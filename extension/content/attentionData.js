/**
 * attentionData.js
 * 负责数据完整记录的创建、导出和下载
 */

function createCompleteRecord(baseRecord) {
  // 获取当前提取的内容
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
  
  // 核心逻辑：详情页优先使用精准提取的文本内容
  if (pageContent?.pageType === 'detail' && pageContent.textContent) {
    fullText = pageContent.textContent;
  } else if (tagInfo.text && tagInfo.isPreview === false) {
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
    // visibleText: pageContent?.visibleContent?.text || '', // 已移除冗余字段
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

  // 导出前先结算当前页面的停留时间
  if (typeof engine.finalizeLastRecord === 'function') {
    engine.finalizeLastRecord();
  }

  const completeRecords = engine.completeRecords || [];
  const records = completeRecords.slice(-recordCount);
  
  const metadata = {
    exportTime: new Date().toLocaleString(),
    sessionId: engine.sessionId,
    totalRecords: records.length,
    requestedCount: recordCount,
    timeRange: records.length > 0 ? {
      start: new Date(records[0].timestamp).toLocaleString(),
      end: new Date(records[records.length - 1].timestamp).toLocaleString()
    } : null
  };
  
  const summary = calculateSummary(records);
  
  // 按照要求，将每个 Record 中的 timestamp 也格式化为可读字符串（与 metadata 一致）
  const formattedRecords = records.map(record => ({
    ...record,
    timestamp: new Date(record.timestamp).toLocaleString()
  }));
  
  return {
    metadata,
    records: formattedRecords,
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
window.exportAttentionJournal = exportSessionJournalAsMarkdown;

/**
 * 将整个会话记录导出为人类可读的 Markdown 文档
 */
function exportSessionJournalAsMarkdown() {
  const engine = window.attentionPulseEngine;
  if (!engine || !engine.completeRecords || engine.completeRecords.length === 0) {
    console.warn('[AttentionPulse:Data] 没有任何记录可供导出');
    return;
  }

  // 导出前先结算当前页面的停留时间
  if (typeof engine.finalizeLastRecord === 'function') {
    engine.finalizeLastRecord();
  }

  console.log('[AttentionPulse:Data] 📄 正在生成会话文档...');
  
  const records = engine.completeRecords;
  const startTime = new Date(records[0].timestamp).toLocaleString();
  const endTime = new Date(records[records.length - 1].timestamp).toLocaleString();
  
  let md = `# AttentionPulse 学习/浏览日志\n\n`;
  md += `- **会话开始时间**: ${startTime}\n`;
  md += `- **会话结束时间**: ${endTime}\n`;
  md += `- **总互动次数**: ${engine.userActions.clicks} 次点击, ${engine.userActions.scrolls} 次滚动\n`;
  md += `- **平均专注度**: ${(records.reduce((s, r) => s + (r.focusLevel || 0), 0) / records.length * 100).toFixed(1)}%\n\n`;
  
  md += `--- \n\n## 📝 详细行为与内容记录\n\n`;

  records.forEach((record, index) => {
    const time = new Date(record.timestamp).toLocaleTimeString();
    const typeIcon = record.pageType === 'detail' ? '📖 [详情页]' : '📱 [信息流]';
    
    md += `### ${index + 1}. ${time} ${typeIcon}\n`;
    md += `- **页面**: [${record.title || '无标题'}](${record.url})\n`;
    md += `- **主要标签**: \`${record.tagName || '未知'}\` | **专注度**: ${((record.focusLevel || 0) * 100).toFixed(0)}%\n`;
    
    if (record.pageType === 'detail' && record.text) {
      const displayContent = record.text.trim().substring(0, 1000);
      md += `#### 📄 提取内容摘要:\n\n${displayContent}${record.text.length > 1000 ? '...' : ''}\n\n`;
    }
    
    if (record.hashtags && record.hashtags.length > 0) {
      md += `- **相关标签**: ${record.hashtags.map(h => `\#${h}`).join(' ')}\n`;
    }
    md += `\n`;
  });

  md += `\n---\n*Generated by AttentionPulse (Beta)*`;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `AttentionPulse_Journal_${timestamp}.md`;
  
  downloadTextFile(md, filename);
}

// 辅助：下载文本文件
function downloadTextFile(content, filename) {
  try {
    const blob = new Blob([content], { type: 'text/markdown' });
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
    console.log('[AttentionPulse:Data] ✅ Markdown文件已下载:', filename);
  } catch (error) {
    console.error('[AttentionPulse:Data] ❌ 下载Markdown失败:', error);
  }
}
