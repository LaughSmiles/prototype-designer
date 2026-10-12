/**
 * 将页面中引用外部图片服务的地址改写为本地资源，使原型完全离线可用。
 *
 * 处理两类：
 *   1. 仍在服务的图床（picsum.photos / api.dicebear.com / images.unsplash.com）
 *      —— 下载到 lib/images/，保持原始尺寸。
 *   2. 已停服的服务（via.placeholder.com，2024 年已关停）
 *      —— 生成本地 SVG 占位图，不依赖任何外部服务。
 *
 * 不处理：可点击的演示链接（href 指向 localhost / example.com 等），它们本就该联网。
 *
 * 用法： node tools/localize-images.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PAGES_ROOT = path.join(PROJECT_ROOT, 'pages');
const IMG_DIR = path.join(PROJECT_ROOT, 'lib', 'images');
const DRY_RUN = process.argv.includes('--dry-run');

const IMAGE_HOSTS = ['images.unsplash.com', 'images.pexels.com', 'picsum.photos', 'api.dicebear.com'];
const DEAD_HOSTS = ['via.placeholder.com'];

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full, out);
        else if (e.name.toLowerCase().endsWith('.html')) out.push(full);
    }
    return out;
}

function localName(url) {
    const u = new URL(url);
    const host = u.hostname.replace(/[^a-z0-9]+/gi, '_');
    const base = u.pathname.replace(/^\//, '').replace(/[^a-zA-Z0-9-]/g, '') || 'img';
    const seg = u.pathname.split('/').filter(Boolean);
    const w = u.searchParams.get('w') || seg[seg.length - 2] || 'x';
    const h = u.searchParams.get('h') || seg[seg.length - 1] || 'x';
    const seed = u.searchParams.get('seed') || '';
    const parts = [host, base, w + 'x' + h];
    if (seed) parts.push(seed);
    let ext = path.extname(u.pathname).toLowerCase();
    if (!/^\.(jpg|jpeg|png|gif|webp|svg)$/.test(ext)) ext = '.img';
    return parts.join('_') + ext;
}

/** 生成占位 SVG，替代已停服的 via.placeholder.com */
function placeholderSvg(w, h) {
    const label = w + '×' + h;
    const fontSize = Math.max(8, Math.round(Math.min(w, h) / 4));
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + label + '">\n'
        + '  <rect width="' + w + '" height="' + h + '" fill="#e9edf2"/>\n'
        + '  <rect x="0.5" y="0.5" width="' + (w - 1) + '" height="' + (h - 1) + '" fill="none" stroke="#c8d0da"/>\n'
        + '  <text x="50%" y="50%" fill="#9aa5b1" font-family="sans-serif" font-size="' + fontSize + '" text-anchor="middle" dominant-baseline="middle">' + label + '</text>\n'
        + '</svg>\n';
}

if (!DRY_RUN && !fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

const pages = walk(PAGES_ROOT);
const RESOURCE_RE = /(?:src|poster|data-src)="(https?:\/\/[^"]+)"/g;

const targets = new Map();
for (const p of pages) {
    const c = fs.readFileSync(p, 'utf-8');
    for (const m of c.matchAll(RESOURCE_RE)) {
        const url = m[1];
        let host;
        try { host = new URL(url).hostname; } catch (e) { continue; }
        if (DEAD_HOSTS.includes(host)) targets.set(url, { kind: 'placeholder' });
        else if (IMAGE_HOSTS.includes(host)) targets.set(url, { kind: 'file' });
    }
}

console.log('========== 外部图片本地化 ==========');
console.log('待本地化资源  : ' + targets.size);

const finalName = new Map();

async function run() {
    let ok = 0;
    let failed = 0;
    const failedList = [];

    for (const [url, meta] of targets) {
        if (meta.kind === 'placeholder') {
            const u = new URL(url);
            const seg = u.pathname.split('/').filter(Boolean);
            const w = parseInt(seg[0], 10) || 36;
            const h = parseInt(seg[1], 10) || w;
            const file = path.join(IMG_DIR, localName(url).replace(/\.img$/, '.svg'));
            if (!DRY_RUN) fs.writeFileSync(file, placeholderSvg(w, h), 'utf-8');
            ok++;
            continue;
        }

        const file = path.join(IMG_DIR, localName(url));
        if (fs.existsSync(file) && fs.statSync(file).size > 0) {
            const buf0 = fs.readFileSync(file);
            const ext2 = buf0.slice(0, 200).toString('utf8').includes('<svg') ? '.svg' : buf0[0] === 0x89 ? '.png' : '.jpg';
            const fin = file.replace(/\.img$/, ext2);
            if (fin !== file) fs.renameSync(file, fin);
            finalName.set(url, path.basename(fin));
            ok++;
            continue;
        }
        if (DRY_RUN) { ok++; continue; }
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length < 200) throw new Error('响应过小');
            const ct = res.headers.get('content-type') || '';
            const ext2 = ct.includes('svg') ? '.svg' : ct.includes('png') ? '.png' : ct.includes('webp') ? '.webp' : ct.includes('gif') ? '.gif' : '.jpg';
            const final = file.replace(/\.img$/, ext2);
            fs.writeFileSync(final, buf);
            finalName.set(url, path.basename(final));
            ok++;
        } catch (e) {
            failed++;
            failedList.push(url + '  (' + e.message + ')');
        }
    }
    console.log('处理成功      : ' + ok);
    console.log('处理失败      : ' + failed);

    let rewrittenPages = 0;
    let rewrittenRefs = 0;
    for (const p of pages) {
        const original = fs.readFileSync(p, 'utf-8');
        let rel = path.relative(path.dirname(p), IMG_DIR).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = './' + rel;
        let next = original;
        let n = 0;
        for (const [url, meta] of targets) {
            const name = meta.kind === 'placeholder' ? localName(url).replace(/\.img$/, '.svg') : finalName.get(url);
            const re = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            if (re.test(next)) { next = next.replace(re, rel + '/' + name); n++; }
        }
        if (n && next !== original) {
            if (!DRY_RUN) fs.writeFileSync(p, next, 'utf-8');
            rewrittenPages++;
            rewrittenRefs += n;
        }
    }
    console.log('改写文件      : ' + rewrittenPages);
    console.log('改写引用      : ' + rewrittenRefs + (DRY_RUN ? '（dry-run，未写盘）' : ''));

    if (DRY_RUN) return;

    let left = [];
    let missing = 0;
    for (const p of pages) {
        const c = fs.readFileSync(p, 'utf-8');
        for (const m of c.matchAll(RESOURCE_RE)) {
            let host = '';
            try { host = new URL(m[1]).hostname; } catch (e) {}
            if (IMAGE_HOSTS.includes(host) || DEAD_HOSTS.includes(host)) {
                left.push(path.relative(PROJECT_ROOT, p) + ' → ' + m[1]);
            }
        }
        for (const m of c.matchAll(/(?:src|poster|data-src)="((?:\.\.\/)+lib\/images\/[^"]+)"/g)) {
            if (!fs.existsSync(path.resolve(path.dirname(p), m[1]))) {
                missing++;
                console.log('  ✗ 缺失: ' + path.relative(PROJECT_ROOT, p) + ' → ' + m[1]);
            }
        }
    }
    console.log('\n最终复核: 仍指向外部图床 ' + left.length + ' 处；本地图片缺失 ' + missing + ' 处');
    left.slice(0, 10).forEach((l) => console.log('  ' + l));

    if (failedList.length) {
        console.log('\n--- 处理失败 ---');
        failedList.forEach((f) => console.log('  ' + f));
        process.exit(1);
    }
}

run();