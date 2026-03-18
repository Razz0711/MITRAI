const fs = require('fs');
const path = require('path');

const map = {
  'MitrRAI': 'MitrRAI',
  'mitrrai': 'mitrrai',
  'MITRRAI': 'MITRRAI',
  'MitrRAi': 'MitrRAi',
  'mitrRAI': 'mitrRAI',
  'Mitrrai': 'Mitrrai'
};

const replaceInFile = (file) => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/mitrrai/ig, (match) => {
        if (map[match]) return map[match];
        if (match === match.toUpperCase()) return 'MITRRAI';
        if (match === match.toLowerCase()) return 'mitrrai';
        return 'MitrRAI'; // default
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Modified:', file);
    }
};

const exts = ['.sql', '.js'];
function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (['node_modules', '.git'].includes(file)) return;
            results = results.concat(walk(filePath));
        } else {
            if (exts.includes(path.extname(file))) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const allExtFiles = walk(__dirname);
allExtFiles.forEach(replaceInFile);
