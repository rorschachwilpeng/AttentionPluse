# 快速创建占位图标

## 最简单的方法（推荐）

### 使用在线工具（1分钟搞定）

1. 访问：https://www.favicon-generator.org/
2. 点击 "Generate Favicons" 
3. 上传任意图片（或使用纯色图片）
4. 下载生成的图标包
5. 将以下文件复制到 `extension/assets/icons/` 目录：
   - `favicon-16x16.png` → 重命名为 `icon16.png`
   - `favicon-32x32.png` → 重命名为 `icon48.png`（或使用 48x48 尺寸）
   - `favicon-96x96.png` → 重命名为 `icon128.png`（或使用 128x128 尺寸）

### 或者使用纯色占位图标

如果你只是想快速测试，可以：

1. 打开任何图片编辑工具（Mac 的 Preview、Windows 的画图等）
2. 创建一个 128x128 的图片，填充颜色 `#667eea`（紫色）
3. 保存为 `icon128.png`
4. 复制并调整尺寸为 48x48 → `icon48.png`
5. 复制并调整尺寸为 16x16 → `icon16.png`

## 验证

创建完成后，检查以下文件是否存在：
- ✅ `extension/assets/icons/icon16.png`
- ✅ `extension/assets/icons/icon48.png`
- ✅ `extension/assets/icons/icon128.png`

然后就可以按照 `INSTALL.md` 的步骤安装扩展了！

