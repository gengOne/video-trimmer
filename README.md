# 视频裁剪工具

一个基于Node.js和FFmpeg的视频时间段裁剪工具，支持打包成exe可执行文件，**内置FFmpeg，无需额外安装**。

## 功能特性

- 🎬 支持多种视频格式（MP4, AVI, MOV, MKV, WMV, FLV, WebM）
- ⏱️ 精确的时间段选择（支持小数秒）
- 🚀 快速处理（使用stream copy，无需重新编码）
- 💻 友好的Web界面
- 📦 可打包成单个exe文件，**内置FFmpeg**
- 🗑️ 自动清理临时文件
- 🔧 无需安装FFmpeg，开箱即用

## 快速开始

### 方法1: 使用预构建的可执行文件（推荐）

1. 下载对应平台的可执行文件
2. 双击运行，浏览器会自动打开
3. 开始使用！

### 方法2: 从源码构建

#### 1. 安装依赖
```bash
npm install
```

#### 2. 下载FFmpeg（自动）
```bash
# 会自动下载当前平台的FFmpeg到bin目录
npm run download-ffmpeg
```

#### 3. 构建可执行文件
```bash
# 构建当前平台
npm run build

# 构建Windows版本
npm run build-win

# 构建Linux版本  
npm run build-linux

# 构建macOS版本
npm run build-mac

# 构建所有平台
npm run build-all
```

### 方法3: 开发模式运行

```bash
npm install
npm run download-ffmpeg
npm start
```

## 构建说明

### 自动下载FFmpeg
程序会在安装时自动下载对应平台的FFmpeg二进制文件到`bin/`目录：

- **Windows**: `bin/ffmpeg.exe`
- **Linux**: `bin/ffmpeg`
- **macOS**: `bin/ffmpeg`

### 手动下载FFmpeg（可选）
如果自动下载失败，可以手动下载：

**Windows:**
- 下载地址: https://github.com/BtbN/FFmpeg-Builds/releases
- 解压后将`ffmpeg.exe`放到`bin/ffmpeg.exe`

**Linux:**
- 下载地址: https://github.com/BtbN/FFmpeg-Builds/releases  
- 解压后将`ffmpeg`放到`bin/ffmpeg`并设置执行权限: `chmod +x bin/ffmpeg`

**macOS:**
- 下载地址: https://evermeet.cx/ffmpeg/
- 解压后将`ffmpeg`放到`bin/ffmpeg`并设置执行权限: `chmod +x bin/ffmpeg`

### 构建选项

```bash
# 构建脚本提供多种选项
node build.js                    # 构建当前平台
node build.js --target node18-win-x64     # 构建Windows 64位
node build.js --target node18-linux-x64   # 构建Linux 64位  
node build.js --target node18-macos-x64   # 构建macOS 64位
node build.js --help            # 显示帮助信息
```

## 使用方法

1. **运行程序**: 双击可执# 视频裁剪工具

一个基于Node.js和FFmpeg的视频时间段裁剪工具，支持打包成exe可执行文件。

## 功能特性

- 🎬 支持多种视频格式（MP4, AVI, MOV, MKV, WMV, FLV, WebM）
- ⏱️ 精确的时间段选择（支持小数秒）
- 🚀 快速处理（使用stream copy，无需重新编码）
- 💻 友好的Web界面
- 📦 可打包成单个exe文件
- 🗑️ 自动清理临时文件

## 安装要求

### 1. FFmpeg
程序依赖FFmpeg进行视频处理，请先安装：

**Windows:**
- 下载FFmpeg: https://ffmpeg.org/download.html
- 解压后将bin目录添加到系统PATH环境变量

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

### 2. Node.js
需要Node.js 18

## 快速开始

### 开发模式运行

1. 克隆或下载项目文件
2. 安装依赖：
```bash
npm install
```

3. 启动程序：
```bash
npm start
```

4. 浏览器会自动打开 http://localhost:9090

### 打包成exe

1. 安装pkg（如果还没安装）：
```bash
npm install -g pkg
```

2. 打包：
```bash
npm run build
```

这将生成 `video-trimmer.exe` 文件。

### 跨平台打包
```bash
npm run build-all
```

这将生成Windows、Linux和macOS的可执行文件。

## 使用方法

1. **选择视频文件**: 点击文件选择按钮，选择要裁剪的视频
2. **设置时间段**: 输入开始时间和结束时间（单位：秒）
3. **开始裁剪**: 点击"开始裁剪视频"按钮
4. **下载结果**: 处理完成后点击下载按钮

## 注意事项

- 确保FFmpeg已正确安装并添加到系统PATH
- 支持的最大文件大小为500MB
- 临时文件会在1小时后自动清理
- 程序运行时会占用9090端口

## 文件结构

```
video-trimmer/
├── app.js              # 主程序文件
├── package.json        # 项目配置
├── public/
│   └── index.html      # 前端页面
└── README.md           # 说明文档
```

## 故障排除

### 常见问题

1. **"FFmpeg未找到"错误**
   - 确保FFmpeg已安装并添加到PATH环境变量

2. **端口占用**
   - 如果9090端口被占用，可以修改app.js中的PORT变量

3. **文件上传失败**
   - 检查文件格式是否支持
   - 检查文件大小是否超过500MB限制

4. **打包后无法运行**
   - 确保目标机器已安装FFmpeg
   - 检查防火墙和杀毒软件设置

## 技术栈

- **后端**: Node.js + Express
- **文件上传**: Multer
- **视频处理**: FFmpeg
- **打包工具**: pkg
- **前端**: HTML5 + CSS3 + JavaScript

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。