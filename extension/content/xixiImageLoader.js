/**
 * Xixi 图片预加载器
 * 负责异步加载所有图片资源，并提供加载状态管理
 */

class XixiImageLoader {
  constructor(imagePaths) {
    this.imagePaths = imagePaths;
    this.loadedImages = {};
    this.loadingPromises = {};
    this.isLoading = false;
    this.loadProgress = 0;
    this.totalImages = 0;
  }

  /**
   * 预加载所有图片
   * @returns {Promise} 加载完成的 Promise
   */
  async preloadAll() {
    if (this.isLoading) {
      console.warn('[XixiImageLoader] 已在加载中，跳过重复加载');
      return;
    }

    this.isLoading = true;
    const allImageURLs = this.imagePaths.getAllImages();
    this.totalImages = allImageURLs.length;
    this.loadProgress = 0;

    console.log(`[XixiImageLoader] 开始预加载 ${this.totalImages} 张图片...`);

    const loadPromises = allImageURLs.map((url, index) => {
      return this.loadImage(url).then(() => {
        this.loadProgress = index + 1;
        const progress = ((this.loadProgress / this.totalImages) * 100).toFixed(1);
        console.log(`[XixiImageLoader] 加载进度: ${this.loadProgress}/${this.totalImages} (${progress}%)`);
      });
    });

    try {
      await Promise.all(loadPromises);
      console.log('[XixiImageLoader] 所有图片加载完成');
      this.isLoading = false;
      return true;
    } catch (error) {
      console.error('[XixiImageLoader] 图片加载失败:', error);
      this.isLoading = false;
      throw error;
    }
  }

  /**
   * 加载单张图片
   * @param {string} url - 图片 URL
   * @returns {Promise<Image>} 加载完成的图片对象
   */
  loadImage(url) {
    // 如果已加载，直接返回缓存的图片
    if (this.loadedImages[url]) {
      return Promise.resolve(this.loadedImages[url]);
    }

    // 如果正在加载，返回现有的 Promise
    if (this.loadingPromises[url]) {
      return this.loadingPromises[url];
    }

    // 创建新的加载 Promise
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.loadedImages[url] = img;
        delete this.loadingPromises[url];
        resolve(img);
      };
      
      img.onerror = (error) => {
        delete this.loadingPromises[url];
        console.error(`[XixiImageLoader] 图片加载失败: ${url}`);
        
        // 检查是否是被拦截器拦截
        const testRequest = new XMLHttpRequest();
        testRequest.open('GET', url, true);
        testRequest.onerror = () => {
          console.error(`[XixiImageLoader] 可能被广告拦截器拦截 (ERR_BLOCKED_BY_CLIENT)`);
          console.warn(`[XixiImageLoader] 建议: 检查浏览器扩展（如 AdBlock、uBlock Origin）是否拦截了扩展资源`);
        };
        testRequest.send();
        
        reject(new Error(`图片加载失败: ${url}`));
      };
      
      // 添加加载开始日志
      console.log(`[XixiImageLoader] 开始加载图片: ${url}`);
      img.src = url;
    });

    this.loadingPromises[url] = promise;
    return promise;
  }

  /**
   * 获取已加载的图片
   * @param {string} url - 图片 URL
   * @returns {Image|null} 图片对象，如果未加载则返回 null
   */
  getImage(url) {
    return this.loadedImages[url] || null;
  }

  /**
   * 获取某个状态的所有图片
   * @param {string} state - 状态名称
   * @returns {Image[]|string[]} 图片数组（如果图片已加载返回 Image 对象，否则返回 URL 字符串）
   */
  getStateImages(state) {
    const urls = this.imagePaths.getStateImages(state);
    const images = urls.map(url => {
      const img = this.getImage(url);
      // 如果图片已加载，返回 Image 对象；否则返回 URL 字符串
      return img || url;
    });
    
    // 如果所有图片都未加载，至少返回 URL 字符串数组
    if (images.length === 0) {
      console.warn(`[XixiImageLoader] 状态 ${state} 没有可用图片或 URL`);
      return [];
    }
    
    return images;
  }

  /**
   * 检查所有图片是否已加载
   * @returns {boolean} 是否全部加载完成
   */
  isAllLoaded() {
    const allImageURLs = this.imagePaths.getAllImages();
    return allImageURLs.every(url => this.loadedImages[url] !== undefined);
  }

  /**
   * 获取加载进度
   * @returns {number} 加载进度 (0-1)
   */
  getProgress() {
    if (this.totalImages === 0) return 0;
    return this.loadProgress / this.totalImages;
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.XixiImageLoader = XixiImageLoader;
}
