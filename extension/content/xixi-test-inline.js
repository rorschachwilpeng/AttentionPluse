/**
 * Xixi PNG Widget 内联测试代码
 * 直接在控制台复制粘贴运行，会自动加载所有必要的模块
 * 
 * 使用方法：
 * 1. 在小红书页面打开控制台（F12）
 * 2. 复制下面的完整代码到控制台运行
 * 3. 或者：访问 chrome-extension://扩展ID/content/xixi-test-inline.js 查看代码
 */

(async function() {
  console.log('%c========== Xixi PNG Widget 阶段1 测试 ==========', 'color: #667eea; font-weight: bold; font-size: 16px;');
  
  // 获取扩展 ID
  const extensionId = chrome.runtime.id;
  const baseURL = chrome.runtime.getURL('content/');
  
  console.log(`扩展 ID: ${extensionId}`);
  console.log(`基础 URL: ${baseURL}`);
  
  // 动态加载脚本
  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(src);
      script.onload = () => {
        console.log(`✅ 已加载: ${src}`);
        resolve();
      };
      script.onerror = () => {
        console.error(`❌ 加载失败: ${src}`);
        reject(new Error(`无法加载 ${src}`));
      };
      document.head.appendChild(script);
    });
  }
  
  try {
    // 1. 加载必要的模块
    console.log('%c[1] 加载模块...', 'color: #667eea; font-weight: bold;');
    
    // 检查是否已加载
    if (typeof XixiImagePaths === 'undefined') {
      await loadScript('content/xixiImagePaths.js');
    }
    if (typeof XixiStateManager === 'undefined') {
      await loadScript('content/xixiStateManager.js');
    }
    if (typeof XixiImageLoader === 'undefined') {
      await loadScript('content/xixiImageLoader.js');
    }
    if (typeof XixiPNGWidget === 'undefined') {
      await loadScript('content/xixiPNGWidget.js');
    }
    
    console.log('  ✅ 所有模块已加载');
    
    // 2. 测试路径管理器
    console.log('%c[2] 测试路径管理器...', 'color: #667eea; font-weight: bold;');
    const imagePaths = new XixiImagePaths();
    const allImages = imagePaths.getAllImages();
    console.log(`  ✅ 找到 ${allImages.length} 张图片`);
    console.log('  图片列表:', allImages);
    
    // 3. 测试状态管理器
    console.log('%c[3] 测试状态管理器...', 'color: #667eea; font-weight: bold;');
    const stateManager = new XixiStateManager();
    const testStates = [
      { D: 0.2, expected: 'calm' },
      { D: 0.5, expected: 'baseline' },
      { D: 0.8, expected: 'restless' }
    ];
    testStates.forEach(({ D, expected }) => {
      const state = stateManager.getState(D);
      const passed = state === expected;
      console.log(`  ${passed ? '✅' : '❌'} D=${D} → ${state} (期望: ${expected})`);
    });
    
    // 4. 创建测试容器
    console.log('%c[4] 创建测试容器...', 'color: #667eea; font-weight: bold;');
    let container = document.getElementById('xixi-test-container');
    if (container) {
      container.remove(); // 如果已存在，先移除
    }
    container = document.createElement('div');
    container.id = 'xixi-test-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      width: 200px;
      height: 200px;
      background: rgba(0, 0, 0, 0.3);
      border: 2px dashed rgba(255, 255, 255, 0.5);
      border-radius: 12px;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    document.body.appendChild(container);
    console.log('  ✅ 测试容器已创建');
    
    // 5. 创建 Widget
    console.log('%c[5] 创建 Widget...', 'color: #667eea; font-weight: bold;');
    const widget = new XixiPNGWidget(container, {
      sizeMin: 80,
      sizeMax: 180,
      opacityMin: 0.6,
      opacityMax: 1.0
    });
    
    // 等待初始化
    console.log('  等待图片加载...');
    await widget.init();
    console.log('  ✅ Widget 初始化完成');
    
    // 6. 测试状态切换
    console.log('%c[6] 测试状态切换...', 'color: #667eea; font-weight: bold;');
    const testValues = [0.2, 0.5, 0.8, 1.0];
    for (const D of testValues) {
      widget.setTurbulence(D);
      await new Promise(resolve => setTimeout(resolve, 500));
      const state = stateManager.getState(widget.D_smooth);
      console.log(`  ✅ D=${D} → 状态: ${state}`);
    }
    
    // 7. 显示状态信息
    console.log('%c[7] 当前状态信息:', 'color: #667eea; font-weight: bold;');
    const status = widget.getStatus();
    console.table(status);
    
    // 8. 提供控制接口
    window.testXixiWidget = widget;
    console.log('%c========== 测试完成 ==========', 'color: #48bb78; font-weight: bold; font-size: 16px;');
    console.log('💡 提示: 使用以下命令控制 Widget:');
    console.log('  testXixiWidget.setTurbulence(0.3)  // 设置 D 值');
    console.log('  testXixiWidget.getStatus()          // 查看状态');
    console.log('  testXixiWidget.update()             // 手动更新');
    
    return widget;
    
  } catch (error) {
    console.error('%c❌ 测试失败:', 'color: #ed8936; font-weight: bold;', error);
    console.error('错误详情:', error.stack);
    throw error;
  }
})();

