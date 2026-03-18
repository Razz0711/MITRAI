const fs = require('fs');
const path = require('path');

const exts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html', '.mjs', '.cjs', '.env', '.xml', '.gradle', '.properties', '.java', '.pbxproj', '.plist', '.m', '.h', '.swift', '.storyboard'];
const ignores = ['node_modules', '.git', '.next', 'dist', 'build', 'public', '.expo', 'ios/Pods', 'android/.gradle'];

function walk(dir, rootDir) {
    let results = [];
    let list;
    try {
        list = fs.readdirSync(dir);
    } catch (e) {
        return results;
    }
    list.forEach(file => {
        const filePath = path.join(dir, file);
        let stat;
        try {
            stat = fs.statSync(filePath);
        } catch (e) {
            return;
        }
        if (stat && stat.isDirectory()) {
            if (!ignores.includes(file)) {
                results = results.concat(walk(filePath, rootDir));
            }
        } else {
            const ext = path.extname(file);
            const base = path.basename(file);
            if (exts.includes(ext) || base === '.env' || base.startsWith('.env.')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const rootDir = __dirname;
console.log('Scanning from:', rootDir);
const files = walk(rootDir, rootDir);
let changedFiles = 0;

const map = {
  'MitrRAI': 'MitrRAI',
  'mitrrai': 'mitrrai',
  'MITRRAI': 'MITRRAI',
  'MitrRAi': 'MitrRAi',
  'mitrRAI': 'mitrRAI',
  'Mitrrai': 'Mitrrai'
};

files.forEach(file => {
    let content;
    try {
        content = fs.readFileSync(file, 'utf8');
    } catch (e) {
        return;
    }
    let original = content;

    content = content.replace(/mitrrai/ig, (match) => {
        if (map[match]) return map[match];
        if (match === match.toUpperCase()) return 'MITRRAI';
        if (match === match.toLowerCase()) return 'mitrrai';
        return 'MitrRAI'; // default
    });

    if (content !== original) {
        try {
            fs.writeFileSync(file, content, 'utf8');
            changedFiles++;
            console.log('Modified:', path.relative(rootDir, file));
        } catch (e) {
            console.error('Failed to write:', file);
        }
    }
});

console.log('Total files changed:', changedFiles);

// Rename android package directory if it exists
const androidParentDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'java', 'com');
const androidOldDir = path.join(androidParentDir, 'mitrrai');
const androidNewDir = path.join(androidParentDir, 'mitrrai');
if (fs.existsSync(androidOldDir)) {
    try {
        fs.renameSync(androidOldDir, androidNewDir);
        console.log('Renamed android package directory.');
    } catch(e) {
        console.error('Error renaming android dir:', e);
    }
}
