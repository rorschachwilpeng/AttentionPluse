// 内容标签判断模块：对内容进行分类
// 支持关键词匹配和 # 标签提取

class ContentTagger {
  constructor() {
    // 标签定义
    this.TAGS = {
      TECH: 'tech',           // 科技
      LEARNING: 'learning',   // 学习
      ENTERTAINMENT: 'entertainment', // 娱乐
      SPORTS: 'sports',       // 运动
      LIFE: 'life',           // 生活
      UNKNOWN: 'unknown'      // 未知
    };
    
    // 关键词库（每个标签对应的关键词）
    this.keywords = {
      [this.TAGS.TECH]: [
        // 技术相关
        '技术', '编程', '代码', '开发', '软件', '硬件', '科技', '互联网',
        'AI', '人工智能', '机器学习', '深度学习', '算法', '数据', '大数据',
        '云计算', '区块链', '加密货币', '比特币', '以太坊',
        '前端', '后端', '全栈', 'Java', 'Python', 'JavaScript', 'React', 'Vue',
        '程序员', '码农', '工程师', '架构', '系统', '平台', '应用', 'APP',
        '数字化', '智能化', '自动化', '物联网', 'IoT', '5G', '6G',
        '芯片', '半导体', '电子', '计算机', '电脑', '手机', '智能设备'
      ],
      
      [this.TAGS.LEARNING]: [
        // 学习相关
        '学习', '教程', '课程', '知识', '教育', '读书', '笔记', '方法', '技巧',
        '经验', '考试', '备考', '技能', '提升', '进步', '成长', '能力',
        '英语', '数学', '语文', '历史', '地理', '物理', '化学', '生物',
        '大学', '研究生', '博士', '学位', '学历', '证书', '资格证',
        '阅读', '写作', '思考', '理解', '记忆', '复习', '预习',
        '学霸', '学渣', '学习计划', '学习方法', '学习笔记', '学习心得',
        '培训', '讲座', '研讨会', '学术', '研究', '论文', '文献'
      ],
      
      [this.TAGS.ENTERTAINMENT]: [
        // 娱乐相关
        '娱乐', '搞笑', '段子', '笑话', '幽默', '有趣', '好玩',
        '明星', '偶像', '追星', '粉丝', '应援', '演唱会', '演出',
        '综艺', '真人秀', '选秀', '比赛', '竞技',
        '电影', '电视剧', '追剧', '影评', '观后感', '剧情', '演员', '导演',
        '音乐', '歌曲', '歌手', '专辑', 'MV', '音乐节', 'live',
        '游戏', '手游', '端游', '电竞', '吃鸡', '王者', 'LOL',
        '吃瓜', '八卦', '热搜', '话题', '热点', '新闻',
        '动漫', '二次元', 'cosplay', '漫展'
      ],
      
      [this.TAGS.SPORTS]: [
        // 运动相关
        '运动', '健身', '锻炼', '跑步', '晨跑', '夜跑', '马拉松',
        '瑜伽', '普拉提', '拉伸', '柔韧性',
        '游泳', '潜水', '冲浪', '水上运动',
        '骑行', '自行车', '单车', '公路车', '山地车',
        '篮球', '足球', '排球', '网球', '羽毛球', '乒乓球',
        '举重', '力量训练', '增肌', '减脂', '塑形', '马甲线', '腹肌',
        '减肥', '瘦身', '体重', 'BMI', '体脂', '肌肉',
        '健康', '体能', '耐力', '爆发力', '柔韧性',
        '运动打卡', '健身打卡', '跑步打卡', '运动记录',
        '健身房', '私教', '训练', '训练计划', '运动装备'
      ],
      
      [this.TAGS.LIFE]: [
        // 生活相关
        '生活', '日常', '分享', '好物', '推荐', '种草',
        '穿搭', '时尚', '服装', '搭配', '风格', '潮流',
        '美食', '料理', '烹饪', '食谱', '餐厅', '探店', '打卡',
        '旅行', '旅游', '攻略', '景点', '酒店', '民宿',
        '家居', '装修', '设计', '装饰', '收纳', '整理',
        '情感', '心情', '感悟', '思考', '人生', '生活态度',
        '购物', '买买买', '剁手', '优惠', '折扣', '促销',
        '宠物', '猫', '狗', '养宠', '宠物日常',
        '护肤', '美妆', '化妆品', '护肤品', '美容',
        '亲子', '育儿', '教育孩子', '家庭', '家人'
      ]
    };
  }
  
  /**
   * 提取文本中的 # 标签
   * @param {string} text - 文本内容
   * @returns {Array} # 标签数组
   */
  extractHashtags(text) {
    if (!text) return [];
    
    // 匹配 # 开头的标签（支持中文、英文、数字）
    const hashtagRegex = /#([^\s#]+)/g;
    const matches = text.match(hashtagRegex);
    
    if (!matches) return [];
    
    // 提取标签内容（去掉 # 号）
    return matches.map(tag => tag.substring(1).trim()).filter(tag => tag.length > 0);
  }
  
  /**
   * 对文本进行关键词匹配
   * @param {string} text - 文本内容
   * @param {string} tag - 标签类型
   * @returns {number} 匹配次数
   */
  matchKeywords(text, tag) {
    if (!text || !this.keywords[tag]) return 0;
    
    const keywords = this.keywords[tag];
    const lowerText = text.toLowerCase();
    let matchCount = 0;
    
    // 统计关键词匹配次数
    keywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      // 使用 indexOf 进行匹配（简单但有效）
      const regex = new RegExp(lowerKeyword, 'g');
      const matches = lowerText.match(regex);
      if (matches) {
        matchCount += matches.length;
      }
    });
    
    return matchCount;
  }
  
  /**
   * 判断内容标签
   * @param {string|Object} content - 内容（可以是文本字符串，也可以是包含 text 的对象）
   * @returns {string} 标签名称
   */
  tag(content) {
    // 处理输入：支持字符串或对象
    let text = '';
    let hashtags = [];
    
    if (typeof content === 'string') {
      text = content;
    } else if (content && typeof content === 'object') {
      text = content.text || content.fullText || content.visibleContent?.text || '';
    }
    
    if (!text || text.trim().length === 0) {
      return this.TAGS.UNKNOWN;
    }
    
    // 提取 # 标签
    hashtags = this.extractHashtags(text);
    
    // 合并正文和标签文本（标签权重更高）
    const hashtagText = hashtags.join(' ');
    const combinedText = hashtagText + ' ' + text;
    
    // 对每个标签进行匹配
    const scores = {};
    const allTags = [this.TAGS.TECH, this.TAGS.LEARNING, this.TAGS.ENTERTAINMENT, 
                     this.TAGS.SPORTS, this.TAGS.LIFE];
    
    allTags.forEach(tag => {
      // 正文匹配
      const textScore = this.matchKeywords(text, tag);
      
      // 标签匹配（权重 x2）
      const hashtagScore = this.matchKeywords(hashtagText, tag) * 2;
      
      // 总分
      scores[tag] = textScore + hashtagScore;
    });
    
    // 找到得分最高的标签
    let maxScore = 0;
    let bestTag = this.TAGS.UNKNOWN;
    
    Object.keys(scores).forEach(tag => {
      if (scores[tag] > maxScore) {
        maxScore = scores[tag];
        bestTag = tag;
      }
    });
    
    // 如果最高分是 0，返回未知
    if (maxScore === 0) {
      return this.TAGS.UNKNOWN;
    }
    
    return bestTag;
  }
  
  /**
   * 获取标签的中文名称
   * @param {string} tag - 标签代码
   * @returns {string} 中文名称
   */
  getTagName(tag) {
    const names = {
      [this.TAGS.TECH]: '科技',
      [this.TAGS.LEARNING]: '学习',
      [this.TAGS.ENTERTAINMENT]: '娱乐',
      [this.TAGS.SPORTS]: '运动',
      [this.TAGS.LIFE]: '生活',
      [this.TAGS.UNKNOWN]: '未知'
    };
    
    return names[tag] || '未知';
  }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.ContentTagger = ContentTagger;
}

