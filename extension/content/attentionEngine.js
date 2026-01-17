/**
 * attentionEngine.js
 * 负责核心逻辑、算法计算、滑动窗口管理和状态聚合
 */

// 1. 时间窗口管理器
class TimeWindow {
  constructor(windowSize = 30000) { // 默认30秒
    this.windowSize = windowSize; // 窗口大小（毫秒）
    this.records = []; // 记录数组
  }
  
  addRecord(record) {
    const now = Date.now();
    this.records.push({
      ...record,
      timestamp: record.timestamp || now
    });
    this.records = this.records.filter(
      record => now - record.timestamp < this.windowSize
    );
  }
  
  getTagConcentration() {
    if (this.records.length === 0) return 0;
    const tagCounts = {};
    this.records.forEach(record => {
      const tag = record.tag || 'unknown';
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(tagCounts));
    return maxCount / this.records.length;
  }
  
  getTagDiversity() {
    if (this.records.length === 0) return 0;
    const uniqueTags = new Set();
    this.records.forEach(record => {
      uniqueTags.add(record.tag || 'unknown');
    });
    return uniqueTags.size / this.records.length;
  }
  
  getTagSwitchFrequency() {
    if (this.records.length < 2) return 0;
    let switchCount = 0;
    for (let i = 1; i < this.records.length; i++) {
      const prevTag = this.records[i - 1].tag || 'unknown';
      const currTag = this.records[i].tag || 'unknown';
      if (prevTag !== currTag) switchCount++;
    }
    return switchCount / (this.records.length - 1);
  }
  
  getRecords() { return this.records.slice(); }
  clear() { this.records = []; }
}

// 2. 专注度计算函数
function calculateFocusLevel(timeWindow, currentRecord = {}) {
  if (timeWindow.records.length === 0) return 0;
  
  // 过滤掉极其短暂的“路过”记录
  const validRecords = timeWindow.records.filter(record => (record.stayTime || 0) >= 1000);
  if (validRecords.length === 0) return 0;

  const tagConcentration = timeWindow.getTagConcentration();
  
  // 如果当前没传 scrollDepth，尝试用历史平均（兜底）
  const scrollDepth = currentRecord.scrollDepth !== undefined 
    ? currentRecord.scrollDepth 
    : (validRecords.reduce((sum, r) => sum + (r.scrollDepth || 0), 0) / validRecords.length);
  
  let focusLevel = 0;
  if (tagConcentration > 0.7) {
    // 高度集中
    const baseFocus = 0.7 + (tagConcentration - 0.7) * 0.3;
    const scrollBonus = scrollDepth > 0.5 ? 0.1 : (scrollDepth < 0.2 ? -0.1 : 0);
    focusLevel = Math.min(1, baseFocus + scrollBonus);
  } else if (tagConcentration >= 0.3) {
    // 中度集中
    focusLevel = tagConcentration;
  } else {
    // 极度分散
    focusLevel = tagConcentration * 0.5;
  }
  
  return Math.max(0, Math.min(1, focusLevel));
}

// 3. 发散度计算函数
function calculateDiversity(timeWindow) {
  if (timeWindow.records.length === 0) return 0;
  const diversity = timeWindow.getTagDiversity();
  const switchFrequency = timeWindow.getTagSwitchFrequency();
  // 多样性与切换频率的加权
  const result = (diversity * 0.6) + (switchFrequency * 0.4);
  return Math.max(0, Math.min(1, result));
}

// 4. 数据处理引擎类
class AttentionEngine {
  constructor() {
    this.timeWindow = new TimeWindow(30000); // 30秒滑动窗口
    this.pageEnterTime = Date.now();
    this.userActions = {
      clicks: 0,
      scrolls: 0,
      pageSwitches: 0
    };
    this.currentFocusLevel = 0;
    this.currentDiversity = 0;
    this.sessionId = this.generateSessionId();
    this.onUpdateCallbacks = [];
    this.completeRecords = []; // 存储完整历史记录
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  onUpdate(callback) {
    this.onUpdateCallbacks.push(callback);
  }

  notifyUpdate(data) {
    this.onUpdateCallbacks.forEach(cb => cb(data));
  }

  recordAction(type) {
    if (this.userActions[type] !== undefined) {
      this.userActions[type]++;
    }
  }

  addRecord(baseRecord) {
    // 依赖全局的 createCompleteRecord
    if (typeof createCompleteRecord === 'function') {
      const completeRecord = createCompleteRecord(baseRecord);
      this.completeRecords.push(completeRecord);
      this.timeWindow.addRecord(completeRecord);
      
      const scrollDepth = completeRecord.scrollDepth || 0;
      this.currentFocusLevel = calculateFocusLevel(this.timeWindow, { scrollDepth });
      this.currentDiversity = calculateDiversity(this.timeWindow);

      this.notifyUpdate({
        focusLevel: this.currentFocusLevel,
        diversity: this.currentDiversity,
        tag: completeRecord.tag
      });
    } else {
      // 降级处理
      this.timeWindow.addRecord(baseRecord);
    }
  }

  resetPageStats() {
    this.pageEnterTime = Date.now();
    this.userActions.clicks = 0;
    this.userActions.scrolls = 0;
    this.userActions.pageSwitches++;
  }

  getStatus() {
    return {
      focusLevel: this.currentFocusLevel,
      diversity: this.currentDiversity,
      actions: { ...this.userActions },
      sessionId: this.sessionId,
      pageEnterTime: this.pageEnterTime
    };
  }
}
