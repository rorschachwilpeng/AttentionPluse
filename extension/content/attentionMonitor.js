/**
 * attentionMonitor.js
 * 负责监听滚动、点击、DOM变化、URL变化
 */

function startContentMonitoring(engine, settings, ui) {
  console.log('[AttentionPulse:Monitor] 启动内容监控...');
  
  let scrollTimeout = null;
  let mutationTimeout = null;
  let lastContentHash = null;
  let lastMutationHash = null;
  
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
      engine.recordAction('scrolls');
      
      if (!window.attentionPulseContentExtractor) return;
      
      try {
        const content = window.attentionPulseContentExtractor.extract();
        const contentHash = JSON.stringify({
          url: content.url,
          scrollPercentage: content.scrollInfo.scrollPercentage,
          visibleCards: content.visibleContent.cards.length
        });
        
        if (contentHash !== lastContentHash) {
          lastContentHash = contentHash;
          
          if (window.attentionPulseContentTagger && content.visibleContent?.text) {
            const tag = window.attentionPulseContentTagger.tag(content.visibleContent.text);
            engine.addRecord({
              tag: tag,
              url: content.url,
              pageType: content.pageType,
              scrollDepth: (content.scrollInfo.scrollPercentage || 0) / 100
            });
          }
        }
      } catch (error) {
        console.error('[AttentionPulse:Monitor] 内容提取出错:', error);
      }
    }, 300);
  }, { passive: true });
  
  const observer = new MutationObserver((mutations) => {
    const hasNewContent = mutations.some(mutation => 
      mutation.addedNodes.length > 0 &&
      Array.from(mutation.addedNodes).some(node => 
        node.nodeType === Node.ELEMENT_NODE && node.offsetHeight > 0
      )
    );
    
    if (hasNewContent) {
      if (mutationTimeout) clearTimeout(mutationTimeout);
      
      mutationTimeout = setTimeout(() => {
        if (!window.attentionPulseContentExtractor) return;
        
        try {
          const content = window.attentionPulseContentExtractor.extract();
          const mutationHash = JSON.stringify({
            visibleCards: content.visibleContent.cards.length,
            elementCount: content.visibleContent.elementCount,
            scrollPercentage: content.scrollInfo.scrollPercentage
          });
          
          if (mutationHash !== lastMutationHash) {
            lastMutationHash = mutationHash;
            if (settings.debug && ui) {
              ui.updateDebugInfo();
            }
          }
        } catch (error) {
          console.error('[AttentionPulse:Monitor] DOM变化内容提取出错:', error);
        }
      }, 800);
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });
}

function startInteractionMonitoring(engine, settings, ui) {
  console.log('[AttentionPulse:Monitor] 启动交互监控...');
  
  let lastUrl = ''; // 初始化为空，确保第一次 handleUrlChange 运行
  engine.resetPageStats();
  
  document.addEventListener('click', (e) => {
    const card = findClickedCard(e.target);
    if (card) {
      engine.recordAction('clicks');
      if (window.attentionPulseContentExtractor) {
        window.clickedCardContent = window.attentionPulseContentExtractor.extractCardContent(card);
      }
    }
  }, true);
  
  const handleUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      const isInitialLoad = lastUrl === '';
      lastUrl = currentUrl;
      
      if (!isInitialLoad) {
        engine.resetPageStats();
        console.log('[AttentionPulse:Monitor] 🔄 URL已变化，已通知引擎重置');
      }
      
      const pageType = window.attentionPulseContentExtractor 
        ? window.attentionPulseContentExtractor.detectPageType() 
        : 'unknown';
      
      if (pageType === 'detail' || currentUrl.includes('/explore/')) {
        handleDetailPage(engine, settings, ui);
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
  const maxAttempts = 5;
  
  const tryExtractDetail = () => {
    attemptCount++;
    if (!window.attentionPulseContentExtractor) return;

    const fullText = extractDetailPageContent();
    if (fullText.length > 500 || attemptCount >= maxAttempts) {
      if (window.clickedCardContent) {
        window.clickedCardContent.text = fullText;
        window.clickedCardContent.isPreview = false;
      }
      
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
        const scrollDepth = (window.attentionPulseContentExtractor.getCurrentContent()?.scrollInfo?.scrollPercentage || 0) / 100;
        
        engine.addRecord({
          tag: tag,
          url: window.location.href,
          pageType: 'detail',
          stayTime: stayTime,
          scrollDepth: scrollDepth
        });
      }
    } else {
      setTimeout(tryExtractDetail, 500);
    }
  };
  
  setTimeout(tryExtractDetail, 1000);
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

function extractDetailPageContent() {
  const selectors = ['[class*="note-detail"]', '[class*="detail-content"]', 'article', 'main'];
  let mainContent = null;
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && el.offsetHeight > 200) { mainContent = el; break; }
  }
  if (!mainContent) {
     const clone = document.body.cloneNode(true);
     clone.querySelectorAll('nav, header, footer, [class*="nav"], [class*="header"], [class*="sidebar"]').forEach(el => el.remove());
     mainContent = clone;
  }
  return (mainContent.innerText || '').trim();
}
