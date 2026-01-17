/**
 * Xixi 浮躁状态动画
 * 实现随机闪烁动画效果（平闪，不刺眼）
 */

class XixiRestlessAnimation {
  constructor(widget) {
    this.widget = widget;
    
    // 动画参数
    this.config = {
      // 浮躁级别对应的闪烁频率范围（毫秒）
      // 轻度浮躁：低频闪烁 (800-1200ms)
      // 中度浮躁：中频闪烁 (400-800ms)
      // 高度浮躁：高频闪烁 (200-400ms)
      frequencyRanges: {
        mild: {
          min: 800,
          max: 1200
        },
        moderate: {
          min: 400,
          max: 800
        },
        severe: {
          min: 200,
          max: 400
        }
      },
      
      // 平闪效果参数（不刺眼、不全透明）
      flashOpacityMin: 0.60,  // 闪烁时的最小透明度（不全透明）
      flashOpacityMax: 0.90,  // 正常时的最大透明度
      flashDuration: 150,     // 单次闪烁持续时间（毫秒）
      
      // 图片切换时的淡入淡出时间
      transitionDuration: 200, // 毫秒
    };
    
    // 状态
    this.isActive = false;
    this.currentImageIndex = 0;
    
    // 闪烁控制
    this.lastFlashTime = 0;
    this.nextFlashTime = 0;
    this.isFlashing = false;
    this.flashStartTime = 0;
    
    // 当前浮躁级别
    this.currentRestlessLevel = null;
    
    // 动画时间
    this.lastFrameTime = Date.now();
  }

  /**
   * 启动动画
   */
  start() {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.lastFrameTime = Date.now();
    this.lastFlashTime = Date.now();
    this.isFlashing = false;
    
    // 初始化当前图片（延迟执行，确保 transition 已完成）
    // 使用 setTimeout 确保在下一个事件循环中执行，避免覆盖 transition 设置的 src
    setTimeout(() => {
      // 检查 src 是否已设置，如果已设置则跳过 updateImage
      if (this.widget.imgElement && this.widget.imgElement.src && this.widget.imgElement.src !== '') {
        console.log('[XixiRestlessAnimation] 图片 src 已设置，跳过 updateImage');
      } else {
        this.updateImage();
      }
    }, 100);
    
    // 安排第一次闪烁
    this.scheduleNextFlash();
    
    console.log('[XixiRestlessAnimation] 随机闪烁动画已启动');
  }

  /**
   * 停止动画
   */
  stop() {
    this.isActive = false;
    this.isFlashing = false;
    console.log('[XixiRestlessAnimation] 随机闪烁动画已停止');
  }

  /**
   * 获取当前浮躁级别对应的频率范围
   * @param {string} level - 浮躁级别：'mild' | 'moderate' | 'severe'
   * @returns {object} {min, max} 频率范围（毫秒）
   */
  getFrequencyRange(level) {
    return this.config.frequencyRanges[level] || this.config.frequencyRanges.mild;
  }

  /**
   * 安排下一次闪烁（随机间隔）
   * @param {string} level - 浮躁级别
   */
  scheduleNextFlash(level = null) {
    // 如果没有指定级别，使用当前级别
    if (!level) {
      level = this.currentRestlessLevel || 'mild';
    }
    
    const range = this.getFrequencyRange(level);
    
    // 随机间隔（非等间隔）
    const randomInterval = range.min + Math.random() * (range.max - range.min);
    
    this.nextFlashTime = Date.now() + randomInterval;
    this.currentRestlessLevel = level;
  }

  /**
   * 更新图片显示（随机切换）
   */
  updateImage() {
    if (!this.widget.imgElement) {
      return;
    }
    
    // 如果 src 已设置，不要清空它
    const currentSrc = this.widget.imgElement.src;
    
    const images = this.widget.imageLoader.getStateImages('restless');
    if (images.length === 0) {
      // 如果没有图片，但 src 已设置，保持现状
      return;
    }

    // 随机选择一张图片（避免连续显示同一张）
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * images.length);
    } while (images.length > 1 && newIndex === this.currentImageIndex);
    
    this.currentImageIndex = newIndex;
    const image = images[this.currentImageIndex];
    
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
        // 使用淡入淡出效果切换图片
        this.widget.imgElement.style.transition = `opacity ${this.config.transitionDuration}ms ease-in-out`;
        this.widget.imgElement.src = imageSrc;
      } else {
        // 如果无法获取 URL，但 src 已设置，保持现状，不要清空
        if (!currentSrc || currentSrc === '') {
          console.warn('[XixiRestlessAnimation] updateImage: 无法获取图片 URL，且当前 src 为空');
        }
      }
    }
  }

  /**
   * 开始闪烁
   */
  startFlash() {
    this.isFlashing = true;
    this.flashStartTime = Date.now();
    this.updateImage(); // 闪烁时切换图片
  }

  /**
   * 结束闪烁
   */
  endFlash() {
    this.isFlashing = false;
  }

  /**
   * 更新动画（每帧调用）
   * @param {number} deltaTime - 时间差（毫秒）
   */
  update(deltaTime) {
    if (!this.isActive) {
      return;
    }

    const currentTime = Date.now();
    
    // 获取当前浮躁级别（从 widget 获取 D 值）
    const D = this.widget.D_smooth;
    const restlessLevel = this.widget.stateManager.getRestlessLevel(D);
    
    // 如果浮躁级别变化，重新安排闪烁
    if (restlessLevel && restlessLevel !== this.currentRestlessLevel) {
      this.scheduleNextFlash(restlessLevel);
    }
    
    // 检查是否需要开始闪烁
    if (!this.isFlashing && currentTime >= this.nextFlashTime) {
      this.startFlash();
      // 闪烁结束后，安排下一次闪烁
      setTimeout(() => {
        this.endFlash();
        this.scheduleNextFlash(restlessLevel);
      }, this.config.flashDuration);
    }
    
    // 应用闪烁效果到 DOM
    this.applyChanges();
  }

  /**
   * 应用变化到 DOM
   */
  applyChanges() {
    if (!this.widget.imgElement) {
      return;
    }

    const baseOpacity = this.widget.getBaseOpacity();
    let finalOpacity;
    
    if (this.isFlashing) {
      // 闪烁时：计算闪烁进度（0-1）
      const flashElapsed = Date.now() - this.flashStartTime;
      const flashProgress = Math.min(flashElapsed / this.config.flashDuration, 1);
      
      // 使用正弦波实现平滑的闪烁效果（从正常到闪烁再回到正常）
      // 前半段：正常 → 闪烁（透明度降低）
      // 后半段：闪烁 → 正常（透明度恢复）
      let flashOpacity;
      if (flashProgress < 0.5) {
        // 前半段：从正常到闪烁
        const progress = flashProgress * 2; // 0-1
        flashOpacity = this.config.flashOpacityMax - 
                      (this.config.flashOpacityMax - this.config.flashOpacityMin) * progress;
      } else {
        // 后半段：从闪烁到正常
        const progress = (flashProgress - 0.5) * 2; // 0-1
        flashOpacity = this.config.flashOpacityMin + 
                      (this.config.flashOpacityMax - this.config.flashOpacityMin) * progress;
      }
      
      finalOpacity = baseOpacity * flashOpacity;
    } else {
      // 正常状态：使用最大透明度
      finalOpacity = baseOpacity * this.config.flashOpacityMax;
    }
    
    this.widget.imgElement.style.opacity = finalOpacity;
    
    // 确保 transition 平滑
    this.widget.imgElement.style.transition = `opacity ${this.config.transitionDuration}ms ease-in-out`;
  }

  /**
   * 重置动画状态
   */
  reset() {
    this.currentImageIndex = 0;
    this.isFlashing = false;
    this.lastFlashTime = Date.now();
    this.scheduleNextFlash();
    // 延迟执行 updateImage，避免覆盖 transition 设置的 src
    setTimeout(() => {
      // 检查 src 是否已设置，如果已设置则跳过 updateImage
      if (this.widget.imgElement && this.widget.imgElement.src && this.widget.imgElement.src !== '') {
        console.log('[XixiRestlessAnimation] reset: 图片 src 已设置，跳过 updateImage');
      } else {
        this.updateImage();
      }
    }, 100);
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.XixiRestlessAnimation = XixiRestlessAnimation;
}

