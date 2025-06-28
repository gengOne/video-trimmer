const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 确保FFmpeg存在的函数
async function ensureFFmpeg(platform) {
    const binDir = path.join(__dirname, 'bin');
    const ffmpegName = platform === 'win' ? 'ffmpeg.exe' : 'ffmpeg';
    const ffmpegPath = path.join(binDir, ffmpegName);
    console.log('platform', platform);
    if (!fs.existsSync(ffmpegPath)) {
        console.log(`警告: ${platform} 平台的FFmpeg不存在: ${ffmpegPath}`);
        console.log('请运行以下命令下载FFmpeg:');
        console.log('npm run download-ffmpeg');
        return false;
    }

    return true;
}

// 构建函数
async function build(target = null) {
    console.log('开始构建视频裁剪工具...\n');

    // 检查pkg是否安装
    try {
        let res = await execAsync('pkg --version');
        console.log('pkg版本:', res.stdout);
    } catch (error) {
        console.log('pkg未安装，正在安装...');
        await execAsync('npm install -g pkg');
    }

    // 确保bin目录存在
    const binDir = path.join(__dirname, 'bin');
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }

    if (target) {
        // 构建特定目标
        const platforms = target.split(',');
        for (const platform of platforms) {
            const [, os] = platform.split('-');
            await ensureFFmpeg(os);
        }

        console.log(`构建目标: ${target}`);
        const command = `pkg . --targets ${target}`;
        console.log(`执行命令: ${command}\n`);

        try {
            const { stdout, stderr } = await execAsync(command);
            if (stdout) console.log(stdout);
            if (stderr) console.log(stderr);
            console.log('构建完成！');
        } catch (error) {
            console.error('构建失败:', error.message);
            process.exit(1);
        }
    } else {
        // 构建当前平台
        const currentPlatform = process.platform;
        await ensureFFmpeg(currentPlatform);

        const outputName = currentPlatform === 'win32' ? 'video-trimmer.exe' : 'video-trimmer';
        console.log(`构建当前平台 (${currentPlatform}): ${outputName}`);

        const command = `pkg . --output ${outputName}`;

        console.log(`执行命令: ${command}\n`);

        try {
            const { stdout, stderr } = await execAsync(command);
            if (stdout) console.log(stdout);
            if (stderr) console.log(stderr);
            console.log(`构建完成: ${outputName}`);
        } catch (error) {
            console.error('构建失败:', error.message);
            process.exit(1);
        }
    }
}

// 显示帮助信息
function showHelp() {
    console.log(`
视频裁剪工具构建脚本

用法:
  node build.js                    # 构建当前平台
  node build.js --target <targets> # 构建指定目标
  node build.js --help            # 显示帮助

目标格式:
  node18-win-x64      # Windows 64位
  node18-linux-x64    # Linux 64位  
  node18-macos-x64    # macOS 64位 (Intel)
  node18-macos-arm64  # macOS 64位 (Apple Silicon)

示例:
  node build.js --target node18-win-x64
  node build.js --target node18-win-x64,node18-linux-x64,node18-macos-x64

注意:
  构建前请确保对应平台的FFmpeg二进制文件存在于bin目录中
  运行 'node download-ffmpeg.js' 可自动下载当前平台的FFmpeg
`);
}

// 主函数
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const targetIndex = args.indexOf('--target');
    const target = targetIndex !== -1 ? args[targetIndex + 1] : null;

    try {
        await build(target);
    } catch (error) {
        console.error('构建过程中发生错误:', error.message);
        process.exit(1);
    }
}

// 只在直接运行时执行
if (require.main === module) {
    main();
}