const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const i18nPath = path.join(root, 'src', 'i18n.js');
const code = fs.readFileSync(i18nPath, 'utf8');
const start = code.indexOf('const resources = ');
const end = code.indexOf('\n};', start) + 2;
const body = code.slice(start, end).replace('const resources', 'var resources') + '; resources';
const resources = vm.runInNewContext(body, {});
const enKeys = new Set(Object.keys(resources.en.translation));
const isKeys = new Set(Object.keys(resources.is.translation));

function walk(dir) {
    const acc = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name.startsWith('.')) continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) acc.push(...walk(p));
        else if (/\.(jsx|js|tsx|ts)$/.test(ent.name)) acc.push(p);
    }
    return acc;
}

const re = /\bt\s*\(\s*['"]([^'"]+)['"]/g;
const used = new Set();
for (const f of walk(path.join(root, 'src'))) {
    const s = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(s))) used.add(m[1]);
}

const missingEn = [...used].filter((k) => !enKeys.has(k)).sort();
console.log('Used in code, missing en:', missingEn.length);
console.log(missingEn.join('\n'));

const onlyEn = [...enKeys].filter((k) => !isKeys.has(k));
const onlyIs = [...isKeys].filter((k) => !enKeys.has(k));
console.log('en-only', onlyEn.length, onlyEn.slice(0, 20));
console.log('is-only', onlyIs.length, onlyIs.slice(0, 20));
