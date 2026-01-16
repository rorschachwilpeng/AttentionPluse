// Popup 逻辑：处理用户设置并保存到 Chrome Storage

// 默认设置
const defaultSettings = {
  enabled: true,
  position: 'bottom-right',
  size: 'medium',
  debug: false
};

// DOM 元素
const enableToggle = document.getElementById('enableToggle');
const positionSelect = document.getElementById('positionSelect');
const sizeSelect = document.getElementById('sizeSelect');
const debugToggle = document.getElementById('debugToggle');

// 初始化：从 storage 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['attentionPulseSettings']);
    const settings = result.attentionPulseSettings || defaultSettings;
    
    // 应用设置到 UI
    enableToggle.checked = settings.enabled;
    positionSelect.value = settings.position;
    sizeSelect.value = settings.size;
    debugToggle.checked = settings.debug;
    
    console.log('[AttentionPulse Popup] 设置已加载:', settings);
  } catch (error) {
    console.error('[AttentionPulse Popup] 加载设置失败:', error);
    // 使用默认设置
    applyDefaultSettings();
  }
}

// 应用默认设置
function applyDefaultSettings() {
  enableToggle.checked = defaultSettings.enabled;
  positionSelect.value = defaultSettings.position;
  sizeSelect.value = defaultSettings.size;
  debugToggle.checked = defaultSettings.debug;
}

// 保存设置到 storage
async function saveSettings() {
  const settings = {
    enabled: enableToggle.checked,
    position: positionSelect.value,
    size: sizeSelect.value,
    debug: debugToggle.checked
  };
  
  try {
    await chrome.storage.local.set({ attentionPulseSettings: settings });
    console.log('[AttentionPulse Popup] 设置已保存:', settings);
    
    // 通知 content script 设置已更新
    notifyContentScript(settings);
  } catch (error) {
    console.error('[AttentionPulse Popup] 保存设置失败:', error);
  }
}

// 通知 content script 设置已更新
function notifyContentScript(settings) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'SETTINGS_UPDATED',
        settings: settings
      }).catch(() => {
        // Content script 可能还未加载，忽略错误
      });
    }
  });
}

// 事件监听
enableToggle.addEventListener('change', saveSettings);
positionSelect.addEventListener('change', saveSettings);
sizeSelect.addEventListener('change', saveSettings);
debugToggle.addEventListener('change', saveSettings);

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', loadSettings);

