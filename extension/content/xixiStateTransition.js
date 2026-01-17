/**
 * Xixi 状态切换管理器
 * 负责处理状态切换时的平滑过渡，使用透明度技巧实现无过渡切换
 */

class XixiStateTransition {
  constructor(widget) {
    this.widget = widget;
    
    // 配置参数
    this.config = {
      // 切换时的透明度
      hiddenOpacity: 0,        // 隐藏时的透明度（完全透明）
      visibleOpacity: 1,       // 显示时的透明度
      
      // 切换延迟（毫秒）- 确保透明度变化生效
      hideDelay: 50,           // 隐藏延迟
      showDelay: 50,           // 显示延迟
      
      // 是否使用过渡动画（根据需求，不使用过渡）
      useTransition: false,
    };
    
    // 状态
    this.isTransitioning = false;
    this.transitionQueue = [];
  }

  /**
   * 执行状态切换（使用透明度技巧）
   * @param {string} fromState - 源状态
   * @param {string} toState - 目标状态
   * @param {Image} newImage - 新状态的图片
   * @param {Function} onComplete - 切换完成回调
   */
  async transition(fromState, toState, newImage, onComplete = null) {
    if (!this.widget.imgElement) {
      console.warn('[XixiStateTransition] imgElement 不存在，无法切换');
      if (onComplete) onComplete();
      return;
    }

    // 验证 newImage 是否有效
    if (!newImage) {
      console.error('[XixiStateTransition] newImage 无效，无法切换');
      if (onComplete) onComplete();
      return;
    }

    // 如果正在切换，将新切换加入队列
    if (this.isTransitioning) {
      this.transitionQueue.push({ fromState, toState, newImage, onComplete });
      return;
    }

    this.isTransitioning = true;
    
    try {
      // 步骤 1：瞬间隐藏（opacity → 0）
      await this.hide();
      
      // 步骤 2：切换图片
      this.switchImage(newImage);
      
      // 验证图片是否已设置（同步检查，确保 src 被设置）
      if (!this.widget.imgElement.src || this.widget.imgElement.src === '') {
        console.error('[XixiStateTransition] switchImage 后图片 src 仍未设置，尝试直接设置');
        // 尝试直接设置
        let imageSrc = null;
        if (typeof newImage === 'string') {
          imageSrc = newImage;
        } else if (newImage && newImage.src) {
          imageSrc = newImage.src;
        }
        
        if (imageSrc) {
          console.log('[XixiStateTransition] 直接设置图片 src:', imageSrc.substring(0, 50) + '...');
          this.widget.imgElement.src = imageSrc;
          this.widget.imgElement.style.visibility = 'visible';
          this.widget.imgElement.style.display = 'block';
        } else {
          console.error('[XixiStateTransition] 无法获取图片 URL');
        }
      } else {
        console.log('[XixiStateTransition] 图片 src 已设置:', this.widget.imgElement.src.substring(0, 50) + '...');
      }
      
      // 步骤 3：恢复显示（opacity → 1）
      await this.show();
      
      // 确保图片完全可见（双重保险）
      if (this.widget.imgElement) {
        this.widget.imgElement.style.visibility = 'visible';
        this.widget.imgElement.style.display = 'block';
        // 确保 opacity 不为 0
        const currentOpacity = parseFloat(this.widget.imgElement.style.opacity);
        if (!currentOpacity || currentOpacity === 0 || isNaN(currentOpacity)) {
          this.widget.imgElement.style.opacity = '1';
          console.log('[XixiStateTransition] 强制设置 opacity 为 1');
        }
      }
      
      // 切换完成
      this.isTransitioning = false;
      
      if (onComplete) {
        onComplete();
      }
      
      // 处理队列中的下一个切换
      this.processQueue();
      
    } catch (error) {
      console.error('[XixiStateTransition] 状态切换失败:', error);
      this.isTransitioning = false;
      if (onComplete) onComplete();
      this.processQueue();
    }
  }

  /**
   * 隐藏图片（opacity → 0）
   * @returns {Promise}
   */
  hide() {
    return new Promise((resolve) => {
      if (!this.widget.imgElement) {
        resolve();
        return;
      }

      // 禁用过渡动画（如果需要瞬间切换）
      if (!this.config.useTransition) {
        this.widget.imgElement.style.transition = 'none';
      }
      
      // 设置透明度为 0
      this.widget.imgElement.style.opacity = this.config.hiddenOpacity;
      
      // 等待一小段时间确保变化生效
      setTimeout(() => {
        resolve();
      }, this.config.hideDelay);
    });
  }

  /**
   * 显示图片（opacity → 1）
   * @returns {Promise}
   */
  show() {
    return new Promise((resolve) => {
      if (!this.widget.imgElement) {
        resolve();
        return;
      }

      // 禁用过渡动画（如果需要瞬间切换）
      if (!this.config.useTransition) {
        this.widget.imgElement.style.transition = 'none';
      }
      
      // 设置透明度为 1
      this.widget.imgElement.style.opacity = this.config.visibleOpacity;
      
      // 等待一小段时间确保变化生效
      setTimeout(() => {
        // 恢复过渡动画（供其他动画使用）
        this.widget.imgElement.style.transition = '';
        resolve();
      }, this.config.showDelay);
    });
  }

  /**
   * 切换图片
   * @param {Image|string} newImage - 新图片（Image 对象或 URL 字符串）
   */
  switchImage(newImage) {
    if (!this.widget || !this.widget.imgElement) {
      console.error('[XixiStateTransition] switchImage: widget 或 imgElement 不存在');
      return;
    }
    
    // 获取图片 URL
    let imageSrc = null;
    
    if (typeof newImage === 'string') {
      imageSrc = newImage;
    } else if (newImage && typeof newImage === 'object' && newImage.src) {
      imageSrc = newImage.src;
    }
    
    // 如果仍然无法获取 URL，尝试从 widget 的 imageLoader 获取
    if (!imageSrc && this.widget.imageLoader && this.widget.imageLoader.imagePaths) {
      const currentState = this.widget.currentState || 'baseline';
      const urls = this.widget.imageLoader.imagePaths.getStateImages(currentState);
      if (urls && urls.length > 0) {
        imageSrc = urls[0];
      }
    }

    // 如果仍然没有 URL，直接返回
    if (!imageSrc) {
      console.error('[XixiStateTransition] switchImage: 无法获取图片 URL', {
        newImage: newImage,
        currentState: this.widget.currentState
      });
      return;
    }

    // 直接设置图片源（只在 src 变化时设置，避免重复触发 onload）
    if (this.widget.imgElement.src !== imageSrc) {
      this.widget.imgElement.src = imageSrc;
    }
    
    // 确保图片元素可见
    this.widget.imgElement.style.visibility = 'visible';
    this.widget.imgElement.style.display = 'block';
    
    // 确保 opacity 不为 0（在切换过程中，opacity 可能被设置为 0）
    const currentOpacity = parseFloat(this.widget.imgElement.style.opacity);
    if (!currentOpacity || currentOpacity === 0 || isNaN(currentOpacity)) {
      this.widget.imgElement.style.opacity = '1';
      console.log('[XixiStateTransition] switchImage: 设置 opacity 为 1');
    }
  }

  /**
   * 处理切换队列
   */
  processQueue() {
    if (this.transitionQueue.length === 0) {
      return;
    }

    const nextTransition = this.transitionQueue.shift();
    this.transition(
      nextTransition.fromState,
      nextTransition.toState,
      nextTransition.newImage,
      nextTransition.onComplete
    );
  }

  /**
   * 清除切换队列
   */
  clearQueue() {
    this.transitionQueue = [];
  }

  /**
   * 检查是否正在切换
   * @returns {boolean}
   */
  isInTransition() {
    return this.isTransitioning;
  }

  /**
   * 强制完成当前切换（用于紧急情况）
   */
  forceComplete() {
    if (this.isTransitioning && this.widget.imgElement) {
      this.widget.imgElement.style.opacity = this.config.visibleOpacity;
      this.widget.imgElement.style.transition = '';
    }
    this.isTransitioning = false;
    this.clearQueue();
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.XixiStateTransition = XixiStateTransition;
}

