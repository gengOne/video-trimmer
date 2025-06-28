const https = require('https');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

// FFmpeg下载链接
const FFMPEG_URLS = {
    'win32-x64': 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    'linux-x64': 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    'darwin-x64': 'https://evermeet.cx/ffmpeg/getrelease/zip',
    'darwin-arm64': 'https://evermeet.cx/ffmpeg/getrelease/zip'
};

async function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);

        https.get(url, (response) => {
            console.log(response.statusCode);
            if (response.statusCode === 302 || response.statusCode === 301) {
                // 处理重定向
                file.close();
                fs.unlinkSync(outputPath);
                return downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(outputPath);
                reject(new Error(`下载失败: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });

            file.on('error', (err) => {
                file.close();
                fs.unlinkSync(outputPath);
                reject(err);
            });
        }).on('error', (err) => {
            file.close();
            fs.unlinkSync(outputPath);
            reject(err);
        });
    });
}

async function extractFFmpeg(archivePath, platform) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const binDir = path.join(__dirname, 'bin');

    try {
        if (platform === 'win32') {
            // Windows - 解压zip文件
            if (process.platform === 'win32') {
                // 在Windows上使用PowerShell解压
                await execAsync(`powershell -command "Expand-Archive -Path '${archivePath}' -DestinationPath '${binDir}' -Force"`);

                // 查找ffmpeg.exe并移动到bin目录
                const extractedDir = fs.readdirSync(binDir).find(d => d.includes('ffmpeg'));
                if (extractedDir) {
                    const ffmpegPath = path.join(binDir, extractedDir, 'bin', 'ffmpeg.exe');
                    const targetPath = path.join(binDir, 'ffmpeg.exe');

                    if (fs.existsSync(ffmpegPath)) {
                        fs.copyFileSync(ffmpegPath, targetPath);
                        // 清理临时目录
                        fs.rmSync(path.join(binDir, extractedDir), { recursive: true, force: true });
                    }
                }
            } else {
                console.log('在非Windows系统上无法解压Windows版本的FFmpeg');
            }
        } else if (platform === 'linux') {
            // Linux - 解压tar.xz文件
            await execAsync(`tar -xf "${archivePath}" -C "${binDir}"`);

            // 查找ffmpeg并移动到bin目录
            const extractedDir = fs.readdirSync(binDir).find(d => d.includes('ffmpeg'));
            if (extractedDir) {
                const ffmpegPath = path.join(binDir, extractedDir, 'bin', 'ffmpeg');
                const targetPath = path.join(binDir, 'ffmpeg');

                if (fs.existsSync(ffmpegPath)) {
                    fs.copyFileSync(ffmpegPath, targetPath);
                    fs.chmodSync(targetPath, '755');
                    // 清理临时目录
                    fs.rmSync(path.join(binDir, extractedDir), { recursive: true, force: true });
                }
            }
        } else if (platform === 'darwin') {
            // macOS - 解压zip文件
            await execAsync(`unzip -o "${archivePath}" -d "${binDir}"`);

            // 设置执行权限
            const ffmpegPath = path.join(binDir, 'ffmpeg');
            if (fs.existsSync(ffmpegPath)) {
                fs.chmodSync(ffmpegPath, '755');
            }
        }
    } catch (error) {
        console.error('解压FFmpeg失败:', error.message);
    }
}

async function downloadFFmpeg() {
    const platform = process.platform;
    const arch = process.arch;
    const key = `${platform}-${arch}`;

    console.log(`正在为 ${platform}-${arch} 下载FFmpeg...`);

    const url = FFMPEG_URLS[key] || FFMPEG_URLS[`${platform}-x64`];

    if (!url) {
        console.log(`不支持的平台: ${key}`);
        console.log('请手动下载FFmpeg并放置在bin目录中');
        return;
    }

    const binDir = path.join(__dirname, 'bin');
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }

    // 检查是否已存在FFmpeg
    const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const ffmpegPath = path.join(binDir, ffmpegName);

    if (fs.existsSync(ffmpegPath)) {
        console.log('FFmpeg已存在，跳过下载');
        return;
    }

    try {
        const ext = url.includes('.zip') ? '.zip' : (url.includes('.tar.xz') ? '.tar.xz' : '.zip');
        const archivePath = path.join(binDir, `ffmpeg${ext}`);

        console.log('正在下载FFmpeg...');
        console.log('下载路径:', archivePath);
        console.log('下载URL:', url);
        await downloadFile(url, archivePath);

        console.log('正在解压FFmpeg...');
        await extractFFmpeg(archivePath, platform);

        // 清理下载的压缩文件
        if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
        }

        // 验证FFmpeg是否成功安装
        if (fs.existsSync(ffmpegPath)) {
            console.log('FFmpeg下载和安装成功！');
        } else {
            console.log('FFmpeg安装可能不完整，请检查bin目录');
        }

    } catch (error) {
        console.error('下载FFmpeg失败:', error.message);
        console.log('请手动下载FFmpeg并放置在bin目录中');
        console.log('Windows: 下载ffmpeg.exe到bin/ffmpeg.exe');
        console.log('Linux/macOS: 下载ffmpeg到bin/ffmpeg');
    }
}

// 静态FFmpeg二进制文件（备用方案）
function createStaticFFmpeg() {
    console.log('创建静态FFmpeg说明文件...');

    const binDir = path.join(__dirname, 'bin');
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }

    const readmePath = path.join(binDir, 'README.txt');
    const readmeContent = `
FFmpeg 二进制文件放置说明
======================

请根据你的目标平台，将对应的FFmpeg二进制文件放置在此目录：

Windows (win32):
- 文件名: ffmpeg.exe
- 下载地址: https://github.com/BtbN/FFmpeg-Builds/releases

Linux (linux):
- 文件名: ffmpeg
- 下载地址: https://github.com/BtbN/FFmpeg-Builds/releases

macOS (darwin):
- 文件名: ffmpeg
- 下载地址: https://evermeet.cx/ffmpeg/

注意事项:
1. 确保二进制文件具有执行权限 (chmod +x ffmpeg)
2. 文件应该是静态编译的版本，不依赖系统库
3. 打包时这些文件会被包含在最终的可执行文件中

自动下载:
运行 'npm install' 时会自动尝试下载对应平台的FFmpeg
如果自动下载失败，请手动下载并放置在此目录
`;

    fs.writeFileSync(readmePath, readmeContent);
}

// 主函数
async function main() {
    console.log('正在准备FFmpeg...');

    // 如果是CI环境或者明确指定不下载，则跳过
    if (process.env.CI || process.env.SKIP_FFMPEG_DOWNLOAD) {
        console.log('跳过FFmpeg下载');
        createStaticFFmpeg();
        return;
    }

    try {
        await downloadFFmpeg();
    } catch (error) {
        console.error('FFmpeg准备失败:', error.message);
        createStaticFFmpeg();
    }
}

// 只在直接运行时执行
if (require.main === module) {
    main();
}

module.exports = { downloadFFmpeg, createStaticFFmpeg };