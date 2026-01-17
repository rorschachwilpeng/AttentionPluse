/**
 * attentionUI.js
 * 负责视觉呈现、Canvas 动画、调试面板等
 */

class AttentionUI {
  constructor(engine, settings) {
    this.engine = engine;
    this.settings = settings;
    this.pulseAnimationId = null;
    this.pulseStartTime = null;
    
    // 视觉状态
    this.currentPulseColor = '#a0aec0';
    this.targetPulseColor = '#a0aec0';
    this.colorTransitionStartTime = null;
    this.colorTransitionStartColor = '#a0aec0';
    this.colorTransitionDuration = 1000;
    
    // 订阅引擎数据更新
    this.engine.onUpdate((data) => {
      this.onEngineUpdate(data);
    });
  }

  onEngineUpdate(data) {
    // 1. 更新颜色目标
    const targetColor = getFocusColor(data.focusLevel);
    if (targetColor !== this.targetPulseColor) {
      this.colorTransitionStartColor = this.currentPulseColor;
      this.targetPulseColor = targetColor;
      this.colorTransitionStartTime = Date.now();
    }
    
    // 2. 如果开启调试，刷新数据面板
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
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.85);
        color: #0f0;
        padding: 12px;
        border-radius: 12px;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 11px;
        line-height: 1.4;
        z-index: 999999;
        pointer-events: none;
        max-width: 300px;
        max-height: 500px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
      `;
      document.body.appendChild(debugDiv);
    }
    
    let pulseCanvas = debugDiv.querySelector('#attentionPulse-wave');
    if (!pulseCanvas) {
      pulseCanvas = document.createElement('canvas');
      pulseCanvas.id = 'attentionPulse-wave';
      pulseCanvas.width = 276;
      pulseCanvas.height = 60;
      pulseCanvas.style.cssText = `
        width: 100%;
        height: 60px;
        margin-bottom: 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
      `;
      debugDiv.appendChild(pulseCanvas);
      this.startPulseAnimation(pulseCanvas);
    }

    this.updateDebugInfo(debugDiv);
  }

  updateDebugInfo(debugDiv = null) {
    if (!debugDiv) debugDiv = document.getElementById('attentionPulse-debug');
    if (!debugDiv) return;

    const stats = this.engine.getStatus();
    const content = window.attentionPulseContentExtractor 
      ? window.attentionPulseContentExtractor.getCurrentContent() 
      : null;

    if (!content) return;

    const tagInfo = window.clickedCardContent || {};
    const currentTagName = tagInfo.tagName || '探测中...';
    const hashtags = tagInfo.hashtags || [];

    const contentHTML = `
      <div style="font-weight: 600; margin-bottom: 12px; color: #fff; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
        <span>AttentionPulse</span>
        <span style="font-size: 10px; color: rgba(255, 255, 255, 0.4); font-weight: 400;">BETA V1.2</span>
      </div>
      
      <div style="background: rgba(30, 30, 30, 0.4); padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span style="color: #888;">专注度 (Focus):</span>
          <span style="color: ${getFocusColor(stats.focusLevel)}; font-weight: bold;">${(stats.focusLevel * 100).toFixed(0)}%</span>
        </div>
        <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span style="color: #888;">发散度 (Diversity):</span>
          <span style="color: #fff;">${(stats.diversity * 100).toFixed(0)}%</span>
        </div>
        <div style="margin-bottom: 0; display: flex; justify-content: space-between;">
          <span style="color: #888;">当前标签:</span>
          <span style="color: #fff;">${currentTagName}</span>
        </div>
      </div>

      <div style="margin: 12px 0; font-size: 10px; color: #666; display: flex; flex-wrap: wrap; gap: 4px;">
        ${hashtags.slice(0, 4).map(h => `<span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">#${h}</span>`).join('')}
      </div>

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

    // 重新组合，不破坏 Canvas 动画层
    const canvas = debugDiv.querySelector('#attentionPulse-wave');
    const containerId = 'attentionPulse-debug-info-container';
    let infoContainer = debugDiv.querySelector(`#${containerId}`);
    
    if (!infoContainer) {
      infoContainer = document.createElement('div');
      infoContainer.id = containerId;
      debugDiv.insertBefore(infoContainer, canvas);
    }
    infoContainer.innerHTML = contentHTML;
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
      
      // 颜色插值平滑处理
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
      
      // 绘制波形和其填充区域
      ctx.beginPath();
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
      
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        ctx.quadraticCurveTo(cp1x, prev.y, curr.x, curr.y);
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
}
