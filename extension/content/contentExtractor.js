// 内容提取模块：从网页中提取关键信息
// 针对小红书等信息流网站优化

class ContentExtractor {
  constructor() {
    this.currentContent = null;
    this.lastExtractTime = 0;
    this.extractThrottle = 500; // 节流：500ms 内最多提取一次
  }

  /**
   * 提取当前页面内容
   * @returns {Object} 包含标题、URL、文本内容等信息
   */
  extract() {
    const now = Date.now();
    if (now - this.lastExtractTime < this.extractThrottle && this.currentContent) {
      return this.currentContent; // 返回缓存
    }
    this.lastExtractTime = now;

    // 提取可见内容（这是最重要的，用于标签判断）
    const visibleContent = this.extractVisibleContent();
    
    const content = {
      url: window.location.href,
      title: document.title,
      timestamp: now,
      // 基础信息
      pageType: this.detectPageType(),
      // 文本内容（整个页面，用于备用）
      textContent: this.extractTextContent(),
      // 当前可见内容（视口内）- 这是主要使用的
      visibleContent: visibleContent,
      // 内容结构信息
      structure: this.extractStructure(),
      // 滚动信息
      scrollInfo: this.getScrollInfo()
    };

    this.currentContent = content;
    return content;
  }

  /**
   * 检测页面类型
   */
  detectPageType() {
    const url = window.location.href;
    const path = window.location.pathname;

    // 小红书页面类型判断
    if (url.includes('xiaohongshu.com')) {
      if (path.includes('/explore/item') || (path.startsWith('/explore/') && path.length > 9)) {
        return 'detail'; // 详情页（优先判断）
      } else if (path === '/explore' || path === '/' || path === '/home' || path.startsWith('/home')) {
        return 'feed'; // 信息流
      } else if (path.includes('/discovery')) {
        return 'discovery'; // 发现页
      } else if (path.includes('/user')) {
        return 'profile'; // 用户主页
      }
    }

    return 'unknown';
  }

  /**
   * 提取页面文本内容
   */
  extractTextContent() {
    // 移除脚本和样式标签
    const clone = document.cloneNode(true);
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());

    // 获取主要文本内容
    const bodyText = clone.body ? clone.body.innerText || '' : '';
    
    // 清理文本：移除多余空白
    return bodyText
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // 限制长度
  }

  /**
   * 提取当前可见区域的内容
   */
  extractVisibleContent() {
    const viewport = {
      top: window.scrollY,
      left: window.scrollX,
      width: window.innerWidth,
      height: window.innerHeight,
      bottom: window.scrollY + window.innerHeight,
      right: window.scrollX + window.innerWidth
    };

    // 获取视口内的元素
    const visibleElements = this.getVisibleElements(viewport);
    
    return {
      viewport,
      elementCount: visibleElements.length,
      text: visibleElements.map(el => el.text).join(' ').substring(0, 1000),
      // 针对小红书：提取可见的笔记卡片
      cards: this.extractVisibleCards(visibleElements)
    };
  }

  /**
   * 获取视口内的可见元素
   */
  getVisibleElements(viewport) {
    const elements = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          // 跳过隐藏元素
          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      const rect = node.getBoundingClientRect();
      const elementTop = rect.top + window.scrollY;
      const elementBottom = rect.bottom + window.scrollY;

      // 检查元素是否在视口内
      if (
        elementBottom >= viewport.top &&
        elementTop <= viewport.bottom &&
        rect.width > 0 &&
        rect.height > 0
      ) {
        const text = node.innerText || node.textContent || '';
        if (text.trim().length > 0) {
          elements.push({
            element: node,
            text: text.trim().substring(0, 200),
            rect: {
              top: elementTop,
              bottom: elementBottom,
              left: rect.left + window.scrollX,
              right: rect.right + window.scrollX,
              width: rect.width,
              height: rect.height
            }
          });
        }
      }
    }

    return elements;
  }

  /**
   * 提取可见的笔记卡片（针对小红书）
   */
  extractVisibleCards(visibleElements) {
    const cards = [];
    
    // 小红书常见的卡片选择器（根据实际页面结构调整）
    // 尝试多种可能的选择器
    const cardSelectors = [
      // 小红书信息流卡片
      '[class*="note-item"]',
      '[class*="feed-item"]',
      '[class*="card-item"]',
      // 更通用的选择器
      'article',
      '[role="article"]',
      // 尝试通过结构特征识别
      'div[class*="note"]',
      'div[class*="feed"]'
    ];

    // 获取视口信息
    const viewportTop = window.scrollY;
    const viewportBottom = window.scrollY + window.innerHeight;

    // 尝试所有选择器，收集所有可能的卡片
    const allPossibleCards = new Set();
    cardSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el && el.offsetHeight > 0) {
            allPossibleCards.add(el);
          }
        });
      } catch (e) {
        // 忽略选择器错误
      }
    });

    // 过滤出视口内的卡片
    Array.from(allPossibleCards).forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const cardTop = rect.top + window.scrollY;
      const cardBottom = rect.bottom + window.scrollY;

      // 检查卡片是否在视口内（至少部分可见）
      if (cardBottom >= viewportTop && cardTop <= viewportBottom && rect.height > 50) {
        const text = card.innerText || card.textContent || '';
        if (text.trim().length > 10) { // 至少有一些文本内容
          cards.push({
            index,
            text: text.trim().substring(0, 300),
            rect: {
              top: cardTop,
              bottom: cardBottom,
              height: rect.height
            }
          });
        }
      }
    });

    // 如果上面的方法没找到，尝试从可见元素中提取（备用方案）
    if (cards.length === 0 && visibleElements && visibleElements.length > 0) {
      // 尝试找到较大的可见元素作为卡片
      visibleElements.forEach((el, index) => {
        if (el.rect && el.rect.height > 100 && el.text.length > 20) {
          cards.push({
            index,
            text: el.text.substring(0, 300),
            rect: el.rect
          });
        }
      });
    }

    return cards;
  }

  /**
   * 提取内容结构信息
   */
  extractStructure() {
    return {
      // 页面主要区域
      mainSections: this.getMainSections(),
      // 链接数量
      linkCount: document.querySelectorAll('a').length,
      // 图片数量
      imageCount: document.querySelectorAll('img').length,
      // 视频数量
      videoCount: document.querySelectorAll('video').length,
      // 文本密度（字符数 / 可见区域面积）
      textDensity: this.calculateTextDensity()
    };
  }

  /**
   * 获取页面主要区域
   */
  getMainSections() {
    const sections = [];
    const mainSelectors = ['main', 'article', '[role="main"]', '.main', '#main'];
    
    mainSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.height > 100) { // 只记录较大的区域
          sections.push({
            selector,
            height: rect.height,
            textLength: (el.innerText || '').length
          });
        }
      });
    });

    return sections;
  }

  /**
   * 计算文本密度
   */
  calculateTextDensity() {
    const viewportArea = window.innerWidth * window.innerHeight;
    const textLength = (document.body.innerText || '').length;
    
    if (viewportArea === 0) return 0;
    return textLength / (viewportArea / 10000); // 每 10000 像素的字符数
  }

  /**
   * 获取滚动信息
   */
  getScrollInfo() {
    return {
      scrollY: window.scrollY,
      scrollX: window.scrollX,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientHeight: window.innerHeight,
      clientWidth: window.innerWidth,
      scrollPercentage: this.calculateScrollPercentage()
    };
  }

  /**
   * 计算滚动百分比
   */
  calculateScrollPercentage() {
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const scrollTop = window.scrollY;

    if (scrollHeight <= clientHeight) return 0;
    return Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
  }

  /**
   * 获取当前内容（带缓存）
   */
  getCurrentContent() {
    return this.currentContent || this.extract();
  }

  /**
   * 提取单个卡片/帖子的内容（用于点击事件）
   * @param {HTMLElement} cardElement - 卡片 DOM 元素
   * @returns {Object} 卡片内容信息
   */
  extractCardContent(cardElement) {
    if (!cardElement) {
      return null;
    }

    try {
      // 提取卡片文本内容
      const text = cardElement.innerText || cardElement.textContent || '';
      
      // 尝试提取标题（通常在特定的元素中）
      const titleElement = cardElement.querySelector('h1, h2, h3, [class*="title"], [class*="Title"]');
      const title = titleElement ? (titleElement.innerText || titleElement.textContent || '').trim() : '';
      
      // 尝试提取描述/正文
      const descElement = cardElement.querySelector('[class*="desc"], [class*="content"], [class*="content"]');
      const description = descElement ? (descElement.innerText || descElement.textContent || '').trim() : '';
      
      // 提取链接（如果有）
      const linkElement = cardElement.querySelector('a[href]');
      const link = linkElement ? linkElement.href : '';
      
      // 提取图片数量
      const images = cardElement.querySelectorAll('img');
      const imageCount = images.length;
      
      // 提取视频数量
      const videos = cardElement.querySelectorAll('video');
      const videoCount = videos.length;

      return {
        text: text.trim(), // 不限制长度，获取完整文本
        title: title || text.trim().split('\n')[0].substring(0, 200), // 如果没有标题，使用第一行
        description: description || text.trim().substring(0, 1000), // 如果没有描述，使用文本前1000字符
        link: link,
        imageCount: imageCount,
        videoCount: videoCount,
        element: cardElement,
        timestamp: Date.now(),
        // 标记这是预览还是完整内容
        isPreview: !description || description.length < text.trim().length * 0.5
      };
    } catch (error) {
      console.error('[AttentionPulse:Extractor] 提取卡片内容失败:', error);
      return null;
    }
  }
}

// 导出到全局作用域（Chrome Extension 环境）
if (typeof window !== 'undefined') {
  window.ContentExtractor = ContentExtractor;
}

