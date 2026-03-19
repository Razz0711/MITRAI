const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const logo = 'public/logo.jpg';
const base = path.join('android', 'app', 'src', 'main', 'res');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generate() {
  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(base, folder);
    fs.mkdirSync(dir, { recursive: true });
    
    // ic_launcher.png and ic_launcher_round.png
    await sharp(logo)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));
    
    await sharp(logo)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));
    
    // ic_launcher_foreground.png (larger with padding for adaptive icons)
    const fgSize = Math.round(size * 1.5);
    const padding = Math.round((fgSize - size) / 2);
    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 26, g: 26, b: 46, alpha: 1 }
      }
    })
    .composite([{
      input: await sharp(logo).resize(size, size, { fit: 'cover' }).png().toBuffer(),
      top: padding,
      left: padding,
    }])
    .png()
    .toFile(path.join(dir, 'ic_launcher_foreground.png'));
    
    console.log(`  ${folder}: ${size}x${size}px done`);
  }
  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
