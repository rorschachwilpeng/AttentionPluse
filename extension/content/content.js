// Content Script: 注入到目标网页中
// 负责读取页面内容、监听浏览状态、渲染 AttentionPulse

(function() {
  'use strict';
  
  // 防止重复注入
  if (window.attentionPulseInjected) {
    console.log('[AttentionPulse] 已注入，跳过重复注入');
    return;
  }
  window.attentionPulseInjected = true;
  
  console.log('[AttentionPulse] Content Script 已注入');
  console.log('[AttentionPulse] 当前页面:', window.location.href);
  console.log('[AttentionPulse] 页面标题:', document.title);
  
  // 默认设置
  let settings = {
    enabled: true,
    position: 'bottom-right',
    size: 'medium',
    debug: false
  };
  
  // 从 storage 加载设置
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['attentionPulseSettings']);
      if (result.attentionPulseSettings) {
        settings = result.attentionPulseSettings;
        console.log('[AttentionPulse] 设置已加载:', settings);
      }
      
      // 根据设置决定是否初始化
      if (settings.enabled) {
        initAttentionPulse();
      }
    } catch (error) {
      console.error('[AttentionPulse] 加载设置失败:', error);
      // 默认启用
      initAttentionPulse();
    }
  }
  
  // 初始化 AttentionPulse
  function initAttentionPulse() {
    console.log('[AttentionPulse] 开始初始化...');
    
    // TODO: A-5 实现 AttentionPulse 可视化叠加
    // 这里先输出日志，验证注入成功
    if (settings.debug) {
      showDebugInfo();
    }
  }
  
  // 显示调试信息（临时，用于验证）
  function showDebugInfo() {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'attentionPulse-debug';
    debugDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 999999;
      pointer-events: none;
    `;
    debugDiv.innerHTML = `
      <div>AttentionPulse Active</div>
      <div>URL: ${window.location.href}</div>
      <div>Title: ${document.title}</div>
    `;
    document.body.appendChild(debugDiv);
  }
  
  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SETTINGS_UPDATED') {
      settings = message.settings;
      console.log('[AttentionPulse] 收到设置更新:', settings);
      
      if (settings.enabled) {
        initAttentionPulse();
      } else {
        // TODO: 移除 AttentionPulse
        console.log('[AttentionPulse] 已禁用');
      }
      
      if (settings.debug) {
        showDebugInfo();
      } else {
        const debugDiv = document.getElementById('attentionPulse-debug');
        if (debugDiv) {
          debugDiv.remove();
        }
      }
    }
    
    sendResponse({ success: true });
  });
  
  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSettings);
  } else {
    loadSettings();
  }
  
})();

