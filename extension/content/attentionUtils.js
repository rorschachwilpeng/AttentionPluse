/**
 * attentionUtils.js
 * 存放基础常量、颜色转换、数学辅助函数等纯工具逻辑
 */

// 1. 颜色常量
const tagColors = {
  'tech': '#667eea',          // 科技 - 紫色
  'learning': '#48bb78',      // 学习 - 绿色
  'entertainment': '#ed8936', // 娱乐 - 橙色
  'sports': '#4299e1',        // 运动 - 蓝色
  'life': '#9f7aea',          // 生活 - 紫色
  'unknown': '#a0aec0'        // 未知 - 灰色
};

// 2. 颜色映射函数
function getTagColor(tag) {
  return tagColors[tag] || tagColors['unknown'];
}

// 3. 颜色工具函数：十六进制转 RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// 4. 颜色工具函数：RGB 转十六进制
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// 5. 颜色插值函数
function interpolateColor(color1, color2, progress) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color2; // 如果转换失败，返回目标颜色
  
  const r = rgb1.r + (rgb2.r - rgb1.r) * progress;
  const g = rgb1.g + (rgb2.g - rgb1.g) * progress;
  const b = rgb1.b + (rgb2.b - rgb1.b) * progress;
  
  return rgbToHex(r, g, b);
}

// 6. 根据专注度获取颜色
function getFocusColor(focusLevel) {
  const focusedColor = '#48bb78';    // 绿色
  const transitionColor = '#84cc16'; // 黄绿色
  const switchingColor = '#fbbf24';  // 黄色
  
  focusLevel = Math.max(0, Math.min(1, focusLevel));
  
  if (focusLevel > 0.7) {
    const progress = (focusLevel - 0.7) / 0.3;
    return interpolateColor(transitionColor, focusedColor, progress);
  } else if (focusLevel >= 0.3) {
    const progress = (focusLevel - 0.3) / 0.4;
    return interpolateColor(switchingColor, transitionColor, progress);
  } else {
    return switchingColor;
  }
}

// 7. 缓动函数：easeInOutCubic
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
