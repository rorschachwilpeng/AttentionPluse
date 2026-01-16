# 图标文件说明

Chrome Extension 需要以下尺寸的图标：

- `icon16.png` - 16x16 像素（工具栏图标）
- `icon48.png` - 48x48 像素（扩展管理页面）
- `icon128.png` - 128x128 像素（Chrome 网上应用店）

## 临时方案

在开发阶段，可以使用以下方式快速创建占位图标：

1. 使用在线工具生成：https://www.favicon-generator.org/
2. 使用简单的纯色图标作为占位
3. 使用 SVG 转 PNG（需要时）

## 图标设计建议

- 主题色：紫色渐变（#667eea 到 #764ba2）
- 元素：可以包含波形或脉冲的抽象图形
- 风格：简洁、现代、低存在感

## 快速创建占位图标

可以使用以下命令（需要 ImageMagick）：

```bash
# 创建 16x16 占位图标
convert -size 16x16 xc:"#667eea" icon16.png

# 创建 48x48 占位图标
convert -size 48x48 xc:"#667eea" icon48.png

# 创建 128x128 占位图标
convert -size 128x128 xc:"#667eea" icon128.png
```

或者使用 Python 脚本创建简单的占位图标。

