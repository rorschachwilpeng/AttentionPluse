/**
 * Xixi 状态自动测试脚本
 * 模拟 Attention Turbulence 从低到高的变化，在每个状态停留 5 秒
 * 
 * 使用方法：
 * 1. 在浏览器控制台运行：copy(测试脚本内容)
 * 2. 或者直接粘贴运行
 */

(function() {
  'use strict';
  
  if (typeof window === 'undefined' || !window.attentionPulseUI) {
    console.error('[Xixi测试] attentionPulseUI 未找到，请确保扩展已加载');
    return;
  }
  
  const ui = window.attentionPulseUI;
  const widget = ui.xixiWidget;
  
  if (!widget) {
    console.error('[Xixi测试] xixiWidget 未找到');
    return;
  }
  
  console.log('%c========== Xixi 状态自动测试 ==========', 'color: #667eea; font-weight: bold; font-size: 16px;');
  console.log('开始自动测试，D 值将从低到高变化，每个状态停留 5 秒');
  console.log('');
  
  // 测试点定义：每个状态的代表性 D 值
  const testPoints = [
    { D: 0.2, name: 'Calm (冷静)', state: 'calm', duration: 5000 },
    { D: 0.5, name: 'Baseline (中立)', state: 'baseline', duration: 5000 },
    { D: 0.75, name: 'Restless - Mild (轻度浮躁)', state: 'restless', level: 'mild', duration: 5000 },
    { D: 0.85, name: 'Restless - Moderate (中度浮躁)', state: 'restless', level: 'moderate', duration: 5000 },
    { D: 0.95, name: 'Restless - Severe (高度浮躁)', state: 'restless', level: 'severe', duration: 5000 },
  ];
  
  let currentIndex = 0;
  let testInterval = null;
  let statusInterval = null;
  
  // 打印当前状态信息
  function printStatus(point) {
    const stateInfo = widget.stateManager.getStateInfo(widget.D_smooth);
    const restlessLevel = widget.stateManager.getRestlessLevel(widget.D_smooth);
    
    console.log(`%c[${new Date().toLocaleTimeString()}] 当前状态:`, 'color: #48bb78; font-weight: bold;', {
      'D值': widget.D_smooth.toFixed(3),
      '状态': stateInfo.state,
      '浮躁级别': restlessLevel || 'N/A',
      '当前图片': widget.imgElement ? widget.imgElement.src.substring(widget.imgElement.src.lastIndexOf('/') + 1) : 'N/A',
      '动画激活': {
        baseline: widget.baselineAnimation?.isActive || false,
        calm: widget.calmAnimation?.isActive || false,
        restless: widget.restlessAnimation?.isActive || false
      }
    });
  }
  
  // 设置 D 值并打印信息
  function setDValueAndLog(point) {
    console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #667eea;');
    console.log(`%c切换到: ${point.name}`, 'color: #667eea; font-weight: bold; font-size: 14px;');
    console.log(`设置 D 值: ${point.D}`);
    
    // 设置 D 值
    ui.setTurbulence(point.D);
    
    // 等待一小段时间让状态切换完成
    setTimeout(() => {
      printStatus(point);
      
      // 开始持续打印状态（每秒一次）
      if (statusInterval) {
        clearInterval(statusInterval);
      }
      
      statusInterval = setInterval(() => {
        printStatus(point);
      }, 1000);
    }, 500);
  }
  
  // 开始测试
  function startTest() {
    if (testInterval) {
      clearInterval(testInterval);
    }
    
    currentIndex = 0;
    
    // 立即设置第一个测试点
    setDValueAndLog(testPoints[0]);
    
    // 设置定时器，每 5 秒切换到下一个测试点
    testInterval = setInterval(() => {
      currentIndex++;
      
      if (currentIndex >= testPoints.length) {
        // 测试完成
        console.log('%c========== 测试完成 ==========', 'color: #48bb78; font-weight: bold; font-size: 16px;');
        console.log('所有状态已测试完毕');
        stopTest();
        return;
      }
      
      setDValueAndLog(testPoints[currentIndex]);
    }, testPoints[0].duration);
  }
  
  // 停止测试
  function stopTest() {
    if (testInterval) {
      clearInterval(testInterval);
      testInterval = null;
    }
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
    console.log('测试已停止');
  }
  
  // 导出到全局
  window.xixiStateTest = {
    start: startTest,
    stop: stopTest,
    setPoint: (index) => {
      if (index >= 0 && index < testPoints.length) {
        currentIndex = index;
        setDValueAndLog(testPoints[index]);
      }
    },
    points: testPoints
  };
  
  // 自动开始测试
  console.log('测试脚本已加载，3 秒后自动开始...');
  console.log('可以使用以下命令控制：');
  console.log('  - window.xixiStateTest.start()  // 开始测试');
  console.log('  - window.xixiStateTest.stop()   // 停止测试');
  console.log('  - window.xixiStateTest.setPoint(0)  // 切换到指定测试点');
  console.log('');
  
  setTimeout(() => {
    startTest();
  }, 3000);
})();

