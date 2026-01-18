/**
 * Xixi 中立状态动画 (Baseline)
 * 目标：实现极轻微、几乎不可察觉的循环变化
 * 设计规范：
 * 1. 3张图片慢循环 (3-5秒切换)
 * 2. 极轻微变化：scale 1.0 <-> 1.01, opacity 0.9 <-> 0.95
 * 3. 切换时淡入淡出 (几乎不可感知)
 */

class XixiBaselineAnimation {
  constructor(widget) {
    this.widget = widget;
    
    // 动画配置 - 严格遵循 UI 设计稿
    this.config = {
      // 图片切换间隔（2-3秒，随机）
      switchIntervalMin: 2000,
      switchIntervalMax: 3000,
      
      // 极轻微变化范围
      scaleMin: 1.0,
      scaleMax: 1.01,
      opacityMin: 0.9,
      opacityMax: 0.95,
      
      // 变化平滑度
      changeSpeed: 0.05, // 极慢的平滑速度
      period: 4.0,       // 基础周期（4秒）
      
      // 呼吸效果配置
      breathing: {
        enabled: true,           // 是否启用呼吸效果
        period: 3.0,             // 呼吸周期（3秒一个完整呼吸）
        inhaleRatio: 0.4,       // 吸气时长占比（40%）
        exhaleRatio: 0.4,       // 呼气时长占比（40%）
        pauseRatio: 0.1,        // 停顿时长占比（10%，在吸气和呼气后各一次）
        opacityRange: 0.08,     // 透明度变化范围（±0.08，即 0.92 ± 0.08 = 0.84 ~ 1.0）
        smoothFactor: 0.15      // 平滑指数（0-1，越大越平滑）
      }
    };
    
    // 运行状态
    this.isActive = false;
    this.currentImageIndex = 0;
    this.lastSwitchTime = 0;
    this.nextSwitchTime = 0;
    this.switchTimerId = null;
    this.lastUpdatedIndex = -1; // 记录上次更新的索引，用于强制切换
    
    // 动画时间记录
    this.animationTime = 0;
    
    // 当前视觉参数
    this.currentScale = 1.0;
    this.currentOpacity = 0.92;
    this.targetScale = 1.0;
    this.targetOpacity = 0.92;
    
    // 呼吸效果参数
    this.breathingOpacity = 0.92;      // 当前呼吸透明度
    this.targetBreathingOpacity = 0.92; // 目标呼吸透明度
  }

  /**
   * 启动动画
   */
  start() {
    if (this.isActive) return;

    this.isActive = true;
    this.animationTime = 0;
    this.lastSwitchTime = Date.now();
    this.scheduleNextSwitch();
    
    // 初始化图片：随机起始帧，避免每次都从同一张开始
    this.pickRandomImageIndex();
    this.updateImage();
    
    // 立即应用初始样式
    this.applyChanges();
    
    console.log('[XixiBaselineAnimation] 阶段 1 启动：中立状态精修模式');
  }

  /**
   * 停止动画
   */
  stop() {
    this.isActive = false;
    if (this.switchTimerId) {
      clearTimeout(this.switchTimerId);
      this.switchTimerId = null;
    }
    if (this.widget.imgElement) {
      this.widget.imgElement.style.transition = '';
    }
  }

  /**
   * 安排下一次图片切换（3-5秒随机）
   */
  scheduleNextSwitch() {
    const interval = this.config.switchIntervalMin + 
                     Math.random() * (this.config.switchIntervalMax - this.config.switchIntervalMin);
    this.nextSwitchTime = Date.now() + interval;

    if (this.switchTimerId) {
      clearTimeout(this.switchTimerId);
    }
    this.switchTimerId = setTimeout(() => {
      if (!this.isActive) return;
      this.switchRandomImage();
      this.lastSwitchTime = Date.now();
      this.scheduleNextSwitch();
    }, interval);
  }

  /**
   * 每一帧的更新逻辑
   */
  update(deltaTime) {
    if (!this.isActive) return;

    const currentTime = Date.now();
    this.animationTime += deltaTime / 1000;

    // 1. 计算极轻微的参数波动 (Sine Wave)
    this.calculateSubtleWaves();

    // 2. 将计算结果应用到 DOM
    this.applyChanges();
  }

  /**
   * 随机切换图片（避免连续同一张）
   */
  switchRandomImage() {
    const images = this.widget.imageLoader.getStateImages('baseline');
    if (images.length <= 1) return;

    const previousIndex = this.currentImageIndex;
    this.pickRandomImageIndex(images.length, previousIndex);
    this.updateImage();
  }

  /**
   * 更新图片 SRC
   */
  updateImage() {
    const imgEl = this.widget.imgElement;
    if (!imgEl) {
      console.warn('[XixiBaselineAnimation] updateImage: imgElement 不存在');
      return;
    }

    const images = this.widget.imageLoader.getStateImages('baseline');
    if (images.length === 0) {
      console.warn('[XixiBaselineAnimation] updateImage: 没有可用图片');
      return;
    }

    const image = images[this.currentImageIndex];
    if (!image) {
      console.warn('[XixiBaselineAnimation] updateImage: 当前索引图片不存在', {
        index: this.currentImageIndex,
        total: images.length
      });
      return;
    }
    
    // 获取图片 URL（支持字符串或 Image 对象）
    let imageSrc = typeof image === 'string' ? image : (image.src || null);
    if (!imageSrc) {
      console.warn('[XixiBaselineAnimation] updateImage: 无法获取图片 URL');
      return;
    }

    // 标准化 URL（移除可能的尾随差异）
    const currentSrc = imgEl.src || '';
    const normalizedCurrent = currentSrc.split('?')[0]; // 移除查询参数
    const normalizedNew = imageSrc.split('?')[0];

    // 强制更新（即使 URL 看起来相同，也更新以确保切换）
    if (normalizedCurrent !== normalizedNew || this.currentImageIndex !== this.lastUpdatedIndex) {
      // 直接设置新 src（浏览器会自动处理缓存）
      // 如果 URL 不同，浏览器会重新加载
      imgEl.style.transition = 'opacity 1s ease-in-out, transform 1s ease-in-out';
      imgEl.src = imageSrc;
      this.lastUpdatedIndex = this.currentImageIndex;
    }
  }

  /**
   * 计算极轻微的变化波动
   */
  calculateSubtleWaves() {
    const time = this.animationTime;
    const period = this.config.period;
    
    // Scale 波动: 1.0 <-> 1.01
    const scaleSin = Math.sin((time * Math.PI * 2) / period);
    this.targetScale = this.config.scaleMin + 
                      (this.config.scaleMax - this.config.scaleMin) * (scaleSin * 0.5 + 0.5);
    
    // Opacity 波动: 0.9 <-> 0.95 (与 Scale 错开相位)
    const opacitySin = Math.cos((time * Math.PI * 2) / period);
    this.targetOpacity = this.config.opacityMin + 
                        (this.config.opacityMax - this.config.opacityMin) * (opacitySin * 0.5 + 0.5);

    // 平滑插值，消除毛刺
    const lerpFactor = 0.05;
    this.currentScale += (this.targetScale - this.currentScale) * lerpFactor;
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * lerpFactor;
    
    // 计算呼吸效果
    if (this.config.breathing.enabled) {
      this.calculateBreathing();
    }
  }

  /**
   * 计算呼吸效果（根据呼和吸改变透明度）
   */
  calculateBreathing() {
    const breathing = this.config.breathing;
    const time = this.animationTime;
    const period = breathing.period;
    
    // 计算当前在呼吸周期的哪个阶段
    const cycleProgress = (time % period) / period;
    
    let targetOpacity = 0.92; // 基础透明度
    
    if (cycleProgress < breathing.inhaleRatio) {
      // 吸气阶段：透明度降低（变暗）
      const inhaleProgress = cycleProgress / breathing.inhaleRatio;
      // 使用缓动函数让吸气更平滑
      const easedProgress = this.easeInOut(inhaleProgress);
      targetOpacity = 0.92 - breathing.opacityRange * easedProgress;
    } else if (cycleProgress < breathing.inhaleRatio + breathing.pauseRatio) {
      // 吸气后停顿
      targetOpacity = 0.92 - breathing.opacityRange;
    } else if (cycleProgress < breathing.inhaleRatio + breathing.pauseRatio + breathing.exhaleRatio) {
      // 呼气阶段：透明度升高（变亮）
      const exhaleStart = breathing.inhaleRatio + breathing.pauseRatio;
      const exhaleProgress = (cycleProgress - exhaleStart) / breathing.exhaleRatio;
      // 使用缓动函数让呼气更平滑
      const easedProgress = this.easeInOut(exhaleProgress);
      targetOpacity = (0.92 - breathing.opacityRange) + breathing.opacityRange * easedProgress;
    } else {
      // 呼气后停顿
      targetOpacity = 0.92;
    }
    
    // 应用平滑指数
    this.targetBreathingOpacity = targetOpacity;
    const smoothFactor = breathing.smoothFactor;
    this.breathingOpacity += (this.targetBreathingOpacity - this.breathingOpacity) * smoothFactor;
  }

  /**
   * 缓动函数（ease-in-out）
   * @param {number} t - 进度值 (0-1)
   * @returns {number} 缓动后的值 (0-1)
   */
  easeInOut(t) {
    return t < 0.5 
      ? 2 * t * t 
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * 应用视觉变化到 DOM
   */
  applyChanges() {
    const imgEl = this.widget.imgElement;
    if (!imgEl || !imgEl.src) return;

    // 获取 Widget 的基础透明度（由 D 值驱动）
    const baseOpacity = this.widget.getBaseOpacity();
    
    // 叠加动画层面的极轻微透明度变化
    let finalOpacity = baseOpacity * this.currentOpacity;
    
    // 叠加呼吸效果（如果启用）
    if (this.config.breathing.enabled) {
      // 呼吸透明度直接叠加在最终透明度上
      finalOpacity = finalOpacity * (this.breathingOpacity / 0.92);
    }

    // 应用变换
    imgEl.style.transform = `scale(${this.currentScale})`;
    imgEl.style.opacity = finalOpacity;
    
    // 确保显示状态
    imgEl.style.display = 'block';
    imgEl.style.visibility = 'visible';
  }

  /**
   * 重置状态
   */
  reset() {
    this.currentImageIndex = 0;
    this.animationTime = 0;
    this.lastSwitchTime = Date.now();
    this.scheduleNextSwitch();
    this.updateImage();
  }

  /**
   * 选择随机图片索引（避免与上一张重复）
   * @param {number} length - 图片数量
   * @param {number} prevIndex - 上一次索引
   */
  pickRandomImageIndex(length = null, prevIndex = null) {
    const images = this.widget.imageLoader.getStateImages('baseline');
    const count = length || images.length;
    if (count <= 1) {
      this.currentImageIndex = 0;
      return;
    }

    const lastIndex = prevIndex !== null ? prevIndex : this.currentImageIndex;
    let nextIndex = lastIndex;
    while (nextIndex === lastIndex) {
      nextIndex = Math.floor(Math.random() * count);
    }
    this.currentImageIndex = nextIndex;
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.XixiBaselineAnimation = XixiBaselineAnimation;
}
