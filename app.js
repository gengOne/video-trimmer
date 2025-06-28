const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

// 获取FFmpeg路径
function getFFmpegPath() {
    let ffmpegPath;
    
    if (process.pkg) {
        // 在pkg打包环境中
        const platform = process.platform;
        const arch = process.arch;
        let ffmpegName;
        
        if (platform === 'win32') {
            ffmpegName = 'ffmpeg.exe';
        } else {
            ffmpegName = 'ffmpeg';
        }
        
        // 从打包的二进制文件中提取ffmpeg
        ffmpegPath = path.join(process.cwd(), 'bin', ffmpegName);
        
        // 如果不存在，尝试从资源中复制
        if (!fs.existsSync(ffmpegPath)) {
            const binDir = path.join(process.cwd(), 'bin');
            if (!fs.existsSync(binDir)) {
                fs.mkdirSync(binDir, { recursive: true });
            }
            
            try {
                // 从pkg资源中复制ffmpeg
                const sourcePath = path.join(__dirname, 'bin', ffmpegName);
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, ffmpegPath);
                    // 在Unix系统上设置执行权限
                    if (platform !== 'win32') {
                        fs.chmodSync(ffmpegPath, '755');
                    }
                }
            } catch (error) {
                console.warn('无法复制FFmpeg二进制文件:', error.message);
            }
        }
    } else {
        // 开发环境，使用系统PATH中的ffmpeg
        ffmpegPath = 'ffmpeg';
    }
    
    return ffmpegPath;
}

const app = express();
const PORT = 9090;

// 创建临时目录
const tempDir = path.join(os.tmpdir(), 'video-trimmer');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `input_${timestamp}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB限制
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(mp4|avi|mov|mkv|wmv|flv|webm)$/i;
        if (allowedTypes.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('只支持视频文件格式'));
        }
    }
});

// 静态文件服务
app.use(express.static('public'));
app.use(express.json());

// 主页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 文件上传接口
app.post('/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '请选择视频文件' });
    }
    
    res.json({ 
        success: true, 
        filename: req.file.filename,
        originalName: req.file.originalname
    });
});

// 视频处理接口
app.post('/trim', async (req, res) => {
    const { filename, startTime, endTime } = req.body;
    
    if (!filename || startTime === undefined || endTime === undefined) {
        return res.status(400).json({ error: '参数不完整' });
    }
    
    const inputPath = path.join(tempDir, filename);
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const outputFilename = `trimmed_${timestamp}${ext}`;
    const outputPath = path.join(tempDir, outputFilename);
    
    if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ error: '源文件不存在' });
    }
    
    try {
        await trimVideo(inputPath, outputPath, startTime, endTime);
        res.json({ 
            success: true, 
            outputFilename: outputFilename,
            downloadUrl: `/download/${outputFilename}`
        });
    } catch (error) {
        console.error('视频处理错误:', error);
        res.status(500).json({ error: '视频处理失败: ' + error.message });
    }
});

// 文件下载接口
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(tempDir, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '文件不存在' });
    }
    
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('下载错误:', err);
        } else {
            // 下载完成后删除临时文件
            setTimeout(() => {
                try {
                    fs.unlinkSync(filePath);
                } catch (e) {
                    console.log('清理临时文件失败:', e.message);
                }
            }, 5000);
        }
    });
});

// FFmpeg视频裁剪函数
function trimVideo(inputPath, outputPath, startTime, endTime) {
    return new Promise((resolve, reject) => {
        // 计算持续时间
        const duration = endTime - startTime;
        
        // 获取FFmpeg路径
        const ffmpegPath = getFFmpegPath();
        
        // FFmpeg命令参数
        const args = [
            '-ss', startTime.toString(),
            '-i', inputPath,
            '-t', duration.toString(),
            '-c', 'copy',
            '-avoid_negative_ts', 'make_zero',
            outputPath
        ];
        
        console.log('FFmpeg命令:', ffmpegPath, args.join(' '));
        
        const ffmpeg = spawn(ffmpegPath, args);
        let stderr = '';
        
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg处理失败，退出码: ${code}\n${stderr}`));
            }
        });
        
        ffmpeg.on('error', (error) => {
            if (error.code === 'ENOENT') {
                reject(new Error('FFmpeg未找到，请确保FFmpeg二进制文件存在'));
            } else {
                reject(error);
            }
        });
    });
}

// 清理临时文件的定时任务
setInterval(() => {
    try {
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            const ageInHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);
            
            // 删除1小时以上的临时文件
            if (ageInHours > 1) {
                fs.unlinkSync(filePath);
                console.log('清理过期文件:', file);
            }
        });
    } catch (error) {
        console.log('清理临时文件时出错:', error.message);
    }
}, 30 * 60 * 1000); // 每30分钟清理一次

// 启动服务器
app.listen(PORT, () => {
    console.log(`视频裁剪工具已启动: http://localhost:${PORT}`);
    
    // 尝试自动打开浏览器
    const { exec } = require('child_process');
    const url = `http://localhost:${PORT}`;
    
    switch (process.platform) {
        case 'darwin':
            exec(`open ${url}`);
            break;
        case 'win32':
            exec(`start ${url}`);
            break;
        default:
            exec(`xdg-open ${url}`);
    }
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});