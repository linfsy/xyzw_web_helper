const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, '张角.jpg');
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const iconSizes = [
  { name: 'mipmap-mdpi', size: 48 },
  { name: 'mipmap-hdpi', size: 72 },
  { name: 'mipmap-xhdpi', size: 96 },
  { name: 'mipmap-xxhdpi', size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 }
];

async function generateIcons() {
  try {
    console.log('正在加载源图片...');
    const image = await loadImage(sourceImage);
    
    console.log('正在创建图标目录...');
    iconSizes.forEach(({ name }) => {
      const dirPath = path.join(resDir, name);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
    
    console.log('正在生成图标...');
    for (const { name, size } of iconSizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(image, 0, 0, size, size);
      
      const outputPath = path.join(resDir, name, 'ic_launcher.png');
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outputPath, buffer);
      
      console.log(`✓ 生成 ${name}/ic_launcher.png (${size}x${size})`);
    }
    
    console.log('图标生成完成！');
  } catch (error) {
    console.error('生成图标失败:', error);
    process.exit(1);
  }
}

generateIcons();