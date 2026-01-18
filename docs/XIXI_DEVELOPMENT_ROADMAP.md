# Xixi Widget 开发路线图

## 📋 项目概述

**项目名称**: Xixi (水母) Widget - 注意力状态可视化组件  
**技术方案**: 基于 PNG 图片 + CSS 动画  
**核心定位**: 用户注意力状态的外化载体，通过"生命节律的变化"让用户感知自己的状态，不打断、不评价

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

---

## ✅ 已完成任务

### 1. 基础框架和核心模块

#### 1.1 图片资源管理
- **文件**: `extension/content/xixiImagePaths.js`
- **功能**: 
  - 使用 `chrome.runtime.getURL()` 获取扩展资源 URL
  - 支持所有部署环境（本地开发、Chrome Web Store）
  - 管理所有状态的图片路径
- **图片文件**:
  - `baseline_1.png`, `baseline_2.png`, `baseline_3.png` (中立状态)
  - `calm_1.png` (冷静状态)
  - `restless_1.png`, `restless_2.png`, `restless_3.png` (浮躁状态)

#### 1.2 状态管理器
- **文件**: `extension/content/xixiStateManager.js`
- **功能**:
  - 根据 D 值判断主状态（calm/baseline/restless）
  - 判断浮躁子状态（mild/moderate/severe）
  - 检测状态变化
- **状态阈值**:
  ```javascript
  D < 0.4   → 'calm' (冷静)
  0.4 ≤ D < 0.7 → 'baseline' (中立)
  D ≥ 0.7   → 'restless' (浮躁)
  
  // 浮躁子状态
  0.7 ≤ D < 0.8 → 'mild' (轻度)
  0.8 ≤ D < 0.9 → 'moderate' (中度)
  0.9 ≤ D ≤ 1.0 → 'severe' (高度)
  ```

#### 1.3 图片预加载器
- **文件**: `extension/content/xixiImageLoader.js`
- **功能**:
  - 异步加载所有图片
  - 提供加载进度和状态管理
  - 支持非阻塞预加载（失败不影响初始化）

#### 1.4 主类框架
- **文件**: `extension/content/xixiPNGWidget.js`
- **功能**:
  - 整合所有模块
  - 实现基础 DOM 结构
  - 实现 D 值平滑处理（EMA - Exponential Moving Average）
  - 实现状态切换逻辑
  - 实现动画循环（requestAnimationFrame）
  - 管理三个状态的动画实例

### 2. 三个状态的动画实现

#### 2.1 中立状态 (Baseline) 动画
- **文件**: `extension/content/xixiBaselineAnimation.js`
- **当前实现**:
  - ✅ 3 张图片缓慢循环（2-3 秒随机间隔）
  - ✅ 极轻微变化：scale (1.0 ↔ 1.01), opacity (0.9 ↔ 0.95)
  - ✅ 淡入淡出切换（1 秒过渡）
  - ✅ 呼吸效果已实现（但可能与图片切换不够协调）
- **配置参数**:
  ```javascript
  {
    switchIntervalMin: 2000,  // 最小切换间隔（毫秒）
    switchIntervalMax: 3000,  // 最大切换间隔（毫秒）
    scaleMin: 1.0,
    scaleMax: 1.01,
    opacityMin: 0.9,
    opacityMax: 0.95,
    breathing: {
      enabled: true,
      period: 3.0,            // 呼吸周期（3秒）
      inhaleRatio: 0.4,       // 吸气时长占比（40%）
      exhaleRatio: 0.4,       // 呼气时长占比（40%）
      pauseRatio: 0.1,        // 停顿时长占比（10%）
      opacityRange: 0.08,     // 透明度变化范围
      smoothFactor: 0.15      // 平滑指数
    }
  }
  ```
- **当前问题**:
  - 图片切换像幻灯片，呼吸效果与图片切换不够协调
  - 需要在图片切换时加入呼吸效果，让切换更自然

#### 2.2 冷静状态 (Calm) 动画
- **文件**: `extension/content/xixiCalmAnimation.js`
- **当前实现**:
  - ✅ 非对称深呼吸曲线（5 秒完整周期）
  - ✅ 吸气/停顿/呼气/停顿的完整流程
  - ✅ 使用 easing 函数（ease-in 吸气，ease-out 呼气）
  - ✅ 透明度变化（0.5-0.7，比 Baseline 更透明）
  - ✅ 缩放变化（1.0-1.08）
- **配置参数**:
  ```javascript
  {
    cycleDuration: 5.0,        // 5秒一个完整周期
    inhaleRatio: 0.4,          // 40% - 吸气
    inhalePauseRatio: 0.06,    // 6% - 吸气后停顿
    exhaleRatio: 0.44,         // 44% - 呼气（略长于吸气）
    exhalePauseRatio: 0.10,    // 10% - 呼气后停顿
    baseOpacity: 0.7,          // 基础透明度（比 Baseline 更透明）
    opacityRange: 0.2,         // 透明度变化范围（±0.2，即 0.5-0.7）
    scaleRange: 0.08,          // 缩放变化范围（1.0-1.08）
    smoothFactor: 0.15         // 平滑速度系数
  }
  ```
- **当前问题**:
  - 呼吸效果已实现，但可能需要优化，确保透明度与缩放配合更自然
  - 需要增强呼吸感，让用户更明显地感受到"呼吸"效果

#### 2.3 浮躁状态 (Restless) 动画
- **文件**: `extension/content/xixiRestlessAnimation.js`
- **当前实现**:
  - ✅ 随机闪烁效果（平闪，不刺眼）
  - ✅ 三级频率控制（轻度/中度/高度）
  - ✅ 图片随机切换
  - ✅ 闪烁透明度范围（0.60-0.90）
- **配置参数**:
  ```javascript
  {
    frequencyRanges: {
      mild: { min: 800, max: 1200 },      // 轻度浮躁：800-1200ms
      moderate: { min: 400, max: 800 },   // 中度浮躁：400-800ms
      severe: { min: 200, max: 400 }      // 高度浮躁：200-400ms
    },
    flashOpacityMin: 0.60,    // 闪烁时的最小透明度
    flashOpacityMax: 0.90,    // 正常时的最大透明度
    flashDuration: 150,       // 单次闪烁持续时间（毫秒）
    transitionDuration: 200   // 图片切换时的淡入淡出时间（毫秒）
  }
  ```

### 3. 状态切换基础逻辑

#### 3.1 状态切换管理器
- **文件**: `extension/content/xixiStateTransition.js`
- **当前实现**:
  - ✅ 使用透明度技巧：切换时瞬间 `opacity → 0`，切换图片后恢复显示
  - ✅ 支持切换队列，避免快速切换时的冲突
  - ✅ 无需过渡动画，直接切换
- **当前问题**:
  - 切换过于生硬，没有过渡效果
  - 需要优化为更丝滑的切换，可以使用呼吸效果作为过渡动画

### 4. 集成和配置

#### 4.1 主 UI 集成
- **文件**: `extension/content/attentionUI.js`
- **功能**:
  - ✅ 集成 Xixi Widget 到主 UI 系统
  - ✅ 实现 `setTurbulence(D)` 接口
  - ✅ 关闭引擎自动更新（等待后端数据接口）
  - ✅ 修复自动切换回中立状态的 bug
- **关键方法**:
  - `initXixiWidget()` - 初始化 Widget
  - `setTurbulence(D)` - 设置 D 值（手动或后端接口调用）
  - `destroyXixiWidget()` - 销毁 Widget

#### 4.2 配置文件
- **文件**: `extension/manifest.json`
- **配置**:
  - ✅ `web_accessible_resources` 声明所有 PNG 图片资源
  - ✅ Content scripts 加载顺序配置

### 5. 测试和调试工具

#### 5.1 状态测试脚本
- **文件**: `extension/content/xixiStateTest.js`
- **功能**:
  - 自动模拟 D 值从低到高的变化
  - 每个状态停留 5 秒
  - 自动打印状态信息
- **使用方法**:
  ```javascript
  window.xixiStateTest.start()    // 开始测试
  window.xixiStateTest.stop()    // 停止测试
  window.xixiStateTest.setPoint(0)  // 切换到指定测试点
  ```

#### 5.2 状态日志工具
- **文件**: `extension/content/xixiStateLogging.js`
- **功能**:
  - 打印每个状态的详细信息
  - 持续监控状态变化
  - 监听状态切换事件
- **使用方法**:
  ```javascript
  logCalmState()           // 打印 Calm 状态信息
  logBaselineState()       // 打印 Baseline 状态信息
  logRestlessState()       // 打印 Restless 状态信息
  logCurrentState()        // 自动识别并打印当前状态
  startStateMonitoring()   // 开始持续监控（每秒）
  enableStateChangeLogging() // 启用状态切换日志
  ```

---

## 🚧 待开发任务

### 前端 - UI 分类

#### 1. 状态转换优化

##### 1.1 优化三个状态之间的转换，使其更加丝滑
- **当前状态**: 
  - 使用透明度技巧：切换时瞬间 `opacity → 0`，切换图片后恢复显示
  - 切换过于生硬，没有过渡效果
- **目标**:
  - 实现平滑的过渡动画
  - 避免视觉上的跳跃感
  - 确保状态切换流畅自然
- **实现建议**:
  - 可以使用 CSS transition 或 JavaScript 动画
  - 考虑使用淡入淡出效果
  - 可以结合呼吸效果作为过渡
- **相关文件**:
  - `extension/content/xixiStateTransition.js` - 状态切换管理器
  - `extension/content/xixiPNGWidget.js` - 主类（调用切换逻辑）

##### 1.2 为"冷静状态"加入/优化呼吸特效
- **当前状态**:
  - 已有非对称深呼吸动画（5 秒周期）
  - 透明度变化：0.5-0.7
  - 缩放变化：1.0-1.08
- **目标**:
  - 增强呼吸感，让用户更明显地感受到"呼吸"效果
  - 确保透明度与缩放配合更自然
  - 通过调整透明度来模拟呼吸感，同时配合图形的放大缩小来实现
- **实现建议**:
  - 优化 easing 函数，让呼吸更自然
  - 调整透明度变化范围，让呼吸更明显
  - 确保缩放和透明度的同步性
- **相关文件**:
  - `extension/content/xixiCalmAnimation.js` - 冷静状态动画类
  - 关键方法：`calculatePhaseValues()`, `update()`, `applyChanges()`

##### 1.3 为"中立状态"（Baseline）加入/优化呼吸特效
- **当前状态**:
  - 已有呼吸效果（3 秒周期）
  - 图片切换像幻灯片（2-3 秒随机间隔）
  - 呼吸效果与图片切换不够协调
- **目标**:
  - 在图片切换时加入呼吸效果，让幻灯片的切换更加自然
  - 让呼吸效果与图片切换协调一致
  - 避免图片切换时的突兀感
- **实现建议**:
  - 在图片切换时，结合呼吸效果进行过渡
  - 可以在切换前先"呼气"（透明度降低、缩放缩小），切换后"吸气"（透明度升高、缩放放大）
  - 或者让图片切换与呼吸周期同步
- **相关文件**:
  - `extension/content/xixiBaselineAnimation.js` - 中立状态动画类
  - 关键方法：`switchRandomImage()`, `updateImage()`, `applyChanges()`
  - 需要协调 `switchTimerId` 和呼吸周期

##### 1.4 使用呼吸效果作为三个状态之间切换的过渡动画
- **当前状态**:
  - 状态切换使用透明度技巧（opacity → 0，切换后恢复）
  - 没有过渡动画
- **目标**:
  - 使用呼吸效果作为状态切换的过渡动画
  - 让状态切换更自然、更有生命感
- **实现建议**:
  - 在状态切换时，先执行一个"呼气"动画（透明度降低、缩放缩小）
  - 切换图片后，执行一个"吸气"动画（透明度升高、缩放放大）
  - 可以使用一个简化的呼吸周期（例如 1-2 秒）作为过渡
  - 需要确保过渡动画不会与目标状态的动画冲突
- **相关文件**:
  - `extension/content/xixiStateTransition.js` - 状态切换管理器
  - `extension/content/xixiPNGWidget.js` - 主类（调用切换逻辑）
  - 可能需要创建一个新的过渡动画类，或者扩展现有的动画类

#### 2. UI 位置调整

##### 2.1 调整"吸吸"在小红书页面上的位置
- **当前状态**:
  - 使用默认位置（top-left 或 bottom-right）
  - 可能有自动定位逻辑（查找搜索框、Home 按钮等）
- **目标**:
  - 针对小红书页面优化位置
  - 确保不遮挡重要内容
  - 确保在不同页面布局下都能正确显示
- **实现建议**:
  - 分析小红书页面的 DOM 结构
  - 找到合适的定位点（例如导航栏、侧边栏等）
  - 实现针对小红书页面的特殊定位逻辑
  - 考虑响应式布局，适配不同屏幕尺寸
- **相关文件**:
  - `extension/content/attentionUI.js` - 主 UI 类
  - 关键方法：`initXixiWidget()`, `findSearchBoxPosition()`, `findHomeButtonPosition()`, `adjustWidgetPosition()`
  - 可能需要添加 `findXiaohongshuPosition()` 方法

---

## 📁 文件结构

```
extension/
├── assets/
│   └── xixi/
│       ├── baseline_1.png      ✅ 中立状态图片 1
│       ├── baseline_2.png      ✅ 中立状态图片 2
│       ├── baseline_3.png    ✅ 中立状态图片 3
│       ├── calm_1.png          ✅ 冷静状态图片
│       ├── restless_1.png      ✅ 浮躁状态图片 1
│       ├── restless_2.png      ✅ 浮躁状态图片 2
│       └── restless_3.png      ✅ 浮躁状态图片 3
│
├── content/
│   ├── xixiImagePaths.js          ✅ 图片路径管理器
│   ├── xixiStateManager.js        ✅ 状态管理器
│   ├── xixiImageLoader.js          ✅ 图片预加载器
│   ├── xixiPNGWidget.js           ✅ 主类
│   ├── xixiBaselineAnimation.js   ✅ 中立状态动画
│   ├── xixiCalmAnimation.js       ✅ 冷静状态动画
│   ├── xixiRestlessAnimation.js   ✅ 浮躁状态动画
│   ├── xixiStateTransition.js     ✅ 状态切换管理器
│   ├── xixiStateTest.js           ✅ 状态测试脚本
│   ├── xixiStateLogging.js        ✅ 状态日志工具
│   └── attentionUI.js             ✅ 主 UI 集成
│
└── manifest.json                   ✅ 扩展配置
```

---

## 🔧 技术实现细节

### 状态映射逻辑

```javascript
// 主状态
D < 0.4   → 'calm' (冷静)
0.4 ≤ D < 0.7 → 'baseline' (中立)
D ≥ 0.7   → 'restless' (浮躁)

// 浮躁子状态
0.7 ≤ D < 0.8 → 'mild' (轻度)
0.8 ≤ D < 0.9 → 'moderate' (中度)
0.9 ≤ D ≤ 1.0 → 'severe' (高度)
```

### D 值输入接口

```javascript
// 手动设置 D 值
window.attentionPulseUI.setTurbulence(0.3)  // Calm 状态
window.attentionPulseUI.setTurbulence(0.5)  // Baseline 状态
window.attentionPulseUI.setTurbulence(0.8)  // Restless 状态

// 后端数据接口（待实现）
// 应该通过消息传递或事件系统接收 D 值
```

### 动画循环机制

- 使用 `requestAnimationFrame` 实现 60fps 动画循环
- 每个动画类都有自己的 `update(deltaTime)` 方法
- 主类 `xixiPNGWidget.js` 负责协调所有动画

### 状态切换流程

1. `xixiPNGWidget.update()` 检测到状态变化
2. 调用 `switchToState(newState)`
3. `switchToState()` 调用 `stateTransition.transition()`
4. `transition()` 执行透明度切换技巧
5. 切换完成后，启动新状态的动画

---

## 🎯 开发优先级建议

### 高优先级
1. **状态转换优化 1.1** - 优化三个状态之间的转换，使其更加丝滑
   - 影响用户体验，需要优先处理
2. **状态转换优化 1.4** - 使用呼吸效果作为状态切换的过渡动画
   - 与 1.1 相关，可以一起实现

### 中优先级
3. **状态转换优化 1.3** - 为"中立状态"加入/优化呼吸特效
   - 改善中立状态的视觉效果
4. **状态转换优化 1.2** - 为"冷静状态"加入/优化呼吸特效
   - 优化现有功能

### 低优先级
5. **UI 位置调整 2.1** - 调整"吸吸"在小红书页面上的位置
   - 特定平台优化，可以后续处理

---

## 📝 开发注意事项

1. **保持代码一致性**:
   - 遵循现有的代码风格和命名规范
   - 使用相同的配置参数格式
   - 保持错误处理的一致性

2. **测试验证**:
   - 使用 `xixiStateTest.js` 进行自动化测试
   - 使用 `xixiStateLogging.js` 观察状态变化
   - 确保三个状态之间的切换流畅

3. **性能考虑**:
   - 避免过度使用 `requestAnimationFrame`
   - 优化 CSS transition 性能
   - 确保动画不会影响页面性能

4. **兼容性**:
   - 确保在不同浏览器上都能正常工作
   - 考虑不同屏幕尺寸的适配

5. **用户体验**:
   - 动画应该自然、不突兀
   - 避免过于频繁的状态切换
   - 确保视觉反馈及时且准确

---

## 🔍 快速开始指南

### 1. 了解项目结构
- 阅读本文档了解整体架构
- 查看 `docs/XIXI_DEVELOPMENT_STATUS.md` 了解详细实现
- 查看 `extension/content/xixiPNGWidget.js` 了解主类结构

### 2. 开发环境设置
- 确保 Chrome 扩展开发环境已配置
- 加载扩展并刷新页面
- 使用浏览器控制台进行调试

### 3. 测试工具使用
- 加载 `xixiStateTest.js` 进行自动化测试
- 加载 `xixiStateLogging.js` 观察状态变化
- 使用 `window.attentionPulseUI.setTurbulence(D)` 手动测试

### 4. 开发流程
1. 理解需求（参考本文档的"待开发任务"部分）
2. 查看相关文件（参考"相关文件"部分）
3. 实现功能
4. 使用测试工具验证
5. 提交代码

---

## 📞 相关资源

- **开发文档**: `docs/XIXI_DEVELOPMENT_STATUS.md` - 详细实现文档
- **数据接口**: `docs/DATA_INTERFACES.md` - 数据接口文档
- **数据结构**: `docs/DATA_STRUCTURES.md` - 数据结构文档

---

**最后更新**: 2024年（阶段 3 完成后）  
**当前状态**: ✅ 基础功能已完成，待优化 UI 效果和位置调整

