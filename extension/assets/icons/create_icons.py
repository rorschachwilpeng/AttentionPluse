#!/usr/bin/env python3
"""
快速创建占位图标
需要安装 Pillow: pip install Pillow
"""

from PIL import Image, ImageDraw

def create_icon(size, filename):
    """创建指定尺寸的图标"""
    # 创建图像
    img = Image.new('RGB', (size, size), color='#667eea')
    draw = ImageDraw.Draw(img)
    
    # 绘制简单的波形图案
    width, height = img.size
    center_y = height // 2
    
    # 绘制几条波形线
    for i in range(3):
        points = []
        for x in range(0, width, 2):
            y = center_y + int(5 * (i - 1) * (x / width - 0.5) * 2)
            points.append((x, y))
        
        if len(points) > 1:
            draw.line(points, fill='white', width=2)
    
    # 保存
    img.save(filename)
    print(f'已创建: {filename} ({size}x{size})')

if __name__ == '__main__':
    create_icon(16, 'icon16.png')
    create_icon(48, 'icon48.png')
    create_icon(128, 'icon128.png')
    print('所有图标创建完成！')

