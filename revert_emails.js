const fs = require('fs');
const path = require('path');

const replaceInFile = (file) => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/mitrai@/g, 'mitrai@');
    content = content.replace(/@mitrrai\./g, '@mitrai.');
    content = content.replace(/mitraistudy8/g, 'mitraistudy8');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Reverted emails in:', file);
    }
};

const exts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html', '.mjs', '.cjs', '.env', '.local', '.production', '.sql'];
function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (['node_modules', '.git', '.next', 'build', 'dist', 'android', 'ios'].includes(file)) return;
            results = results.concat(walk(filePath));
        } else {
            // Also include .env files using includes
            if (exts.includes(path.extname(file)) || file.startsWith('.env') || file.endsWith('.env')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const allFiles = walk(__dirname);
allFiles.forEach(replaceInFile);
