import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    
    console.log('正在创建图标目录...');
    iconSizes.forEach(({ name }) => {
      const dirPath = path.join(resDir, name);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
    
    console.log('正在生成图标...');
    for (const { name, size } of iconSizes) {
      const outputPath = path.join(resDir, name, 'ic_launcher.png');
      
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ 生成 ${name}/ic_launcher.png (${size}x${size})`);
    }
    
    console.log('图标生成完成！');
  } catch (error) {
    console.error('生成图标失败:', error);
    process.exit(1);
  }
}

generateIcons();