/**
 * Xixi PNG 实现示例
 * 展示如何使用 PNG 图片实现多状态切换
 */

class XixiPNGWidget {
  constructor(container, config = {}) {
    this.container = container;
    this.config = {
      sizeMin: 40,
      sizeMax: 100,
      opacityMin: 0.5,
      opacityMax: 0.9,
      ...config
    };
    
    // D 值状态
    this.D_raw = 0.4;
    this.D_smooth = 0.4;
    this.D_smoothAlpha = 0.1;
    
    // 图片资源（需要预加载）
    this.images = {
      // 冷静状态 (D = 0)
      calm: [
        'images/xixi-calm-1.png',
        'images/xixi-calm-2.png',
        'images/xixi-calm-3.png',
        'images/xixi-calm-4.png',
        'images/xixi-calm-5.png'
      ],
      // 中心状态 (D = 0.5)
      center: [
        'images/xixi-center-1.png',
        'images/xixi-center-2.png',
        'images/xixi-center-3.png',
        'images/xixi-center-4.png',
        'images/xixi-center-5.png'
      ],
      // 急躁状态 (D = 1)
      agitated: [
        'images/xixi-agitated-1.png',
        'images/xixi-agitated-2.png',
        'images/xixi-agitated-3.png',
        'images/xixi-agitated-4.png',
        'images/xixi-agitated-5.png'
      ]
    };
    
    // 当前状态
    this.currentState = 'center';
    this.currentFrameIndex = 0;
    this.loadedImages = {};
    
    // 动画时间
    this.animationTime = 0;
    this.lastFrameTime = Date.now();
    this.frameChangeInterval = 200; // 每 200ms 切换一帧
    
    // 初始化
    this.preloadImages().then(() => {
      this.initWidget();
      this.startAnimation();
    });
  }

  /**
   * 预加载所有图片
   */
  async preloadImages() {
    const allImages = [
      ...this.images.calm,
      ...this.images.center,
      ...this.images.agitated
    ];
    
    const loadPromises = allImages.map(src => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.loadedImages[src] = img;
          resolve();
        };
        img.onerror = reject;
        img.src = src;
      });
    });
    
    await Promise.all(loadPromises);
    console.log('[Xixi PNG] 所有图片已加载');
  }

  /**
   * 初始化 Widget
   */
  initWidget() {
    // 创建容器
    this.imgElement = document.createElement('img');
    this.imgElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: opacity 0.3s ease-out,
                  transform 0.3s ease-out,
                  filter 0.3s ease-out;
    `;
    
    this.container.appendChild(this.imgElement);
    this.updateImage();
  }

  /**
   * 平滑 D 值（EMA）
   */
  smoothDValue(deltaTime = null) {
    if (this.D_raw === 0 && this.D_smooth === 0) {
      return 0;
    }
    
    let alpha = this.D_smoothAlpha;
    if (deltaTime !== null && deltaTime > 0) {
      const normalizedDelta = Math.min(deltaTime / 16.67, 3);
      alpha = Math.min(alpha * (1 + normalizedDelta * 0.5), 0.5);
    }
    
    this.D_smooth = alpha * this.D_raw + (1 - alpha) * this.D_smooth;
    this.D_smooth = Math.max(0, Math.min(1, this.D_smooth));
    return this.D_smooth;
  }

  /**
   * 根据 D 值确定状态
   */
  getStateFromD(D) {
    if (D < 0.33) return 'calm';
    if (D < 0.66) return 'center';
    return 'agitated';
  }

  /**
   * 更新显示的图片
   */
  updateImage() {
    const state = this.getStateFromD(this.D_smooth);
    const stateImages = this.images[state];
    
    // 如果状态改变，重置帧索引
    if (state !== this.currentState) {
      this.currentState = state;
      this.currentFrameIndex = 0;
    }
    
    // 循环播放当前状态的帧
    const currentImageSrc = stateImages[this.currentFrameIndex];
    const img = this.loadedImages[currentImageSrc];
    
    if (img && this.imgElement) {
      this.imgElement.src = currentImageSrc;
      
      // 根据 D 值调整视觉效果
      const params = this.mapDToVisualParams(this.D_smooth);
      this.applyVisualParams(params);
    }
  }

  /**
   * 映射 D 值到视觉参数
   */
  mapDToVisualParams(D) {
    D = Math.max(0, Math.min(1, D));
    
    return {
      size: this.config.sizeMin + (this.config.sizeMax - this.config.sizeMin) * D,
      opacity: this.config.opacityMin + (this.config.opacityMax - this.config.opacityMin) * D,
      brightness: 1.0 - D * 0.3,  // D高→更暗
      blurAmount: D * 1.5,          // D高→更模糊
      scale: 0.95 + D * 0.1         // 轻微缩放变化
    };
  }

  /**
   * 应用视觉参数
   */
  applyVisualParams(params) {
    if (!this.imgElement) return;
    
    // 容器尺寸
    this.container.style.width = `${params.size}px`;
    this.container.style.height = `${params.size}px`;
    
    // 图片样式
    this.imgElement.style.opacity = params.opacity;
    this.imgElement.style.filter = `
      brightness(${params.brightness}) 
      blur(${params.blurAmount}px)
    `;
    this.imgElement.style.transform = `scale(${params.scale})`;
  }

  /**
   * 设置 D 值
   */
  setTurbulence(D) {
    this.D_raw = Math.max(0, Math.min(1, D));
  }

  /**
   * 启动动画循环
   */
  startAnimation() {
    let lastFrameChangeTime = Date.now();
    
    const animate = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;
      
      // 更新动画时间
      this.animationTime += deltaTime / 1000;
      
      // 平滑 D 值
      this.smoothDValue(deltaTime);
      
      // 帧切换（每 200ms 切换一帧）
      if (currentTime - lastFrameChangeTime >= this.frameChangeInterval) {
        const stateImages = this.images[this.currentState];
        this.currentFrameIndex = (this.currentFrameIndex + 1) % stateImages.length;
        lastFrameChangeTime = currentTime;
        this.updateImage();
      }
      
      // 更新视觉参数（连续变化）
      const params = this.mapDToVisualParams(this.D_smooth);
      this.applyVisualParams(params);
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
}

// 使用示例
/*
const container = document.getElementById('widget-container');
const xixi = new XixiPNGWidget(container);

// 设置 D 值
xixi.setTurbulence(0.3); // 冷静状态
xixi.setTurbulence(0.5); // 中心状态
xixi.setTurbulence(0.8); // 急躁状态
*/

