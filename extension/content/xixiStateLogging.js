/**
 * Xixi 状态日志打印代码集合
 * 用于观察每个状态的详细信息
 */

(function() {
  'use strict';
  
  if (typeof window === 'undefined' || !window.attentionPulseUI) {
    console.error('[Xixi日志] attentionPulseUI 未找到');
    return;
  }
  
  const ui = window.attentionPulseUI;
  const widget = ui.xixiWidget;
  
  if (!widget) {
    console.error('[Xixi日志] xixiWidget 未找到');
    return;
  }
  
  // 通用状态信息打印
  function getStateInfo() {
    const stateInfo = widget.stateManager.getStateInfo(widget.D_smooth);
    const restlessLevel = widget.stateManager.getRestlessLevel(widget.D_smooth);
    
    return {
      'D值 (raw)': ui.D_raw.toFixed(3),
      'D值 (smooth)': widget.D_smooth.toFixed(3),
      '主状态': stateInfo.state,
      '浮躁级别': restlessLevel || 'N/A',
      'Widget状态': widget.currentState,
      'StateManager状态': widget.stateManager.currentState,
      '图片src': widget.imgElement ? widget.imgElement.src.substring(widget.imgElement.src.lastIndexOf('/') + 1) : 'N/A',
      '图片尺寸': widget.imgElement ? `${widget.imgElement.naturalWidth}x${widget.imgElement.naturalHeight}` : 'N/A',
      '容器样式': {
        opacity: widget.container?.style.opacity || 'N/A',
        visibility: widget.container?.style.visibility || 'N/A',
        display: widget.container?.style.display || 'N/A',
        transform: widget.imgElement?.style.transform || 'N/A'
      }
    };
  }
  
  // 1. Calm 状态日志
  window.logCalmState = function() {
    console.log('%c========== Calm 状态信息 ==========', 'color: #4299e1; font-weight: bold;');
    const info = getStateInfo();
    console.table(info);
    
    if (widget.calmAnimation) {
      const calm = widget.calmAnimation;
      console.log('Calm 动画状态:', {
        '是否激活': calm.isActive,
        '动画时间': calm.animationTime.toFixed(2) + 's',
        '当前缩放': calm.currentScale.toFixed(3),
        '目标缩放': calm.targetScale.toFixed(3),
        '当前透明度': calm.currentOpacity.toFixed(3),
        '目标透明度': calm.targetOpacity.toFixed(3),
        '配置': {
          '周期时长': calm.config.cycleDuration + 's',
          '基础透明度': calm.config.baseOpacity,
          '透明度范围': `±${calm.config.opacityRange}`,
          '缩放范围': `${calm.config.scaleMin}-${calm.config.scaleMax}`
        }
      });
    }
  };
  
  // 2. Baseline 状态日志
  window.logBaselineState = function() {
    console.log('%c========== Baseline 状态信息 ==========', 'color: #48bb78; font-weight: bold;');
    const info = getStateInfo();
    console.table(info);
    
    if (widget.baselineAnimation) {
      const baseline = widget.baselineAnimation;
      console.log('Baseline 动画状态:', {
        '是否激活': baseline.isActive,
        '当前图片索引': baseline.currentImageIndex,
        '下次切换时间': baseline.nextSwitchTime ? new Date(baseline.nextSwitchTime).toLocaleTimeString() : 'N/A',
        '呼吸进度': baseline.breathing ? baseline.breathing.currentPhase : 'N/A',
        '配置': {
          '切换间隔': `${baseline.config.switchIntervalMin}-${baseline.config.switchIntervalMax}ms`,
          '透明度范围': baseline.breathing ? `${baseline.breathing.opacityMin}-${baseline.breathing.opacityMax}` : 'N/A',
          '缩放范围': baseline.breathing ? `${baseline.breathing.scaleMin}-${baseline.breathing.scaleMax}` : 'N/A'
        }
      });
    }
  };
  
  // 3. Restless 状态日志
  window.logRestlessState = function() {
    console.log('%c========== Restless 状态信息 ==========', 'color: #ed8936; font-weight: bold;');
    const info = getStateInfo();
    console.table(info);
    
    if (widget.restlessAnimation) {
      const restless = widget.restlessAnimation;
      const restlessLevel = widget.stateManager.getRestlessLevel(widget.D_smooth);
      const frequencyRange = restless.getFrequencyRange(restlessLevel || 'mild');
      
      console.log('Restless 动画状态:', {
        '是否激活': restless.isActive,
        '当前浮躁级别': restlessLevel || 'N/A',
        '当前图片索引': restless.currentImageIndex,
        '是否闪烁中': restless.isFlashing,
        '下次闪烁时间': restless.nextFlashTime ? new Date(restless.nextFlashTime).toLocaleTimeString() : 'N/A',
        '频率范围': `${frequencyRange.min}-${frequencyRange.max}ms`,
        '配置': {
          '闪烁透明度': `${restless.config.flashOpacityMin}-${restless.config.flashOpacityMax}`,
          '闪烁时长': restless.config.flashDuration + 'ms',
          '过渡时长': restless.config.transitionDuration + 'ms'
        }
      });
    }
  };
  
  // 4. 通用状态日志（自动识别当前状态）
  window.logCurrentState = function() {
    const state = widget.stateManager.getState(widget.D_smooth);
    
    console.log(`%c当前状态: ${state}`, 'color: #667eea; font-weight: bold; font-size: 14px;');
    
    switch(state) {
      case 'calm':
        window.logCalmState();
        break;
      case 'baseline':
        window.logBaselineState();
        break;
      case 'restless':
        window.logRestlessState();
        break;
      default:
        console.log('未知状态:', state);
        console.table(getStateInfo());
    }
  };
  
  // 5. 持续监控（每秒打印一次）
  let monitorInterval = null;
  window.startStateMonitoring = function(interval = 1000) {
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }
    
    console.log(`开始监控状态，每 ${interval}ms 打印一次`);
    monitorInterval = setInterval(() => {
      window.logCurrentState();
      console.log('---');
    }, interval);
  };
  
  window.stopStateMonitoring = function() {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
      console.log('状态监控已停止');
    }
  };
  
  // 6. 状态切换日志（监听状态变化）
  let lastState = null;
  window.enableStateChangeLogging = function() {
    console.log('启用状态变化日志');
    
    const checkInterval = setInterval(() => {
      const currentState = widget.stateManager.getState(widget.D_smooth);
      
      if (currentState !== lastState) {
        console.log(`%c🔄 状态切换: ${lastState || 'N/A'} → ${currentState}`, 'color: #f56565; font-weight: bold;', {
          'D值': widget.D_smooth.toFixed(3),
          '时间': new Date().toLocaleTimeString()
        });
        lastState = currentState;
      }
    }, 100);
    
    // 返回停止函数
    return () => {
      clearInterval(checkInterval);
      console.log('状态变化日志已停止');
    };
  };
  
  console.log('%c========== Xixi 状态日志工具已加载 ==========', 'color: #667eea; font-weight: bold;');
  console.log('可用命令：');
  console.log('  - logCalmState()           // 打印 Calm 状态信息');
  console.log('  - logBaselineState()        // 打印 Baseline 状态信息');
  console.log('  - logRestlessState()       // 打印 Restless 状态信息');
  console.log('  - logCurrentState()        // 自动识别并打印当前状态');
  console.log('  - startStateMonitoring()  // 开始持续监控（每秒）');
  console.log('  - stopStateMonitoring()   // 停止监控');
  console.log('  - enableStateChangeLogging() // 启用状态切换日志');
})();

