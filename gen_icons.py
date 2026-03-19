from PIL import Image
import os

logo = Image.open('public/logo.jpg').convert('RGBA')

# Make it square (crop center)
w, h = logo.size
s = min(w, h)
left = (w - s) // 2
top = (h - s) // 2
logo = logo.crop((left, top, left + s, top + s))

base = r'android\app\src\main\res'

# Android mipmap sizes
sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

for folder, size in sizes.items():
    path = os.path.join(base, folder)
    os.makedirs(path, exist_ok=True)
    
    resized = logo.resize((size, size), Image.LANCZOS)
    
    # ic_launcher.png
    resized.save(os.path.join(path, 'ic_launcher.png'), 'PNG')
    # ic_launcher_round.png (same image, Android handles round masking)
    resized.save(os.path.join(path, 'ic_launcher_round.png'), 'PNG')
    # ic_launcher_foreground.png (for adaptive icons, needs to be 108/48 = 2.25x bigger with padding)
    fg_size = int(size * 1.5)  # foreground is larger with safe zone
    fg = Image.new('RGBA', (fg_size, fg_size), (26, 26, 46, 255))  # #1a1a2e background
    offset = (fg_size - size) // 2
    fg.paste(resized, (offset, offset), resized)
    fg.save(os.path.join(path, 'ic_launcher_foreground.png'), 'PNG')
    
    print(f'  {folder}: {size}x{size}px done')

print('All icons generated successfully!')
