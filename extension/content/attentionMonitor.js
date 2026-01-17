/**
 * attentionMonitor.js
 * 负责监听滚动、点击、DOM变化、URL变化
 */

function startContentMonitoring(engine, settings, ui) {
  console.log('[AttentionPulse:Monitor] 启动内容监控 (精简模式)...');
  
  let scrollTimeout = null;
  // let mutationTimeout = null; // 移除 mutation 相关变量
  // let lastContentHash = null;
  // let lastMutationHash = null;
  
  // 1. 只有滚动时记录 "scrolls" 行为次数，但不进行任何内容提取
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
      engine.recordAction('scrolls');
      
      // 注意：已移除滚动时的 extract() 调用，不再因为滚动而分析页面内容
    }, 300);
  }, { passive: true });
  
  // 2. 移除 MutationObserver (DOM 变化监听)，因为不需要在加载新笔记时抓取
  /*
  const observer = new MutationObserver((mutations) => {
     ...
  });
  observer.observe(...) 
  */
}

function startInteractionMonitoring(engine, settings, ui) {
  console.log('[AttentionPulse:Monitor] 启动交互监控 (精简模式)...');
  
  let lastUrl = ''; 
  // engine.resetPageStats(); // 初始不需要重置，等进入详情页再说
  
  // 1. 点击监控：仅为了捕捉用户意图，暂不进行深度提取，深度数据在 URL 变化进入详情页后处理
  document.addEventListener('click', (e) => {
    const card = findClickedCard(e.target);
    if (card) {
      engine.recordAction('clicks');
      // 如果需要记录点击的一瞬间卡片的基本信息做个快照，可以保留
      if (window.attentionPulseContentExtractor) {
        window.clickedCardContent = window.attentionPulseContentExtractor.extractCardContent(card);
      }
    }
  }, true);
  
  const handleUrlChange = () => {
    const currentUrl = window.location.href;
    // console.log(`[AttentionPulse:Monitor] 检查 URL: ${currentUrl}`); // 调试用
    
    // 只有 URL 发生实质变化时才处理
    if (currentUrl !== lastUrl) {
      const isInitialLoad = lastUrl === '';
      lastUrl = currentUrl;
      
      // 清理上一个页面的点击缓存，防止数据污染
      window.clickedCardContent = null;
      
      const pageType = window.attentionPulseContentExtractor 
        ? window.attentionPulseContentExtractor.detectPageType() 
        : 'unknown';

      // 核心修改：只在检测到进入“详情页”时，才触发真正的数据提取和记录逻辑
      if (pageType === 'detail') {
        console.log(`[AttentionPulse:Monitor] 🎯 探测到详情页 (Initial: ${isInitialLoad}), 准备提取数据... URL: ${currentUrl}`);
        if (!isInitialLoad) {
          engine.resetPageStats(); // 切换了帖子，重置统计
        }
        handleDetailPage(engine, settings, ui);
      } else {
        console.log(`[AttentionPulse:Monitor] 🔄 页面切换为: ${pageType}, URL: ${currentUrl}`);
        // 如果当前正在追踪详情页，现在离开详情页了，停止计时
        engine.stopTracking();
      }
    }
  };

  handleUrlChange(); // 立即运行一次
  setInterval(handleUrlChange, 500);

  // 劫持 history
  const wrapHistory = (type) => {
    const original = history[type];
    return function() {
      const result = original.apply(this, arguments);
      setTimeout(handleUrlChange, 100);
      return result;
    };
  };
  history.pushState = wrapHistory('pushState');
  history.replaceState = wrapHistory('replaceState');
}

function handleDetailPage(engine, settings, ui) {
  let attemptCount = 0;
  const maxAttempts = 6; // 稍微增加重试次数
  const targetUrl = window.location.href; // 记录触发时的目标 URL
  
  const tryExtractDetail = () => {
    // 关键防御逻辑：如果用户已经离开了该详情页，立即停止提取，防止录入错误的（如主页）信息
    if (window.location.href !== targetUrl) {
      console.log('[AttentionPulse:Monitor] ⚠️ 检测到页面已跳转，停止提取该笔记数据。');
      return;
    }

    attemptCount++;
    if (!window.attentionPulseContentExtractor) return;

    // 主动调用提取器
    const extractedContent = window.attentionPulseContentExtractor.extract();
    const fullText = extractedContent.textContent || '';
    
    // 如果提取到了有效正文（即使只有 5 字，小红书有些笔记确实很短）或者达到最大尝试次数
    if (fullText.length > 5 || attemptCount >= maxAttempts) {
      // 只有在还是同一个页面时才进行记录
      if (window.location.href === targetUrl) {
        console.log(`[AttentionPulse:Monitor] 提取详情页完毕 (次数: ${attemptCount}), 长度: ${fullText.length}`);
        
        // 更新点击缓存
        if (window.clickedCardContent) {
          window.clickedCardContent.title = extractedContent.title;
          window.clickedCardContent.text = fullText;
          window.clickedCardContent.isPreview = false;
        }
        
        // 生成标签并记录
        if (window.attentionPulseContentTagger && fullText.length > 0) {
          const tag = window.attentionPulseContentTagger.tag(fullText);
          const tagName = window.attentionPulseContentTagger.getTagName(tag);
          const hashtags = window.attentionPulseContentTagger.extractHashtags(fullText);
          
          if (window.clickedCardContent) {
            window.clickedCardContent.tag = tag;
            window.clickedCardContent.tagName = tagName;
            window.clickedCardContent.hashtags = hashtags;
          }

          const stayTime = Date.now() - engine.pageEnterTime;
          const scrollPercentage = extractedContent.scrollInfo?.scrollPercentage || 0;
          
          engine.addRecord({
            tag: tag,
            url: targetUrl, // 使用进入时的 URL 而不是当前 window.location
            title: extractedContent.title,
            pageType: 'detail',
            stayTime: stayTime,
            scrollDepth: scrollPercentage / 100
          });
        }
      }
    } else {
      // 继续重试，缩短重试间隔以匹配快速操作
      setTimeout(tryExtractDetail, 400);
    }
  };
  
  // 减少初始等待时间，更早尝试抓取
  setTimeout(tryExtractDetail, 300);
}

function findClickedCard(target) {
  const cardSelectors = ['[class*="note-item"]', '[class*="feed-item"]', '[class*="card-item"]', 'article', '[role="article"]'];
  let element = target;
  let depth = 0;
  while (element && element !== document.body && depth < 10) {
    for (const selector of cardSelectors) {
      if (element.matches && element.matches(selector)) {
        const rect = element.getBoundingClientRect();
        if (rect.height > 100 && rect.width > 100) return element;
      }
    }
    element = element.parentElement;
    depth++;
  }
  return null;
}
