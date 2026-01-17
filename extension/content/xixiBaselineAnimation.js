/**
 * Xixi 中立状态动画
 * 实现缓慢循环和极轻微变化效果
 */

class XixiBaselineAnimation {
  constructor(widget) {
    this.widget = widget;
    
    // 动画参数
    this.config = {
      // 图片切换间隔（3-5秒，随机）
      switchIntervalMin: 3000,  // 3秒
      switchIntervalMax: 5000,  // 5秒
      
      // 极轻微变化范围
      scaleMin: 1.0,
      scaleMax: 1.01,  // 极轻微缩放
      opacityMin: 0.9,
      opacityMax: 0.95, // 极轻微透明度变化
      
      // 变化速度（很慢）
      changeSpeed: 0.3, // 变化速度系数（越小越慢）
    };
    
    // 状态
    this.isActive = false;
    this.currentImageIndex = 0;
    this.lastSwitchTime = 0;
    this.nextSwitchTime = 0;
    
    // 动画时间
    this.animationTime = 0;
    this.lastFrameTime = Date.now();
    
    // 当前变化值
    this.currentScale = 1.0;
    this.currentOpacity = 0.9;
    this.targetScale = 1.0;
    this.targetOpacity = 0.9;
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
    this.lastFrameTime = Date.now();
    this.lastSwitchTime = Date.now();
    this.scheduleNextSwitch();
    
    // 初始化当前图片（延迟执行，确保 transition 已完成）
    setTimeout(() => {
      // 检查 src 是否已设置，如果已设置则跳过 updateImage
      if (this.widget.imgElement && this.widget.imgElement.src && this.widget.imgElement.src !== '') {
        console.log('[XixiBaselineAnimation] 图片 src 已设置，跳过 updateImage');
      } else {
        this.updateImage();
      }
    }, 100);
    
    // 立即应用一次变化，确保图片可见
    this.applyChanges();
    
    console.log('[XixiBaselineAnimation] 动画已启动', {
      baseOpacity: this.widget.getBaseOpacity(),
      currentOpacity: this.currentOpacity,
      finalOpacity: this.widget.getBaseOpacity() * this.currentOpacity
    });
  }

  /**
   * 停止动画
   */
  stop() {
    this.isActive = false;
    console.log('[XixiBaselineAnimation] 动画已停止');
  }

  /**
   * 安排下一次图片切换
   */
  scheduleNextSwitch() {
    const interval = this.config.switchIntervalMin + 
                     Math.random() * (this.config.switchIntervalMax - this.config.switchIntervalMin);
    this.nextSwitchTime = this.lastSwitchTime + interval;
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
    this.animationTime += deltaTime / 1000; // 转换为秒

    // 检查是否需要切换图片
    if (currentTime >= this.nextSwitchTime) {
      this.switchImage();
      this.lastSwitchTime = currentTime;
      this.scheduleNextSwitch();
    }

    // 更新极轻微变化
    this.updateSubtleChanges(deltaTime);

    // 应用变化到 DOM
    this.applyChanges();
  }

  /**
   * 切换到下一张图片（缓慢、几乎不可感知）
   */
  switchImage() {
    const images = this.widget.imageLoader.getStateImages('baseline');
    if (images.length === 0) {
      return;
    }

    // 循环切换
    this.currentImageIndex = (this.currentImageIndex + 1) % images.length;
    this.updateImage();
    
    // 切换时使用淡入淡出（几乎不可感知）
    // 通过极轻微的 opacity 变化实现
    this.targetOpacity = this.config.opacityMin + 
                        Math.random() * (this.config.opacityMax - this.config.opacityMin);
  }

  /**
   * 更新图片显示
   */
  updateImage() {
    if (!this.widget.imgElement) {
      return;
    }
    
    // 如果 src 已设置，不要清空它
    const currentSrc = this.widget.imgElement.src;
    
    const images = this.widget.imageLoader.getStateImages('baseline');
    if (images.length === 0) {
      // 如果没有图片，但 src 已设置，保持现状
      return;
    }

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
        // 使用淡入淡出效果（通过 CSS transition）
        this.widget.imgElement.style.transition = 'opacity 2s ease-in-out';
        this.widget.imgElement.src = imageSrc;
      } else {
        // 如果无法获取 URL，但 src 已设置，保持现状，不要清空
        if (!currentSrc || currentSrc === '') {
          console.warn('[XixiBaselineAnimation] updateImage: 无法获取图片 URL，且当前 src 为空');
        }
      }
    }
  }

  /**
   * 更新极轻微变化（scale 和 opacity）
   * @param {number} deltaTime - 时间差（毫秒）
   */
  updateSubtleChanges(deltaTime) {
    // 使用正弦波实现缓慢的周期性变化
    const time = this.animationTime;
    const period = 4.0; // 4秒一个周期（很慢）
    
    // Scale 变化（极轻微）
    const scalePhase = (time % period) / period * Math.PI * 2;
    this.targetScale = this.config.scaleMin + 
                      (this.config.scaleMax - this.config.scaleMin) * 
                      (Math.sin(scalePhase) * 0.5 + 0.5);
    
    // Opacity 变化（极轻微，独立周期）
    const opacityPhase = ((time * 0.7) % period) / period * Math.PI * 2;
    this.targetOpacity = this.config.opacityMin + 
                        (this.config.opacityMax - this.config.opacityMin) * 
                        (Math.sin(opacityPhase) * 0.5 + 0.5);
    
    // 平滑过渡到目标值
    const speed = this.config.changeSpeed * (deltaTime / 16.67); // 归一化到 60fps
    this.currentScale += (this.targetScale - this.currentScale) * speed;
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * speed;
  }

  /**
   * 应用变化到 DOM
   */
  applyChanges() {
    if (!this.widget.imgElement) {
      return;
    }

    // 确保图片 src 已设置，如果未设置则跳过
    if (!this.widget.imgElement.src || this.widget.imgElement.src === '') {
      return;
    }

    // 应用 scale（通过 transform）
    this.widget.imgElement.style.transform = `scale(${this.currentScale})`;
    
    // 应用 opacity（叠加在基础 opacity 上）
    // 注意：这里只应用极轻微的变化，基础 opacity 由 widget 控制
    const baseOpacity = this.widget.getBaseOpacity();
    const finalOpacity = baseOpacity * this.currentOpacity;
    
    // 确保最终 opacity 至少为 0.5，避免几乎不可见
    const safeOpacity = Math.max(0.5, finalOpacity);
    this.widget.imgElement.style.opacity = safeOpacity;
    
    // 确保图片始终可见
    this.widget.imgElement.style.visibility = 'visible';
    this.widget.imgElement.style.display = 'block';
    
    // 确保 transition 平滑
    this.widget.imgElement.style.transition = 'opacity 2s ease-in-out, transform 2s ease-in-out';
  }

  /**
   * 重置动画状态
   */
  reset() {
    this.currentImageIndex = 0;
    this.currentScale = 1.0;
    this.currentOpacity = 0.9;
    this.targetScale = 1.0;
    this.targetOpacity = 0.9;
    this.lastSwitchTime = Date.now();
    this.scheduleNextSwitch();
    // 延迟执行 updateImage，避免覆盖 transition 设置的 src
    setTimeout(() => {
      // 检查 src 是否已设置，如果已设置则跳过 updateImage
      if (this.widget.imgElement && this.widget.imgElement.src && this.widget.imgElement.src !== '') {
        console.log('[XixiBaselineAnimation] reset: 图片 src 已设置，跳过 updateImage');
      } else {
        this.updateImage();
      }
    }, 100);
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.XixiBaselineAnimation = XixiBaselineAnimation;
}

