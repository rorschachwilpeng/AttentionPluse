/**
 * Xixi PNG Widget 简单测试脚本
 * 在浏览器控制台中运行此脚本来测试基础功能
 * 
 * 使用方法：
 * 1. 在小红书页面打开控制台（F12）
 * 2. 确保扩展已加载
 * 3. 复制此文件内容到控制台运行
 * 4. 或者：在控制台输入 testXixiPNG()
 */

async function testXixiPNG() {
  console.log('%c========== Xixi PNG Widget 阶段1 测试 ==========', 'color: #667eea; font-weight: bold; font-size: 16px;');
  
  try {
    // 1. 检查模块是否加载
    console.log('%c[1] 检查模块...', 'color: #667eea; font-weight: bold;');
    
    if (typeof XixiImagePaths === 'undefined') {
      throw new Error('XixiImagePaths 未定义，请确保脚本已加载');
    }
    if (typeof XixiStateManager === 'undefined') {
      throw new Error('XixiStateManager 未定义，请确保脚本已加载');
    }
    if (typeof XixiImageLoader === 'undefined') {
      throw new Error('XixiImageLoader 未定义，请确保脚本已加载');
    }
    if (typeof XixiPNGWidget === 'undefined') {
      throw new Error('XixiPNGWidget 未定义，请确保脚本已加载');
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
    if (!container) {
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
    }
    
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
    throw error;
  }
}

// 如果直接运行，自动执行测试
if (typeof window !== 'undefined' && window.location) {
  // 不在扩展环境中，提示用户
  console.log('请在扩展环境中运行此测试脚本');
}

