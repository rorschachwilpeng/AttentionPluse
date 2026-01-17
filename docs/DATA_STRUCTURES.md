# 项目数据结构定义 (Data Structures)

本文档定义了 AttentionPulse 项目中核心的数据对象结构。这些结构用于模块间通信、数据存储和状态分析。

## 1. 完整行为记录 (CompleteRecord)

这是系统中最核心的数据单元，由 `attentionData.js` 中的 `createCompleteRecord` 生成。它合并了用户行为、页面内容和引擎计算出的专注度指标，用于最终的存储和分析。

```typescript
interface CompleteRecord {
  // --- 基础上下文信息 ---
  timestamp: number;        // 记录生成的时间戳 (Date.now())
  sessionId: string;        // 会话 ID (虽然代码中没显式在 return 中，但在 collectRawData 的 metadata 中使用)
  url: string;              // 当前页面 URL
  pageType: string;         // 页面类型 ('feed' | 'detail' | 'discovery' | 'profile' | 'unknown')
  
  // --- 用户行为指标 ---
  stayTime: number;         // 页面停留时间 (ms)
  scrollDepth: number;      // 滚动深度 (0.0 - 1.0)
  userActions: {
    clicks: number;         // 累计点击次数
    scrolls: number;        // 累计滚动事件触发次数
    pageSwitches: number;   // 页面切换次数
  };

  // --- 内容语义信息 ---
  title: string;            // 页面标题
  text: string;             // 也就是 fullText，当前关注的完整文本内容（帖子正文或页面可见文本）
  visibleText: string;      // 当前视口可见的文本内容
  
  // --- 标签与分类 ---
  tag: string;              // 内容分类标签代码 ('tech', 'learning', 'entertainment', etc.)
  tagName: string;          // 标签中文名 (e.g., "科技")
  hashtags: string[];       // 提取出的 hashtags (e.g., ["人工智能", "Python"])
  
  // --- 页面结构统计 ---
  visibleCards: number;     // 视口内可见的卡片/帖子数量
  elementCount: number;     // 视口内可见的 DOM 元素数量
  
  // --- 专注度计算结果 ---
  focusLevel: number;       // 当前专注度评分 (0.0 - 1.0)
  diversity: number;        // 当前内容发散度评分 (0.0 - 1.0)
  
  // --- 时间窗口统计 (用于调试算法) ---
  timeWindowTagCount: number;   // 时间窗口内同类标签出现的次数
  timeWindowTotalCount: number; // 时间窗口内总记录数
}
```

## 2. 页面提取内容 (ExtractedContent)

由 `ContentExtractor.extract()` 返回，描述当前网页在特定时刻的内容快照。

```typescript
interface ExtractedContent {
  url: string;
  title: string;
  timestamp: number;
  
  // --- 页面类型 ---
  pageType: 'feed' | 'detail' | 'discovery' | 'profile' | 'unknown';
  
  // --- 文本内容 ---
  textContent: string;      // 页面整体纯文本 (已做清洗，限长 5000 字符)
  
  // --- 可见区域内容 (关键字段) ---
  visibleContent: {
    viewport: ViewportInfo; // 视口坐标信息
    elementCount: number;   // 可见元素数量
    text: string;           // 可见区域拼接文本 (限长 1000 字符)
    cards: CardItem[];      // 识别出的卡片列表
  };
  
  // --- 结构统计 ---
  structure: {
    mainSections: SectionInfo[];
    linkCount: number;
    imageCount: number;
    videoCount: number;
    textDensity: number;    // 文本密度
  };
  
  // --- 滚动信息 ---
  scrollInfo: {
    scrollY: number;
    scrollX: number;
    scrollHeight: number;
    scrollWidth: number;
    clientHeight: number;
    clientWidth: number;
    scrollPercentage: number; // 0-100
  };
}

interface ViewportInfo {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}
```

## 3. 卡片内容 (CardContent)

由 `ContentExtractor.extractCardContent()` 返回，通常在用户点击某个帖子/卡片时生成。

```typescript
interface CardContent {
  text: string;             // 完整文本内容
  title: string;            // 推测的标题
  description: string;      // 推测的描述/正文
  link: string;             // 跳转链接
  
  imageCount: number;       // 卡片内图片数
  videoCount: number;       // 卡片内视频数
  
  element: HTMLElement;     // DOM 元素引用
  timestamp: number;
  
  isPreview: boolean;       // true 表示这是一个预览卡片，false 表示可能是详情内容
  
  // --- 可能被后续流程附加的字段 ---
  tag?: string;             // 标签代码
  tagName?: string;         // 标签名
  hashtags?: string[];
}
```

## 4. 引擎状态 (AttentionState)

由 `AttentionEngine.getStatus()` 返回，用于 UI 实时渲染。

```typescript
interface AttentionState {
  focusLevel: number;       // 当前实时专注度
  diversity: number;        // 当前实时发散度
  
  actions: {
    clicks: number;
    scrolls: number;
    pageSwitches: number;
  };
  
  sessionId: string;        // 当前会话 ID
  pageEnterTime: number;    // 进入当前页面的时间戳
}
```
