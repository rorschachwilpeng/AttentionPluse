// Content Script: 注入到目标网页中
// 负责读取页面内容、监听浏览状态、渲染 AttentionPulse

(function() {
  'use strict';
  
  try {
    // 防止重复注入（使用更严格的检查）
    const injectionKey = 'attentionPulseInjected';
    const injectionTimestamp = 'attentionPulseInjectionTime';
    
    if (window[injectionKey]) {
      console.log('[AttentionPulse] 已注入，跳过重复注入（时间:', new Date(window[injectionTimestamp]).toISOString(), ')');
      return;
    }
    
    // 标记已注入
    window[injectionKey] = true;
    window[injectionTimestamp] = Date.now();
    
    // 第一步：验证脚本已加载
    console.log('[AttentionPulse] ===== 脚本开始执行 =====');
    
    console.log('%c[AttentionPulse] Content Script 已注入', 'color: #667eea; font-weight: bold; font-size: 14px;');
    console.log('[AttentionPulse] 当前页面:', window.location.href);
    console.log('[AttentionPulse] 页面标题:', document.title);
    console.log('[AttentionPulse] 窗口信息:', {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollY: window.scrollY,
      scrollX: window.scrollX
    });
    console.log('[AttentionPulse] 扩展 ID:', chrome.runtime.id);
    
    // 第二步：检查 ContentExtractor 是否可用
    console.log('[AttentionPulse] 检查 ContentExtractor...');
    if (typeof ContentExtractor === 'undefined') {
      console.error('[AttentionPulse] ❌ ContentExtractor 未定义！');
      console.error('[AttentionPulse] 可能原因：contentExtractor.js 未正确加载');
      console.error('[AttentionPulse] 请检查：');
      console.error('  1. manifest.json 中 contentExtractor.js 是否在 content.js 之前');
      console.error('  2. 文件路径是否正确');
      console.error('  3. 扩展管理页面是否有错误');
      
      // 即使 ContentExtractor 未加载，也继续执行基础功能
      console.warn('[AttentionPulse] 继续执行基础功能（无内容提取）');
    } else {
      console.log('[AttentionPulse] ✓ ContentExtractor 已找到');
      
      // 初始化内容提取器
      try {
        const contentExtractor = new ContentExtractor();
        console.log('[AttentionPulse] ✓ ContentExtractor 初始化成功');
        window.attentionPulseContentExtractor = contentExtractor; // 保存到全局
      } catch (error) {
        console.error('[AttentionPulse] ❌ ContentExtractor 初始化失败:', error);
      }
    }
    
    // 第三步：检查 ContentTagger 是否可用
    console.log('[AttentionPulse] 检查 ContentTagger...');
    if (typeof ContentTagger === 'undefined') {
      console.warn('[AttentionPulse] ⚠️ ContentTagger 未定义（标签判断功能不可用）');
    } else {
      console.log('[AttentionPulse] ✓ ContentTagger 已找到');
      
      // 初始化标签判断器
      try {
        const contentTagger = new ContentTagger();
        console.log('[AttentionPulse] ✓ ContentTagger 初始化成功');
        window.attentionPulseContentTagger = contentTagger; // 保存到全局
      } catch (error) {
        console.error('[AttentionPulse] ❌ ContentTagger 初始化失败:', error);
      }
    }
  } catch (error) {
    console.error('[AttentionPulse] ❌ 脚本执行出错:', error);
    console.error('[AttentionPulse] 错误堆栈:', error.stack);
    return;
  }
  
  // 默认设置
  let settings = {
    enabled: true,
    position: 'bottom-right',
    size: 'medium',
    debug: false
  };
  
  // ===== 颜色映射相关 =====
  
  // 颜色状态管理
  let currentPulseColor = '#a0aec0';  // 当前心跳图颜色（默认：未知/灰色）
  let targetPulseColor = '#a0aec0';   // 目标颜色（用于过渡）
  let colorTransitionStartColor = '#a0aec0'; // 过渡起始颜色
  let colorTransitionStartTime = null; // 过渡开始时间
  const colorTransitionDuration = 500; // 过渡时长（毫秒）
  
  // 颜色映射函数
  function getTagColor(tag) {
    const tagColors = {
      'tech': '#667eea',        // 科技 - 紫色
      'learning': '#48bb78',     // 学习 - 绿色
      'entertainment': '#ed8936', // 娱乐 - 橙色
      'sports': '#4299e1',       // 运动 - 蓝色
      'life': '#9f7aea',         // 生活 - 紫色
      'unknown': '#a0aec0'       // 未知 - 灰色
    };
    return tagColors[tag] || tagColors['unknown'];
  }
  
  // 颜色工具函数：十六进制转 RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  // 颜色工具函数：RGB 转十六进制
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  // 颜色插值函数
  function interpolateColor(color1, color2, progress) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return color2; // 如果转换失败，返回目标颜色
    
    const r = rgb1.r + (rgb2.r - rgb1.r) * progress;
    const g = rgb1.g + (rgb2.g - rgb1.g) * progress;
    const b = rgb1.b + (rgb2.b - rgb1.b) * progress;
    
    return rgbToHex(r, g, b);
  }
  
  // 缓动函数：easeInOutCubic
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  // 颜色更新函数（旧版本，基于标签）
  function updatePulseColor(tag) {
    const newColor = getTagColor(tag);
    
    // 如果颜色相同，无需更新
    if (newColor === targetPulseColor) {
      return;
    }
    
    // 从当前颜色开始过渡到新颜色
    // 如果当前正在过渡，会从当前颜色继续过渡，确保快速切换时也能平滑过渡
    colorTransitionStartColor = currentPulseColor;
    targetPulseColor = newColor;
    colorTransitionStartTime = Date.now();
    
    console.log('[AttentionPulse] 🎨 更新心跳图颜色:', {
      tag: tag,
      color: newColor,
      fromColor: colorTransitionStartColor,
      toColor: targetPulseColor
    });
  }
  
  // ===== 阶段2：状态计算与可视化 =====
  
  // 2.1 专注度→颜色映射
  /**
   * 根据专注度获取颜色
   * @param {number} focusLevel - 专注度（0-1）
   * @returns {string} 颜色值（十六进制）
   */
  function getFocusColor(focusLevel) {
    // 颜色定义
    const focusedColor = '#48bb78';    // 绿色 - 专注状态
    const transitionColor = '#84cc16'; // 黄绿色 - 过渡状态
    const switchingColor = '#fbbf24';  // 黄色 - 转移状态
    
    // 确保专注度在 0-1 范围内
    focusLevel = Math.max(0, Math.min(1, focusLevel));
    
    // 根据专注度计算颜色
    if (focusLevel > 0.7) {
      // 专注度 > 0.7 → 绿色（专注状态）
      // 在 0.7-1.0 之间进行插值，从黄绿色到纯绿色
      const progress = (focusLevel - 0.7) / 0.3; // 0-1
      return interpolateColor(transitionColor, focusedColor, progress);
    } else if (focusLevel >= 0.3) {
      // 专注度 0.3-0.7 → 黄绿色（过渡状态）
      // 在黄色和黄绿色之间插值
      const progress = (focusLevel - 0.3) / 0.4; // 0-1
      return interpolateColor(switchingColor, transitionColor, progress);
    } else {
      // 专注度 < 0.3 → 黄色（转移状态）
      return switchingColor;
    }
  }
  
  // 2.1 更新颜色函数（新版本，基于专注度）
  /**
   * 根据专注度更新 Pulse 颜色
   * @param {number} focusLevel - 专注度（0-1）
   */
  function updatePulseColorByFocus(focusLevel) {
    const newColor = getFocusColor(focusLevel);
    
    // 如果颜色相同，无需更新
    if (newColor === targetPulseColor) {
      return;
    }
    
    // 从当前颜色开始过渡到新颜色
    colorTransitionStartColor = currentPulseColor;
    targetPulseColor = newColor;
    colorTransitionStartTime = Date.now();
    
    console.log('[AttentionPulse] 🎨 更新心跳图颜色（基于专注度）:', {
      focusLevel: focusLevel.toFixed(2),
      color: newColor
    });
  }
  
  // ===== 阶段1：核心数据结构 =====
  
  // 1.1 时间窗口管理器
  class TimeWindow {
    constructor(windowSize = 30000) { // 默认30秒
      this.windowSize = windowSize; // 窗口大小（毫秒）
      this.records = []; // 记录数组
    }
    
    /**
     * 添加记录并自动清理过期数据
     * @param {Object} record - 记录对象 { timestamp, tag, url, pageType, stayTime, scrollDepth }
     */
    addRecord(record) {
      const now = Date.now();
      
      // 添加新记录
      this.records.push({
        ...record,
        timestamp: record.timestamp || now
      });
      
      // 清理过期记录（超过窗口大小的记录）
      this.records = this.records.filter(
        record => now - record.timestamp < this.windowSize
      );
    }
    
    /**
     * 计算标签集中度
     * @returns {number} 标签集中度（0-1），1表示完全集中
     */
    getTagConcentration() {
      if (this.records.length === 0) return 0;
      
      // 统计每个标签的出现次数
      const tagCounts = {};
      this.records.forEach(record => {
        const tag = record.tag || 'unknown';
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      
      // 找到出现次数最多的标签
      const maxCount = Math.max(...Object.values(tagCounts));
      
      // 集中度 = 最多标签出现次数 / 总记录数
      return maxCount / this.records.length;
    }
    
    /**
     * 计算标签多样性
     * @returns {number} 标签多样性（0-1），1表示完全多样
     */
    getTagDiversity() {
      if (this.records.length === 0) return 0;
      
      // 获取不同标签的数量
      const uniqueTags = new Set();
      this.records.forEach(record => {
        uniqueTags.add(record.tag || 'unknown');
      });
      
      // 多样性 = 不同标签数量 / 总记录数
      return uniqueTags.size / this.records.length;
    }
    
    /**
     * 计算标签切换频率
     * @returns {number} 切换频率（0-1），1表示频繁切换
     */
    getTagSwitchFrequency() {
      if (this.records.length < 2) return 0;
      
      let switchCount = 0;
      for (let i = 1; i < this.records.length; i++) {
        const prevTag = this.records[i - 1].tag || 'unknown';
        const currTag = this.records[i].tag || 'unknown';
        if (prevTag !== currTag) {
          switchCount++;
        }
      }
      
      // 切换频率 = 切换次数 / (总记录数 - 1)
      return switchCount / (this.records.length - 1);
    }
    
    /**
     * 获取时间窗口内的记录（用于调试）
     * @returns {Array} 记录数组
     */
    getRecords() {
      return this.records.slice(); // 返回副本
    }
    
    /**
     * 清空所有记录
     */
    clear() {
      this.records = [];
    }
  }
  
  // 1.2 专注度计算函数
  /**
   * 计算专注度
   * @param {TimeWindow} timeWindow - 时间窗口对象
   * @param {Object} currentRecord - 当前记录 { stayTime, scrollDepth }
   * @returns {number} 专注度分数（0-1）
   */
  function calculateFocusLevel(timeWindow, currentRecord = {}) {
    if (timeWindow.records.length === 0) return 0;
    
    // 过滤：停留时间 < 1秒的记录不计入（测试用，原为3秒）
    const validRecords = timeWindow.records.filter(
      record => (record.stayTime || 0) >= 1000
    );
    
    if (validRecords.length === 0) return 0;
    
    // 计算标签集中度
    const tagConcentration = timeWindow.getTagConcentration();
    
    // 获取滚动深度（当前记录或平均值）
    const scrollDepth = currentRecord.scrollDepth || 
      validRecords.reduce((sum, r) => sum + (r.scrollDepth || 0), 0) / validRecords.length;
    
    let focusLevel = 0;
    
    // 根据标签集中度计算专注度
    if (tagConcentration > 0.7) {
      // 集中度 > 0.7 → 专注度 = 0.7 + (集中度-0.7)*0.3 + 滚动深度加成
      const baseFocus = 0.7 + (tagConcentration - 0.7) * 0.3;
      const scrollBonus = scrollDepth > 0.5 ? 0.1 : (scrollDepth < 0.2 ? -0.1 : 0);
      focusLevel = Math.min(1, baseFocus + scrollBonus);
    } else if (tagConcentration >= 0.3) {
      // 集中度 0.3-0.7 → 专注度 = 集中度（线性）
      focusLevel = tagConcentration;
    } else {
      // 集中度 < 0.3 → 专注度 = 集中度 * 0.5（惩罚）
      focusLevel = tagConcentration * 0.5;
    }
    
    // 确保在 0-1 范围内
    return Math.max(0, Math.min(1, focusLevel));
  }
  
  // 1.3 发散度计算函数
  /**
   * 计算发散度
   * @param {TimeWindow} timeWindow - 时间窗口对象
   * @returns {number} 发散度分数（0-1）
   */
  function calculateDiversity(timeWindow) {
    if (timeWindow.records.length === 0) return 0;
    
    // 计算标签多样性
    const diversity = timeWindow.getTagDiversity();
    
    // 计算标签切换频率
    const switchFrequency = timeWindow.getTagSwitchFrequency();
    
    // 发散度 = (多样性 * 0.6) + (切换频率 * 0.4)
    const result = (diversity * 0.6) + (switchFrequency * 0.4);
    
    // 确保在 0-1 范围内
    return Math.max(0, Math.min(1, result));
  }
  
  // 1.4 数据记录格式定义
  /**
   * 创建数据记录
   * @param {Object} data - 原始数据
   * @returns {Object} 格式化的数据记录
   */
  function createAttentionRecord(data) {
    return {
      timestamp: data.timestamp || Date.now(),
      sessionId: data.sessionId || 'unknown',
      tag: data.tag || 'unknown',
      url: data.url || window.location.href,
      pageType: data.pageType || 'unknown',
      stayTime: data.stayTime || 0,
      scrollDepth: data.scrollDepth || 0,
      focusLevel: data.focusLevel || 0,
      diversity: data.diversity || 0,
      timeWindowTagCount: data.timeWindowTagCount || 0,
      timeWindowTotalCount: data.timeWindowTotalCount || 0
    };
  }
  
  // 全局时间窗口实例
  let attentionTimeWindow = new TimeWindow(30000); // 30秒窗口
  
  // 页面停留时间跟踪
  let pageEnterTime = Date.now(); // 当前页面进入时间
  
  // 用户行为跟踪（每条记录单独统计）
  let currentPageUserActions = {
    clicks: 0,        // 该页面的点击次数
    scrolls: 0,       // 该页面的滚动次数
    pageSwitches: 0   // 页面切换次数（进入该页面时重置为1）
  };
  
  // ===== Raw Data 收集功能 =====
  
  /**
   * 创建完整数据记录（方案A：增强时间窗口记录）
   * @param {Object} baseRecord - 基础记录 { tag, url, pageType, stayTime, scrollDepth }
   * @returns {Object} 完整数据记录
   */
  function createCompleteRecord(baseRecord) {
    // 获取页面内容
    let pageContent = null;
    if (window.attentionPulseContentExtractor) {
      try {
        pageContent = window.attentionPulseContentExtractor.getCurrentContent();
      } catch (error) {
        console.error('[AttentionPulse] 获取页面内容失败:', error);
      }
    }
    
    // 获取标签判断结果（优先使用 clickedCardContent，包含完整文本）
    const tagInfo = window.clickedCardContent || {};
    
    // 获取完整文本（优先使用 clickedCardContent 的完整文本）
    let fullText = '';
    if (tagInfo.text && tagInfo.isPreview === false) {
      // 详情页完整文本
      fullText = tagInfo.text;
    } else if (pageContent?.visibleContent?.text) {
      // 可见文本
      fullText = pageContent.visibleContent.text;
    } else {
      // 备用：从页面提取
      fullText = document.body?.innerText || '';
    }
    
    // 计算专注度和发散度
    let focusLevel = 0;
    let diversity = 0;
    if (attentionTimeWindow && attentionTimeWindow.records.length > 0) {
      focusLevel = calculateFocusLevel(attentionTimeWindow, {
        scrollDepth: baseRecord.scrollDepth
      });
      diversity = calculateDiversity(attentionTimeWindow);
    }
    
    // 组装完整记录
    const completeRecord = {
      // 基础字段
      timestamp: baseRecord.timestamp || Date.now(),
      tag: baseRecord.tag || 'unknown',
      url: baseRecord.url || window.location.href,
      pageType: baseRecord.pageType || 'unknown',
      stayTime: baseRecord.stayTime || 0,
      scrollDepth: baseRecord.scrollDepth || 0,
      
      // 页面内容（完整文本）
      title: pageContent?.title || document.title || '',
      text: fullText, // 完整文本
      visibleText: pageContent?.visibleContent?.text || '',
      visibleCards: pageContent?.visibleContent?.cards?.length || 0,
      elementCount: pageContent?.visibleContent?.elementCount || 0,
      
      // 标签判断结果
      tagName: tagInfo.tagName || '',
      hashtags: tagInfo.hashtags || [],
      
      // 专注度和发散度
      focusLevel: focusLevel,
      diversity: diversity,
      
      // 用户行为（当前页面的行为统计）
      userActions: {
        clicks: currentPageUserActions.clicks,
        scrolls: currentPageUserActions.scrolls,
        pageSwitches: currentPageUserActions.pageSwitches
      },
      
      // 时间窗口统计（用于上下文）
      timeWindowTagCount: attentionTimeWindow 
        ? attentionTimeWindow.records.filter(r => r.tag === baseRecord.tag).length 
        : 0,
      timeWindowTotalCount: attentionTimeWindow 
        ? attentionTimeWindow.records.length 
        : 0
    };
    
    return completeRecord;
  }
  
  /**
   * 获取当前会话ID
   * @returns {string} 会话ID
   */
  function getCurrentSessionId() {
    // 从 Chrome Storage 获取或生成会话ID
    if (!window.attentionPulseSessionId) {
      window.attentionPulseSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return window.attentionPulseSessionId;
  }
  
  /**
   * 计算统计信息
   * @param {Array} records - 记录数组
   * @returns {Object} 统计信息
   */
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
    
    // 标签统计
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
  
  /**
   * 收集Raw Data
   * @param {number} recordCount - 收集的记录数量（默认50）
   * @returns {Object} 完整数据对象
   */
  function collectRawData(recordCount = 50) {
    // 1. 从时间窗口获取最近N条完整记录
    const completeRecords = attentionTimeWindow?.completeRecords || [];
    const records = completeRecords.slice(-recordCount);
    
    // 2. 添加元数据
    const metadata = {
      exportTime: new Date().toISOString(),
      sessionId: getCurrentSessionId(),
      totalRecords: records.length,
      requestedCount: recordCount,
      timeRange: records.length > 0 ? {
        start: records[0]?.timestamp || null,
        end: records[records.length - 1]?.timestamp || null
      } : null
    };
    
    // 3. 计算统计信息
    const summary = calculateSummary(records);
    
    // 4. 组装完整数据
    return {
      metadata,
      records,
      summary
    };
  }
  
  /**
   * 下载JSON文件
   * @param {string} jsonString - JSON字符串
   * @param {string} filename - 文件名
   */
  function downloadJSONFile(jsonString, filename) {
    try {
      // 创建Blob对象
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      // 触发下载
      document.body.appendChild(a);
      a.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('[AttentionPulse] ✅ JSON文件已下载:', filename);
    } catch (error) {
      console.error('[AttentionPulse] ❌ 下载文件失败:', error);
      // 如果下载失败，输出到控制台
      console.log('[AttentionPulse] JSON数据:', jsonString);
    }
  }
  
  /**
   * 导出Raw Data为JSON文件
   * @param {number} recordCount - 导出的记录数量（默认50）
   * @param {boolean} pretty - 是否格式化JSON（默认true）
   * @returns {Object} 导出的数据对象
   */
  function exportRawDataAsJSON(recordCount = 50, pretty = true) {
    console.log(`[AttentionPulse] 📦 开始导出Raw Data（最近${recordCount}条记录）...`);
    
    // 收集数据
    const data = collectRawData(recordCount);
    
    // 格式化JSON
    const jsonString = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `attentionPulse_raw_data_${timestamp}.json`;
    
    // 下载文件
    downloadJSONFile(jsonString, filename);
    
    console.log('[AttentionPulse] 📊 导出数据统计:', {
      记录数: data.records.length,
      标签数: data.summary.uniqueTags.length,
      平均专注度: data.summary.avgFocusLevel.toFixed(2),
      平均发散度: data.summary.avgDiversity.toFixed(2)
    });
    
    return data;
  }
  
  // 暴露到全局，方便在控制台调用
  window.exportAttentionPulseData = exportRawDataAsJSON;
  window.collectAttentionPulseData = collectRawData;
  
  // ===== 阶段1测试函数 =====
  // 在浏览器控制台中调用 window.testStage1() 来测试阶段1的功能
  window.testStage1 = function() {
    console.log('%c[阶段1测试] ===== 开始测试 =====', 'color: #667eea; font-weight: bold; font-size: 14px;');
    
    // 创建测试用的时间窗口
    const testWindow = new TimeWindow(30000);
    
    // 测试场景1：专注状态（同一标签，停留时间长）
    console.log('\n%c[测试场景1] 专注状态（同一标签，停留时间长）', 'color: #48bb78; font-weight: bold;');
    testWindow.clear();
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      testWindow.addRecord({
        timestamp: now - (10 - i) * 2000, // 每2秒一条记录
        tag: 'tech',
        url: 'https://test.com/tech',
        pageType: 'detail',
        stayTime: 5000, // 停留5秒
        scrollDepth: 0.6
      });
    }
    const concentration1 = testWindow.getTagConcentration();
    const diversity1 = testWindow.getTagDiversity();
    const focusLevel1 = calculateFocusLevel(testWindow, { scrollDepth: 0.6 });
    const diversityScore1 = calculateDiversity(testWindow);
    
    console.log('标签集中度:', concentration1.toFixed(2), '(期望: > 0.7)');
    console.log('标签多样性:', diversity1.toFixed(2), '(期望: < 0.3)');
    console.log('专注度:', focusLevel1.toFixed(2), '(期望: > 0.7)');
    console.log('发散度:', diversityScore1.toFixed(2), '(期望: < 0.3)');
    console.log('✓ 专注状态测试完成');
    
    // 测试场景2：转移状态（不同标签，频繁切换）
    console.log('\n%c[测试场景2] 转移状态（不同标签，频繁切换）', 'color: #fbbf24; font-weight: bold;');
    testWindow.clear();
    const tags2 = ['tech', 'learning', 'entertainment', 'tech', 'learning'];
    for (let i = 0; i < 5; i++) {
      testWindow.addRecord({
        timestamp: now - (5 - i) * 3000,
        tag: tags2[i],
        url: `https://test.com/${tags2[i]}`,
        pageType: 'detail',
        stayTime: 2000, // 停留2秒（小于3秒，应该被过滤）
        scrollDepth: 0.3
      });
    }
    const concentration2 = testWindow.getTagConcentration();
    const diversity2 = testWindow.getTagDiversity();
    const focusLevel2 = calculateFocusLevel(testWindow, { scrollDepth: 0.3 });
    const diversityScore2 = calculateDiversity(testWindow);
    
    console.log('标签集中度:', concentration2.toFixed(2), '(期望: < 0.5)');
    console.log('标签多样性:', diversity2.toFixed(2), '(期望: > 0.5)');
    console.log('专注度:', focusLevel2.toFixed(2), '(期望: < 0.5，因为停留时间<3秒被过滤)');
    console.log('发散度:', diversityScore2.toFixed(2), '(期望: > 0.5)');
    console.log('✓ 转移状态测试完成');
    
    // 测试场景3：过渡状态（部分集中）
    console.log('\n%c[测试场景3] 过渡状态（部分集中）', 'color: #84cc16; font-weight: bold;');
    testWindow.clear();
    const tags3 = ['tech', 'tech', 'tech', 'learning', 'tech', 'tech'];
    for (let i = 0; i < 6; i++) {
      testWindow.addRecord({
        timestamp: now - (6 - i) * 2500,
        tag: tags3[i],
        url: `https://test.com/${tags3[i]}`,
        pageType: 'detail',
        stayTime: 4000, // 停留4秒
        scrollDepth: 0.5
      });
    }
    const concentration3 = testWindow.getTagConcentration();
    const diversity3 = testWindow.getTagDiversity();
    const focusLevel3 = calculateFocusLevel(testWindow, { scrollDepth: 0.5 });
    const diversityScore3 = calculateDiversity(testWindow);
    
    console.log('标签集中度:', concentration3.toFixed(2), '(期望: 0.3-0.7)');
    console.log('标签多样性:', diversity3.toFixed(2));
    console.log('专注度:', focusLevel3.toFixed(2), '(期望: 0.3-0.7)');
    console.log('发散度:', diversityScore3.toFixed(2));
    console.log('✓ 过渡状态测试完成');
    
    // 测试场景4：数据记录格式
    console.log('\n%c[测试场景4] 数据记录格式', 'color: #667eea; font-weight: bold;');
    const testRecord = createAttentionRecord({
      tag: 'tech',
      url: 'https://test.com',
      pageType: 'detail',
      stayTime: 5000,
      scrollDepth: 0.6,
      focusLevel: 0.8,
      diversity: 0.2
    });
    console.log('数据记录:', testRecord);
    console.log('✓ 数据记录格式测试完成');
    
    // 测试场景5：时间窗口自动清理
    console.log('\n%c[测试场景5] 时间窗口自动清理', 'color: #9f7aea; font-weight: bold;');
    testWindow.clear();
    // 添加一些旧记录（超过30秒）
    testWindow.addRecord({
      timestamp: now - 35000, // 35秒前
      tag: 'tech',
      stayTime: 5000,
      scrollDepth: 0.5
    });
    // 添加一些新记录
    for (let i = 0; i < 3; i++) {
      testWindow.addRecord({
        timestamp: now - (3 - i) * 5000, // 5秒、10秒、15秒前
        tag: 'tech',
        stayTime: 5000,
        scrollDepth: 0.5
      });
    }
    console.log('添加记录后，窗口内记录数:', testWindow.getRecords().length);
    console.log('期望: 只有3条新记录（旧记录应被自动清理）');
    console.log('✓ 时间窗口清理测试完成');
    
    console.log('\n%c[阶段1测试] ===== 测试完成 =====', 'color: #667eea; font-weight: bold; font-size: 14px;');
    console.log('提示: 可以在控制台中使用以下命令测试全局时间窗口:');
    console.log('  - attentionTimeWindow.addRecord({ tag: "tech", stayTime: 5000, scrollDepth: 0.6 })');
    console.log('  - attentionTimeWindow.getTagConcentration()');
    console.log('  - calculateFocusLevel(attentionTimeWindow, { scrollDepth: 0.6 })');
    console.log('  - calculateDiversity(attentionTimeWindow)');
  };
  
  // 从 storage 加载设置
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['attentionPulseSettings']);
      if (result.attentionPulseSettings) {
        settings = result.attentionPulseSettings;
        console.log('[AttentionPulse] 设置已加载:', settings);
      }
      
      // 根据设置决定是否初始化
      if (settings.enabled) {
        initAttentionPulse();
      }
    } catch (error) {
      console.error('[AttentionPulse] 加载设置失败:', error);
      // 默认启用
      initAttentionPulse();
    }
  }
  
  // 初始化 AttentionPulse
  function initAttentionPulse() {
    console.log('[AttentionPulse] 开始初始化...');
    
    // 初始化会话ID
    getCurrentSessionId();
    console.log('[AttentionPulse] 会话ID:', window.attentionPulseSessionId);
    
    // 初始化用户行为统计
    currentPageUserActions = {
      clicks: 0,
      scrolls: 0,
      pageSwitches: 1 // 初始化为1，表示进入页面
    };
    
    // A-2: 提取初始内容
    if (window.attentionPulseContentExtractor) {
      try {
        const initialContent = window.attentionPulseContentExtractor.extract();
        console.log('[AttentionPulse] 初始内容已提取:', {
          pageType: initialContent.pageType,
          url: initialContent.url,
          visibleCards: initialContent.visibleContent.cards.length,
          visibleText: initialContent.visibleContent.text.substring(0, 200) + '...',
          scrollPercentage: initialContent.scrollInfo.scrollPercentage,
          elementCount: initialContent.visibleContent.elementCount
        });
      } catch (error) {
        console.error('[AttentionPulse] 内容提取失败:', error);
      }
    } else {
      console.warn('[AttentionPulse] ContentExtractor 不可用，跳过内容提取');
    }
    
    // A-3: 开始监听浏览状态（滚动、内容变化）
    startContentMonitoring();
    
    // A-4: 开始监听用户交互（点击事件、URL 变化）
    startInteractionMonitoring();
    
    // TODO: A-5 实现 AttentionPulse 可视化叠加
    // 这里先输出日志，验证注入成功
    if (settings.debug) {
      showDebugInfo();
    }
    
    console.log('[AttentionPulse] ===== 初始化完成 =====');
  }
  
  // A-4: 用户交互监控（点击事件 + URL 变化）
  function startInteractionMonitoring() {
    console.log('[AttentionPulse] 启动交互监控（点击事件 + URL 变化）...');
    
    let lastUrl = window.location.href;
    let clickedCardContent = null;
    
    // 初始化页面进入时间
    pageEnterTime = Date.now();
    
    // 1. 监听点击事件（捕获阶段，确保能捕获到）
    document.addEventListener('click', (e) => {
      // 尝试找到被点击的帖子卡片
      const card = findClickedCard(e.target);
      
      if (card) {
        console.log('[AttentionPulse] 检测到帖子点击');
        
        // 增加点击计数
        currentPageUserActions.clicks++;
        
        // 提取点击的卡片内容
        if (window.attentionPulseContentExtractor) {
          clickedCardContent = window.attentionPulseContentExtractor.extractCardContent(card);
          
          if (clickedCardContent) {
            console.log('[AttentionPulse] 已提取点击的帖子内容:', {
              title: clickedCardContent.title,
              text: clickedCardContent.text.substring(0, 100) + '...',
              imageCount: clickedCardContent.imageCount,
              link: clickedCardContent.link
            });
            
            // TODO: A-4 在这里进行标签判断
            // const tag = tagContent(clickedCardContent);
            // console.log('[AttentionPulse] 标签判断结果:', tag);
          }
        }
      }
    }, true); // 使用捕获阶段
    
    // 2. 监听 URL 变化（SPA 路由变化）
    // 方法1: 监听 popstate 事件（浏览器前进/后退）
    window.addEventListener('popstate', () => {
      handleUrlChange();
    });
    
    // 方法2: 使用 MutationObserver 监听 location 变化
    let urlCheckInterval = null;
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        handleUrlChange();
      }
    };
    
    // 定期检查 URL 变化（SPA 可能不会触发 popstate）
    urlCheckInterval = setInterval(checkUrlChange, 500);
    
    // 方法3: 重写 pushState 和 replaceState（更可靠）
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(handleUrlChange, 100);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(handleUrlChange, 100);
    };
    
    // URL 变化处理函数
    function handleUrlChange() {
      const currentUrl = window.location.href;
      const pathname = window.location.pathname;
      
      // 如果URL变化，更新页面进入时间并重置用户行为统计
      if (currentUrl !== lastUrl) {
        pageEnterTime = Date.now();
        lastUrl = currentUrl;
        // 重置用户行为统计（新页面）
        currentPageUserActions = {
          clicks: 0,
          scrolls: 0,
          pageSwitches: 1 // 进入新页面，切换次数为1
        };
        console.log('[AttentionPulse] 🔄 URL已变化，重置页面进入时间和用户行为统计');
      }
      const pageType = window.attentionPulseContentExtractor 
        ? window.attentionPulseContentExtractor.detectPageType() 
        : 'unknown';
      
      // 更详细的 URL 分析
      const isDetailPage = pathname.includes('/explore/') && pathname.length > 20 
        || pathname.includes('/discovery/item/')
        || currentUrl.includes('/explore/') && !currentUrl.includes('channel_id');
      
      console.log('[AttentionPulse] URL 已变化:', {
        url: currentUrl,
        pathname: pathname,
        pageType: pageType,
        isDetailPage: isDetailPage,
        urlIncludesExplore: currentUrl.includes('/explore/'),
        pathnameLength: pathname.length
      });
      
      // 如果是详情页，提取详情页完整内容
      if (pageType === 'detail' || isDetailPage) {
        console.log('[AttentionPulse] 检测到详情页，准备提取完整内容...');
        
        // 使用多次尝试，确保内容已加载
        let attemptCount = 0;
        const maxAttempts = 5;
        
        const tryExtractDetail = () => {
          attemptCount++;
          console.log(`[AttentionPulse] 尝试提取详情页内容 (${attemptCount}/${maxAttempts})...`);
          
          if (window.attentionPulseContentExtractor) {
            const content = window.attentionPulseContentExtractor.extract();
            
            // 提取详情页的完整文本内容
            const fullText = extractDetailPageContent();
            
            console.log('[AttentionPulse] 详情页内容提取结果:', {
              attempt: attemptCount,
              title: content.title,
              fullTextLength: fullText.length,
              fullTextPreview: fullText.substring(0, 300) + (fullText.length > 300 ? '...' : ''),
              visibleTextLength: content.visibleContent.text.length,
              visibleTextPreview: content.visibleContent.text.substring(0, 200) + '...',
              bodyTextLength: document.body ? document.body.innerText.length : 0
            });
            
            // 如果提取到了足够的内容，或者已经尝试了足够次数
            if (fullText.length > 500 || attemptCount >= maxAttempts) {
              // 更新点击的卡片内容为完整内容
              if (clickedCardContent) {
                clickedCardContent.text = fullText.length > 0 ? fullText : content.visibleContent.text;
                clickedCardContent.isPreview = false;
                console.log('[AttentionPulse] ✅ 已更新为完整内容，长度:', clickedCardContent.text.length);
              }
              
              // A-4: 进行标签判断（使用完整内容）
              if (window.attentionPulseContentTagger && fullText.length > 0) {
                try {
                  const tag = window.attentionPulseContentTagger.tag(fullText);
                  const tagName = window.attentionPulseContentTagger.getTagName(tag);
                  
                  // 提取 # 标签用于调试
                  const hashtags = window.attentionPulseContentTagger.extractHashtags(fullText);
                  
                  console.log('[AttentionPulse] 🏷️ 标签判断结果:', {
                    tag: tag,
                    tagName: tagName,
                    hashtags: hashtags,
                    contentLength: fullText.length
                  });
                  
                  // 保存标签到 clickedCardContent
                  if (clickedCardContent) {
                    clickedCardContent.tag = tag;
                    clickedCardContent.tagName = tagName;
                    clickedCardContent.hashtags = hashtags;
                  }
                  
                  // 保存到全局变量，供调试信息使用
                  window.clickedCardContent = clickedCardContent;
                  
                  // 方案A：添加完整数据到时间窗口
                  if (attentionTimeWindow) {
                    // 计算停留时间（从进入页面到现在）
                    const stayTime = Date.now() - pageEnterTime;
                    
                    // 获取滚动深度
                    const scrollDepth = window.attentionPulseContentExtractor
                      ? (window.attentionPulseContentExtractor.getCurrentContent()?.scrollInfo?.scrollPercentage || 0) / 100
                      : 0;
                    
                    // 获取页面类型
                    const pageType = window.attentionPulseContentExtractor
                      ? window.attentionPulseContentExtractor.detectPageType()
                      : 'unknown';
                    
                    // 创建基础记录
                    const baseRecord = {
                      timestamp: Date.now(),
                      tag: tag,
                      url: window.location.href,
                      pageType: pageType,
                      stayTime: stayTime,
                      scrollDepth: scrollDepth
                    };
                    
                    // 创建完整记录（包含所有数据）
                    const completeRecord = createCompleteRecord(baseRecord);
                    
                    // 添加到时间窗口（只保存基础字段用于计算，完整数据在导出时再组装）
                    attentionTimeWindow.addRecord(baseRecord);
                    
                    // 保存完整记录到扩展字段（用于导出）
                    if (!attentionTimeWindow.completeRecords) {
                      attentionTimeWindow.completeRecords = [];
                    }
                    attentionTimeWindow.completeRecords.push(completeRecord);
                    
                    // 保持完整记录数量与时间窗口同步（只保留最近N条）
                    const maxRecords = 1000; // 最多保留1000条完整记录
                    if (attentionTimeWindow.completeRecords.length > maxRecords) {
                      attentionTimeWindow.completeRecords.shift(); // 移除最旧的记录
                    }
                    
                    console.log('[AttentionPulse] 📊 已添加完整记录到时间窗口:', {
                      tag: tag,
                      stayTime: stayTime,
                      scrollDepth: scrollDepth.toFixed(2),
                      focusLevel: completeRecord.focusLevel.toFixed(2),
                      diversity: completeRecord.diversity.toFixed(2),
                      windowRecords: attentionTimeWindow.records.length
                    });
                  }
                  
                  // 注意：颜色现在基于专注度实时计算，不再基于标签
                  // Pulse 颜色会在 drawPulseWave 中根据时间窗口状态自动更新
                  
                  // 更新调试信息（如果已启用）
                  if (settings.debug) {
                    const currentContent = window.attentionPulseContentExtractor 
                      ? window.attentionPulseContentExtractor.getCurrentContent() 
                      : null;
                    updateDebugInfo(currentContent);
                  }
                } catch (error) {
                  console.error('[AttentionPulse] 标签判断失败:', error);
                }
              } else {
                console.warn('[AttentionPulse] ContentTagger 不可用或内容为空，跳过标签判断');
              }
            } else {
              // 内容还不够，继续等待
              setTimeout(tryExtractDetail, 500);
            }
          }
        };
        
        // 开始提取（延迟启动，给页面时间加载）
        setTimeout(tryExtractDetail, 1000);
      } else if (pageType === 'feed') {
        // 返回信息流页面，清除之前的标签
        clickedCardContent = null;
        window.clickedCardContent = null;
        console.log('[AttentionPulse] 返回信息流页面，清除之前的标签');
        
        // 注意：颜色现在基于专注度实时计算，会在 drawPulseWave 中自动更新
        // 返回信息流页面时，时间窗口会逐渐清空，专注度会自然降低
        
        // 更新调试信息（清除标签显示）
        if (settings.debug) {
          const currentContent = window.attentionPulseContentExtractor 
            ? window.attentionPulseContentExtractor.getCurrentContent() 
            : null;
          updateDebugInfo(currentContent);
        }
      }
    }
    
    console.log('[AttentionPulse] 交互监控已启动');
  }
  
  // 查找被点击的帖子卡片
  function findClickedCard(target) {
    // 小红书可能的卡片选择器
    const cardSelectors = [
      '[class*="note-item"]',
      '[class*="feed-item"]',
      '[class*="card-item"]',
      'article',
      '[role="article"]'
    ];
    
    // 向上查找，找到卡片容器
    let element = target;
    let maxDepth = 10; // 最多向上查找 10 层
    let depth = 0;
    
    while (element && element !== document.body && depth < maxDepth) {
      // 检查当前元素是否匹配卡片选择器
      for (const selector of cardSelectors) {
        try {
          if (element.matches && element.matches(selector)) {
            // 确保元素足够大（是真正的卡片，不是小图标）
            const rect = element.getBoundingClientRect();
            if (rect.height > 100 && rect.width > 100) {
              return element;
            }
          }
        } catch (e) {
          // 忽略选择器错误
        }
      }
      
      // 检查父元素
      element = element.parentElement;
      depth++;
    }
    
    return null;
  }
  
  // 提取详情页的完整内容
  function extractDetailPageContent() {
    try {
      console.log('[AttentionPulse] 开始提取详情页内容...');
      
      // 方法1: 尝试找到详情页的主要内容区域（小红书特定的选择器）
      const mainContentSelectors = [
        '[class*="note-detail"]',
        '[class*="detail-content"]',
        '[class*="article-content"]',
        '[class*="note-content"]',
        '[class*="content-wrapper"]',
        'article',
        '[role="article"]',
        'main',
        '[class*="main-content"]'
      ];
      
      let mainContent = null;
      let usedSelector = null;
      
      for (const selector of mainContentSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element && element.offsetHeight > 200) {
            mainContent = element;
            usedSelector = selector;
            console.log('[AttentionPulse] 找到主要内容区域，选择器:', selector, '高度:', element.offsetHeight);
            break;
          }
        } catch (e) {
          // 忽略选择器错误
        }
      }
      
      // 方法2: 如果没找到，尝试从 body 中提取，但排除导航、侧边栏等
      if (!mainContent) {
        console.log('[AttentionPulse] 未找到特定内容区域，从 body 提取...');
        // 移除不需要的元素
        const clone = document.body.cloneNode(true);
        const toRemove = clone.querySelectorAll(
          'nav, header, footer, [class*="nav"], [class*="header"], [class*="footer"], ' +
          '[class*="sidebar"], [class*="comment"], [class*="toolbar"], [class*="bottom"]'
        );
        toRemove.forEach(el => el.remove());
        mainContent = clone;
        usedSelector = 'body (filtered)';
      }
      
      // 提取文本内容
      let fullText = '';
      if (mainContent) {
        fullText = (mainContent.innerText || mainContent.textContent || '').trim();
        console.log('[AttentionPulse] 提取结果:', {
          selector: usedSelector,
          textLength: fullText.length,
          preview: fullText.substring(0, 200) + '...'
        });
      } else {
        console.warn('[AttentionPulse] 无法找到内容区域');
      }
      
      return fullText;
    } catch (error) {
      console.error('[AttentionPulse] 提取详情页内容失败:', error);
      return '';
    }
  }
  
  // A-2 & A-3: 内容监控
  function startContentMonitoring() {
    console.log('[AttentionPulse] 启动内容监控...');
    
    let scrollTimeout = null;
    let mutationTimeout = null;
    let lastContentHash = null;
    let lastMutationHash = null;
    
    // 监听滚动事件（节流）
    window.addEventListener('scroll', () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        // 增加滚动计数
        currentPageUserActions.scrolls++;
        
        if (!window.attentionPulseContentExtractor) {
          return; // ContentExtractor 不可用时跳过
        }
        
        try {
          const content = window.attentionPulseContentExtractor.extract();
          const contentHash = JSON.stringify({
            url: content.url,
            scrollPercentage: content.scrollInfo.scrollPercentage,
            visibleCards: content.visibleContent.cards.length
          });
          
          // 如果内容发生变化，输出日志
          if (contentHash !== lastContentHash) {
            lastContentHash = contentHash;
            console.log('[AttentionPulse] 内容已更新:', {
              scrollPercentage: content.scrollInfo.scrollPercentage,
              visibleCards: content.visibleContent.cards.length,
              pageType: content.pageType
            });
            
            // 更新调试信息
            if (settings.debug) {
              updateDebugInfo(content);
            }
          }
        } catch (error) {
          console.error('[AttentionPulse] 内容提取出错:', error);
        }
      }, 300); // 滚动节流：300ms
    }, { passive: true });
    
    // 监听 DOM 变化（新内容加载，如信息流滚动加载）
    const observer = new MutationObserver((mutations) => {
      // 检查是否有新内容添加
      const hasNewContent = mutations.some(mutation => 
        mutation.addedNodes.length > 0 &&
        Array.from(mutation.addedNodes).some(node => 
          node.nodeType === Node.ELEMENT_NODE && 
          node.offsetHeight > 0 // 只关注可见的元素
        )
      );
      
      if (hasNewContent) {
        // 清除之前的定时器，避免重复触发
        if (mutationTimeout) {
          clearTimeout(mutationTimeout);
        }
        
        // 延迟提取，等待 DOM 更新完成（节流）
        mutationTimeout = setTimeout(() => {
          if (!window.attentionPulseContentExtractor) {
            return; // ContentExtractor 不可用时跳过
          }
          
          try {
            const content = window.attentionPulseContentExtractor.extract();
            const mutationHash = JSON.stringify({
              visibleCards: content.visibleContent.cards.length,
              elementCount: content.visibleContent.elementCount,
              scrollPercentage: content.scrollInfo.scrollPercentage
            });
            
            // 只有当内容真正变化时才输出日志（去重）
            if (mutationHash !== lastMutationHash) {
              lastMutationHash = mutationHash;
              console.log('[AttentionPulse] 检测到新内容加载:', {
                visibleCards: content.visibleContent.cards.length,
                elementCount: content.visibleContent.elementCount,
                scrollPercentage: content.scrollInfo.scrollPercentage
              });
              
              if (settings.debug) {
                updateDebugInfo(content);
              }
            }
          } catch (error) {
            console.error('[AttentionPulse] 内容提取出错:', error);
          }
        }, 800); // DOM 变化节流：800ms，避免频繁触发
      }
    });
    
    // 开始观察 DOM 变化（只观察主要区域，减少触发频率）
    const observeTarget = document.body;
    observer.observe(observeTarget, {
      childList: true,
      subtree: true,
      // 不观察属性变化，减少触发频率
      attributes: false,
      characterData: false
    });
    
    console.log('[AttentionPulse] 内容监控已启动');
  }
  
  // 显示调试信息（A-2: 展示提取到的内容）
  function showDebugInfo() {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'attentionPulse-debug';
    debugDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 11px;
      line-height: 1.4;
      z-index: 999999;
      pointer-events: none;
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    // 创建心跳图 Canvas
    const pulseCanvas = document.createElement('canvas');
    pulseCanvas.id = 'attentionPulse-wave';
    pulseCanvas.width = 276; // 300px - 24px padding
    pulseCanvas.height = 50;
    pulseCanvas.style.cssText = `
      width: 100%;
      height: 50px;
      margin-bottom: 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
    `;
    debugDiv.appendChild(pulseCanvas);
    
    // 获取当前内容
    let content = null;
    if (window.attentionPulseContentExtractor) {
      try {
        content = window.attentionPulseContentExtractor.getCurrentContent();
      } catch (error) {
        console.error('[AttentionPulse] 获取内容失败:', error);
      }
    }
    
    updateDebugInfo(content, debugDiv);
    document.body.appendChild(debugDiv);
    
    // 启动心跳图动画
    startPulseAnimation(pulseCanvas);
  }
  
  // A-5: 心跳图动画
  let pulseAnimationId = null;
  let pulseStartTime = null;
  
  // 2.2 注意力状态变量（用于实时更新）
  let currentFocusLevel = 0;  // 当前专注度（0-1）
  let currentDiversity = 0;   // 当前发散度（0-1）
  
  function startPulseAnimation(canvas) {
    if (!canvas) return;
    
    // 停止之前的动画（如果存在）
    if (pulseAnimationId) {
      cancelAnimationFrame(pulseAnimationId);
    }
    
    pulseStartTime = Date.now();
    const ctx = canvas.getContext('2d');
    
    // 动画参数
    const cycleDuration = 2500; // 2.5秒一个周期
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const centerY = canvasHeight / 2;
    const lineWidth = 2;
    
    // 绘制函数
    function drawPulseWave() {
      const currentTime = Date.now();
      const elapsed = currentTime - pulseStartTime;
      const progress = (elapsed % cycleDuration) / cycleDuration; // 0 到 1
      
      // 2.3 实时读取专注度和发散度
      // 从时间窗口计算当前状态
      if (attentionTimeWindow && attentionTimeWindow.records.length > 0) {
        // 计算当前专注度和发散度
        const focusLevel = calculateFocusLevel(attentionTimeWindow, {
          scrollDepth: window.attentionPulseContentExtractor 
            ? (window.attentionPulseContentExtractor.getCurrentContent()?.scrollInfo?.scrollPercentage || 0) / 100
            : 0
        });
        const diversity = calculateDiversity(attentionTimeWindow);
        
        // 更新全局状态
        currentFocusLevel = focusLevel;
        currentDiversity = diversity;
        
        // 根据专注度更新颜色
        const targetFocusColor = getFocusColor(focusLevel);
        if (targetFocusColor !== targetPulseColor) {
          colorTransitionStartColor = currentPulseColor;
          targetPulseColor = targetFocusColor;
          colorTransitionStartTime = Date.now();
        }
      }
      
      // 处理颜色过渡
      if (colorTransitionStartTime && currentPulseColor !== targetPulseColor) {
        const transitionElapsed = Date.now() - colorTransitionStartTime;
        const transitionProgress = Math.min(transitionElapsed / colorTransitionDuration, 1);
        
        // 使用缓动函数
        const easedProgress = easeInOutCubic(transitionProgress);
        // 从起始颜色过渡到目标颜色
        currentPulseColor = interpolateColor(colorTransitionStartColor, targetPulseColor, easedProgress);
        
        // 过渡完成
        if (transitionProgress >= 1) {
          currentPulseColor = targetPulseColor;
          colorTransitionStartTime = null;
        }
      }
      
      // 清除画布
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // 设置绘制样式（使用动态颜色）
      ctx.strokeStyle = currentPulseColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 方案3：绘制基线（保留，用于视觉参考）
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvasWidth, centerY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 2.2 根据发散度计算振幅（方案2：扩大振幅范围）
      // 发散度越高 → 振幅越大（范围：3-30，更明显的变化）
      const baseAmplitude = 3;  // 基础振幅（收敛状态）
      const amplitudeRange = 27; // 振幅范围
      const amplitude = baseAmplitude + (currentDiversity * amplitudeRange);
      
      // 方案3：绘制波形填充区域（带宽样式）
      // 绘制波形（从左到右滚动）- 正弦波
      const points = [];
      const pointCount = 200; // 点的数量，影响平滑度
      const frequency = 2; // 正弦波频率（控制波形密度）
      
      for (let i = 0; i <= pointCount; i++) {
        const x = (i / pointCount) * canvasWidth;
        
        // 计算波形位置（考虑滚动效果）
        const waveX = (x / canvasWidth + progress) % 1; // 0 到 1，循环
        
        // 生成纯正弦波
        const phase = waveX * Math.PI * 2 * frequency; // 相位
        const y = centerY + Math.sin(phase) * amplitude;
        
        points.push({ x, y });
      }
      
      // 创建填充路径（波形 + 基线，形成封闭区域）
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      // 绘制波形路径（使用平滑曲线）
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        // 使用二次贝塞尔曲线实现平滑连接
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prev.y;
        
        ctx.quadraticCurveTo(cp1x, cp1y, curr.x, curr.y);
      }
      
      // 闭合路径：从波形末尾连接到基线右端，再回到基线左端
      ctx.lineTo(canvasWidth, centerY); // 到基线右端
      ctx.lineTo(0, centerY); // 回到基线左端
      ctx.closePath(); // 闭合路径
      
      // 填充区域（使用专注度颜色，整个区域统一颜色）
      ctx.fillStyle = currentPulseColor;
      ctx.fill();
      
      // 可选：绘制波形线条（使用相同颜色，增强视觉效果）
      ctx.strokeStyle = currentPulseColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 重新绘制波形线条
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prev.y;
        ctx.quadraticCurveTo(cp1x, cp1y, curr.x, curr.y);
      }
      ctx.stroke();
      
      // 继续动画
      pulseAnimationId = requestAnimationFrame(drawPulseWave);
    }
    
    // 开始动画
    drawPulseWave();
  }
  
  function stopPulseAnimation() {
    if (pulseAnimationId) {
      cancelAnimationFrame(pulseAnimationId);
      pulseAnimationId = null;
    }
  }
  
  // 更新调试信息
  function updateDebugInfo(content, debugDiv = null) {
    if (!debugDiv) {
      debugDiv = document.getElementById('attentionPulse-debug');
    }
    if (!debugDiv) return;
    
    // 如果没有传入 content，尝试从 ContentExtractor 获取
    if (!content && window.attentionPulseContentExtractor) {
      try {
        content = window.attentionPulseContentExtractor.getCurrentContent();
      } catch (error) {
        console.error('[AttentionPulse] 获取内容失败:', error);
      }
    }
    
    if (!content) {
      debugDiv.innerHTML = '<div style="color: #f00;">内容提取失败</div>';
      return;
    }
    
    const scrollInfo = content.scrollInfo || {};
    const visibleContent = content.visibleContent || {};
    
    // 获取当前标签信息（优先从 clickedCardContent 获取）
    let currentTag = null;
    let currentTagName = '未知';
    let currentHashtags = [];
    
    if (window.clickedCardContent && window.clickedCardContent.tag) {
      // 从点击的卡片内容获取标签
      currentTag = window.clickedCardContent.tag;
      currentTagName = window.clickedCardContent.tagName || '未知';
      currentHashtags = window.clickedCardContent.hashtags || [];
    } else if (window.attentionPulseContentTagger && content.visibleContent && content.visibleContent.text) {
      // 如果没有点击的卡片，尝试对当前可见内容进行标签判断
      try {
        const text = content.visibleContent.text;
        if (text.length > 50) { // 只有内容足够长时才判断
          currentTag = window.attentionPulseContentTagger.tag(text);
          currentTagName = window.attentionPulseContentTagger.getTagName(currentTag);
          currentHashtags = window.attentionPulseContentTagger.extractHashtags(text);
        }
      } catch (error) {
        // 忽略标签判断错误
      }
    }
    
    // 标签颜色映射
    const tagColors = {
      'tech': '#667eea',        // 科技 - 紫色
      'learning': '#48bb78',    // 学习 - 绿色
      'entertainment': '#ed8936', // 娱乐 - 橙色
      'sports': '#4299e1',      // 运动 - 蓝色
      'life': '#9f7aea',        // 生活 - 紫色
      'unknown': '#a0aec0'      // 未知 - 灰色
    };
    
    const tagColor = tagColors[currentTag] || tagColors['unknown'];
    
    // 显示 # 标签（最多显示前 3 个）
    const hashtagsDisplay = currentHashtags.length > 0 
      ? currentHashtags.slice(0, 3).map(tag => `#${tag}`).join(' ') + (currentHashtags.length > 3 ? '...' : '')
      : '无';
    
    // 保存或创建心跳图 Canvas（避免被 innerHTML 删除）
    let pulseCanvas = debugDiv.querySelector('#attentionPulse-wave');
    const shouldStartAnimation = !pulseCanvas;
    
    if (!pulseCanvas) {
      pulseCanvas = document.createElement('canvas');
      pulseCanvas.id = 'attentionPulse-wave';
      pulseCanvas.width = 276;
      pulseCanvas.height = 50;
      pulseCanvas.style.cssText = `
        width: 100%;
        height: 50px;
        margin-bottom: 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);
      `;
    }
    
    // 创建内容 HTML（不包含 canvas，canvas 单独处理）
    const contentHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #0ff;">AttentionPulse</div>
      <div style="margin-bottom: 6px;">
        <div style="color: #aaa;">页面类型:</div>
        <div>${content.pageType || 'unknown'}</div>
      </div>
      <div style="margin-bottom: 6px;">
        <div style="color: #aaa;">滚动位置:</div>
        <div>${scrollInfo.scrollPercentage || 0}%</div>
      </div>
      <div style="margin-bottom: 6px;">
        <div style="color: #aaa;">可见卡片:</div>
        <div>${visibleContent.cards ? visibleContent.cards.length : 0} 个</div>
      </div>
      <div style="margin-bottom: 6px;">
        <div style="color: #aaa;">可见元素:</div>
        <div>${visibleContent.elementCount || 0} 个</div>
      </div>
      <div style="margin-bottom: 6px;">
        <div style="color: #aaa;">文本密度:</div>
        <div>${content.structure ? Math.round(content.structure.textDensity) : 0}</div>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333;">
        <div style="margin-bottom: 6px;">
          <div style="color: #aaa;">内容标签:</div>
          <div style="color: ${tagColor}; font-weight: bold; font-size: 12px;">${currentTagName}</div>
        </div>
        <div style="margin-bottom: 6px;">
          <div style="color: #aaa;"># 标签:</div>
          <div style="color: #888; font-size: 10px;">${hashtagsDisplay}</div>
        </div>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333; font-size: 10px; color: #666;">
        URL: ${content.url ? content.url.substring(0, 40) : 'N/A'}...
      </div>
    `;
    
    // 更新内容（先保存 canvas，设置 innerHTML 后再重新插入）
    debugDiv.innerHTML = contentHTML;
    
    // 插入 canvas 到标题后面
    const titleDiv = debugDiv.querySelector('div:first-child');
    if (titleDiv) {
      titleDiv.insertAdjacentElement('afterend', pulseCanvas);
    }
    
    // 启动动画（如果需要）
    if (shouldStartAnimation) {
      startPulseAnimation(pulseCanvas);
    }
  }
  
  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SETTINGS_UPDATED') {
      settings = message.settings;
      console.log('[AttentionPulse] 收到设置更新:', settings);
      
      if (settings.enabled) {
        initAttentionPulse();
      } else {
        // TODO: 移除 AttentionPulse
        console.log('[AttentionPulse] 已禁用');
      }
      
      if (settings.debug) {
        showDebugInfo();
      } else {
        const debugDiv = document.getElementById('attentionPulse-debug');
        if (debugDiv) {
          debugDiv.remove();
        }
      }
    }
    
    sendResponse({ success: true });
  });
  
  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSettings);
  } else {
    loadSettings();
  }
  
})();

