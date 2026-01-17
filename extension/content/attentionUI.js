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
    
    // UI 刷新心跳
    this.uiHeartbeat = setInterval(() => {
      if (this.settings.debug) {
        this.updateDebugInfo();
      }
    }, 1000);
    
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
    const sessionStats = this.engine.getSessionStats ? this.engine.getSessionStats() : [];
    
    // 如果不在详情页，展示不同的状态
    const isDetail = this.engine.isDetailActive;
    const tagInfo = isDetail ? (window.clickedCardContent || {}) : {};
    const currentTagName = isDetail ? (tagInfo.tagName || '分析中...') : '浏览列表...';
    const hashtags = isDetail ? (tagInfo.hashtags || []) : [];
    const currentStayTime = this.engine.getCurrentPageStayTime() / 1000;

    const contentHTML = `
      <div style="font-weight: 600; margin-bottom: 12px; color: #fff; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
        <span>AttentionPulse</span>
        <span style="font-size: 10px; color: rgba(255, 255, 255, 0.4); font-weight: 400;">BETA V1.3</span>
      </div>
      
      <div style="background: rgba(30, 30, 30, 0.4); padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 12px;">
        <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span style="color: #888;">当前正在看:</span>
          <span style="color: ${isDetail ? '#ff2442' : '#888'}; font-weight: bold;">${currentTagName}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">本次停留:</span>
          <span style="color: #fff;">${currentStayTime.toFixed(1)}s</span>
        </div>
      </div>

      <div style="background: rgba(255, 255, 255, 0.03); padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); max-height: 200px; overflow-y: auto;">
        <div style="font-size: 10px; color: #00c8ff; margin-bottom: 8px; font-weight: 600; display: flex; justify-content: space-between;">
          <span>会话标签统计 (按时长排序)</span>
          <span>数量 / 时长</span>
        </div>
        ${sessionStats.length === 0 ? '<div style="color: #444; text-align: center; font-size: 10px; padding: 10px;">暂无统计数据</div>' : ''}
        ${sessionStats.slice(0, 8).map(item => {
          const maxTime = (sessionStats[0] && sessionStats[0].stayTime) || 1;
          const percentage = Math.min(100, (item.stayTime / maxTime) * 100);
          return `
            <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 10px;">
              <span style="color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px;">${item.name}</span>
              <div style="flex: 1; height: 4px; background: rgba(255,255,255,0.05); margin: 0 8px; border-radius: 2px; position: relative; overflow: hidden;">
                <div style="height: 100%; background: #00c8ff; width: ${percentage}%;"></div>
              </div>
              <span style="color: #888; width: 65px; text-align: right; font-variant-numeric: tabular-nums;">${item.count}篇/${(item.stayTime / 1000).toFixed(0)}s</span>
            </div>
          `;
        }).join('')}
      </div>

      <div style="margin: 12px 0; font-size: 10px; color: #666; display: flex; flex-wrap: wrap; gap: 4px;">
        ${hashtags.slice(0, 4).map(h => `<span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">#${h}</span>`).join('')}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px;">
        <div style="background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px;">
          <div style="color: #555; margin-bottom: 2px;">会话点击:</div>
          <div style="color: #fff;">${stats.actions.clicks}</div>
        </div>
        <div style="background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px;">
          <div style="color: #555; margin-bottom: 2px;">会话滚动:</div>
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
