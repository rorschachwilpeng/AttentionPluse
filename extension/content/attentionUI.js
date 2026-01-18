/**
 * attentionUI.js
 * 负责视觉呈现、Canvas 动画、调试面板等
 * 正在将 AttentionPulse 波形图 UI 替换为 Xixi (Jellyfish) 组件
 */

class AttentionUI {
  constructor(engine, settings) {
    this.engine = engine;
    this.settings = settings;
    
    // 待移除：旧的波形图相关状态
    this.pulseAnimationId = null;
    this.pulseStartTime = null;
    this.currentPulseColor = '#a0aec0';
    this.targetPulseColor = '#a0aec0';
    this.colorTransitionStartTime = null;
    this.colorTransitionStartColor = '#a0aec0';
    this.colorTransitionDuration = 1000;
    
    // Xixi (Jellyfish) 组件状态
    this.xixiEnabled = settings.xixiEnabled !== false;
    console.log(`[Xixi] 初始化状态: xixiEnabled=${this.xixiEnabled}`);
    this.xixiContainer = null;
    this.xixiWidget = null;
    this.xixiCanvas = null; // 保留用于向后兼容（已废弃）
    this.xixiAnimationId = null; // 保留用于向后兼容（已废弃）
    this.xixiStartTime = null; // 保留用于向后兼容（已废弃）
    
    // D 值状态
    this.D_raw = 0;
    this.D_smooth = 0;
    this.D_smoothAlpha = settings.xixiSmoothAlpha || 0.1;
    this.lastFrameTime = Date.now();
    
    // Mock 模式状态
    this.mockMode = null;
    this.mockOptions = null;
    this.mockIntervalId = null;
    this.mockSliderContainer = null;
    
    // 数据源配置
    this.useEngineData = settings.xixiUseEngineData !== false;
    
    // 视觉参数
    this.visualParams = { size: 0, opacity: 0, turbidity: 0 };
    
    // 配置参数
    this.xixiConfig = {
      position: settings.xixiPosition || 'top-left',
      offsetX: settings.xixiOffsetX || 20,
      offsetY: settings.xixiOffsetY || 20,
      scale: settings.xixiScale || 1.0,
      sizeMin: 40,
      sizeMax: 100,
      opacityMin: 0.5,
      opacityMax: 0.9,
      turbidityMin: 0,
      turbidityMax: 1
    };
    
    // 订阅引擎数据更新
    this.engine.onUpdate((data) => {
      this.onEngineUpdate(data);
    });
    
    // 初始化 Xixi 组件
    if (this.xixiEnabled) {
      this.initXixiWidget();
    }
  }

  onEngineUpdate(data) {
    // 待移除：旧的波形图颜色逻辑
    const targetColor = getFocusColor(data.focusLevel);
    if (targetColor !== this.targetPulseColor) {
      this.colorTransitionStartColor = this.currentPulseColor;
      this.targetPulseColor = targetColor;
      this.colorTransitionStartTime = Date.now();
    }
    
    // 从 Engine 数据更新 D 值
    if (this.xixiEnabled && !this.mockMode && this.useEngineData) {
      const D = this.calculateDFromEngine(data);
      this.setTurbulence(D);
    }
    
    // 如果开启调试，刷新数据面板
    if (this.settings.debug) {
      this.updateDebugInfo();
    }
  }

  showDebugInfo() {
    let debugDiv = document.getElementById('attentionPulse-debug');
    if (!debugDiv) {
      debugDiv = document.createElement('div');
      debugDiv.id = 'attentionPulse-debug';
      debugDiv.style.cssText = `
        position: fixed; top: 10px; right: 10px; background: rgba(0, 0, 0, 0.85);
        color: #0f0; padding: 12px; border-radius: 12px;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 11px; line-height: 1.4; z-index: 999999; pointer-events: none;
        max-width: 300px; max-height: 500px; overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);
      `;
      document.body.appendChild(debugDiv);
    }
    
    const oldCanvas = debugDiv.querySelector('#attentionPulse-wave');
    if (oldCanvas) {
      oldCanvas.remove();
      this.stopPulseAnimation();
    }

    this.updateDebugInfo(debugDiv);
  }

  updateDebugInfo(debugDiv = null) {
    if (!debugDiv) debugDiv = document.getElementById('attentionPulse-debug');
    if (!debugDiv) return;

    const stats = this.engine.getStatus();
    const content = window.attentionPulseContentExtractor?.getCurrentContent() || null;
    const tagInfo = window.clickedCardContent || {};
    const currentTagName = tagInfo.tagName || '探测中...';
    const hashtags = tagInfo.hashtags || [];

    const xixiData = {
      D_raw: this.D_raw || 0,
      D_smooth: this.D_smooth || 0,
      smoothAlpha: this.D_smoothAlpha || 0.1,
      size: this.visualParams?.size || 0,
      opacity: this.visualParams?.opacity || 0,
      turbidity: this.visualParams?.turbidity || 0
    };

    const dDifference = Math.abs(xixiData.D_raw - xixiData.D_smooth);
    const debugStyle = (bg, border) => `background: ${bg}; padding: 10px; border-radius: 8px; border: 1px solid ${border}; margin-bottom: 10px;`;
    const rowStyle = (mb = 6) => `margin-bottom: ${mb}px; display: flex; justify-content: space-between;`;

    const contentHTML = `
      <div style="font-weight: 600; margin-bottom: 12px; color: #fff; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
        <span>AttentionPulse <span style="color: #667eea;">Xixi</span></span>
        <span style="font-size: 10px; color: rgba(255, 255, 255, 0.4); font-weight: 400;">BETA V1.2</span>
      </div>
      
      <div style="${debugStyle('rgba(102, 126, 234, 0.15)', 'rgba(102, 126, 234, 0.3)')}">
        <div style="color: #667eea; font-weight: 600; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">D 值 (注意力扰动指数)</div>
        <div style="${rowStyle()}"><span style="color: #888;">D_raw:</span><span style="color: #fff; font-weight: bold;">${(xixiData.D_raw * 100).toFixed(1)}%</span></div>
        <div style="${rowStyle()}"><span style="color: #888;">D_smooth:</span><span style="color: #667eea; font-weight: bold;">${(xixiData.D_smooth * 100).toFixed(1)}%</span></div>
        <div style="${rowStyle(0)}"><span style="color: #888;">smoothAlpha:</span><span style="color: #fff;">${xixiData.smoothAlpha.toFixed(3)}</span></div>
        ${dDifference > 0.01 ? `<div style="margin-top: 4px; font-size: 9px; color: #888;">差异: ${(dDifference * 100).toFixed(1)}%</div>` : ''}
      </div>

      <div style="${debugStyle('rgba(30, 30, 30, 0.4)', 'rgba(255, 255, 255, 0.05)')}">
        <div style="color: #888; font-weight: 600; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">视觉参数</div>
        <div style="${rowStyle()}"><span style="color: #888;">尺寸 (Size):</span><span style="color: #fff;">${xixiData.size.toFixed(1)}px</span></div>
        <div style="${rowStyle()}"><span style="color: #888;">透明度 (Opacity):</span><span style="color: #fff;">${(xixiData.opacity * 100).toFixed(1)}%</span></div>
        <div style="${rowStyle(0)}"><span style="color: #888;">浑浊度 (Turbidity):</span><span style="color: #fff;">${(xixiData.turbidity * 100).toFixed(1)}%</span></div>
      </div>

      <div style="${debugStyle('rgba(30, 30, 30, 0.4)', 'rgba(255, 255, 255, 0.05)')}">
        <div style="color: #888; font-weight: 600; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">引擎数据 (参考)</div>
        <div style="${rowStyle()}"><span style="color: #888;">专注度 (Focus):</span><span style="color: ${getFocusColor(stats.focusLevel)}; font-weight: bold;">${(stats.focusLevel * 100).toFixed(0)}%</span></div>
        <div style="${rowStyle()}"><span style="color: #888;">发散度 (Diversity):</span><span style="color: #fff;">${(stats.diversity * 100).toFixed(0)}%</span></div>
        <div style="${rowStyle(0)}"><span style="color: #888;">当前标签:</span><span style="color: #fff;">${currentTagName}</span></div>
      </div>

      ${hashtags.length > 0 ? `<div style="margin: 10px 0; font-size: 10px; color: #666; display: flex; flex-wrap: wrap; gap: 4px;">
        ${hashtags.slice(0, 4).map(h => `<span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">#${h}</span>`).join('')}
      </div>` : ''}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px;">
        <div style="background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px;">
          <div style="color: #555; margin-bottom: 2px;">点击:</div>
          <div style="color: #fff;">${stats.actions.clicks}</div>
        </div>
        <div style="background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px;">
          <div style="color: #555; margin-bottom: 2px;">滚动:</div>
          <div style="color: #fff;">${stats.actions.scrolls}</div>
        </div>
      </div>
    `;

    debugDiv.innerHTML = contentHTML;
  }

  startPulseAnimation(canvas) {
    if (!canvas) return;
    this.pulseStartTime = Date.now();
    const ctx = canvas.getContext('2d');
    const cycleDuration = 2500;
    
    const draw = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - this.pulseStartTime;
      const progress = (elapsed % cycleDuration) / cycleDuration;
      
      if (this.colorTransitionStartTime && this.currentPulseColor !== this.targetPulseColor) {
        const transitionElapsed = Date.now() - this.colorTransitionStartTime;
        const transitionProgress = Math.min(transitionElapsed / this.colorTransitionDuration, 1);
        const easedProgress = easeInOutCubic(transitionProgress);
        this.currentPulseColor = interpolateColor(this.colorTransitionStartColor, this.targetPulseColor, easedProgress);
        if (transitionProgress >= 1) {
          this.currentPulseColor = this.targetPulseColor;
          this.colorTransitionStartTime = null;
        }
      }
      
      const stats = this.engine.getStatus();
      const amplitude = 3 + (stats.diversity * 27);
      const centerY = canvas.height / 2;
      const canvasWidth = canvas.width;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const points = [];
      const pointCount = 100;
      const frequency = 2;
      
      for (let i = 0; i <= pointCount; i++) {
        const x = (i / pointCount) * canvasWidth;
        const waveX = (x / canvasWidth + progress) % 1;
        const phase = waveX * Math.PI * 2 * frequency;
        const y = centerY + Math.sin(phase) * amplitude;
        points.push({ x, y });
      }
      
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        ctx.quadraticCurveTo(prev.x + (curr.x - prev.x) / 2, prev.y, curr.x, curr.y);
      }
      ctx.lineTo(canvasWidth, centerY);
      ctx.lineTo(0, centerY);
      ctx.closePath();
      
      ctx.fillStyle = this.currentPulseColor;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = this.currentPulseColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      this.pulseAnimationId = requestAnimationFrame(draw);
    };
    
    draw();
  }

  stopPulseAnimation() {
    if (this.pulseAnimationId) {
      cancelAnimationFrame(this.pulseAnimationId);
      this.pulseAnimationId = null;
    }
  }

  // ========== 辅助方法 ==========
  
  /**
   * 检查元素是否在视口内
   */
  checkViewportBounds(left, top, width, height) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedLeft = left;
    let adjustedTop = top;
    let reason = '';
    
    if (left < 0) {
      adjustedLeft = 10;
      reason += '左侧超出视口; ';
    } else if (left + width > viewportWidth) {
      adjustedLeft = viewportWidth - width - 10;
      reason += '右侧超出视口; ';
    }
    
    if (top < 0) {
      adjustedTop = 10;
      reason += '顶部超出视口; ';
    } else if (top + height > viewportHeight) {
      adjustedTop = viewportHeight - height - 10;
      reason += '底部超出视口; ';
    }
    
    const inViewport = (left >= 0 && left + width <= viewportWidth && 
                        top >= 0 && top + height <= viewportHeight);
    
    return {
      inViewport,
      reason: reason || '在视口内',
      adjusted: { left: adjustedLeft, top: adjustedTop }
    };
  }

  /**
   * 设置容器基础样式
   */
  setContainerBaseStyles(container, widgetSize) {
    container.style.position = 'fixed';
    container.style.width = `${widgetSize}px`;
    container.style.height = `${widgetSize}px`;
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.boxSizing = 'border-box';
    container.style.border = 'none';
    container.style.outline = 'none';
    container.style.lineHeight = '0';
    container.style.fontSize = '0';
    container.style.zIndex = '2147483647';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    container.style.isolation = 'isolate';
  }

  /**
   * 通用元素查找方法
   */
  findElementBySelectors(selectors, validator) {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (validator(rect)) {
            return { element, rect };
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }
    return null;
  }
  // ========== Xixi Widget 方法 ==========
  
  async initXixiWidget() {
    if (typeof XixiPNGWidget === 'undefined') {
      console.error('[Xixi] XixiPNGWidget 类未找到，请确保已加载相关模块');
      return;
    }

    if (this.xixiWidget) {
      this.destroyXixiWidget();
    }

    this.xixiContainer = document.createElement('div');
    this.xixiContainer.id = 'xixi-widget';
    
    const config = this.xixiConfig;
    const widgetSize = config.sizeMax * config.scale;
    
    // 尝试定位到搜索框左侧
    const searchBoxPosition = this.findSearchBoxPosition();
    
    if (searchBoxPosition) {
      let left = searchBoxPosition.left - widgetSize - 12;
      let top = searchBoxPosition.top;
      
      const viewportCheck = this.checkViewportBounds(left, top, widgetSize, widgetSize);
      if (!viewportCheck.inViewport) {
        console.warn(`[Xixi] 计算位置超出视口: ${viewportCheck.reason}，自动修正`);
        left = viewportCheck.adjusted.left;
        top = viewportCheck.adjusted.top;
      }
      
      this.setContainerBaseStyles(this.xixiContainer, widgetSize);
      this.xixiContainer.style.top = `${top}px`;
      this.xixiContainer.style.left = `${left}px`;
      this.xixiContainer.style.right = 'auto';
      this.xixiContainer.style.bottom = 'auto';
      
      setTimeout(() => {
        const actualRect = this.xixiContainer.getBoundingClientRect();
        const finalViewportCheck = this.checkViewportBounds(
          actualRect.left, actualRect.top, actualRect.width, actualRect.height
        );
        if (!finalViewportCheck.inViewport) {
          console.warn(`[Xixi] 实际位置仍然超出视口，进行二次修正`);
          this.xixiContainer.style.left = `${finalViewportCheck.adjusted.left}px`;
          this.xixiContainer.style.top = `${finalViewportCheck.adjusted.top}px`;
        }
      }, 100);
    } else {
      // 使用默认位置
      let top = config.offsetY, left = config.offsetX, right = 'auto', bottom = 'auto';
      
      if (config.position === 'top-right') {
        top = config.offsetY; left = 'auto'; right = config.offsetX;
      } else if (config.position === 'bottom-left') {
        top = 'auto'; left = config.offsetX; bottom = config.offsetY;
      } else if (config.position === 'bottom-right') {
        top = 'auto'; left = 'auto'; right = config.offsetX; bottom = config.offsetY;
      }
      
      this.setContainerBaseStyles(this.xixiContainer, widgetSize);
      this.xixiContainer.style.top = `${top}px`;
      this.xixiContainer.style.left = `${left}px`;
      this.xixiContainer.style.right = right;
      this.xixiContainer.style.bottom = bottom;
      
      console.log(`[Xixi] 使用默认位置: left=${left}px, top=${top}px`);
    }
    
    this.xixiContainer.style.opacity = '0';
    this.xixiContainer.style.transition = 'opacity 0.3s ease-in-out';
    
    document.body.appendChild(this.xixiContainer);
    
    if (document.body.lastChild !== this.xixiContainer) {
      document.body.removeChild(this.xixiContainer);
      document.body.appendChild(this.xixiContainer);
    }
    
    try {
      this.xixiWidget = new XixiPNGWidget(this.xixiContainer, {
        sizeMin: config.sizeMin,
        sizeMax: config.sizeMax,
        opacityMin: config.opacityMin,
        opacityMax: config.opacityMax
      });
      
      await this.xixiWidget.init();
      
      if (this.useEngineData && this.engine) {
        try {
          const status = this.engine.getStatus();
          if (status && (status.focusLevel !== undefined || status.diversity !== undefined)) {
            const initialD = this.calculateDFromEngine(status);
            if (initialD > 0) {
              this.D_raw = initialD;
              console.log(`[Xixi] 从 Engine 获取初始 D 值: ${initialD.toFixed(3)}`);
            }
          }
        } catch (error) {
          console.warn('[Xixi] 获取 Engine 初始数据失败:', error);
        }
      }
      
      if (this.D_raw < 0.1) {
        this.D_raw = 0.4;
        console.log('[Xixi] D 值过小，设置为最小可见值: 0.4');
      }
      
      this.D_smooth = this.D_raw;
      this.xixiWidget.setTurbulence(this.D_raw);
      
      setTimeout(() => {
        if (this.xixiWidget) {
          this.xixiWidget.updateVisualParams();
        }
      }, 100);
      
      this.xixiContainer.style.opacity = '1';
      this.xixiContainer.style.visibility = 'visible';
      this.xixiContainer.style.display = 'block';
      
      setTimeout(() => {
        this.adjustWidgetPosition();
      }, 200);
      
      console.log(`[Xixi] PNG Widget 已初始化 - D=${this.D_raw.toFixed(2)}`);
      
    } catch (error) {
      console.error('[Xixi] 初始化 PNG Widget 失败:', error);
      if (this.xixiContainer?.parentNode) {
        this.xixiContainer.parentNode.removeChild(this.xixiContainer);
      }
      this.xixiContainer = null;
      this.xixiWidget = null;
    }
  }

  findSearchBoxPosition() {
    const searchSelectors = [
      'input[placeholder*="搜索"]',
      'input[placeholder*="Search"]',
      'input[type="search"]',
      '.search-input',
      '[class*="search"] input',
      '[class*="Search"] input'
    ];
    
    const result = this.findElementBySelectors(searchSelectors, (rect) => {
      const viewportCheck = this.checkViewportBounds(rect.left, rect.top, rect.width, rect.height);
      return rect.width > 0 && rect.height > 0 && viewportCheck.inViewport;
    });
    
    if (result) {
      console.log(`[Xixi] 找到搜索框`, result.rect);
      return result.rect;
    }
    
    console.warn('[Xixi] 未找到搜索框，将使用默认位置');
    return null;
  }

  findHomeButtonPosition() {
    // 通过文本查找
    const allLinks = document.querySelectorAll('a, button, [role="button"], div[role="button"]');
    for (const link of allLinks) {
      const text = link.textContent?.trim() || '';
      if (text === '发现' || text === '首页' || text.includes('发现')) {
        const rect = link.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top >= 0) {
          console.log(`[Xixi] 通过文本找到 Home 按钮: "${text}"`, rect);
          return { ...rect, bottom: rect.bottom };
        }
      }
    }
    
    // 通过选择器查找
    const navSelectors = [
      'nav a:first-child',
      '[role="navigation"] a:first-child',
      'aside a:first-child',
      '[class*="sidebar"] a:first-child',
      '[class*="nav"] a:first-child'
    ];
    
    const result = this.findElementBySelectors(navSelectors, (rect) => 
      rect.width > 0 && rect.height > 0 && rect.top >= 0
    );
    
    if (result) {
      console.log(`[Xixi] 通过选择器找到 Home 按钮`, result.rect);
      return { ...result.rect, bottom: result.rect.bottom };
    }
    
    console.warn('[Xixi] 未找到 Home 按钮，将使用默认位置');
    return null;
  }

  adjustWidgetPosition() {
    if (!this.xixiContainer) return;

    const homeButtonPosition = this.findHomeButtonPosition();
    if (!homeButtonPosition) return;

    const config = this.xixiConfig;
    const widgetSize = config.sizeMax * config.scale;
    
    let left = homeButtonPosition.left + (homeButtonPosition.width - widgetSize) / 2;
    let top = homeButtonPosition.bottom + 8;
    
    const viewportCheck = this.checkViewportBounds(left, top, widgetSize, widgetSize);
    if (!viewportCheck.inViewport) {
      console.warn(`[Xixi] 调整位置超出视口: ${viewportCheck.reason}，自动修正`);
      left = viewportCheck.adjusted.left;
      top = viewportCheck.adjusted.top;
    }
    
    this.xixiContainer.style.position = 'fixed';
    this.xixiContainer.style.top = `${top}px`;
    this.xixiContainer.style.left = `${left}px`;
    this.xixiContainer.style.transform = 'none';
    
    setTimeout(() => {
      const newRect = this.xixiContainer.getBoundingClientRect();
      const finalViewportCheck = this.checkViewportBounds(
        newRect.left, newRect.top, newRect.width, newRect.height
      );
      if (!finalViewportCheck.inViewport) {
        console.warn(`[Xixi] 修正后位置仍然超出视口，进行二次修正`);
        this.xixiContainer.style.left = `${finalViewportCheck.adjusted.left}px`;
        this.xixiContainer.style.top = `${finalViewportCheck.adjusted.top}px`;
      }
    }, 50);
  }

  destroyXixiWidget() {
    this.stopMockMode();
    
    if (this.xixiWidget?.destroy) {
      this.xixiWidget.destroy();
    }
    
    this.stopXixiAnimation();
    
    if (this.xixiContainer?.parentNode) {
      this.xixiContainer.parentNode.removeChild(this.xixiContainer);
    }
    
    this.xixiContainer = null;
    this.xixiWidget = null;
    this.xixiCanvas = null;
    this.xixiStartTime = null;
    
    console.log('[Xixi] Widget 已销毁');
  }

  setTurbulence(D) {
    if (typeof D !== 'number' || isNaN(D)) {
      console.warn('[Xixi] setTurbulence: 无效的 D 值，使用 0');
      D = 0;
    }
    this.D_raw = Math.max(0, Math.min(1, D));
    
    if (this.xixiWidget?.setTurbulence) {
      this.xixiWidget.setTurbulence(D);
    }
    
    if (this.xixiEnabled && !this.xixiContainer) {
      this.initXixiWidget();
    }
  }

  smoothDValue(deltaTime = null) {
    if (this.D_raw === 0 && this.D_smooth === 0) return 0;
    
    let alpha = this.D_smoothAlpha;
    if (deltaTime !== null && deltaTime > 0) {
      const normalizedDelta = Math.min(deltaTime / 16.67, 3);
      alpha = Math.min(alpha * (1 + normalizedDelta * 0.5), 0.5);
    }
    
    this.D_smooth = alpha * this.D_raw + (1 - alpha) * this.D_smooth;
    this.D_smooth = Math.max(0, Math.min(1, this.D_smooth));
    return this.D_smooth;
  }

  setSmoothAlpha(alpha) {
    if (typeof alpha === 'number' && alpha >= 0 && alpha <= 1) {
      this.D_smoothAlpha = alpha;
      console.log(`[Xixi] 平滑系数已更新: ${alpha}`);
    } else {
      console.warn('[Xixi] setSmoothAlpha: 无效的 alpha 值，应在 [0, 1] 范围内');
    }
  }

  getDStatus() {
    return {
      D_raw: this.D_raw,
      D_smooth: this.D_smooth,
      smoothAlpha: this.D_smoothAlpha,
      difference: Math.abs(this.D_raw - this.D_smooth)
    };
  }

  resetSmooth() {
    this.D_smooth = this.D_raw;
    console.log('[Xixi] 平滑状态已重置');
  }

  mapDToVisualParams(D) {
    D = Math.max(0, Math.min(1, D));
    const config = this.xixiConfig;
    return {
      size: config.sizeMin + (config.sizeMax - config.sizeMin) * D,
      opacity: config.opacityMin + (config.opacityMax - config.opacityMin) * D,
      turbidity: config.turbidityMin + (config.turbidityMax - config.turbidityMin) * D
    };
  }

  updateVisualParams() {
    this.visualParams = this.mapDToVisualParams(this.D_smooth);
    return this.visualParams;
  }

  // ========== 已废弃的 Canvas 渲染方法（保留用于向后兼容） ==========
  
  renderXixi() {
    if (this.xixiWidget) {
      console.warn('[Xixi] renderXixi() 已废弃，PNG Widget 内部已管理渲染');
      return;
    }
    // Canvas 渲染代码已移除，如需使用请参考历史版本
  }

  drawTurbidityNoise(ctx, centerX, centerY, radius, turbidity) {
    // 已废弃
  }

  startXixiAnimation() {
    if (this.xixiWidget) {
      console.log('[Xixi] PNG Widget 内部已管理动画循环');
      return;
    }
    // Canvas 动画代码已移除，如需使用请参考历史版本
  }

  stopXixiAnimation() {
    if (this.xixiAnimationId) {
      cancelAnimationFrame(this.xixiAnimationId);
      this.xixiAnimationId = null;
    }
    
    if (this.xixiWidget?.stopAnimation) {
      this.xixiWidget.stopAnimation();
    }
  }

  calculateDFromEngine(engineData) {
    if (!engineData) return 0;
    const focusLevel = engineData.focusLevel || 0;
    const diversity = engineData.diversity || 0;
    const D = (1 - focusLevel) * 0.6 + diversity * 0.4;
    return Math.max(0, Math.min(1, D));
  }

  startMockMode(mode = 'random', options = {}) {
    this.stopMockMode();
    this.mockMode = mode;
    this.mockOptions = {
      interval: options.interval || 500,
      minValue: options.minValue || 0,
      maxValue: options.maxValue || 1,
      speed: options.speed || 0.5,
      ...options
    };
    
    if (mode === 'random') {
      this.mockIntervalId = setInterval(() => {
        const currentD = this.D_raw;
        const targetD = Math.random() * (this.mockOptions.maxValue - this.mockOptions.minValue) + this.mockOptions.minValue;
        const step = (targetD - currentD) * this.mockOptions.speed;
        this.setTurbulence(currentD + step);
      }, this.mockOptions.interval);
      console.log('[Xixi] Mock 模式已启动：随机波动');
    } else if (mode === 'slider') {
      this.createMockSlider();
      console.log('[Xixi] Mock 模式已启动：Slider 控制');
    }
  }

  stopMockMode() {
    if (this.mockIntervalId) {
      clearInterval(this.mockIntervalId);
      this.mockIntervalId = null;
    }
    if (this.mockSliderContainer) {
      this.destroyMockSlider();
    }
    this.mockMode = null;
    this.mockOptions = null;
  }

  createMockSlider() {
    if (this.mockSliderContainer) {
      this.destroyMockSlider();
    }
    
    this.mockSliderContainer = document.createElement('div');
    this.mockSliderContainer.id = 'xixi-mock-slider';
    this.mockSliderContainer.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; background: rgba(0, 0, 0, 0.8);
      padding: 16px; border-radius: 8px; z-index: 999999;
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px; color: #fff; min-width: 200px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    `;
    
    const title = document.createElement('div');
    title.textContent = 'Xixi Mock Control';
    title.style.cssText = 'margin-bottom: 12px; font-weight: 600; color: #fff;';
    this.mockSliderContainer.appendChild(title);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = this.D_raw.toString();
    slider.style.cssText = 'width: 100%; margin-bottom: 8px;';
    
    const valueDisplay = document.createElement('div');
    valueDisplay.style.cssText = 'text-align: center; color: #888; font-size: 11px;';
    valueDisplay.textContent = `D = ${(this.D_raw * 100).toFixed(0)}%`;
    
    slider.addEventListener('input', (e) => {
      const D = parseFloat(e.target.value);
      this.setTurbulence(D);
      valueDisplay.textContent = `D = ${(D * 100).toFixed(0)}%`;
    });
    
    this.mockSliderContainer.appendChild(slider);
    this.mockSliderContainer.appendChild(valueDisplay);
    document.body.appendChild(this.mockSliderContainer);
  }

  destroyMockSlider() {
    if (this.mockSliderContainer?.parentNode) {
      this.mockSliderContainer.parentNode.removeChild(this.mockSliderContainer);
    }
    this.mockSliderContainer = null;
  }

  // ========== 诊断方法 ==========
  
  /**
   * 诊断图片显示问题
   * 专门用于检查为什么图片不显示
   */
  /**
   * 诊断 DOM 结构（检查容器和图片元素的关系）
   */
  diagnoseDOMStructure() {
    console.log('%c========== DOM 结构诊断 ==========', 'color: #667eea; font-weight: bold; font-size: 16px;');
    
    // 1. 检查容器
    const container = document.getElementById('xixi-widget');
    if (!container) {
      console.error('✗ 容器 #xixi-widget 不存在');
      return;
    }
    
    console.log('✓ 容器存在');
    console.log('  容器 ID:', container.id);
    console.log('  容器子元素数量:', container.children.length);
    console.log('  容器 innerHTML 长度:', container.innerHTML.length);
    
    // 2. 检查所有子元素
    console.log('\n容器内的所有子元素:');
    Array.from(container.children).forEach((child, index) => {
      console.log(`  [${index}]`, {
        tagName: child.tagName,
        id: child.id || '无',
        className: child.className || '无',
        src: child.src ? child.src.substring(child.src.lastIndexOf('/') + 1) : '无',
        isImg: child.tagName === 'IMG'
      });
    });
    
    // 3. 检查 Widget 中的 imgElement
    if (this.xixiWidget && this.xixiWidget.imgElement) {
      const widgetImg = this.xixiWidget.imgElement;
      console.log('\nWidget 中的 imgElement:');
      console.log('  - 存在:', !!widgetImg);
      console.log('  - src:', widgetImg.src ? widgetImg.src.substring(widgetImg.src.lastIndexOf('/') + 1) : '空');
      console.log('  - 是否在容器中:', container.contains(widgetImg));
      console.log('  - 是否等于 DOM 中的 img:', widgetImg === container.querySelector('img'));
    }
    
    // 4. 检查是否有多个 img 元素
    const allImgs = container.querySelectorAll('img');
    console.log(`\n容器中共有 ${allImgs.length} 个 img 元素:`);
    allImgs.forEach((img, index) => {
      console.log(`  [${index}]`, {
        src: img.src ? img.src.substring(img.src.lastIndexOf('/') + 1) : '空',
        isWidgetImg: this.xixiWidget && img === this.xixiWidget.imgElement,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    });
    
    // 5. 检查是否有元素被隐藏或覆盖
    const visibleImgs = Array.from(allImgs).filter(img => {
      const style = window.getComputedStyle(img);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
    console.log(`\n可见的 img 元素数量: ${visibleImgs.length}`);
    if (visibleImgs.length !== allImgs.length) {
      console.warn('⚠️ 有 img 元素被隐藏！');
    }
  }

  diagnoseImageDisplay() {
    console.log('%c========== 图片显示诊断 ==========', 'color: #667eea; font-weight: bold; font-size: 16px;');
    
    const report = {
      containerExists: false,
      imgElementExists: false,
      imgSrcSet: false,
      imgLoaded: false,
      imgVisible: false,
      issues: [],
      suggestions: []
    };
    
    // 1. 检查容器
    const container = document.getElementById('xixi-widget');
    report.containerExists = !!container;
    
    if (!container) {
      report.issues.push('容器不存在');
      report.suggestions.push('调用: window.attentionPulseUI.initXixiWidget()');
      console.error('✗ 容器不存在');
      return report;
    }
    
    console.log('✓ 容器存在');
    const containerStyle = window.getComputedStyle(container);
    console.log('  容器样式:', {
      width: containerStyle.width,
      height: containerStyle.height,
      opacity: containerStyle.opacity,
      visibility: containerStyle.visibility,
      display: containerStyle.display
    });
    
    // 2. 检查图片元素
    const imgElement = container.querySelector('img');
    report.imgElementExists = !!imgElement;
    
    if (!imgElement) {
      report.issues.push('图片元素不存在');
      report.suggestions.push('检查 XixiPNGWidget.createDOM() 是否被调用');
      console.error('✗ 图片元素不存在');
      console.log('  容器内容:', container.innerHTML);
      console.log('  容器子元素数量:', container.children.length);
      return report;
    }
    
    console.log('✓ 图片元素存在');
    
    // 检查图片元素是否在容器中
    const isInContainer = container.contains(imgElement);
    if (!isInContainer) {
      report.issues.push('图片元素不在容器中');
      report.suggestions.push('检查图片元素是否正确添加到容器');
      console.error('✗ 图片元素不在容器中');
    } else {
      console.log('✓ 图片元素在容器中');
    }
    
    // 3. 检查图片 src
    report.imgSrcSet = !!imgElement.src && imgElement.src !== '';
    
    if (!report.imgSrcSet) {
      report.issues.push('图片 src 未设置');
      report.suggestions.push('检查 switchToState() 和 stateTransition.transition() 是否正常工作');
      console.error('✗ 图片 src 未设置');
    } else {
      console.log('✓ 图片 src 已设置:', imgElement.src.substring(0, 80) + '...');
    }
    
    // 4. 检查图片是否加载
    report.imgLoaded = imgElement.complete && imgElement.naturalWidth > 0;
    
    if (!report.imgLoaded) {
      report.issues.push('图片未加载完成');
      report.suggestions.push('检查图片路径是否正确，图片文件是否存在');
      console.error('✗ 图片未加载完成', {
        complete: imgElement.complete,
        naturalWidth: imgElement.naturalWidth,
        naturalHeight: imgElement.naturalHeight,
        src: imgElement.src
      });
      
      // 检查图片路径格式
      if (imgElement.src) {
        if (!imgElement.src.startsWith('chrome-extension://')) {
          console.warn('⚠️ 图片路径格式异常，应该是 chrome-extension:// 开头');
        }
        // 尝试验证图片路径
        const testImg = new Image();
        testImg.onload = () => {
          console.log('✓ 图片路径验证成功，图片可以加载');
        };
        testImg.onerror = () => {
          console.error('✗ 图片路径验证失败，图片无法加载:', imgElement.src);
          report.issues.push(`图片路径无效: ${imgElement.src}`);
        };
        testImg.src = imgElement.src;
      }
      
      // 检查图片加载错误
      imgElement.onerror = () => {
        console.error('图片加载失败:', imgElement.src);
        report.issues.push(`图片加载失败: ${imgElement.src}`);
      };
    } else {
      console.log('✓ 图片已加载', {
        width: imgElement.naturalWidth,
        height: imgElement.naturalHeight
      });
    }
    
    // 5. 检查图片可见性
    const imgStyle = window.getComputedStyle(imgElement);
    const imgRect = imgElement.getBoundingClientRect();
    
    // 检查图片的实际计算样式
    const computedOpacity = parseFloat(imgStyle.opacity);
    const computedVisibility = imgStyle.visibility;
    const computedDisplay = imgStyle.display;
    
    // 更严格的可见性检查
    const isOpacityVisible = computedOpacity > 0;
    const isVisibilityVisible = computedVisibility !== 'hidden';
    const isDisplayVisible = computedDisplay !== 'none';
    const hasSize = imgRect.width > 0 && imgRect.height > 0;
    
    report.imgVisible = isOpacityVisible && isVisibilityVisible && isDisplayVisible && hasSize;
    
    // 如果不可见，提供详细原因
    if (!report.imgVisible) {
      const reasons = [];
      if (!isOpacityVisible) reasons.push(`opacity 为 ${computedOpacity}`);
      if (!isVisibilityVisible) reasons.push(`visibility 为 ${computedVisibility}`);
      if (!isDisplayVisible) reasons.push(`display 为 ${computedDisplay}`);
      if (!hasSize) reasons.push(`尺寸为 ${imgRect.width}x${imgRect.height}`);
      console.warn('⚠️ 图片不可见的原因:', reasons.join(', '));
    }
    
    console.log('图片样式:', {
      opacity: imgStyle.opacity,
      computedOpacity: computedOpacity,
      visibility: imgStyle.visibility,
      display: imgStyle.display,
      width: imgStyle.width,
      height: imgStyle.height,
      actualSize: `${imgRect.width}x${imgRect.height}`
    });
    
    if (!report.imgVisible) {
      report.issues.push('图片不可见');
      if (imgStyle.opacity === '0') {
        report.suggestions.push('设置: imgElement.style.opacity = "1"');
      }
      if (imgStyle.visibility === 'hidden') {
        report.suggestions.push('设置: imgElement.style.visibility = "visible"');
      }
      if (imgStyle.display === 'none') {
        report.suggestions.push('设置: imgElement.style.display = "block"');
      }
      console.error('✗ 图片不可见');
    } else {
      console.log('✓ 图片可见');
    }
    
    // 6. 检查 Widget 状态
    if (this.xixiWidget) {
      console.log('Widget 状态:', {
        isInitialized: this.xixiWidget.isInitialized,
        currentState: this.xixiWidget.currentState,
        D_raw: this.xixiWidget.D_raw,
        D_smooth: this.xixiWidget.D_smooth
      });
      
      if (!this.xixiWidget.isInitialized) {
        report.issues.push('Widget 未初始化完成');
        report.suggestions.push('等待 Widget 初始化完成');
      }
    }
    
    // 输出总结
    console.log('\n%c========== 诊断总结 ==========', 'color: #667eea; font-weight: bold;');
    if (report.issues.length === 0) {
      console.log('%c✓ 未发现问题，图片应该正常显示', 'color: #48bb78; font-weight: bold;');
    } else {
      console.log(`%c✗ 发现 ${report.issues.length} 个问题:`, 'color: #ed8936; font-weight: bold;');
      report.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
    if (report.suggestions.length > 0) {
      console.log('\n修复建议:');
      report.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }
    
    return report;
  }
  
  /**
   * 测试图片路径（用于调试）
   * 验证图片 URL 是否正确生成
   */
  /**
   * 诊断图片读取状态
   * 检查图片路径生成、预加载状态、以及实际加载情况
   */
  /**
   * 检查是否被广告拦截器拦截
   */
  checkAdBlocker() {
    console.log('%c========== 广告拦截器检查 ==========', 'color: #667eea; font-weight: bold; font-size: 16px;');
    
    if (!this.xixiWidget || !this.xixiWidget.imageLoader) {
      console.error('✗ Widget 或 imageLoader 不存在');
      return;
    }
    
    const imagePaths = this.xixiWidget.imageLoader.imagePaths;
    const testUrl = imagePaths.getStateImages('baseline')[0];
    
    if (!testUrl) {
      console.error('✗ 无法获取测试 URL');
      return;
    }
    
    console.log('测试 URL:', testUrl);
    
    // 方法1: 使用 Image 对象测试
    const img = new Image();
    img.onload = () => {
      console.log('✓ 图片可以加载（Image 对象）');
    };
    img.onerror = () => {
      console.error('✗ 图片无法加载（Image 对象）');
      console.warn('⚠️ 可能被广告拦截器拦截');
    };
    img.src = testUrl;
    
    // 方法2: 使用 fetch 测试
    fetch(testUrl)
      .then(response => {
        if (response.ok) {
          console.log('✓ 图片可以访问（fetch）');
        } else {
          console.error('✗ 图片无法访问（fetch）:', response.status, response.statusText);
        }
      })
      .catch(error => {
        console.error('✗ fetch 失败:', error);
        if (error.message.includes('blocked') || error.name === 'TypeError') {
          console.warn('⚠️ 可能被广告拦截器拦截 (ERR_BLOCKED_BY_CLIENT)');
        }
      });
    
    // 方法3: 检查扩展 ID 和路径
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      console.log('扩展 ID:', chrome.runtime.id);
      console.log('URL 格式:', testUrl.startsWith('chrome-extension://') ? '正确' : '异常');
    }
    
    // 提供解决方案
    console.log('\n%c========== 解决方案 ==========', 'color: #667eea; font-weight: bold;');
    console.log('如果图片被拦截，可以尝试：');
    console.log('1. 检查浏览器扩展（AdBlock、uBlock Origin 等）');
    console.log('2. 在拦截器中添加白名单规则：');
    console.log('   - 允许扩展 ID:', chrome?.runtime?.id || '未知');
    console.log('   - 允许路径: chrome-extension://*/assets/xixi/*');
    console.log('3. 临时禁用广告拦截器测试');
  }

  diagnoseImageLoading() {
    console.log('%c========== 图片读取诊断 ==========', 'color: #667eea; font-weight: bold; font-size: 16px;');
    
    if (!this.xixiWidget || !this.xixiWidget.imageLoader) {
      console.error('✗ Widget 或 imageLoader 不存在');
      return;
    }
    
    const imageLoader = this.xixiWidget.imageLoader;
    const imagePaths = imageLoader.imagePaths;
    
    // 1. 检查 chrome.runtime API
    console.log('1. Chrome Extension API 检查:');
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
      console.error('  ✗ chrome.runtime.getURL 不可用');
      return;
    }
    console.log('  ✓ chrome.runtime.getURL 可用');
    console.log('  扩展 ID:', chrome.runtime.id);
    
    // 2. 检查图片路径生成
    console.log('2. 图片路径生成检查:');
    const testState = 'restless';
    const urls = imagePaths.getStateImages(testState);
    console.log(`  状态 "${testState}" 的图片 URL:`, urls);
    if (urls.length === 0) {
      console.error('  ✗ 无法生成图片 URL');
      return;
    }
    console.log(`  ✓ 成功生成 ${urls.length} 个 URL`);
    
    // 3. 检查图片预加载状态
    console.log('3. 图片预加载状态:');
    const allUrls = imagePaths.getAllImages();
    console.log(`  总图片数: ${allUrls.length}`);
    
    let loadedCount = 0;
    let failedCount = 0;
    allUrls.forEach(url => {
      const img = imageLoader.getImage(url);
      if (img) {
        loadedCount++;
      } else {
        failedCount++;
      }
    });
    console.log(`  已加载: ${loadedCount}/${allUrls.length}`);
    console.log(`  未加载: ${failedCount}/${allUrls.length}`);
    
    // 4. 检查当前状态的图片
    console.log('4. 当前状态图片检查:');
    const currentState = this.xixiWidget.currentState || 'restless';
    const stateImages = imageLoader.getStateImages(currentState);
    console.log(`  状态 "${currentState}" 的图片:`, {
      count: stateImages.length,
      types: stateImages.map(img => typeof img),
      firstItem: stateImages.length > 0 ? (typeof stateImages[0] === 'string' ? stateImages[0].substring(0, 50) + '...' : 'Image对象') : '无'
    });
    
    // 5. 测试图片 URL 是否可访问
    console.log('5. 图片 URL 可访问性测试:');
    if (urls.length > 0) {
      const testUrl = urls[0];
      const testImg = new Image();
      testImg.onload = () => {
        console.log(`  ✓ 图片可以加载: ${testUrl.substring(0, 50)}...`);
        console.log(`    尺寸: ${testImg.naturalWidth}x${testImg.naturalHeight}`);
      };
      testImg.onerror = () => {
        console.error(`  ✗ 图片无法加载: ${testUrl}`);
        console.error(`    可能原因: 文件不存在、路径错误、权限问题`);
      };
      testImg.src = testUrl;
    }
    
    // 6. 检查图片文件是否存在（通过文件系统）
    console.log('6. 图片文件检查:');
    console.log('  基础路径:', imagePaths.basePath);
    console.log('  图片文件配置:', imagePaths.imageFiles);
    
    return {
      chromeRuntimeAvailable: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL,
      extensionId: chrome?.runtime?.id,
      totalImages: allUrls.length,
      loadedCount,
      failedCount,
      currentState,
      stateImagesCount: stateImages.length
    };
  }

  testImagePaths() {
    if (!this.xixiWidget || !this.xixiWidget.imageLoader) {
      console.error('Widget 未初始化');
      return;
    }
    
    const imagePaths = this.xixiWidget.imageLoader.imagePaths;
    const baselineUrls = imagePaths.getStateImages('baseline');
    
    console.log('Baseline 图片 URL:');
    baselineUrls.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    
    // 测试第一个 URL 是否可以访问
    if (baselineUrls.length > 0) {
      const testImg = new Image();
      testImg.onload = () => {
        console.log('✓ 图片可以加载:', baselineUrls[0]);
      };
      testImg.onerror = () => {
        console.error('✗ 图片无法加载:', baselineUrls[0]);
      };
      testImg.src = baselineUrls[0];
    }
    
    return baselineUrls;
  }

  /**
   * 强制显示图片（用于调试）
   * 尝试修复常见的图片显示问题
   */
  forceShowImage() {
    console.log('%c========== 强制显示图片 ==========', 'color: #667eea; font-weight: bold;');
    
    const container = document.getElementById('xixi-widget');
    if (!container) {
      console.error('容器不存在，无法显示图片');
      return;
    }
    
    const imgElement = container.querySelector('img');
    if (!imgElement) {
      console.error('图片元素不存在');
      return;
    }
    
    // 强制设置图片可见性
    imgElement.style.opacity = '1';
    imgElement.style.visibility = 'visible';
    imgElement.style.display = 'block';
    
    console.log('✓ 图片样式已强制设置');
    
    // 如果图片 src 未设置，尝试设置
    if (!imgElement.src || imgElement.src === '') {
      console.log('图片 src 未设置，尝试从 Widget 获取...');
      
      if (this.xixiWidget && this.xixiWidget.imageLoader) {
        // 获取 baseline 状态的图片（可能是 Image 对象或 URL 字符串）
        const images = this.xixiWidget.imageLoader.getStateImages('baseline');
        if (images.length > 0) {
          let imageSrc = null;
          if (typeof images[0] === 'string') {
            // 如果是 URL 字符串，直接使用
            imageSrc = images[0];
          } else if (images[0].src) {
            // 如果是 Image 对象，使用其 src
            imageSrc = images[0].src;
          } else {
            // 尝试从 imagePaths 获取 URL
            const urls = this.xixiWidget.imageLoader.imagePaths.getStateImages('baseline');
            if (urls.length > 0) {
              imageSrc = urls[0];
            }
          }
          
          if (imageSrc) {
            imgElement.src = imageSrc;
            console.log('✓ 已设置图片 src:', imageSrc.substring(0, 80) + '...');
          } else {
            console.error('无法获取图片路径');
          }
        } else {
          console.error('无法获取图片，尝试重新切换状态...');
          // 尝试重新切换状态
          if (this.xixiWidget.switchToState) {
            this.xixiWidget.switchToState('baseline');
          }
        }
      } else {
        console.error('Widget 或 imageLoader 不存在');
      }
    } else {
      console.log('图片 src 已设置:', imgElement.src.substring(0, 80) + '...');
      
      // 如果图片未加载，尝试重新加载
      if (!imgElement.complete || imgElement.naturalWidth === 0) {
        console.log('图片未加载，尝试重新加载...');
        const currentSrc = imgElement.src;
        imgElement.src = '';
        setTimeout(() => {
          imgElement.src = currentSrc;
          console.log('✓ 已触发重新加载');
        }, 100);
      }
    }
    
    // 检查容器样式
    container.style.opacity = '1';
    container.style.visibility = 'visible';
    container.style.display = 'block';
    
    console.log('✓ 容器样式已强制设置');
    console.log('\n%c========== 完成 ==========', 'color: #48bb78; font-weight: bold;');
    console.log('如果图片仍然不显示，请检查:');
    console.log('  1. 图片路径是否正确');
    console.log('  2. 图片文件是否存在');
    console.log('  3. 浏览器控制台是否有错误信息');
  }
  
  diagnoseXixi() {
    console.log('%c========== Xixi Widget 诊断 ==========', 'color: #667eea; font-weight: bold; font-size: 16px;');
    
    const report = {
      enabled: this.xixiEnabled,
      initialized: !!(this.xixiContainer && this.xixiWidget),
      domExists: false,
      visible: false,
      hasCanvas: false,
      dValues: { D_raw: this.D_raw, D_smooth: this.D_smooth, smoothAlpha: this.D_smoothAlpha },
      visualParams: { ...this.visualParams },
      config: { ...this.xixiConfig },
      errors: []
    };
    
    if (!report.enabled) {
      report.errors.push('Xixi 未启用，请在 settings 中设置 xixiEnabled: true');
    }
    
    if (!report.initialized) {
      report.errors.push('组件未初始化，尝试调用 initXixiWidget()');
        if (this.xixiEnabled) {
        try {
          this.initXixiWidget();
          report.initialized = !!(this.xixiContainer && this.xixiWidget);
      } catch (error) {
        report.errors.push(`重新初始化失败: ${error.message}`);
        }
      }
    }

    const domElement = document.getElementById('xixi-widget');
    report.domExists = !!domElement;
    
    if (report.domExists) {
      const computedStyle = window.getComputedStyle(domElement);
      const rect = domElement.getBoundingClientRect();
      
      report.visible = computedStyle.opacity !== '0' && 
                      computedStyle.visibility !== 'hidden' && 
                      computedStyle.display !== 'none' &&
                      rect.width > 0 && 
                      rect.height > 0;
      
      if (!report.visible) {
        report.errors.push(`元素不可见: opacity=${computedStyle.opacity}, visibility=${computedStyle.visibility}, display=${computedStyle.display}`);
    }

      const imgElement = domElement.querySelector('img');
      report.hasCanvas = !!imgElement;
      if (!report.hasCanvas) {
        report.errors.push('容器中没有图片元素（PNG Widget 未正确初始化）');
        }
      } else {
      report.errors.push('DOM 中找不到 #xixi-widget 元素');
    }
    
    if (this.D_raw < 0.1) {
      report.errors.push(`D 值太小 (${this.D_raw.toFixed(3)})，可能导致 widget 几乎不可见`);
    }
    if (this.visualParams.opacity < 0.05) {
      report.errors.push(`透明度太低 (${this.visualParams.opacity.toFixed(3)})，几乎不可见`);
    }
    if (this.visualParams.size < 10) {
      report.errors.push(`尺寸太小 (${this.visualParams.size.toFixed(1)}px)，可能看不见`);
    }

    console.log(`%c[诊断结果] ${report.errors.length === 0 ? '✓ 未发现问题' : `✗ 发现 ${report.errors.length} 个问题`}`, 
      `color: ${report.errors.length === 0 ? '#48bb78' : '#ed8936'}; font-weight: bold;`);
    
    if (report.errors.length > 0) {
      report.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    return report;
  }

  diagnoseViewport() {
    console.log('%c========== 视口诊断 ==========', 'color: #667eea; font-weight: bold; font-size: 16px;');
    
    const report = {
      widgetExists: false,
      inViewport: false,
      viewportInfo: { width: window.innerWidth, height: window.innerHeight, scrollX: window.scrollX, scrollY: window.scrollY },
      widgetPosition: {},
      issues: [],
      suggestions: []
    };
    
    const widget = document.getElementById('xixi-widget');
    report.widgetExists = !!widget;
    
    if (!widget) {
      report.issues.push('Widget 元素不存在');
      report.suggestions.push('尝试调用: window.attentionPulseUI.initXixiWidget()');
      console.error('✗ Widget 元素不存在');
      return report;
    }
    
    const rect = widget.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(widget);
    
    report.widgetPosition = {
      left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
      width: rect.width, height: rect.height,
      position: computedStyle.position, zIndex: computedStyle.zIndex,
      opacity: computedStyle.opacity, visibility: computedStyle.visibility,
      display: computedStyle.display
    };
    
    const viewportCheck = this.checkViewportBounds(rect.left, rect.top, rect.width, rect.height);
    report.inViewport = viewportCheck.inViewport;
    
    if (viewportCheck.inViewport) {
      console.log('%c✓ Widget 在视口内', 'color: #48bb78; font-weight: bold;');
    } else {
      console.error(`%c✗ Widget 超出视口: ${viewportCheck.reason}`, 'color: #ed8936; font-weight: bold;');
      report.issues.push(`超出视口: ${viewportCheck.reason}`);
      report.suggestions.push(`建议修正位置: left=${viewportCheck.adjusted.left}px, top=${viewportCheck.adjusted.top}px`);
    }
    
    if (computedStyle.opacity === '0') report.issues.push('透明度为 0，不可见');
    if (computedStyle.visibility === 'hidden') report.issues.push('visibility 为 hidden，不可见');
    if (computedStyle.display === 'none') report.issues.push('display 为 none，不可见');
    if (rect.width === 0 || rect.height === 0) report.issues.push(`尺寸为 0: width=${rect.width}px, height=${rect.height}px`);
    
    console.log(`%c[诊断结果] ${report.issues.length === 0 ? '✓ 未发现问题' : `✗ 发现 ${report.issues.length} 个问题`}`, 
      `color: ${report.issues.length === 0 ? '#48bb78' : '#ed8936'}; font-weight: bold;`);
    
    if (report.suggestions.length > 0) {
      console.log('修复建议:');
      report.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    return report;
  }

  forceShowXixi() {
    console.log('%c========== 强制显示 Xixi Widget ==========', 'color: #667eea; font-weight: bold;');
    
    if (!this.xixiContainer) {
      console.log('Widget 未初始化，正在初始化...');
      this.initXixiWidget();
    }
    
    if (this.xixiContainer) {
      const config = this.xixiConfig;
      const widgetSize = config.sizeMax * config.scale;
      
      this.setContainerBaseStyles(this.xixiContainer, widgetSize);
      this.xixiContainer.style.opacity = '1';
      this.xixiContainer.style.visibility = 'visible';
      this.xixiContainer.style.display = 'block';
      this.xixiContainer.style.top = '20px';
      this.xixiContainer.style.left = '20px';
      this.xixiContainer.style.right = 'auto';
      this.xixiContainer.style.bottom = 'auto';
      
      console.log('✓ 容器样式已强制设置');
    }
    
    this.setTurbulence(0.5);
    console.log('✓ D 值已设置为 0.5，PNG Widget 会自动更新');
    
    const domElement = document.getElementById('xixi-widget');
    if (domElement) {
      const rect = domElement.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(domElement);
      console.log(`位置: x=${rect.x.toFixed(0)}px, y=${rect.y.toFixed(0)}px, 尺寸: ${rect.width.toFixed(0)}px x ${rect.height.toFixed(0)}px`);
      
      const viewportCheck = this.checkViewportBounds(rect.left, rect.top, rect.width, rect.height);
      if (!viewportCheck.inViewport) {
        console.warn(`⚠️ Widget 超出视口: ${viewportCheck.reason}`);
        this.xixiContainer.style.left = `${viewportCheck.adjusted.left}px`;
        this.xixiContainer.style.top = `${viewportCheck.adjusted.top}px`;
      } else {
        console.log('✓ Widget 在视口内');
      }
      
      const elementAtPoint = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      if (elementAtPoint && elementAtPoint !== domElement && !domElement.contains(elementAtPoint)) {
        console.warn('⚠️ 可能被其他元素遮挡:', elementAtPoint);
      }
    }
    
    let testMarker = document.getElementById('xixi-test-marker');
    if (!testMarker) {
      testMarker = document.createElement('div');
      testMarker.id = 'xixi-test-marker';
      const markerSize = this.xixiConfig.sizeMax * this.xixiConfig.scale;
      testMarker.style.cssText = `
        position: fixed; top: 20px; left: 20px;
        width: ${markerSize}px; height: ${markerSize}px;
        border: 2px solid red; background: rgba(255, 0, 0, 0.1);
        z-index: 999998; pointer-events: none; box-sizing: border-box;
      `;
      testMarker.innerHTML = '<div style="color: red; font-size: 10px; padding: 2px;">Xixi 应该在这里</div>';
      document.body.appendChild(testMarker);
      console.log('✓ 已创建测试标记（红色边框）');
    }
    
    console.log('\n%c========== 完成 ==========', 'color: #48bb78; font-weight: bold;');
  }
}
