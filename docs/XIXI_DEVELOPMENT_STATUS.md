# Xixi PNG Widget 开发状态总结

## 📋 项目概述

**项目名称**: Xixi (水母) Widget - 注意力状态可视化组件  
**技术方案**: 基于 PNG 图片 + CSS 动画（替代原 Canvas 实现）  
**核心定位**: 用户注意力状态的外化载体，通过"生命节律的变化"让用户感知自己的状态，不打断、不评价

---

## 🎯 产品需求

### 三种状态定义

1. **冷静状态 (Calm)** - D < 0.4
   - 关键词：向内、沉静、专注、呼吸
   - 用户感受：「我好像慢下来了」
   - 实现：1 张 PNG + CSS 深呼吸动画

2. **中立状态 (Baseline)** - 0.4 ≤ D < 0.7
   - 关键词：稳定、陪伴、在场、无干扰
   - 用户感受：「它在那儿，但我不需要管它」
   - 实现：3 张 PNG 缓慢循环 + 极轻微变化

3. **浮躁状态 (Restless)** - D ≥ 0.7
   - 关键词：不稳定、跳跃、内在张力
   - 用户感受：「我好像有点坐不住了」
   - 实现：3 张 PNG + 随机闪烁（平闪效果）

### 浮躁子状态（三分化）
- **轻度浮躁** (0.7 ≤ D < 0.8): 低频闪烁 (800-1200ms)
- **中度浮躁** (0.8 ≤ D < 0.9): 中频闪烁 (400-800ms)
- **高度浮躁** (0.9 ≤ D ≤ 1.0): 高频闪烁 (200-400ms)

### 状态切换策略
- 使用透明度技巧：切换时瞬间 opacity → 0，切换图片后恢复显示
- 无需过渡动画，直接切换

---

## ✅ 已完成模块

### 1. 基础配置
- ✅ `manifest.json` - 添加 `web_accessible_resources` 声明图片资源
- ✅ 图片资源已放置在 `extension/assets/xixi/` 目录

### 2. 工具模块
- ✅ `xixiImagePaths.js` - 图片路径管理器
  - 使用 `chrome.runtime.getURL()` 获取扩展资源 URL
  - 支持所有部署环境（本地开发、Chrome Web Store）
  - 图片文件：`baseline_1.png`, `baseline_2.png`, `baseline_3.png`, `calm_1.png`, `restless_1.png`, `restless_2.png`, `restless_3.png`

- ✅ `xixiStateManager.js` - 状态管理器
  - 根据 D 值判断状态（calm/baseline/restless）
  - 判断浮躁子状态（mild/moderate/severe）
  - 检测状态变化

- ✅ `xixiImageLoader.js` - 图片预加载器
  - 异步加载所有图片
  - 提供加载进度和状态管理

### 3. 主类框架
- ✅ `xixiPNGWidget.js` - 主类
  - 整合所有模块
  - 实现基础 DOM 结构
  - 实现 D 值平滑处理（EMA）
  - 实现状态切换逻辑
  - 实现动画循环（requestAnimationFrame）

### 4. 动画模块
- ✅ `xixiBaselineAnimation.js` - 中立状态动画
  - 3 张图片缓慢循环（3-5 秒随机间隔）
  - 极轻微变化：scale (1.0 ↔ 1.01), opacity (0.9 ↔ 0.95)
  - 淡入淡出切换（2 秒过渡）

- ✅ `xixiCalmAnimation.js` - 冷静状态动画（阶段 3 已完成）
  - 非对称呼吸曲线（吸气/停顿/吐气/停顿）
  - 使用 easing 函数实现平滑过渡
  - 节律：慢、不对称、有停顿
  - 6 秒完整呼吸周期
  - 吸气 25%，停顿 10%，吐气 45%，停顿 20%

- ✅ `xixiStateTransition.js` - 状态切换管理器（阶段 5 已完成）
  - 实现透明度切换技巧（opacity → 0，切换图片后恢复）
  - 处理状态切换的平滑过渡
  - 支持切换队列，避免快速切换时的冲突
  - 无需过渡动画，直接切换

---

## 🚧 待开发模块

### 阶段 6：集成和优化（已完成）
- ✅ 集成到 `attentionUI.js`
  - ✅ 替换现有 Canvas 实现为 PNG Widget
  - ✅ 保持 API 兼容性
  - ✅ 标记旧的 Canvas 方法为已废弃
  - ✅ 更新诊断方法以支持 PNG Widget

---

## 📁 文件结构

```
extension/
├── assets/
│   └── xixi/
│       ├── baseline_1.png
│       ├── baseline_2.png
│       ├── baseline_3.png
│       ├── calm_1.png
│       ├── restless_1.png
│       ├── restless_2.png
│       └── restless_3.png
│
├── content/
│   ├── xixiImagePaths.js          ✅ 图片路径管理器
│   ├── xixiStateManager.js        ✅ 状态管理器
│   ├── xixiImageLoader.js          ✅ 图片预加载器
│   ├── xixiBaselineAnimation.js   ✅ 中立状态动画
│   ├── xixiCalmAnimation.js       ✅ 冷静状态动画
│   ├── xixiRestlessAnimation.js   ✅ 浮躁状态动画
│   ├── xixiStateTransition.js     ✅ 状态切换管理器
│   ├── xixiPNGWidget.js           ✅ 主类
│   ├── xixiStateTransition.js     ⏳ 状态切换管理器（待开发）
│   └── attentionUI.js             ⏳ 需要集成（待开发）
│
└── manifest.json                   ✅ 已配置 web_accessible_resources
```

---

## 🔧 技术实现细节

### 图片路径处理
- **方法**: 使用 `chrome.runtime.getURL('assets/xixi/文件名.png')`
- **原因**: Content script 无法直接使用相对路径，必须使用扩展 API
- **配置**: `manifest.json` 中已声明 `web_accessible_resources`

### 状态映射逻辑
```javascript
D < 0.4   → 'calm' (冷静)
0.4 ≤ D < 0.7 → 'baseline' (中立)
D ≥ 0.7   → 'restless' (浮躁)

// 浮躁子状态
0.7 ≤ D < 0.8 → 'mild' (轻度)
0.8 ≤ D < 0.9 → 'moderate' (中度)
0.9 ≤ D ≤ 1.0 → 'severe' (高度)
```

### 动画实现策略
- **中立状态**: 缓慢循环 + 极轻微变化（几乎不可感知）
- **冷静状态**: CSS 驱动的深呼吸动画（非对称曲线）
- **浮躁状态**: 随机闪烁（平闪，不刺眼）

### 性能优化
- 图片预加载（启动时一次性加载）
- 帧率控制（requestAnimationFrame）
- CSS 动画（GPU 加速）
- 按需更新（只在状态变化时更新）

---

## 🐛 已知问题

### 图片路径问题（⚠️ 需要修复）
- **问题描述**: 用户反馈图片路径有问题，图片无法正确加载
- **可能原因**: 
  - 路径配置错误
  - 文件名不匹配
  - `chrome.runtime.getURL()` 返回的路径不正确
- **待检查**: 
  - 验证 `xixiImagePaths.js` 中的文件名是否与实际文件匹配
  - 验证 `chrome.runtime.getURL('assets/xixi/baseline_1.png')` 是否正确
  - 检查 `manifest.json` 中的 `web_accessible_resources` 配置

### 模块加载问题
- **问题**: 新模块需要手动加载才能测试
- **临时方案**: 使用 `loadXixiModules()` 函数手动加载
- **长期方案**: 已添加到 `manifest.json`，需要重新加载扩展

---

## 📝 开发流程

### 当前阶段
**阶段 6 已完成** - 集成和优化（Canvas 已替换为 PNG Widget）

### 下一步
所有核心功能已完成，可以进行最终测试和优化

### 开发原则
- **分而治之**: 每个阶段独立开发、独立测试
- **模块化**: 每个功能独立模块，便于维护
- **测试驱动**: 每个阶段完成后立即测试验证

---

## 🧪 测试方法

### 手动加载模块（当前方法）
```javascript
async function loadXixiModules() {
  const modules = [
    'xixiImagePaths.js',
    'xixiStateManager.js', 
    'xixiImageLoader.js',
    'xixiBaselineAnimation.js',
    'xixiPNGWidget.js'
  ];
  
  for (const module of modules) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/' + module);
    document.head.appendChild(script);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

await loadXixiModules();
```

### 创建测试 Widget
```javascript
const container = document.createElement('div');
container.style.cssText = 'position: fixed; top: 20px; left: 20px; width: 200px; height: 200px; background: rgba(0,0,0,0.3); border: 2px dashed rgba(255,255,255,0.5); border-radius: 12px; z-index: 999999;';
document.body.appendChild(container);

const widget = new XixiPNGWidget(container);
await widget.init();
widget.setTurbulence(0.5); // 测试中立状态
```

---

## 📚 关键代码位置

### 主类
- `extension/content/xixiPNGWidget.js` - 主类，整合所有模块

### 动画模块
- `extension/content/xixiBaselineAnimation.js` - 中立状态动画（已完成）
- `extension/content/xixiCalmAnimation.js` - 冷静状态动画（待开发）
- `extension/content/xixiRestlessAnimation.js` - 浮躁状态动画（待开发）

### 工具模块
- `extension/content/xixiImagePaths.js` - 图片路径管理
- `extension/content/xixiStateManager.js` - 状态管理
- `extension/content/xixiImageLoader.js` - 图片加载

### 配置文件
- `extension/manifest.json` - 扩展配置（已添加新模块到 content_scripts）

---

## 🎯 下一步开发任务

### 优先级 1：修复图片路径问题
- 检查图片文件名与代码中的路径是否匹配
- 验证图片能否正确加载

### 已完成：阶段 6 - 集成和优化
- ✅ 集成到 `attentionUI.js`
- ✅ 替换 Canvas 实现为 PNG Widget
- ✅ 标记旧的 Canvas 方法为已废弃
- ✅ 更新诊断方法

---

## 💡 重要提示

1. **图片路径**: 使用 `chrome.runtime.getURL()` 获取扩展资源 URL
2. **模块加载**: 新模块已添加到 `manifest.json`，需要重新加载扩展
3. **测试方法**: 当前使用手动加载模块的方式测试
4. **开发策略**: 分阶段开发，每阶段完成后测试验证
5. **状态切换**: 使用透明度技巧实现无过渡切换

---

## 📞 联系信息

如有问题，请参考：
- 开发文档：`docs/DEVELOPMENT_STATUS.md`
- 数据接口：`docs/DATA_INTERFACES.md`
- 数据结构：`docs/DATA_STRUCTURES.md`

---

**最后更新**: 阶段 6 完成（集成和优化）  
**当前状态**: ✅ 所有阶段已完成，Canvas 已完全替换为 PNG Widget 实现

---

## 🔍 快速开始指南（给新 Agent）

### 1. 了解项目
- 阅读本文档了解整体架构
- 查看 `docs/DEVELOPMENT_STATUS.md` 了解原项目状态
- 查看 `extension/content/attentionUI.js` 了解现有实现

### 2. 检查当前状态
- 已完成的模块：基础工具模块 + 中立状态动画
- 待开发：冷静状态动画、浮躁状态动画、状态切换、集成

### 3. 立即需要处理的问题
- **图片路径问题**: 用户反馈图片无法加载，需要检查 `xixiImagePaths.js` 和 `manifest.json` 配置

### 4. 测试方法
- 使用控制台手动加载模块测试
- 创建测试容器和 Widget 实例
- 验证图片加载和状态切换

### 5. 开发流程
- 按阶段开发，每阶段完成后测试
- 保持模块化设计
- 遵循"分而治之"策略

