# Extension (A线 - Plugin Demo)

Chrome Extension 实现，用于在真实网页环境中验证 AttentionPulse 的技术可行性。

## 目录结构

```
extension/
├── manifest.json          # Chrome Extension 配置文件
├── content/              # Content Script
│   └── content.js        # 注入到网页中的脚本
├── popup/                # Popup 界面
│   ├── popup.html        # Popup HTML
│   ├── popup.js          # Popup 逻辑
│   └── popup.css         # Popup 样式
├── background/           # Background Service Worker (如需要)
│   └── background.js
└── assets/               # 静态资源
    └── icons/            # 插件图标
```

## 开发任务

- [x] A-1 插件基础搭建
- [ ] A-2 网页内容感知
- [ ] A-3 浏览状态监听
- [ ] A-4 内容标签判断（本地/mock）
- [ ] A-5 AttentionPulse 可视化叠加
- [ ] A-6 标签变化 → Pulse 颜色变化
- [ ] A-7 信息密度 → Pulse 振幅变化（可选）
- [ ] A-8 插件 Demo 录屏

