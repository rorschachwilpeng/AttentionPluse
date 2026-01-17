/**
 * Xixi 图片路径管理器
 * 负责管理所有图片资源的路径，使用 chrome.runtime.getURL 获取扩展资源
 */

class XixiImagePaths {
  constructor() {
    // 图片文件名（相对路径）
    this.imageFiles = {
      baseline: [
        'baseline_1.png',
        'baseline_2.png',
        'baseline_3.png'
      ],
      calm: [
        'calm_1.png'
      ],
      restless: [
        'restless_1.png',
        'restless_2.png',
        'restless_3.png'
      ]
    };
    
    // 基础路径
    this.basePath = 'assets/xixi/';
    
    // 缓存已生成的 URL
    this.urlCache = {};
  }

  /**
   * 获取图片的完整 URL（使用 chrome.runtime.getURL）
   * 这是最可靠的方式，适用于所有部署环境（本地开发、Chrome Web Store、其他平台）
   * @param {string} filename - 图片文件名
   * @returns {string} 完整的扩展 URL
   */
  getImageURL(filename) {
    // 检查缓存
    if (this.urlCache[filename]) {
      return this.urlCache[filename];
    }
    
    // 验证 chrome.runtime API 是否可用
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
      console.error('[XixiImagePaths] chrome.runtime.getURL 不可用，无法加载图片');
      throw new Error('Chrome Extension API 不可用');
    }
    
    // 生成相对路径（相对于扩展根目录）
    const relativePath = this.basePath + filename;
    
    // 使用 chrome.runtime.getURL 获取完整 URL
    // 这会自动处理：
    // - 本地开发：使用临时扩展 ID
    // - Chrome Web Store：使用发布后的扩展 ID
    // - 其他平台：使用对应的扩展 ID
    const fullURL = chrome.runtime.getURL(relativePath);
    
    // 验证 URL 格式
    if (!fullURL || !fullURL.startsWith('chrome-extension://')) {
      console.warn(`[XixiImagePaths] 生成的 URL 格式异常: ${fullURL}`);
    }
    
    // 缓存
    this.urlCache[filename] = fullURL;
    
    // 开发模式下输出调试信息
    if (this.isDebugMode()) {
      console.log(`[XixiImagePaths] 图片路径: ${relativePath} → ${fullURL}`);
    }
    
    return fullURL;
  }

  /**
   * 检查是否为调试模式
   * @returns {boolean}
   */
  isDebugMode() {
    // 检查 URL 参数或全局变量
    return window.location.search.includes('xixi_debug=true') || 
           (window.attentionPulseSettings && window.attentionPulseSettings.debug);
  }

  /**
   * 验证图片 URL 是否可访问（可选，用于调试）
   * @param {string} url - 图片 URL
   * @returns {Promise<boolean>} 是否可访问
   */
  async validateImageURL(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => {
        console.warn(`[XixiImagePaths] 图片无法加载: ${url}`);
        resolve(false);
      };
      img.src = url;
      // 设置超时（3秒）
      setTimeout(() => resolve(false), 3000);
    });
  }

  /**
   * 获取某个状态的所有图片 URL
   * @param {string} state - 状态名称：'baseline' | 'calm' | 'restless'
   * @returns {string[]} 图片 URL 数组
   */
  getStateImages(state) {
    const filenames = this.imageFiles[state];
    if (!filenames) {
      console.warn(`[XixiImagePaths] 未知状态: ${state}`);
      return [];
    }
    
    return filenames.map(filename => this.getImageURL(filename));
  }

  /**
   * 获取所有图片 URL（用于预加载）
   * @returns {string[]} 所有图片 URL
   */
  getAllImages() {
    const allImages = [];
    
    Object.keys(this.imageFiles).forEach(state => {
      const stateImages = this.getStateImages(state);
      allImages.push(...stateImages);
    });
    
    return allImages;
  }

  /**
   * 获取图片数量统计
   * @returns {object} 各状态的图片数量
   */
  getImageCount() {
    return {
      baseline: this.imageFiles.baseline.length,
      calm: this.imageFiles.calm.length,
      restless: this.imageFiles.restless.length,
      total: this.getAllImages().length
    };
  }

  /**
   * 批量验证所有图片 URL（用于调试和部署前检查）
   * @returns {Promise<object>} 验证结果
   */
  async validateAllImages() {
    const allURLs = this.getAllImages();
    const results = {
      total: allURLs.length,
      valid: 0,
      invalid: 0,
      details: {}
    };

    console.log(`[XixiImagePaths] 开始验证 ${allURLs.length} 张图片...`);

    for (const url of allURLs) {
      const isValid = await this.validateImageURL(url);
      if (isValid) {
        results.valid++;
      } else {
        results.invalid++;
      }
      results.details[url] = isValid;
    }

    console.log(`[XixiImagePaths] 验证完成: ${results.valid}/${results.total} 有效`);
    if (results.invalid > 0) {
      console.warn(`[XixiImagePaths] ⚠️ 有 ${results.invalid} 张图片无法加载`);
    }

    return results;
  }

  /**
   * 获取扩展 ID（用于调试）
   * @returns {string|null} 扩展 ID
   */
  getExtensionId() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return chrome.runtime.id;
    }
    return null;
  }
}

// 导出单例
if (typeof window !== 'undefined') {
  window.XixiImagePaths = XixiImagePaths;
}

