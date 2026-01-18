/**
 * 自动切换诊断脚本
 * 用于排查为什么设置 D 值后会自动切换回中立状态
 */

(function() {
  'use strict';
  
  if (typeof window === 'undefined' || !window.attentionPulseUI) {
    console.error('[诊断] attentionPulseUI 未找到，请确保扩展已加载');
    return;
  }
  
  const ui = window.attentionPulseUI;
  const widget = ui.xixiWidget;
  
  if (!widget) {
    console.error('[诊断] xixiWidget 未找到');
    return;
  }
  
  console.log('%c========== 自动切换诊断 ==========', 'color: #667eea; font-weight: bold; font-size: 14px;');
  
  // 1. 检查配置
  console.log('\n1. 配置检查:');
  console.log('  - useEngineData:', ui.useEngineData);
  console.log('  - manualDValueSet:', ui.manualDValueSet);
  console.log('  - mockMode:', ui.mockMode);
  console.log('  - xixiEnabled:', ui.xixiEnabled);
  
  // 2. 检查当前 D 值
  console.log('\n2. 当前 D 值:');
  console.log('  - UI.D_raw:', ui.D_raw);
  console.log('  - UI.D_smooth:', ui.D_smooth);
  console.log('  - Widget.D_raw:', widget.D_raw);
  console.log('  - Widget.D_smooth:', widget.D_smooth);
  
  // 3. 检查状态
  console.log('\n3. 当前状态:');
  const currentState = widget.stateManager.getState(widget.D_smooth);
  console.log('  - 根据 D_smooth 计算的状态:', currentState);
  console.log('  - Widget.currentState:', widget.currentState);
  console.log('  - StateManager.currentState:', widget.stateManager.currentState);
  console.log('  - enabledStates:', widget.enabledStates);
  
  // 4. 检查状态阈值
  console.log('\n4. 状态阈值:');
  console.log('  - calm: D <', widget.stateManager.thresholds.calm);
  console.log('  - baseline:', widget.stateManager.thresholds.calm, '≤ D <', widget.stateManager.thresholds.baseline);
  console.log('  - restless: D ≥', widget.stateManager.thresholds.baseline);
  
  // 5. 测试设置 D = 0.3（应该切换到 calm）
  console.log('\n5. 测试设置 D = 0.3（应该切换到 calm）:');
  console.log('  执行: window.attentionPulseUI.setTurbulence(0.3)');
  
  // 记录设置前的状态
  const beforeState = widget.currentState;
  const beforeDRaw = widget.D_raw;
  const beforeDSmooth = widget.D_smooth;
  
  // 设置 D 值
  ui.setTurbulence(0.3);
  
  // 等待一小段时间后检查
  setTimeout(() => {
    console.log('\n  设置后的状态:');
    console.log('    - D_raw:', widget.D_raw, '(期望: 0.3)');
    console.log('    - D_smooth:', widget.D_smooth, '(期望: 0.3)');
    console.log('    - 计算的状态:', widget.stateManager.getState(widget.D_smooth), '(期望: calm)');
    console.log('    - currentState:', widget.currentState, '(期望: calm)');
    console.log('    - 状态是否变化:', beforeState !== widget.currentState);
    
    // 检查是否有其他代码在修改 D 值
    console.log('\n6. 监控 D 值变化（5秒）:');
    let checkCount = 0;
    const monitorInterval = setInterval(() => {
      checkCount++;
      const currentDRaw = widget.D_raw;
      const currentDSmooth = widget.D_smooth;
      const currentState = widget.currentState;
      
      if (currentDRaw !== 0.3 || currentDSmooth !== 0.3 || currentState !== 'calm') {
        console.warn(`  [${checkCount * 0.5}s] ⚠️ D 值或状态被改变:`, {
          D_raw: currentDRaw,
          D_smooth: currentDSmooth,
          state: currentState,
          expected: { D_raw: 0.3, D_smooth: 0.3, state: 'calm' }
        });
      } else {
        console.log(`  [${checkCount * 0.5}s] ✓ D 值和状态正常`);
      }
      
      if (checkCount >= 10) {
        clearInterval(monitorInterval);
        console.log('\n  监控结束');
        
        // 最终检查
        console.log('\n7. 最终检查:');
        console.log('  - D_raw:', widget.D_raw, '(期望: 0.3)');
        console.log('  - D_smooth:', widget.D_smooth, '(期望: 0.3)');
        console.log('  - currentState:', widget.currentState, '(期望: calm)');
        console.log('  - useEngineData:', ui.useEngineData, '(期望: false)');
        console.log('  - manualDValueSet:', ui.manualDValueSet, '(期望: true)');
        
        if (widget.currentState !== 'calm') {
          console.error('\n❌ 问题确认: 状态被自动切换了！');
          console.log('\n可能的原因:');
          console.log('  1. 引擎仍在自动更新 D 值');
          console.log('  2. 初始化逻辑强制设置了 D 值');
          console.log('  3. smoothDValue 函数改变了 D_smooth');
          console.log('  4. enabledStates 不包含 calm 状态');
          console.log('  5. 其他代码在调用 setTurbulence');
        } else {
          console.log('\n✓ 状态正常，未发现自动切换问题');
        }
      }
    }, 500);
  }, 100);
  
  console.log('\n提示: 请观察上面的输出，特别是"监控 D 值变化"部分');
  console.log('如果看到 D 值或状态被改变，说明有代码在自动修改它们');
})();

