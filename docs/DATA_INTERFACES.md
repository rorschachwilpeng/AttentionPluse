# 项目数据接口文档 (Data Interfaces)

本文档描述了 AttentionPulse 核心模块提供的公共接口（API）。这些接口定义了数据如何在提取器、引擎、UI 和数据存储模块之间流转。

## 1. 内容提取接口 (ContentExtractor)

负责解析 DOM 并结构化数据。挂载于 `window.attentionPulseContentExtractor`。

### `extract()`
- **描述**: 获取当前页面的完整内容快照。包含节流机制（默认 500ms）。
- **参数**: 无
- **返回**: `ExtractedContent` 对象
- **用途**: 用于周期性分析当前视口内的内容分布。

### `extractCardContent(cardElement)`
- **描述**: 解析特定的卡片 DOM 元素（如小红书的笔记卡片）。
- **参数**: 
  - `cardElement` (HTMLElement): 目标 DOM 节点。
- **返回**: `CardContent` | `null`
- **用途**: 当用户点击卡片时被调用，用于捕获用户的显式兴趣点。

### `detectPageType()`
- **描述**: 根据 URL 和路径特征判断当前页面类型。
- **返回**: `string` ('feed' | 'detail' | 'discovery' | 'profile' | 'unknown')

---

## 2. 核心引擎接口 (AttentionEngine)

负责状态管理和算法计算。挂载于 `window.attentionPulseEngine`。

### `addRecord(baseRecord)`
- **描述**: 向时间窗口添加一条新的行为记录，并触发重新计算专注度。
- **参数**: 
  - `baseRecord`: 包含 `tag`, `scrollDepth`, `stayTime` 等基础信息的对象。
- **行为**: 
  1. 调用 `createCompleteRecord` 补全数据。
  2. 存入滑动时间窗口。
  3. 计算新的 `focusLevel` 和 `diversity`。
  4. 触发 `onUpdate` 回调。

### `recordAction(type)`
- **描述**: 记录一次原子用户交互。
- **参数**: 
  - `type`: `'clicks'` | `'scrolls'`
- **用途**: 统计用户活跃度。

### `resetPageStats()`
- **描述**: 重置当前页面的统计数据（如停留时间、页面内点击数）。
- **用途**: 当 URL 发生变化（路由跳转）时调用。

### `onUpdate(callback)`
- **描述**: 注册状态更新观察者。
- **参数**: 
  - `callback`: `(data: { focusLevel, diversity, tag }) => void`
- **用途**: UI 模块订阅此事件以驱动动画。

---

## 3. 内容标签接口 (ContentTagger)

负责文本语义分析。挂载于 `window.attentionPulseContentTagger`。

### `tag(text)`
- **描述**: 对输入文本进行关键词匹配，返回最符合的分类标签。
- **参数**: `text` (string)
- **返回**: `string` (Tag Code, e.g., 'tech')

### `extractHashtags(text)`
- **描述**: 提取文本中的 `#hashtag`。
- **参数**: `text` (string)
- **返回**: `string[]`

---

## 4. 数据管理接口 (AttentionData)

负责数据的最终组装和导出。全局函数。

### `createCompleteRecord(baseRecord)`
- **描述**: 将引擎传入的基础记录，结合当前提取器的状态，融合成完整的持久化记录。
- **参数**: `baseRecord`
- **返回**: `CompleteRecord`

### `collectRawData(recordCount)`
- **描述**: 收集最近的 N 条完整记录，并生成统计摘要。
- **参数**: `recordCount` (number, default: 50)
- **返回**: 
  ```javascript
  {
    metadata: { ... },
    records: CompleteRecord[],
    summary: { ... }
  }
  ```
- **用途**: 用于 '导出数据' 功能。

---

## 5. 监控模块 (AttentionMonitor)

非类对象，是一组启动函数。

### `startContentMonitoring(engine, settings, ui)`
- **功能**: 
  - 监听滚动事件 (`scroll`)。
  - 监听 DOM 变化 (`MutationObserver`)。
  - 定期调用 `extractor.extract()` 并向引擎发送数据。

### `startInteractionMonitoring(engine, settings, ui)`
- **功能**: 
  - 监听点击事件 (`click`)。
  - 监听 URL 变化 (`popstate`, `pushState`, interval)。
  - 处理详情页的特定逻辑。
