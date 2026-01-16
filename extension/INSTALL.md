# 安装与测试指南

## 前置准备

### 1. 创建图标文件

在 `assets/icons/` 目录下需要以下三个图标文件：
- `icon16.png` (16x16)
- `icon48.png` (48x48)  
- `icon128.png` (128x128)

**快速创建占位图标的方法：**

**方法1：使用在线工具（推荐，最快）**
- 访问 https://www.favicon-generator.org/ 或 https://realfavicongenerator.net/
- 上传一个简单的图标或使用纯色图片
- 下载并重命名为对应尺寸，放到 `assets/icons/` 目录

**方法2：使用 Python (需要 Pillow)**
```bash
cd extension/assets/icons
pip install --user Pillow  # 或使用虚拟环境
python3 create_icons.py
```

**方法3：使用 ImageMagick (如果已安装)**
```bash
cd extension/assets/icons
convert -size 16x16 xc:"#667eea" icon16.png
convert -size 48x48 xc:"#667eea" icon48.png
convert -size 128x128 xc:"#667eea" icon128.png
```

**方法4：手动创建（最简单）**
- 使用任何图片编辑工具（如 Preview、Photoshop、GIMP）创建 16x16, 48x48, 128x128 的 PNG 图片
- 可以使用纯色图片作为占位（如紫色 #667eea）
- 或者从网上下载一个简单的图标，复制三份并调整尺寸

**⚠️ 注意：图标文件是必需的！** 如果图标文件不存在，Chrome 扩展将无法加载。

## 安装步骤

### 1. 打开 Chrome 扩展管理页面

- 在 Chrome 地址栏输入：`chrome://extensions/`
- 或者：菜单 → 更多工具 → 扩展程序

### 2. 启用开发者模式

- 在扩展管理页面右上角，打开"开发者模式"开关

### 3. 加载扩展

- 点击"加载已解压的扩展程序"
- 选择 `AttentionPluse/extension/` 目录
- 扩展应该会出现在扩展列表中

### 4. 验证安装

- 检查扩展图标是否出现在工具栏
- 点击扩展图标，应该弹出 Popup 界面
- 打开小红书网站 (https://www.xiaohongshu.com)
- 打开浏览器控制台（F12），应该能看到 `[AttentionPulse] Content Script 已注入` 的日志

## 测试 Checklist

- [ ] 扩展可以成功加载
- [ ] Popup 界面正常显示
- [ ] Popup 中的开关可以操作
- [ ] 设置可以保存（关闭 Popup 再打开，设置应该保留）
- [ ] 在小红书页面，控制台能看到 Content Script 注入日志
- [ ] 启用"显示调试信息"后，页面右上角出现调试信息框

## 常见问题

### 问题1：扩展加载失败
- 检查 `manifest.json` 语法是否正确
- 检查所有文件路径是否正确
- 检查图标文件是否存在

### 问题2：Content Script 未注入
- 确认访问的是小红书网站（`*.xiaohongshu.com`）
- 刷新页面
- 检查控制台是否有错误信息

### 问题3：Popup 无法打开
- 检查 `popup.html` 文件路径是否正确
- 检查 `popup.js` 和 `popup.css` 路径是否正确
- 查看扩展管理页面的错误信息

## 下一步

完成 A-1 后，继续实现：
- A-2: 网页内容感知
- A-3: 浏览状态监听
- A-5: AttentionPulse 可视化叠加

