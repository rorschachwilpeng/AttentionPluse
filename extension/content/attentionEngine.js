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
    this.timeWindow = new TimeWindow(30000); // 30秒短窗口（用于专注度计算）
    this.statsWindow = new TimeWindow(300000); // 新增：5分钟统计窗口 (5 * 60 * 1000)
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
    this.isDetailActive = false; // 新增：标记当前是否正在详情页活跃计时
    this.lastTag = null; // 新增：存储当前活跃页面的标签信息
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
      this.isDetailActive = true; // 开启计时标志
      this.lastTag = completeRecord; // 存储当前标签供 UI 使用
      
      this.timeWindow.addRecord(completeRecord);
      this.statsWindow.addRecord(completeRecord); // 同时加入5分钟统计窗口
      
      const scrollDepth = completeRecord.scrollDepth || 0;
      // 暂时移除：专注度和发散度计算
      // this.currentFocusLevel = calculateFocusLevel(this.timeWindow, { scrollDepth });
      // this.currentDiversity = calculateDiversity(this.timeWindow);

      // 获取实时统计数据
      const realTimeStats = this.getRecentStats();
      const sessionStats = this.getSessionStats();

      this.notifyUpdate({
        focusLevel: this.currentFocusLevel,
        diversity: this.currentDiversity,
        tag: completeRecord.tag,
        tagName: completeRecord.tagName,
        stats: realTimeStats, // 将5分钟统计结果一起发给 UI
        sessionStats: sessionStats // 将会话总统计结果发给 UI
      });
    } else {
      // 降级处理
      this.timeWindow.addRecord(baseRecord);
    }
  }

  /**
   * 新增：获取最近5分钟的实时统计数据
   */
  getRecentStats() {
    this.finalizeLastRecord();
    const records = this.statsWindow ? this.statsWindow.getRecords() : [];
    if (!records || records.length === 0) return null;

    const tagCounts = {};
    const tagStayTimes = {};
    let totalStayTime = 0;

    records.forEach(r => {
      const tag = r.tag || 'unknown';
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      
      const stay = r.stayTime || 0;
      tagStayTimes[tag] = (tagStayTimes[tag] || 0) + stay;
      totalStayTime += stay;
    });

    let topTag = 'unknown';
    let maxCount = 0;
    Object.keys(tagCounts).forEach(tag => {
      if (tagCounts[tag] > maxCount) {
        maxCount = tagCounts[tag];
        topTag = tag;
      }
    });

    return {
      totalCount: records.length,
      topTag: topTag,
      topTagPercentage: (maxCount / records.length * 100).toFixed(1),
      tagCounts: tagCounts,
      tagStayTimes: tagStayTimes,
      totalStayTime: totalStayTime
    };
  }

  resetPageStats() {
    this.stopTracking(); // 在重置前，停止并结算上一条记录
    this.pageEnterTime = Date.now();
    this.userActions.clicks = 0;
    this.userActions.scrolls = 0;
    this.userActions.pageSwitches++;
  }

  /**
   * 停止当前详情页的追踪
   */
  stopTracking() {
    this.finalizeLastRecord();
    this.isDetailActive = false;
    this.lastTag = null;
  }

  finalizeLastRecord() {
    // 只有在活跃追踪状态下才更新时间，防止在列表页误加时间
    if (this.isDetailActive && this.completeRecords.length > 0) {
      const lastRecord = this.completeRecords[this.completeRecords.length - 1];
      // 计算从进入页面到此刻的总时间
      const finalStayTime = Date.now() - this.pageEnterTime;
      
      // 只有在时间合理范围内（比如小于 30 分钟）才进行更新，防止挂机
      if (finalStayTime > 0 && finalStayTime < 1800000) {
        lastRecord.stayTime = finalStayTime;
      }
    }
  }

  getCurrentPageStayTime() {
    if (!this.isDetailActive) return 0;
    return Date.now() - this.pageEnterTime;
  }

  /**
   * 获取本次会话自开启以来的所有标签统计信息
   */
  getSessionStats() {
    this.finalizeLastRecord(); // 结算数据
    
    const tagCounts = {};
    const tagStayTimes = {};
    
    this.completeRecords.forEach(r => {
      const tagName = r.tagName || r.tag || '未知';
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      tagStayTimes[tagName] = (tagStayTimes[tagName] || 0) + (r.stayTime || 0);
    });

    // 转换为数组并按时间排序，方便 UI 展示
    const sortedStats = Object.keys(tagCounts).map(name => ({
      name,
      count: tagCounts[name],
      stayTime: tagStayTimes[name]
    })).sort((a, b) => b.stayTime - a.stayTime);

    return sortedStats;
  }

  /**
   * 接口方法：获取指定时间窗口内的统计信息
   * @param {number} windowMs 时间窗口（毫秒），默认 5 分钟
   */
  getRecentBehaviorStats(windowMs = 300000) {
    const now = Date.now();
    const startTimeToken = now - windowMs;
    
    // 过滤出最近 windowMs 内的记录
    const recentRecords = this.completeRecords.filter(r => {
      // 记录的完成时间应该在窗口内
      const recordEndTime = (r.timestamp || now);
      return recordEndTime > startTimeToken;
    });

    const tagStats = {};
    let totalPosts = recentRecords.length;
    let totalStayTime = 0;

    recentRecords.forEach(r => {
      const tagName = r.tagName || r.tag || '未知';
      if (!tagStats[tagName]) {
        tagStats[tagName] = { count: 0, stayTime: 0 };
      }
      tagStats[tagName].count += 1;
      
      // 如果是当前正在活跃的记录，使用实时计算的时间，而不是记录时快照的时间
      let stay = r.stayTime || 0;
      if (this.isDetailActive && r === this.lastTag) {
        stay = this.getCurrentPageStayTime();
      }
      
      tagStats[tagName].stayTime += stay;
      totalStayTime += stay;
    });

    // 如果当前正在看某篇笔记，且它还没被 addRecord (即不在 recentRecords 中)
    if (this.isDetailActive && this.lastTag && !recentRecords.includes(this.lastTag)) {
      const currentTagName = this.lastTag.tagName || this.lastTag.tag || '未知';
      const currentStay = this.getCurrentPageStayTime();
      
      if (!tagStats[currentTagName]) {
        tagStats[currentTagName] = { count: 0, stayTime: 0 };
      }
      tagStats[currentTagName].count += 1;
      tagStats[currentTagName].stayTime += currentStay;
      totalPosts += 1;
      totalStayTime += currentStay;
    }

    return {
      windowMs,
      totalPosts,
      totalStayTime,
      tagStats, // 按标签聚合的对象
      // 转换为数组格式方便排序展示
      sortedTags: Object.keys(tagStats).map(name => ({
        name,
        count: tagStats[name].count,
        stayTime: tagStats[name].stayTime
      })).sort((a, b) => b.stayTime - a.stayTime)
    };
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
