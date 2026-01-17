// 最简单的测试脚本 - 确保能注入
console.error('[AttentionPulse:Test] ===== 测试脚本已加载 =====');
console.error('[AttentionPulse:Test] 当前 URL:', window.location.href);
console.error('[AttentionPulse:Test] 页面标题:', document.title);
console.error('[AttentionPulse:Test] 时间戳:', new Date().toISOString());

// 在页面上创建一个明显的标记（带详细信息）
const testMarker = document.createElement('div');
testMarker.id = 'attentionPulse-test-marker';
testMarker.style.cssText = `
  position: fixed;
  top: 50px;
  right: 50px;
  background: red;
  color: white;
  padding: 15px;
  z-index: 999999;
  font-size: 12px;
  border-radius: 6px;
  font-family: monospace;
  max-width: 300px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
`;
testMarker.innerHTML = `
  <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">✓ AttentionPulse 已注入！</div>
  <div style="margin-bottom: 4px;">URL: ${window.location.href.substring(0, 40)}...</div>
  <div style="margin-bottom: 4px;">标题: ${document.title.substring(0, 30)}...</div>
  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 10px;">
    如果看不到控制台日志，请调整控制台过滤器为 "All levels"
  </div>
`;
document.body.appendChild(testMarker);

console.error('[AttentionPulse:Test] 测试标记已添加到页面');

