/**
 * content.js
 * AttentionPulse 插件的主入口文件
 * 负责各模块的协调运行
 */

(function() {
  'use strict';

  // 1. 防止重复注入
  const INJECTION_KEY = 'attentionPulseInjected';
  if (window[INJECTION_KEY]) {
    console.log('[AttentionPulse:Main] 已注入，跳过重复加载');
    return;
  }
  window[INJECTION_KEY] = true;

  console.log('%c[AttentionPulse:Main] 核心加载中...', 'color: #667eea; font-weight: bold;');

  // 2. 初始化全局状态
  let settings = {
    enabled: true,
    position: 'bottom-right',
    size: 'medium',
    debug: false,
    xixiEnabled: true,  // 默认启用 Xixi widget
    xixiUseEngineData: true  // 默认开启引擎自动更新，实现数据驱动动画
  };

  // 3. 实例化核心类
  const initEngine = () => {
    if (typeof AttentionEngine === 'undefined' || 
        typeof ContentExtractor === 'undefined' || 
        typeof ContentTagger === 'undefined') {
      console.warn('[AttentionPulse:Main] 等待核心模块加载...');
      setTimeout(initEngine, 100);
      return;
    }
    
    // 初始化内容提取器和标签器
    window.attentionPulseContentExtractor = new ContentExtractor();
    window.attentionPulseContentTagger = new ContentTagger();
    
    const engine = new AttentionEngine();
    window.attentionPulseEngine = engine; 
    init(engine);
  };

  // 4. 初始化流程
  async function init(engine) {
    // A. 加载配置
    try {
      const result = await chrome.storage.local.get(['attentionPulseSettings']);
      if (result.attentionPulseSettings) {
        Object.assign(settings, result.attentionPulseSettings);
      }
    } catch (e) {
      console.warn('[AttentionPulse:Main] 加载配置失败，使用默认值');
    }

    let ui = null;
    let monitoringStarted = false;

    const startPluginComponents = () => {
      if (!settings.enabled) return;

      // B. 初始化 UI
      if (typeof AttentionUI === 'undefined') {
        console.error('[AttentionPulse:Main] AttentionUI 未定义，无法启动界面');
        return;
      }
      
      if (!ui) {
        ui = new AttentionUI(engine, settings);
        window.attentionPulseUI = ui;
      }

      // C. 启动监控
      if (!monitoringStarted) {
        if (typeof startContentMonitoring !== 'undefined') {
          startContentMonitoring(engine, settings, ui);
        }
        if (typeof startInteractionMonitoring !== 'undefined') {
          startInteractionMonitoring(engine, settings, ui);
        }
        monitoringStarted = true;
      }

      // D. 如果开启调试模式，显示面板
      if (settings.debug && ui) {
        ui.showDebugInfo();
      }
    };

    // 初始启动
    startPluginComponents();

    // 消息监听器
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED') {
        const oldEnabled = settings.enabled;
        const oldDebug = settings.debug;
        Object.assign(settings, message.settings);
        
        if (!settings.enabled) {
          const debugDiv = document.getElementById('attentionPulse-debug');
          if (debugDiv) debugDiv.remove();
          if (ui) {
            ui.stopPulseAnimation();
            ui.stopUIHeartbeat();
          }
        } else {
          // 如果是从禁用变启用，重新初始化组件
          if (!oldEnabled) {
            startPluginComponents();
          }
          
          if (ui) {
            ui.startUIHeartbeat();
            if (settings.debug) {
              ui.showDebugInfo();
            } else if (oldDebug && !settings.debug) {
              const debugDiv = document.getElementById('attentionPulse-debug');
              if (debugDiv) debugDiv.remove();
              ui.stopPulseAnimation();
            }
          }
        }
      }
      sendResponse({ success: true });
    });

    console.log('%c[AttentionPulse:Main] ===== 初始化完成 =====', 'color: #48bb78; font-weight: bold;');
  }

  // 5. 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngine);
  } else {
    initEngine();
  }

})();
