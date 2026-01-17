/**
 * Xixi SVG 实现示例
 * 展示如何使用 SVG 实现连续动画和视觉效果
 */

class XixiSVGWidget {
  constructor(container, config = {}) {
    this.container = container;
    this.config = {
      sizeMin: 40,
      sizeMax: 100,
      opacityMin: 0.5,
      opacityMax: 0.9,
      transparencyMin: 0.9,  // D=0 时最透明
      transparencyMax: 0.5,  // D=1 时最不透明
      glossIntensityMin: 1.0, // D=0 时光泽最强
      glossIntensityMax: 0.2, // D=1 时光泽最弱
      ...config
    };
    
    // D 值状态
    this.D_raw = 0.4;
    this.D_smooth = 0.4;
    this.D_smoothAlpha = 0.1;
    
    // 视觉参数
    this.visualParams = {};
    
    // 动画时间
    this.animationTime = 0;
    this.lastFrameTime = Date.now();
    
    // 初始化
    this.initSVG();
    this.startAnimation();
  }

  /**
   * 初始化 SVG 结构
   */
  initSVG() {
    // 创建 SVG 容器
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'xixi-svg-widget');
    this.svg.setAttribute('viewBox', '0 0 200 200');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // 设置样式（使用 CSS 变量，支持连续变化）
    this.svg.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      transition: width 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                  height 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // 创建 defs（定义渐变、滤镜等）
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // 1. 清澈状态的渐变
    const clearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    clearGradient.setAttribute('id', 'clear-gradient');
    clearGradient.setAttribute('cx', '50%');
    clearGradient.setAttribute('cy', '30%');
    clearGradient.setAttribute('r', '70%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'rgba(255, 255, 255, 0.9)');
    clearGradient.appendChild(stop1);
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '50%');
    stop2.setAttribute('stop-color', 'rgba(200, 220, 255, 0.7)');
    clearGradient.appendChild(stop2);
    
    const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('stop-color', 'rgba(180, 200, 240, 0.5)');
    clearGradient.appendChild(stop3);
    
    defs.appendChild(clearGradient);
    
    // 2. 浑浊状态的渐变
    const turbidGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    turbidGradient.setAttribute('id', 'turbid-gradient');
    turbidGradient.setAttribute('cx', '50%');
    turbidGradient.setAttribute('cy', '30%');
    turbidGradient.setAttribute('r', '70%');
    
    const stop4 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop4.setAttribute('offset', '0%');
    stop4.setAttribute('stop-color', 'rgba(150, 170, 200, 0.6)');
    turbidGradient.appendChild(stop4);
    
    const stop5 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop5.setAttribute('offset', '50%');
    stop5.setAttribute('stop-color', 'rgba(120, 140, 180, 0.5)');
    turbidGradient.appendChild(stop5);
    
    const stop6 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop6.setAttribute('offset', '100%');
    stop6.setAttribute('stop-color', 'rgba(100, 120, 160, 0.4)');
    turbidGradient.appendChild(stop6);
    
    defs.appendChild(turbidGradient);
    
    // 3. 光泽滤镜（高光效果）
    const glossFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    glossFilter.setAttribute('id', 'gloss-filter');
    glossFilter.setAttribute('x', '-50%');
    glossFilter.setAttribute('y', '-50%');
    glossFilter.setAttribute('width', '200%');
    glossFilter.setAttribute('height', '200%');
    
    // 高光效果
    const feSpecular = document.createElementNS('http://www.w3.org/2000/svg', 'feSpecularLighting');
    feSpecular.setAttribute('result', 'specOut');
    feSpecular.setAttribute('in', 'SourceGraphic');
    feSpecular.setAttribute('specularConstant', '1.5');
    feSpecular.setAttribute('specularExponent', '20');
    feSpecular.setAttribute('lighting-color', 'rgba(255, 255, 255, 0.8)');
    
    const fePointLight = document.createElementNS('http://www.w3.org/2000/svg', 'fePointLight');
    fePointLight.setAttribute('x', '100');
    fePointLight.setAttribute('y', '40');
    fePointLight.setAttribute('z', '200');
    feSpecular.appendChild(fePointLight);
    
    glossFilter.appendChild(feSpecular);
    
    // 混合高光
    const feComposite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    feComposite.setAttribute('in', 'specOut');
    feComposite.setAttribute('in2', 'SourceAlpha');
    feComposite.setAttribute('operator', 'in');
    feComposite.setAttribute('result', 'specOut2');
    glossFilter.appendChild(feComposite);
    
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode1.setAttribute('in', 'SourceGraphic');
    const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode2.setAttribute('in', 'specOut2');
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    glossFilter.appendChild(feMerge);
    
    defs.appendChild(glossFilter);
    
    // 4. 浑浊滤镜（噪点 + 模糊）
    const turbidFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    turbidFilter.setAttribute('id', 'turbid-filter');
    turbidFilter.setAttribute('x', '-50%');
    turbidFilter.setAttribute('y', '-50%');
    turbidFilter.setAttribute('width', '200%');
    turbidFilter.setAttribute('height', '200%');
    
    // 噪点纹理
    const feTurbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    feTurbulence.setAttribute('baseFrequency', '0.9');
    feTurbulence.setAttribute('numOctaves', '4');
    feTurbulence.setAttribute('result', 'noise');
    turbidFilter.appendChild(feTurbulence);
    
    // 模糊效果
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('in', 'SourceGraphic');
    feGaussianBlur.setAttribute('stdDeviation', '1.5');
    feGaussianBlur.setAttribute('result', 'blur');
    turbidFilter.appendChild(feGaussianBlur);
    
    // 混合噪点和模糊
    const feComposite2 = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    feComposite2.setAttribute('in', 'noise');
    feComposite2.setAttribute('in2', 'blur');
    feComposite2.setAttribute('operator', 'multiply');
    feComposite2.setAttribute('result', 'turbid');
    turbidFilter.appendChild(feComposite2);
    
    defs.appendChild(turbidFilter);
    
    this.svg.appendChild(defs);
    
    // 创建主组（包含所有元素）
    this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.mainGroup.setAttribute('class', 'xixi-main-group');
    this.mainGroup.setAttribute('transform', 'translate(100, 100)');
    
    // 绘制水母主体
    this.drawBody();
    
    // 绘制触手
    this.drawTentacles();
    
    // 绘制眼睛和脸颊
    this.drawFace();
    
    this.mainGroup.appendChild(this.bodyGroup);
    this.mainGroup.appendChild(this.tentaclesGroup);
    this.mainGroup.appendChild(this.faceGroup);
    
    this.svg.appendChild(this.mainGroup);
    this.container.appendChild(this.svg);
    
    // 初始化视觉参数
    this.updateVisualParams();
    this.applyVisualParams();
  }

  /**
   * 绘制水母主体（钟状体）
   */
  drawBody() {
    this.bodyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.bodyGroup.setAttribute('class', 'xixi-body');
    
    // 主体路径（钟状体）
    const bodyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bodyPath.setAttribute('d', 'M -60,0 A 60,60 0 0,1 60,0 Q 18,24 0,36 Q -18,24 -60,0 Z');
    bodyPath.setAttribute('class', 'xixi-bell');
    bodyPath.setAttribute('fill', 'url(#clear-gradient)');
    bodyPath.setAttribute('stroke', 'rgba(80, 120, 180, 0.8)');
    bodyPath.setAttribute('stroke-width', '3');
    bodyPath.setAttribute('style', 'transition: fill 0.2s ease-out, stroke 0.2s ease-out;');
    
    this.bodyGroup.appendChild(bodyPath);
    
    // 内部结构线条
    for (let i = 0; i < 3; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const y = -18 + i * 18;
      const radius = 60 * (0.6 - i * 0.15);
      line.setAttribute('d', `M ${-radius * 0.6},${y} A ${radius},${radius} 0 0,1 ${radius * 0.6},${y}`);
      line.setAttribute('stroke', 'rgba(150, 180, 220, 0.5)');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('fill', 'none');
      line.setAttribute('class', 'xixi-internal-line');
      this.bodyGroup.appendChild(line);
    }
  }

  /**
   * 绘制触手
   */
  drawTentacles() {
    this.tentaclesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.tentaclesGroup.setAttribute('class', 'xixi-tentacles');
    
    const tentacleCount = 5;
    const tentacleSpacing = 120 / (tentacleCount - 1);
    const startX = -60;
    
    for (let i = 0; i < tentacleCount; i++) {
      const tentacle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const x = startX + i * tentacleSpacing;
      
      // 触手路径（波浪形）
      const pathData = `
        M ${x},36
        Q ${x + 2},46 ${x},56
        Q ${x - 2},66 ${x},76
        Q ${x + 2},86 ${x},96
      `;
      
      tentacle.setAttribute('d', pathData);
      tentacle.setAttribute('stroke', 'rgba(100, 140, 200, 0.8)');
      tentacle.setAttribute('stroke-width', '2');
      tentacle.setAttribute('fill', 'none');
      tentacle.setAttribute('class', 'xixi-tentacle');
      tentacle.setAttribute('style', `
        transform-origin: ${x}px 36px;
        transition: transform 0.1s ease-out;
      `);
      
      // 为每根触手设置不同的动画延迟
      tentacle.style.setProperty('--tentacle-index', i);
      
      this.tentaclesGroup.appendChild(tentacle);
    }
  }

  /**
   * 绘制面部（眼睛和脸颊）
   */
  drawFace() {
    this.faceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.faceGroup.setAttribute('class', 'xixi-face');
    
    // 眼睛
    const eyeSpacing = 15;
    const eyeY = -12;
    const eyeSize = 4;
    
    const leftEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    leftEye.setAttribute('cx', -eyeSpacing);
    leftEye.setAttribute('cy', eyeY);
    leftEye.setAttribute('r', eyeSize);
    leftEye.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
    leftEye.setAttribute('class', 'xixi-eye');
    
    const rightEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rightEye.setAttribute('cx', eyeSpacing);
    rightEye.setAttribute('cy', eyeY);
    rightEye.setAttribute('r', eyeSize);
    rightEye.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
    rightEye.setAttribute('class', 'xixi-eye');
    
    // 脸颊
    const cheekY = eyeY + 9;
    const cheekSpacing = 21;
    const cheekSize = 7;
    
    const leftCheek = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    leftCheek.setAttribute('cx', -cheekSpacing);
    leftCheek.setAttribute('cy', cheekY);
    leftCheek.setAttribute('rx', cheekSize);
    leftCheek.setAttribute('ry', cheekSize * 0.8);
    leftCheek.setAttribute('fill', 'rgba(255, 180, 200, 0.6)');
    leftCheek.setAttribute('class', 'xixi-cheek');
    
    const rightCheek = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    rightCheek.setAttribute('cx', cheekSpacing);
    rightCheek.setAttribute('cy', cheekY);
    rightCheek.setAttribute('rx', cheekSize);
    rightCheek.setAttribute('ry', cheekSize * 0.8);
    rightCheek.setAttribute('fill', 'rgba(255, 180, 200, 0.6)');
    rightCheek.setAttribute('class', 'xixi-cheek');
    
    this.faceGroup.appendChild(leftEye);
    this.faceGroup.appendChild(rightEye);
    this.faceGroup.appendChild(leftCheek);
    this.faceGroup.appendChild(rightCheek);
  }

  /**
   * 平滑 D 值（EMA）
   */
  smoothDValue(deltaTime = null) {
    if (this.D_raw === 0 && this.D_smooth === 0) {
      return 0;
    }
    
    let alpha = this.D_smoothAlpha;
    if (deltaTime !== null && deltaTime > 0) {
      const normalizedDelta = Math.min(deltaTime / 16.67, 3);
      alpha = Math.min(alpha * (1 + normalizedDelta * 0.5), 0.5);
    }
    
    this.D_smooth = alpha * this.D_raw + (1 - alpha) * this.D_smooth;
    this.D_smooth = Math.max(0, Math.min(1, this.D_smooth));
    return this.D_smooth;
  }

  /**
   * 映射 D 值到视觉参数（连续函数）
   */
  mapDToVisualParams(D) {
    D = Math.max(0, Math.min(1, D));
    
    return {
      // 基础参数
      size: this.config.sizeMin + (this.config.sizeMax - this.config.sizeMin) * D,
      opacity: this.config.opacityMin + (this.config.opacityMax - this.config.opacityMin) * D,
      
      // 透明度（反向：D高→不透明）
      transparency: this.config.transparencyMax - 
                    (this.config.transparencyMax - this.config.transparencyMin) * D,
      
      // 光泽强度（反向：D高→光泽弱）
      glossIntensity: this.config.glossIntensityMax - 
                     (this.config.glossIntensityMax - this.config.glossIntensityMin) * D,
      
      // 动画参数
      tentacleWaveAmplitude: 2 + D * 6,      // 2-8px
      tentacleWaveSpeed: 0.5 + D * 1.5,     // 0.5-2.0
      floatAmplitude: 2 + D * 8,             // 2-10px
      floatSpeed: 0.3 + D * 1.2,            // 0.3-1.5
      breathAmplitude: 0.95 + D * 0.1,      // 0.95-1.05
      breathSpeed: 0.8 + D * 1.7,           // 0.8-2.5
      
      // 颜色亮度
      brightness: 1.0 - D * 0.3,            // 1.0-0.7
      
      // 模糊程度
      blurAmount: D * 2.0,                   // 0-2.0
    };
  }

  /**
   * 更新视觉参数
   */
  updateVisualParams() {
    this.visualParams = this.mapDToVisualParams(this.D_smooth);
  }

  /**
   * 应用视觉参数到 SVG（使用 CSS 变量，保证连续变化）
   */
  applyVisualParams() {
    const params = this.visualParams;
    
    // 设置容器尺寸（直接设置，因为 SVG 元素不支持 CSS 变量）
    this.container.style.width = `${params.size}px`;
    this.container.style.height = `${params.size}px`;
    this.container.style.opacity = params.opacity;
    
    // 设置 CSS 变量（用于 CSS 样式）
    if (this.container.style.setProperty) {
      this.container.style.setProperty('--size', `${params.size}px`);
      this.container.style.setProperty('--opacity', params.opacity);
      this.container.style.setProperty('--transparency', params.transparency);
      this.container.style.setProperty('--gloss-intensity', params.glossIntensity);
      this.container.style.setProperty('--brightness', params.brightness);
      this.container.style.setProperty('--blur-amount', `${params.blurAmount}px`);
      
      // 动画参数
      this.container.style.setProperty('--wave-amplitude', `${params.tentacleWaveAmplitude}px`);
      this.container.style.setProperty('--wave-speed', `${params.tentacleWaveSpeed}s`);
      this.container.style.setProperty('--float-amplitude', `${params.floatAmplitude}px`);
      this.container.style.setProperty('--float-speed', `${params.floatSpeed}s`);
      this.container.style.setProperty('--breath-amplitude', params.breathAmplitude);
      this.container.style.setProperty('--breath-speed', `${params.breathSpeed}s`);
    }
    
    // 应用滤镜效果到 SVG（使用 CSS filter，因为 SVG filter 属性不支持动态值）
    const brightnessValue = params.brightness;
    const blurValue = params.blurAmount;
    if (blurValue > 0) {
      this.svg.style.filter = `brightness(${brightnessValue}) blur(${blurValue}px)`;
    } else {
      this.svg.style.filter = `brightness(${brightnessValue})`;
    }
    
    // 根据 D 值平滑混合渐变和滤镜（而不是硬切换）
    const bodyPath = this.bodyGroup.querySelector('.xixi-bell');
    if (bodyPath) {
      // 平滑过渡：使用混合比例
      const clearRatio = 1 - this.D_smooth; // D=0 时完全清澈，D=1 时完全浑浊
      const turbidRatio = this.D_smooth;
      
      // 如果更接近清澈状态，使用清澈渐变和光泽滤镜
      if (clearRatio > 0.5) {
        bodyPath.setAttribute('fill', 'url(#clear-gradient)');
        bodyPath.setAttribute('filter', 'url(#gloss-filter)');
        // 光泽强度随 D 值变化
        bodyPath.style.opacity = params.transparency;
      } else {
        // 更接近浑浊状态，使用浑浊渐变和浑浊滤镜
        bodyPath.setAttribute('fill', 'url(#turbid-gradient)');
        bodyPath.setAttribute('filter', 'url(#turbid-filter)');
        bodyPath.style.opacity = params.transparency;
      }
      
      // 内部线条透明度
      const internalLines = this.bodyGroup.querySelectorAll('.xixi-internal-line');
      internalLines.forEach(line => {
        line.style.opacity = params.transparency * 0.6;
      });
    }
    
    // 面部元素透明度
    const faceElements = this.faceGroup.querySelectorAll('.xixi-eye, .xixi-cheek');
    faceElements.forEach(el => {
      el.style.opacity = params.transparency;
    });
  }

  /**
   * 设置 D 值
   */
  setTurbulence(D) {
    this.D_raw = Math.max(0, Math.min(1, D));
  }

  /**
   * 启动动画循环
   */
  startAnimation() {
    const animate = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;
      
      // 更新动画时间
      this.animationTime += deltaTime / 1000; // 转换为秒
      
      // 平滑 D 值
      this.smoothDValue(deltaTime);
      
      // 更新视觉参数
      this.updateVisualParams();
      
      // 应用视觉参数（CSS 会自动处理平滑过渡）
      this.applyVisualParams();
      
      // 应用动画变换（触手摆动、浮动、呼吸）
      this.applyAnimations();
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * 应用动画变换（基于时间的动画）
   */
  applyAnimations() {
    const params = this.visualParams;
    const time = this.animationTime;
    
    // 1. 身体浮动（上下移动）
    const floatY = Math.sin(time * params.floatSpeed) * params.floatAmplitude;
    
    // 2. 呼吸效果（缩放）
    const breathScale = 1.0 + (Math.sin(time * params.breathSpeed) * 0.5 + 0.5) * 
                       (params.breathAmplitude - 1.0);
    
    // 应用变换到主组
    this.mainGroup.setAttribute('transform', 
      `translate(100, ${100 + floatY}) scale(${breathScale})`);
    
    // 3. 触手摆动（每根触手有不同的相位）
    const tentacles = this.tentaclesGroup.querySelectorAll('.xixi-tentacle');
    tentacles.forEach((tentacle, index) => {
      const phase = (time * params.tentacleWaveSpeed) + (index * 0.3);
      const waveX = Math.sin(phase) * params.tentacleWaveAmplitude;
      const waveRotation = Math.sin(phase) * 5; // 轻微旋转
      
      // 安全地提取 x 坐标
      const pathData = tentacle.getAttribute('d');
      const match = pathData.match(/M\s+(-?\d+\.?\d*)/);
      if (match) {
        const x = parseFloat(match[1]);
        tentacle.setAttribute('transform', 
          `translate(${waveX}, 0) rotate(${waveRotation} ${x} 36)`);
      } else {
        // 如果匹配失败，使用默认值
        const defaultX = -60 + (index * 30);
        tentacle.setAttribute('transform', 
          `translate(${waveX}, 0) rotate(${waveRotation} ${defaultX} 36)`);
      }
    });
  }
}

// 使用示例
/*
// 创建容器
const container = document.createElement('div');
container.style.cssText = `
  position: fixed;
  top: 20px;
  left: 20px;
  width: 100px;
  height: 100px;
  z-index: 999999;
  pointer-events: none;
`;

document.body.appendChild(container);

// 创建 Xixi widget
const xixi = new XixiSVGWidget(container);

// 测试：改变 D 值
setTimeout(() => xixi.setTurbulence(0.8), 2000);
setTimeout(() => xixi.setTurbulence(0.2), 4000);
setTimeout(() => xixi.setTurbulence(0.6), 6000);
*/

