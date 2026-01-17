/**
 * Xixi 冷静状态动画
 * 实现深呼吸动画效果（非对称呼吸曲线）
 */

class XixiCalmAnimation {
  constructor(widget) {
    this.widget = widget;
    
    // 动画参数
    this.config = {
      // 呼吸周期总时长（秒）- 慢节奏
      cycleDuration: 6.0,  // 6秒一个完整周期
      
      // 非对称呼吸时间分配（总和应为 1.0）
      // 吸气时间短，吐气时间长，中间有停顿
      inhaleRatio: 0.25,      // 25% - 吸气
      inhalePauseRatio: 0.1,  // 10% - 吸气后停顿
      exhaleRatio: 0.45,      // 45% - 吐气
      exhalePauseRatio: 0.2,  // 20% - 吐气后停顿
      
      // 呼吸幅度
      scaleMin: 0.95,         // 最小缩放（吐气时）
      scaleMax: 1.05,         // 最大缩放（吸气时）
      opacityMin: 0.70,       // 最小透明度（吐气时，更透明/消散）
      opacityMax: 0.95,       // 最大透明度（吸气时，更不透明/清晰）
      
      // Easing 函数参数（用于平滑过渡）
      easingPower: 2.5,       // easing 曲线的幂次，值越大越平滑
    };
    
    // 状态
    this.isActive = false;
    
    // 动画时间
    this.animationTime = 0;   // 当前周期内的进度（0-1）
    this.cycleStartTime = 0;   // 当前周期开始的时间戳
    this.lastFrameTime = Date.now();
    
    // 当前动画值
    this.currentScale = 1.0;
    this.currentOpacity = 0.9;
    
    // 计算各阶段的时间点
    this.calculatePhaseTimings();
  }

  /**
   * 计算各阶段的时间点
   */
  calculatePhaseTimings() {
    const duration = this.config.cycleDuration;
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
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.animationTime = 0;
    this.cycleStartTime = Date.now();
    this.lastFrameTime = Date.now();
    
    // 初始化当前图片（延迟执行，确保 transition 已完成）
    setTimeout(() => {
      // 检查 src 是否已设置，如果已设置则跳过 updateImage
      if (this.widget.imgElement && this.widget.imgElement.src && this.widget.imgElement.src !== '') {
        console.log('[XixiCalmAnimation] 图片 src 已设置，跳过 updateImage');
      } else {
        this.updateImage();
      }
    }, 100);
    
    // 初始化动画值
    this.currentScale = (this.config.scaleMin + this.config.scaleMax) / 2;
    this.currentOpacity = (this.config.opacityMin + this.config.opacityMax) / 2;
    
    console.log('[XixiCalmAnimation] 深呼吸动画已启动');
  }

  /**
   * 停止动画
   */
  stop() {
    this.isActive = false;
    console.log('[XixiCalmAnimation] 深呼吸动画已停止');
  }

  /**
   * 更新图片显示（calm 状态只有一张图片，不需要切换）
   */
  updateImage() {
    if (!this.widget.imgElement) {
      return;
    }
    
    // 如果 src 已设置，不要清空它
    const currentSrc = this.widget.imgElement.src;
    
    const images = this.widget.imageLoader.getStateImages('calm');
    if (images.length === 0) {
      // 如果没有图片，但 src 已设置，保持现状
      return;
    }

    // calm 状态只有一张图片，直接设置
    const image = images[0];
    if (image) {
      // 获取图片 URL（支持 Image 对象或 URL 字符串）
      let imageSrc = null;
      if (typeof image === 'string') {
        imageSrc = image;
      } else if (image && image.src) {
        imageSrc = image.src;
      }
      
      // 只有在获取到有效 URL 时才设置 src
      if (imageSrc) {
        // 如果 src 已设置且相同，跳过
        if (currentSrc === imageSrc) {
          return;
        }
        this.widget.imgElement.src = imageSrc;
        this.widget.imgElement.style.opacity = '1';
      } else {
        // 如果无法获取 URL，但 src 已设置，保持现状，不要清空
        if (!currentSrc || currentSrc === '') {
          console.warn('[XixiCalmAnimation] updateImage: 无法获取图片 URL，且当前 src 为空');
        }
      }
    }
  }

  /**
   * Easing 函数：平滑的缓入缓出曲线
   * @param {number} t - 进度值 (0-1)
   * @returns {number} 缓动后的值 (0-1)
   */
  easeInOut(t) {
    // 使用幂函数实现平滑的缓入缓出
    const power = this.config.easingPower;
    if (t < 0.5) {
      return Math.pow(t * 2, power) / 2;
    } else {
      return 1 - Math.pow((1 - t) * 2, power) / 2;
    }
  }

  /**
   * 根据当前阶段计算动画值
   * @param {number} phaseProgress - 当前阶段的进度 (0-1)
   * @param {string} phase - 阶段名称
   * @returns {object} {scale, opacity}
   */
  calculatePhaseValues(phaseProgress, phase) {
    let scale, opacity;
    
    switch (phase) {
      case 'inhale':
        // 吸气：从最小到最大，使用 easing
        const inhaleEased = this.easeInOut(phaseProgress);
        scale = this.config.scaleMin + (this.config.scaleMax - this.config.scaleMin) * inhaleEased;
        opacity = this.config.opacityMin + (this.config.opacityMax - this.config.opacityMin) * inhaleEased;
        break;
        
      case 'inhalePause':
        // 吸气后停顿：保持最大值
        scale = this.config.scaleMax;
        opacity = this.config.opacityMax;
        break;
        
      case 'exhale':
        // 吐气：从最大到最小，使用 easing
        const exhaleEased = this.easeInOut(phaseProgress);
        scale = this.config.scaleMax - (this.config.scaleMax - this.config.scaleMin) * exhaleEased;
        opacity = this.config.opacityMax - (this.config.opacityMax - this.config.opacityMin) * exhaleEased;
        break;
        
      case 'exhalePause':
        // 吐气后停顿：保持最小值
        scale = this.config.scaleMin;
        opacity = this.config.opacityMin;
        break;
        
      default:
        scale = (this.config.scaleMin + this.config.scaleMax) / 2;
        opacity = (this.config.opacityMin + this.config.opacityMax) / 2;
    }
    
    return { scale, opacity };
  }

  /**
   * 更新动画（每帧调用）
   * @param {number} deltaTime - 时间差（毫秒）
   */
  update(deltaTime) {
    if (!this.isActive) {
      return;
    }

    // 更新动画时间（转换为秒）
    const deltaSeconds = deltaTime / 1000;
    this.animationTime += deltaSeconds;
    
    // 计算当前周期内的进度 (0-1)
    let cycleProgress = (this.animationTime % this.config.cycleDuration) / this.config.cycleDuration;
    
    // 确定当前处于哪个阶段
    let currentPhase;
    let phaseProgress = 0;
    
    if (cycleProgress < this.phaseTimings.inhaleEnd) {
      // 吸气阶段
      currentPhase = 'inhale';
      phaseProgress = cycleProgress / this.phaseTimings.inhaleEnd;
    } else if (cycleProgress < this.phaseTimings.inhalePauseEnd) {
      // 吸气后停顿
      currentPhase = 'inhalePause';
      phaseProgress = 1.0; // 停顿阶段保持最大值
    } else if (cycleProgress < this.phaseTimings.exhaleEnd) {
      // 吐气阶段
      currentPhase = 'exhale';
      const exhaleStart = this.phaseTimings.inhalePauseEnd;
      const exhaleDuration = this.phaseTimings.exhaleEnd - exhaleStart;
      phaseProgress = (cycleProgress - exhaleStart) / exhaleDuration;
    } else {
      // 吐气后停顿
      currentPhase = 'exhalePause';
      phaseProgress = 1.0; // 停顿阶段保持最小值
    }
    
    // 计算当前阶段的目标值
    const targetValues = this.calculatePhaseValues(phaseProgress, currentPhase);
    
    // 平滑过渡到目标值（使用线性插值，让动画更流畅）
    const smoothingSpeed = 0.15; // 平滑速度系数
    this.currentScale += (targetValues.scale - this.currentScale) * smoothingSpeed;
    this.currentOpacity += (targetValues.opacity - this.currentOpacity) * smoothingSpeed;
    
    // 应用变化到 DOM
    this.applyChanges();
  }

  /**
   * 应用变化到 DOM
   */
  applyChanges() {
    if (!this.widget.imgElement) {
      return;
    }

    // 应用 scale（通过 transform）
    this.widget.imgElement.style.transform = `scale(${this.currentScale})`;
    
    // 应用 opacity（叠加在基础 opacity 上）
    const baseOpacity = this.widget.getBaseOpacity();
    const finalOpacity = baseOpacity * this.currentOpacity;
    this.widget.imgElement.style.opacity = finalOpacity;
    
    // 使用 CSS transition 让变化更平滑
    this.widget.imgElement.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
  }

  /**
   * 重置动画状态
   */
  reset() {
    this.animationTime = 0;
    this.cycleStartTime = Date.now();
    this.currentScale = (this.config.scaleMin + this.config.scaleMax) / 2;
    this.currentOpacity = (this.config.opacityMin + this.config.opacityMax) / 2;
    this.updateImage();
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.XixiCalmAnimation = XixiCalmAnimation;
}

