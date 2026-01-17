/**
 * attentionData.js
 * 负责数据完整记录的创建、导出和下载
 */

function createCompleteRecord(baseRecord) {
  // 获取页面内容
  let pageContent = null;
  if (window.attentionPulseContentExtractor) {
    try {
      pageContent = window.attentionPulseContentExtractor.getCurrentContent();
    } catch (error) {
      console.error('[AttentionPulse:Data] 获取页面内容失败:', error);
    }
  }
  
  const tagInfo = window.clickedCardContent || {};
  let fullText = '';
  if (tagInfo.text && tagInfo.isPreview === false) {
    fullText = tagInfo.text;
  } else if (pageContent?.visibleContent?.text) {
    fullText = pageContent.visibleContent.text;
  } else {
    fullText = document.body?.innerText || '';
  }
  
  // 从全局引擎获取状态（因为该函数被 engine 调用）
  // 注意：此处的 engine 变量应在 main/content.js 中定义为全局
  const engine = window.attentionPulseEngine;
  
  let focusLevel = 0;
  let diversity = 0;
  if (engine && engine.timeWindow && engine.timeWindow.records.length > 0) {
    focusLevel = calculateFocusLevel(engine.timeWindow, {
      scrollDepth: baseRecord.scrollDepth
    });
    diversity = calculateDiversity(engine.timeWindow);
  }
  
  const completeRecord = {
    timestamp: baseRecord.timestamp || Date.now(),
    tag: baseRecord.tag || 'unknown',
    url: baseRecord.url || window.location.href,
    pageType: baseRecord.pageType || 'unknown',
    stayTime: baseRecord.stayTime || 0,
    scrollDepth: baseRecord.scrollDepth || 0,
    
    title: pageContent?.title || document.title || '',
    text: fullText,
    visibleText: pageContent?.visibleContent?.text || '',
    visibleCards: pageContent?.visibleContent?.cards?.length || 0,
    elementCount: pageContent?.visibleContent?.elementCount || 0,
    
    tagName: tagInfo.tagName || '',
    hashtags: tagInfo.hashtags || [],
    
    focusLevel: focusLevel,
    diversity: diversity,
    
    userActions: engine ? {
      clicks: engine.userActions.clicks,
      scrolls: engine.userActions.scrolls,
      pageSwitches: engine.userActions.pageSwitches
    } : {},
    
    timeWindowTagCount: (engine && engine.timeWindow) 
      ? engine.timeWindow.records.filter(r => r.tag === baseRecord.tag).length 
      : 0,
    timeWindowTotalCount: (engine && engine.timeWindow) 
      ? engine.timeWindow.records.length 
      : 0
  };
  
  return completeRecord;
}

function calculateSummary(records) {
  if (records.length === 0) {
    return {
      uniqueTags: [],
      tagDistribution: {},
      avgFocusLevel: 0,
      avgDiversity: 0,
      avgStayTime: 0,
      avgScrollDepth: 0
    };
  }
  
  const tagCounts = {};
  const uniqueTags = new Set();
  let totalFocusLevel = 0;
  let totalDiversity = 0;
  let totalStayTime = 0;
  let totalScrollDepth = 0;
  
  records.forEach(record => {
    const tag = record.tag || 'unknown';
    uniqueTags.add(tag);
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    totalFocusLevel += record.focusLevel || 0;
    totalDiversity += record.diversity || 0;
    totalStayTime += record.stayTime || 0;
    totalScrollDepth += record.scrollDepth || 0;
  });
  
  return {
    uniqueTags: Array.from(uniqueTags),
    tagDistribution: tagCounts,
    avgFocusLevel: totalFocusLevel / records.length,
    avgDiversity: totalDiversity / records.length,
    avgStayTime: totalStayTime / records.length,
    avgScrollDepth: totalScrollDepth / records.length
  };
}

function collectRawData(recordCount = 50) {
  const engine = window.attentionPulseEngine;
  if (!engine) return null;

  const completeRecords = engine.completeRecords || [];
  const records = completeRecords.slice(-recordCount);
  
  const metadata = {
    exportTime: new Date().toISOString(),
    sessionId: engine.sessionId,
    totalRecords: records.length,
    requestedCount: recordCount,
    timeRange: records.length > 0 ? {
      start: records[0]?.timestamp || null,
      end: records[records.length - 1]?.timestamp || null
    } : null
  };
  
  const summary = calculateSummary(records);
  
  return {
    metadata,
    records,
    summary
  };
}

function downloadJSONFile(jsonString, filename) {
  try {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    console.log('[AttentionPulse:Data] ✅ JSON文件已下载:', filename);
  } catch (error) {
    console.error('[AttentionPulse:Data] ❌ 下载文件失败:', error);
  }
}

function exportRawDataAsJSON(recordCount = 50, pretty = true) {
  console.log(`[AttentionPulse:Data] 📦 开始导出Raw Data（最近${recordCount}条记录）...`);
  const data = collectRawData(recordCount);
  if (!data) return;

  const jsonString = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `attentionPulse_raw_data_${timestamp}.json`;
  
  downloadJSONFile(jsonString, filename);
  return data;
}

// 暴露到全局，方便在控制台调用
window.exportAttentionPulseData = exportRawDataAsJSON;
window.collectAttentionPulseData = collectRawData;
