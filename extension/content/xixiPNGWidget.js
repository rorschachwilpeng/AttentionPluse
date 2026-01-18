/**
 * Xixi PNG Widget 主类
 * 整合所有模块，实现基于 PNG 图片的 Xixi 组件
 */

class XixiPNGWidget {
  constructor(container, config = {}) {
    this.container = container;
    
    // 配置参数
    this.config = {
      sizeMin: 40,
      sizeMax: 100,
      opacityMin: 0.5,
      opacityMax: 0.9,
      ...config
    };
    
    // 开发阶段限制：当前阶段只支持 baseline 状态
    // 阶段 2：只支持 baseline
    // 阶段 3：支持 baseline + calm
    // 阶段 4：支持所有状态
    this.enabledStates = config.enabledStates || ['baseline', 'calm', 'restless'];
    
    // D 值状态（初始值设为 0.5，等待后端数据接口设置）
    this.D_raw = 0.5;
    this.D_smooth = 0.5;
    this.D_smoothAlpha = 0.1;
    
    // 初始化模块
    this.imagePaths = new XixiImagePaths();
    this.stateManager = new XixiStateManager();
    this.imageLoader = new XixiImageLoader(this.imagePaths);
    this.stateTransition = new XixiStateTransition(this);
    
    // DOM 元素
    this.imgElement = null;
    
    // 当前状态
    this.currentState = null;
    this.currentImageIndex = 0;
    
    // 动画实例
    this.baselineAnimation = null;
    this.calmAnimation = null;
    this.restlessAnimation = null;
    
    // 动画循环
    this.animationId = null;
    this.lastFrameTime = Date.now();
    
    // 初始化标志
    this.isInitialized = false;
    this.isLoading = false;
    
    // 初始化
    this.init();
  }

  /**
   * 初始化 Widget
   */
  async init() {
    if (this.isInitialized) {
      console.warn('[XixiPNGWidget] 已初始化，跳过重复初始化');
      return;
    }

    console.log('[XixiPNGWidget] 开始初始化...');
    
    try {
      // 1. 预加载所有图片（允许失败继续，因为我们有 URL 兜底）
      this.isLoading = true;
      try {
        await this.imageLoader.preloadAll();
      } catch (e) {
        console.warn('[XixiPNGWidget] 预加载部分失败，将使用 URL 模式运行', e);
      }
      this.isLoading = false;
      
      // 2. 创建 DOM 结构
      this.createDOM();
      
      // 3. 创建动画实例
      this.baselineAnimation = new XixiBaselineAnimation(this);
      this.calmAnimation = new XixiCalmAnimation(this);
      this.restlessAnimation = new XixiRestlessAnimation(this);
      
      // 4. 设置初始状态（应用开发阶段限制）
      console.log('[XixiPNGWidget] 步骤 4: 设置初始状态');
      
      // 确保 D_smooth 有初始值（使用 0.5 作为默认值，等待后端数据接口设置）
      if (typeof this.D_smooth !== 'number' || isNaN(this.D_smooth)) {
        this.D_smooth = 0.5;
        this.D_raw = 0.5;
        console.log('[XixiPNGWidget] D 值无效，使用默认值: 0.5（等待后端数据接口设置）');
      }
      
      let initialState = this.stateManager.getState(this.D_smooth);
      if (!this.enabledStates.includes(initialState)) {
        initialState = 'baseline';
      }
      
      // 强制执行状态切换
      console.log(`  - 准备切换到状态: ${initialState}`);
      this.switchToState(initialState);
      
      // 关键修复：即便异步操作没完，也立刻同步设置一个基础 URL 确保显示
      if (this.imgElement && (!this.imgElement.src || this.imgElement.src === '')) {
        const urls = this.imageLoader.imagePaths.getStateImages(initialState);
        if (urls.length > 0) {
          console.log('[XixiPNGWidget] init 过程中同步补全 src');
          this.imgElement.src = urls[0];
          this.imgElement.style.opacity = '1';
          this.imgElement.style.visibility = 'visible';
          this.imgElement.style.display = 'block';
        }
      }
      
      // 验证状态切换是否成功
      setTimeout(() => {
        console.log('[XixiPNGWidget] 状态切换验证:', {
          currentState: this.currentState,
          imgElementExists: !!this.imgElement,
          imgSrc: this.imgElement?.src ? this.imgElement.src.substring(0, 50) + '...' : '空',
          imgComplete: this.imgElement?.complete,
          imgNaturalWidth: this.imgElement?.naturalWidth,
          imgNaturalHeight: this.imgElement?.naturalHeight
        });
      }, 100);
      
      // 验证图片是否已设置（如果状态切换失败，直接设置）
      setTimeout(() => {
        if (this.imgElement && (!this.imgElement.src || this.imgElement.src === '')) {
          // 直接从 imagePaths 获取 URL（最可靠的方式）
          const urls = this.imageLoader.imagePaths.getStateImages(initialState);
          if (urls.length > 0) {
            this.imgElement.src = urls[0];
            this.imgElement.style.opacity = '1';
            this.imgElement.style.display = 'block';
            this.imgElement.style.visibility = 'visible';
          }
        }
      }, 100);
      
    // 再次验证（更长的延迟，确保所有异步操作完成）
    setTimeout(() => {
      if (this.imgElement && (!this.imgElement.src || this.imgElement.src === '' || this.imgElement.src.endsWith('undefined'))) {
        const stateToUse = this.currentState || 'baseline';
        const urls = this.imageLoader.imagePaths.getStateImages(stateToUse);
        if (urls.length > 0) {
          console.log('[XixiPNGWidget] 最终延迟验证发现 src 为空，强制补全');
          this.imgElement.src = urls[0];
          this.imgElement.style.opacity = '1';
          this.imgElement.style.display = 'block';
          this.imgElement.style.visibility = 'visible';
        }
      }
    }, 1500);
      
      // 5. 应用初始视觉参数
      this.updateVisualParams();
      
      // 6. 启动动画循环
      this.startAnimation();
      
      this.isInitialized = true;
      console.log('[XixiPNGWidget] 初始化完成');
      
    } catch (error) {
      console.error('[XixiPNGWidget] 初始化失败:', error);
      this.isLoading = false;
      throw error;
    }
  }

  /**
   * 创建 DOM 结构
   */
  createDOM() {
    // 关键修复：先清理容器中所有现有的 img 元素，避免重复创建
    const existingImgs = this.container.querySelectorAll('img');
    if (existingImgs.length > 0) {
      console.warn(`[XixiPNGWidget] 发现容器中有 ${existingImgs.length} 个 img 元素，正在清理...`);
      existingImgs.forEach(img => img.remove());
    }
    
    // 创建图片元素
    this.imgElement = document.createElement('img');
    this.imgElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      margin: 0;
      padding: 0;
      border: none;
      outline: none;
      vertical-align: top;
      position: relative;
      top: 0;
      left: 0;
      transform-origin: top left; // 确保缩放从左上角开始，不会超出容器
      transition: opacity 0.3s ease-out,
                  transform 0.3s ease-out,
                  filter 0.3s ease-out;
    `;
    
    // 添加图片加载错误处理（只设置一次，避免重复绑定）
    this.imgElement.onerror = (e) => {
      const src = this.imgElement.src;
      console.error('[XixiPNGWidget] 图片加载失败:', {
        src: src ? src.substring(0, 80) + '...' : '空',
        state: this.currentState
      });
      
      // 检查是否是被拦截器拦截
      if (src && src.startsWith('chrome-extension://')) {
        console.warn('[XixiPNGWidget] 可能被广告拦截器拦截 (ERR_BLOCKED_BY_CLIENT)');
        console.warn('[XixiPNGWidget] 建议: 检查浏览器扩展（如 AdBlock、uBlock Origin）是否拦截了扩展资源');
        console.warn('[XixiPNGWidget] 解决方案: 在拦截器中添加白名单规则，允许扩展资源加载');
      }
    };
    
    // 添加图片加载成功处理（只设置一次，避免重复绑定）
    // 移除日志，避免控制台刷屏
    this.imgElement.onload = () => {
      // 图片加载成功，但不输出日志
    };
    
    // 添加到容器
    this.container.appendChild(this.imgElement);
    
    // 设置容器样式（强制设置，确保图片不会溢出）
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden'; // 强制 hidden，防止图片溢出
    this.container.style.margin = '0';
    this.container.style.padding = '0';
    this.container.style.border = 'none';
    this.container.style.outline = 'none';
    // 确保容器填满父容器
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.boxSizing = 'border-box';
    // 确保图片从容器顶部开始（不使用 flexbox，直接设置）
    this.container.style.display = 'block';
    this.container.style.lineHeight = '0';
    this.container.style.fontSize = '0';
    // 确保容器本身不会超出父容器
    this.container.style.maxWidth = '100%';
    this.container.style.maxHeight = '100%';
  }

  /**
   * 切换到指定状态
   * @param {string} state - 状态名称：'calm' | 'baseline' | 'restless'
   */
  switchToState(state) {
    console.log(`[XixiPNGWidget] switchToState 被调用: ${state}`, {
      currentState: this.currentState,
      stateManagerState: this.stateManager.currentState,
      D_smooth: this.D_smooth.toFixed(3)
    });
    
    // 开发阶段限制：如果状态未启用，强制使用 baseline
    if (!this.enabledStates.includes(state)) {
      console.log(`  - 状态 ${state} 尚未开发，强制使用 baseline（当前阶段：${this.enabledStates.join(', ')}）`);
      state = 'baseline';
    }
    
    // 如果状态未变化且图片已设置，跳过切换
    if (this.currentState === state && this.imgElement && this.imgElement.src && this.imgElement.src !== '' && !this.imgElement.src.endsWith('undefined')) {
      // 关键补丁：确保同一状态下动画仍然启动
      if (state === 'baseline' && this.baselineAnimation && !this.baselineAnimation.isActive) {
        this.baselineAnimation.start();
      } else if (state === 'calm' && this.calmAnimation && !this.calmAnimation.isActive) {
        this.calmAnimation.start();
      } else if (state === 'restless' && this.restlessAnimation && !this.restlessAnimation.isActive) {
        this.restlessAnimation.start();
      }
      console.log(`  - 状态未变化（当前: ${this.currentState}）且图片已设置，跳过切换`);
      return;
    }

    if (this.currentState === state) {
      console.log(`  - 状态未变化（当前: ${this.currentState}），但图片需要重新设置或修复`);
    } else {
      console.log(`  - 切换状态: ${this.currentState} → ${state}`);
    }
    
    // 停止当前状态的动画（仅在状态真正改变时）
    if (this.currentState !== state) {
      if (this.baselineAnimation && this.baselineAnimation.isActive) {
        this.baselineAnimation.stop();
      }
      if (this.calmAnimation && this.calmAnimation.isActive) {
        this.calmAnimation.stop();
      }
      if (this.restlessAnimation && this.restlessAnimation.isActive) {
        this.restlessAnimation.stop();
      }
    }
    
    // 获取该状态的图片
    console.log(`  - 从 imageLoader 获取状态 ${state} 的图片...`);
    const images = this.imageLoader.getStateImages(state);
    console.log(`  - getStateImages 返回:`, {
      count: images.length,
      firstItemType: images.length > 0 ? typeof images[0] : '空',
      firstItemIsString: images.length > 0 ? typeof images[0] === 'string' : false,
      firstItemIsImage: images.length > 0 ? (images[0] instanceof Image) : false,
      firstItemSrc: images.length > 0 && images[0]?.src ? images[0].src.substring(0, 50) + '...' : (images.length > 0 && typeof images[0] === 'string' ? images[0].substring(0, 50) + '...' : '无')
    });
    
    if (images.length === 0) {
      console.log(`  - getStateImages 返回空数组，尝试直接从 imagePaths 获取 URL...`);
      // 尝试直接从 imagePaths 获取 URL
      const urls = this.imageLoader.imagePaths.getStateImages(state);
      console.log(`  - imagePaths.getStateImages 返回:`, {
        count: urls.length,
        firstUrl: urls.length > 0 ? urls[0].substring(0, 50) + '...' : '无'
      });
      if (urls.length > 0) {
        // 直接使用第一个 URL
        const oldState = this.currentState;
        this.currentState = state;
        this.currentImageIndex = 0;
        this.stateTransition.transition(oldState, state, urls[0], () => {
          // 确保图片 src 已设置（双重保险）
          if (this.imgElement && (!this.imgElement.src || this.imgElement.src === '')) {
            console.warn('[XixiPNGWidget] transition 完成后 src 仍为空，强制设置');
            this.imgElement.src = urls[0];
          }
          
          // 确保图片可见（在启动动画之前）
          if (this.imgElement) {
            this.imgElement.style.visibility = 'visible';
            this.imgElement.style.display = 'block';
            if (this.imgElement.src && this.imgElement.src !== '') {
              const currentOpacity = parseFloat(this.imgElement.style.opacity) || 0;
              if (currentOpacity === 0 || isNaN(currentOpacity)) {
                this.imgElement.style.opacity = '1';
              }
            }
          }
          
          // 延迟启动动画，确保 src 已设置
          setTimeout(() => {
            if (state === 'baseline' && this.baselineAnimation) {
              this.baselineAnimation.reset();
              this.baselineAnimation.start();
            } else if (state === 'calm' && this.calmAnimation) {
              this.calmAnimation.reset();
              this.calmAnimation.start();
            } else if (state === 'restless' && this.restlessAnimation) {
              this.restlessAnimation.reset();
              this.restlessAnimation.start();
            }
          }, 50);
        });
        return;
      }
      return;
    }

    // 更新当前状态
    const oldState = this.currentState;
    this.currentState = state;
    this.currentImageIndex = 0;

    // 使用状态切换管理器进行切换
    let newImage = images[0];
    
    // 确保 newImage 存在
    if (!newImage) {
      const urls = this.imageLoader.imagePaths.getStateImages(state);
      if (urls.length > 0) {
        newImage = urls[0];
      } else {
        return;
      }
    }
    
    // 如果 newImage 是 URL 字符串，直接使用它（switchImage 可以处理 URL 字符串）
    if (typeof newImage === 'string') {
      console.log(`  - 图片未加载，直接使用 URL: ${newImage.substring(0, 50)}...`);
      // 直接使用 URL 字符串，switchImage 会处理
      this.stateTransition.transition(oldState, state, newImage, () => {
        // 切换完成后启动新状态的动画
        if (state === 'baseline' && this.baselineAnimation) {
          this.baselineAnimation.reset();
          this.baselineAnimation.start();
        } else if (state === 'calm' && this.calmAnimation) {
          this.calmAnimation.reset();
          this.calmAnimation.start();
        } else if (state === 'restless' && this.restlessAnimation) {
          this.restlessAnimation.reset();
          this.restlessAnimation.start();
        }
      });
      // 同时尝试在后台加载图片，以便下次使用
      this.imageLoader.loadImage(newImage).catch((error) => {
        console.warn(`  - 后台加载图片失败:`, error);
      });
      return;
    }
    
    console.log(`  - 准备切换图片:`, {
      imageExists: !!newImage,
      imageSrc: newImage?.src ? newImage.src.substring(0, 50) + '...' : '空',
      imageComplete: newImage?.complete,
      imageNaturalWidth: newImage?.naturalWidth
    });
    
    // 验证图片对象
    if (!newImage) {
      console.error(`  - ❌ 图片对象无效: newImage 为 null 或 undefined`);
      return;
    }
    
    // 如果 newImage 是 Image 对象但没有 src，尝试从 imageLoader 获取
    if (!newImage.src) {
      const urls = this.imageLoader.imagePaths.getStateImages(state);
      if (urls.length > 0) {
        console.log(`  - 图片对象没有 src，尝试使用 URL: ${urls[0]}`);
        newImage = urls[0];
      } else {
        console.error(`  - ❌ 无法获取图片 URL`);
        return;
      }
    }
    
    // 获取图片 URL（用于回调中的备用设置）
    let fallbackUrl = null;
    if (typeof newImage === 'string') {
      fallbackUrl = newImage;
    } else if (newImage && newImage.src) {
      fallbackUrl = newImage.src;
    } else {
      const urls = this.imageLoader.imagePaths.getStateImages(state);
      if (urls.length > 0) {
        fallbackUrl = urls[0];
      }
    }
    
    this.stateTransition.transition(oldState, state, newImage, () => {
      // 确保图片 src 已设置（双重保险）
      if (this.imgElement && (!this.imgElement.src || this.imgElement.src === '') && fallbackUrl) {
        console.warn('[XixiPNGWidget] transition 完成后 src 仍为空，强制设置');
        this.imgElement.src = fallbackUrl;
      }
      
      // 确保图片可见（在启动动画之前）
      if (this.imgElement) {
        this.imgElement.style.visibility = 'visible';
        this.imgElement.style.display = 'block';
        // 如果图片 src 已设置，确保至少有一些可见度
        if (this.imgElement.src && this.imgElement.src !== '') {
          const currentOpacity = parseFloat(this.imgElement.style.opacity) || 0;
          if (currentOpacity === 0 || isNaN(currentOpacity)) {
            this.imgElement.style.opacity = '1';
          }
        }
      }
      
      // 延迟启动动画，确保 src 已设置
      setTimeout(() => {
        if (state === 'baseline' && this.baselineAnimation) {
          this.baselineAnimation.reset();
          this.baselineAnimation.start();
        } else if (state === 'calm' && this.calmAnimation) {
          this.calmAnimation.reset();
          this.calmAnimation.start();
        } else if (state === 'restless' && this.restlessAnimation) {
          this.restlessAnimation.reset();
          this.restlessAnimation.start();
        }
      }, 50);
    });
  }

  /**
   * 更新显示的图片
   * @param {Image} image - 图片对象
   */
  updateImage(image) {
    if (!this.imgElement || !image) {
      console.warn('[XixiPNGWidget] updateImage: imgElement 或 image 不存在', {
        hasImgElement: !!this.imgElement,
        hasImage: !!image
      });
      return;
    }

    // 获取图片 URL（支持 Image 对象或 URL 字符串）
    let imageSrc = null;
    if (typeof image === 'string') {
      imageSrc = image;
    } else if (image && image.src) {
      imageSrc = image.src;
    }
    
    if (!imageSrc) {
      console.warn('[XixiPNGWidget] updateImage: 无法获取图片 URL');
      return;
    }

    // 设置图片源（只在 src 变化时设置，避免重复触发 onload）
    if (this.imgElement.src !== imageSrc) {
      this.imgElement.src = imageSrc;
    }
    
    // 确保图片可见
    this.imgElement.style.opacity = '1';
    this.imgElement.style.display = 'block';
    this.imgElement.style.visibility = 'visible';
    
    // 注意：不再在这里设置 onerror 和 onload，因为已经在 createDOM() 中设置过了
    // 这样可以避免重复绑定事件监听器
  }

  /**
   * 更新视觉参数（大小、透明度等）
   */
  updateVisualParams() {
    if (!this.container || !this.imgElement) {
      console.warn('[XixiPNGWidget] updateVisualParams: container 或 imgElement 不存在');
      return;
    }

    // 确保 D_smooth 有最小值，避免尺寸为 0
    const safeD = Math.max(0.1, this.D_smooth);
    const params = this.mapDToVisualParams(safeD);
    
    // 确保尺寸至少是 sizeMin
    const finalSize = Math.max(this.config.sizeMin, params.size);
    
    // 更新容器尺寸
    this.container.style.width = `${finalSize}px`;
    this.container.style.height = `${finalSize}px`;
    
    // 确保图片始终可见
    if (this.imgElement.src && this.imgElement.src !== '') {
      this.imgElement.style.display = 'block';
      this.imgElement.style.visibility = 'visible';
      
      // 更新基础透明度（动画会在 applyChanges 中叠加变化）
      // 如果不在 baseline 状态，直接应用；如果在 baseline 状态，由动画控制
      if (this.currentState !== 'baseline') {
        this.imgElement.style.opacity = Math.max(0.5, params.opacity); // 确保至少 50% 可见
      } else {
        // baseline 状态：确保图片至少可见，动画会在此基础上调整
        // 如果动画还没有启动，先设置一个基础值
        if (!this.baselineAnimation || !this.baselineAnimation.isActive) {
          this.imgElement.style.opacity = Math.max(0.5, params.opacity);
        }
        // 如果动画已启动，让动画控制 opacity（但确保至少 0.3）
      }
    } else {
      // 如果 src 未设置，确保至少可见（等待 src 设置）
      this.imgElement.style.display = 'block';
      this.imgElement.style.visibility = 'visible';
      this.imgElement.style.opacity = '0.5'; // 临时可见度，等待图片加载
    }
  }

  /**
   * 获取基础透明度（供动画使用）
   * @returns {number} 基础透明度
   */
  getBaseOpacity() {
    const params = this.mapDToVisualParams(this.D_smooth);
    return params.opacity;
  }

  /**
   * 映射 D 值到视觉参数
   * @param {number} D - D 值 (0-1)
   * @returns {object} 视觉参数
   */
  mapDToVisualParams(D) {
    D = Math.max(0, Math.min(1, D));
    
    return {
      size: this.config.sizeMin + (this.config.sizeMax - this.config.sizeMin) * D,
      opacity: this.config.opacityMin + (this.config.opacityMax - this.config.opacityMin) * D
    };
  }

  /**
   * 平滑 D 值（EMA）
   * @param {number} deltaTime - 时间差（毫秒）
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
   * 设置 D 值
   * @param {number} D - D 值 (0-1)
   */
  setTurbulence(D) {
    // 直接设置 D 值，不进行平滑处理（由平滑函数负责）
    this.D_raw = Math.max(0, Math.min(1, D));
    
    // 立即同步 D_smooth，避免平滑算法导致延迟切换
    // 但保留平滑机制，用于后续的细微调整
    this.D_smooth = this.D_raw;
    
    // 如果已初始化，检查状态变化
    if (this.isInitialized) {
      this.update();
    }
  }

  /**
   * 启动动画循环
   */
  startAnimation() {
    if (this.animationId) {
      return; // 已在运行
    }

    const animate = () => {
      if (!this.isInitialized) {
        return;
      }

      const currentTime = Date.now();
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // 更新 Widget
      this.update(deltaTime);

      // 继续动画循环
      this.animationId = requestAnimationFrame(animate);
    };

    this.lastFrameTime = Date.now();
    this.animationId = requestAnimationFrame(animate);
    console.log('[XixiPNGWidget] 动画循环已启动');
  }

  /**
   * 停止动画循环
   */
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      console.log('[XixiPNGWidget] 动画循环已停止');
    }
  }

  /**
   * 更新 Widget（检查状态变化并更新显示）
   * @param {number} deltaTime - 时间差（毫秒）
   */
  update(deltaTime = null) {
    if (!this.isInitialized || this.isLoading) {
      return;
    }

    // 平滑 D 值（但只在 D_raw 不为 0 时平滑，避免从 0 平滑到默认值）
    // 如果 D_raw 为 0，说明等待后端设置，不进行平滑
    if (this.D_raw !== 0) {
      this.smoothDValue(deltaTime);
    }

    // 检查状态变化（如果 D 值为 0，不进行状态检查，避免切换到 baseline）
    if (this.D_raw === 0 && this.D_smooth === 0) {
      return; // 等待后端数据接口设置 D 值
    }

    // 检查状态变化
    let newState = this.stateManager.getState(this.D_smooth);
    
    // 开发阶段限制：如果检测到的状态未启用，强制使用 baseline
    if (!this.enabledStates.includes(newState)) {
      newState = 'baseline';
    }
    
    // 检查状态变化
    const stateChanged = this.stateManager.hasStateChanged(this.D_smooth);
    const widgetStateMismatch = this.currentState !== newState;
    
    if (stateChanged || widgetStateMismatch) {
      console.log(`[XixiPNGWidget] update: 检测到状态变化`, {
        D_smooth: this.D_smooth.toFixed(3),
        newState,
        currentState: this.currentState,
        stateManagerState: this.stateManager.currentState,
        stateChanged,
        widgetStateMismatch
      });
      this.switchToState(newState);
    }

    // 更新视觉参数
    this.updateVisualParams();

    // 更新状态动画
    if (this.currentState === 'baseline' && this.baselineAnimation) {
      if (!this.baselineAnimation.isActive) {
        // 防止状态已就位但动画未启动，导致图片不切换
        this.baselineAnimation.start();
      }
      this.baselineAnimation.update(deltaTime || 16.67);
    } else if (this.currentState === 'calm' && this.calmAnimation) {
      if (!this.calmAnimation.isActive) {
        this.calmAnimation.start();
      }
      this.calmAnimation.update(deltaTime || 16.67);
    } else if (this.currentState === 'restless' && this.restlessAnimation) {
      if (!this.restlessAnimation.isActive) {
        this.restlessAnimation.start();
      }
      this.restlessAnimation.update(deltaTime || 16.67);
    }
  }

  /**
   * 销毁 Widget
   */
  destroy() {
    // 停止动画
    this.stopAnimation();
    
    // 停止状态动画
    if (this.baselineAnimation) {
      this.baselineAnimation.stop();
    }
    if (this.calmAnimation) {
      this.calmAnimation.stop();
    }
    if (this.restlessAnimation) {
      this.restlessAnimation.stop();
    }
    
    if (this.imgElement && this.imgElement.parentNode) {
      this.imgElement.parentNode.removeChild(this.imgElement);
    }
    this.imgElement = null;
    this.isInitialized = false;
    console.log('[XixiPNGWidget] 已销毁');
  }

  /**
   * 获取当前状态信息（用于调试）
   * @returns {object} 状态信息
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      loading: this.isLoading,
      D_raw: this.D_raw,
      D_smooth: this.D_smooth,
      currentState: this.currentState,
      stateInfo: this.stateManager.getStateInfo(this.D_smooth),
      imageCount: this.imagePaths.getImageCount()
    };
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.XixiPNGWidget = XixiPNGWidget;
}

