/**
 * Xixi 状态管理器
 * 负责根据 D 值判断当前状态，以及检测状态变化
 */

class XixiStateManager {
  constructor() {
    // 状态阈值
    this.thresholds = {
      calm: 0.4,      // D < 0.4 = 冷静
      baseline: 0.7,  // 0.4 ≤ D < 0.7 = 中立
      // D ≥ 0.7 = 浮躁
    };
    
    // 浮躁子状态阈值
    this.restlessThresholds = {
      mild: 0.8,      // 0.7 ≤ D < 0.8 = 轻度浮躁
      moderate: 0.9,  // 0.8 ≤ D < 0.9 = 中度浮躁
      // 0.9 ≤ D ≤ 1.0 = 高度浮躁
    };
    
    // 当前状态
    this.currentState = null;
    this.currentRestlessLevel = null;
  }

  /**
   * 根据 D 值获取主状态
   * @param {number} D - D 值 (0-1)
   * @returns {string} 状态名称：'calm' | 'baseline' | 'restless'
   */
  getState(D) {
    D = Math.max(0, Math.min(1, D)); // 确保在 [0, 1] 范围内
    
    if (D < this.thresholds.calm) {
      return 'calm';
    } else if (D < this.thresholds.baseline) {
      return 'baseline';
    } else {
      return 'restless';
    }
  }

  /**
   * 获取浮躁子状态（仅在 restless 状态下有效）
   * @param {number} D - D 值 (0-1)
   * @returns {string} 浮躁级别：'mild' | 'moderate' | 'severe' | null
   */
  getRestlessLevel(D) {
    if (this.getState(D) !== 'restless') {
      return null;
    }
    
    D = Math.max(0, Math.min(1, D));
    
    if (D < this.restlessThresholds.mild) {
      return 'mild';
    } else if (D < this.restlessThresholds.moderate) {
      return 'moderate';
    } else {
      return 'severe';
    }
  }

  /**
   * 检测状态是否发生变化
   * @param {number} D - 新的 D 值
   * @returns {boolean} 是否发生变化
   */
  hasStateChanged(D) {
    const newState = this.getState(D);
    const hasChanged = this.currentState !== newState;
    
    if (hasChanged) {
      this.currentState = newState;
      // 如果切换到浮躁状态，也更新浮躁级别
      if (newState === 'restless') {
        this.currentRestlessLevel = this.getRestlessLevel(D);
      } else {
        this.currentRestlessLevel = null;
      }
    } else if (newState === 'restless') {
      // 即使主状态没变，浮躁级别可能变化
      const newLevel = this.getRestlessLevel(D);
      if (this.currentRestlessLevel !== newLevel) {
        this.currentRestlessLevel = newLevel;
        return true; // 浮躁级别变化也算状态变化
      }
    }
    
    return hasChanged;
  }

  /**
   * 获取当前状态信息
   * @param {number} D - D 值
   * @returns {object} 状态信息
   */
  getStateInfo(D) {
    const state = this.getState(D);
    const info = {
      state: state,
      D: D
    };
    
    if (state === 'restless') {
      info.restlessLevel = this.getRestlessLevel(D);
    }
    
    return info;
  }

  /**
   * 重置状态（用于初始化）
   */
  reset() {
    this.currentState = null;
    this.currentRestlessLevel = null;
  }
}

// 导出单例
if (typeof window !== 'undefined') {
  window.XixiStateManager = XixiStateManager;
}

