/**
 * Xixi 冷静状态动画 (Calm)
 * 目标：实现非对称深呼吸效果，越专注越透明
 * 设计规范：
 * 1. 整体透明度更低（基础 0.7，比 Baseline 更透明）
 * 2. 非对称呼吸曲线：吸气 opacity ↓, scale ↑；呼气 opacity ↑, scale ↓
 * 3. 使用 easing 函数（ease-in 吸气，ease-out 呼气）
 * 4. 节律：慢、不对称、有停顿
 */

class XixiCalmAnimation {
  constructor(widget) {
    this.widget = widget;
    
    // 动画配置 - 严格遵循 UI 设计稿
    this.config = {
      // 呼吸周期总时长（秒）- 慢节奏
      cycleDuration: 5.0,  // 5秒一个完整周期
      
      // 非对称呼吸时间分配（总和应为 1.0）
      inhaleRatio: 0.4,        // 40% - 吸气
      inhalePauseRatio: 0.06,  // 6% - 吸气后停顿
      exhaleRatio: 0.44,       // 44% - 呼气（略长于吸气，实现不对称）
      exhalePauseRatio: 0.10,  // 10% - 呼气后停顿
      
      // 基础透明度（比 Baseline 更透明，越专注越不干扰）
      baseOpacity: 0.7,
      
      // 呼吸幅度
      opacityRange: 0.2,       // 透明度变化范围（±0.2，即 0.5-0.7）
      scaleRange: 0.08,        // 缩放变化范围（1.0-1.08）
      
      // 平滑指数
      smoothFactor: 0.15,      // 平滑速度系数（0-1，越大越平滑）
    };
    
    // 运行状态
    this.isActive = false;
    
    // 动画时间记录
    this.animationTime = 0;
    
    // 当前视觉参数
    this.currentScale = 1.0;
    this.currentOpacity = 0.7;
    this.targetScale = 1.0;
    this.targetOpacity = 0.7;
    
    // 计算各阶段的时间点
    this.calculatePhaseTimings();
  }

  /**
   * 计算各阶段的时间点
   */
  calculatePhaseTimings() {
    this.phaseTimings = {
      inhaleStart: 0,
      inhaleEnd: this.config.inhaleRatio,
      inhalePauseEnd: this.config.inhaleRatio + this.config.inhalePauseRatio,
      exhaleEnd: this.config.inhaleRatio + this.config.inhalePauseRatio + this.config.exhaleRatio,
      exhalePauseEnd: 1.0
    };
  }

  /**
   * 启动动画
   */
  start() {
    if (this.isActive) return;

    this.isActive = true;
    this.animationTime = 0;
    
    // 初始化图片
    this.updateImage();
    
    // 立即应用初始样式
    this.applyChanges();
    
    console.log('[XixiCalmAnimation] 阶段 3 启动：冷静状态深呼吸模式');
  }

  /**
   * 停止动画
   */
  stop() {
    this.isActive = false;
    if (this.widget.imgElement) {
      this.widget.imgElement.style.transition = '';
    }
  }

  /**
   * 更新图片显示（calm 状态只有一张图片）
   */
  updateImage() {
    const imgEl = this.widget.imgElement;
    if (!imgEl) return;

    const images = this.widget.imageLoader.getStateImages('calm');
    const image = images[0];
    
    if (image) {
      let imageSrc = typeof image === 'string' ? image : image.src;
      if (imageSrc && imgEl.src !== imageSrc) {
        imgEl.style.transition = 'opacity 1s ease-in-out, transform 1s ease-in-out';
        imgEl.src = imageSrc;
      }
    }
  }

  /**
   * Easing 函数：ease-in（吸气用，开始慢，后加速）
   * @param {number} t - 进度值 (0-1)
   * @returns {number} 缓动后的值 (0-1)
   */
  easeIn(t) {
    return t * t;
  }

  /**
   * Easing 函数：ease-out（呼气用，开始快，后减速）
   * @param {number} t - 进度值 (0-1)
   * @returns {number} 缓动后的值 (0-1)
   */
  easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * 更新动画（每帧调用）
   * @param {number} deltaTime - 时间差（毫秒）
   */
  update(deltaTime) {
    if (!this.isActive) return;

    const deltaSeconds = deltaTime / 1000;
    this.animationTime += deltaSeconds;
    
    // 计算当前周期内的进度 (0-1)
    const cycleProgress = (this.animationTime % this.config.cycleDuration) / this.config.cycleDuration;
    
    // 计算呼吸效果
    this.calculateBreathing(cycleProgress);
    
    // 应用变化到 DOM
    this.applyChanges();
  }

  /**
   * 计算非对称深呼吸效果
   * @param {number} cycleProgress - 周期进度 (0-1)
   */
  calculateBreathing(cycleProgress) {
    const timings = this.phaseTimings;
    let targetScale, targetOpacity;
    
    if (cycleProgress < timings.inhaleEnd) {
      // 吸气阶段：opacity ↓, scale ↑ (ease-in)
      const inhaleProgress = cycleProgress / timings.inhaleEnd;
      const easedProgress = this.easeIn(inhaleProgress);
      
      // 吸气时：透明度降低（更透明），缩放增大
      targetOpacity = this.config.baseOpacity - this.config.opacityRange * easedProgress;
      targetScale = 1.0 + this.config.scaleRange * easedProgress;
      
    } else if (cycleProgress < timings.inhalePauseEnd) {
      // 吸气后停顿：保持最小值
      targetOpacity = this.config.baseOpacity - this.config.opacityRange;
      targetScale = 1.0 + this.config.scaleRange;
      
    } else if (cycleProgress < timings.exhaleEnd) {
      // 呼气阶段：opacity ↑, scale ↓ (ease-out)
      const exhaleStart = timings.inhalePauseEnd;
      const exhaleProgress = (cycleProgress - exhaleStart) / (timings.exhaleEnd - exhaleStart);
      const easedProgress = this.easeOut(exhaleProgress);
      
      // 呼气时：透明度升高（更不透明），缩放减小
      targetOpacity = (this.config.baseOpacity - this.config.opacityRange) + 
                      this.config.opacityRange * easedProgress;
      targetScale = (1.0 + this.config.scaleRange) - 
                    this.config.scaleRange * easedProgress;
      
    } else {
      // 呼气后停顿：保持基础值
      targetOpacity = this.config.baseOpacity;
      targetScale = 1.0;
    }
    
    // 平滑过渡到目标值
    const smoothFactor = this.config.smoothFactor;
    this.currentScale += (targetScale - this.currentScale) * smoothFactor;
    this.currentOpacity += (targetOpacity - this.currentOpacity) * smoothFactor;
  }

  /**
   * 应用视觉变化到 DOM
   */
  applyChanges() {
    const imgEl = this.widget.imgElement;
    if (!imgEl || !imgEl.src) return;

    // Calm 状态：整体更透明（基础 0.7），呼吸效果在此基础上变化
    // 直接使用计算好的呼吸透明度，确保比 Baseline 更透明
    const finalOpacity = this.currentOpacity;

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
    this.animationTime = 0;
    this.currentScale = 1.0;
    this.currentOpacity = this.config.baseOpacity;
    this.updateImage();
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.XixiCalmAnimation = XixiCalmAnimation;
}
