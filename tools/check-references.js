/**
 * 校验并修复所有原型页面中的本地引用（src / href）
 *
 * 背景：项目经过多次批量迁移后，部分页面残留了指向已废弃目录结构的失效引用，
 *      浏览器会静默忽略它们，导致样式/图标缺失，且不会有任何报错。
 *      本工具做两件事：
 *        1. verify —— 解析每个本地引用，报告解析失败项（有未解决项时以非零码退出，可接 CI）
 *        2. repair —— 自动修复可识别的失效引用
 *
 * 修复策略（按优先级）：
 *   a) 已知遗留映射：lib/tailwindcss/* → lib/js/tailwindcss.js，lib/fontawesome/* → lib/css/all.min.css
 *   b) 按文件名在 js/ css/ lib/ menu/ 中反查唯一匹配，重算正确的相对路径
 *   c) 若页面中已存在可用的等价引用，则直接删除这条冗余失效标签
 *
 * 用法：
 *   node tools/check-references.js            # 仅校验，报告问题
 *   node tools/check-references.js --repair   # 校验并修复
 *   node tools/check-references.js --dry-run  # 模拟修复，不写盘
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PAGES_ROOT = path.join(PROJECT_ROOT, 'pages');
const REPAIR = process.argv.includes('--repair');
const DRY_RUN = process.argv.includes('--dry-run') || !REPAIR;

/** 允许被引用的顶层资源目录 */
const SEARCH_ROOTS = ['js', 'css', 'lib', 'menu'];

/** 已知的历史目录结构 → 当前目录结构 */
const KNOWN_MAP = [
    {
        // 废弃的 tailwindcss 目录
        test: (rel) => /(^|\/)lib\/tailwindcss\/tailwind(\.min)?\.(css|js)$/.test(rel),
        resource: 'tailwindcss',
        target: () => path.join(PROJECT_ROOT, 'lib', 'js', 'tailwindcss.js'),
    },
    {
        test: (rel) => /(^|\/)lib\/fontawesome\/all(\.min)?\.css$/.test(rel),
        resource: 'fontawesome',
        target: () => path.join(PROJECT_ROOT, 'lib', 'css', 'all.min.css'),
    },
];

/** 递归列出目录下的所有文件 */
function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

/** 文件名 → 绝对路径 反查表（仅收录可被引用的资源根目录下的文件） */
const INDEX = new Map();
for (const root of SEARCH_ROOTS) {
    for (const f of walk(path.join(PROJECT_ROOT, root))) {
        if (!INDEX.has(path.basename(f))) INDEX.set(path.basename(f), f);
    }
}

const htmlFiles = walk(PAGES_ROOT).filter((f) => f.toLowerCase().endsWith('.html'));

/** 从页面所在目录指向目标文件的相对路径，始终以 ../ 开头、以 / 结尾（跨根目录时） */
function relTo(pageFile, target) {
    let rel = path.relative(path.dirname(pageFile), target).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return rel;
}

/**
 * 抽取页面中的本地引用标签。
 * 关键：<script> 必须连同其 </script> 一起匹配，否则删除时会遗留孤立的闭合标签。
 */
function extractTags(content) {
    const tags = [];
    const re = /<(script|link)\b[^>]*?\b(?:src|href)="((?:\.\.\/)*(?:js\/|css\/|lib\/|menu\/)[^"?#]+)"[^>]*?>(?:\s*<\/script>)?/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
        tags.push({ full: m[0], kind: m[1].toLowerCase(), rel: m[2], line: lineOf(content, m.index) });
    }
    return tags;
}

/** 计算某个字符下标所在的行号（0 基） */
function lineOf(content, index) {
    let n = 0;
    for (let i = 0; i < index; i++) if (content.charCodeAt(i) === 10) n++;
    return n;
}

/**
 * 清理孤立闭合标签：统计 <script 与 </script> 数量，
 * 若闭合多于开启，则删除那些独占一行的孤立 </script>。
 */
function stripOrphanScriptCloses(content, edits) {
    const opens = (content.match(/<script\b/gi) || []).length;
    const closes = (content.match(/<\/script>/gi) || []).length;
    let extra = closes - opens;
    if (extra <= 0) return content;
    const lines = content.split('\n');
    for (let i = lines.length - 1; i >= 0 && extra > 0; i--) {
        if (/^\s*<\/script>\s*$/.test(lines[i])) {
            lines.splice(i, 1);
            extra--;
            edits.push('删除孤立的 </script>');
        }
    }
    return lines.join('\n');
}

const fixedFiles = [];
const unresolved = [];

for (const pageFile of htmlFiles) {
    const relPage = path.relative(PROJECT_ROOT, pageFile).replace(/\\/g, '/');
    const original = fs.readFileSync(pageFile, 'utf-8');
    const tags = extractTags(original);

    if (!tags.length) continue;

    let content = original;
    let changed = false;
    const edits = [];

    for (const tag of tags) {
        const abs = path.resolve(path.dirname(pageFile), tag.rel);
        if (fs.existsSync(abs)) continue; // 正常

        // --- 尝试确定这个失效引用「应该」指向哪里 ---
        let target = null;
        let resource = null;
        for (const m of KNOWN_MAP) {
            if (m.test(tag.rel)) {
                target = m.target();
                resource = m.resource;
                break;
            }
        }
        if (!target && INDEX.has(path.basename(tag.rel))) {
            target = INDEX.get(path.basename(tag.rel));
            resource = path.basename(tag.rel);
        }
        if (!target || !fs.existsSync(target)) {
            unresolved.push({ file: relPage, rel: tag.rel, reason: '无法确定正确目标' });
            continue;
        }

        const correctRel = relTo(pageFile, target);
        const isJs = target.toLowerCase().endsWith('.js');

        // 页面里是否已经有可用的等价引用？有则删掉这条冗余失效标签
        const alreadyOk = tags.some(
            (t) =>
                t.full !== tag.full &&
                (() => {
                    const a = path.resolve(path.dirname(pageFile), t.rel);
                    if (!fs.existsSync(a)) return false;
                    return resource ? path.basename(a) === path.basename(target) : false;
                })()
        );

        let replacement;
        if (alreadyOk) {
            replacement = ''; // 删除冗余标签
            edits.push(`删除冗余失效引用 ${tag.rel}`);
        } else if (tag.kind === 'link' && isJs) {
            // 目标其实是 JS，必须用 <script> 承载
            replacement = `<script src="${correctRel}"></script>`;
            edits.push(`${tag.rel} → ${correctRel}（link 改为 script）`);
        } else {
            replacement = tag.full.replace(tag.rel, correctRel);
            edits.push(`${tag.rel} → ${correctRel}`);
        }

        // 若该标签独占一行，删除整行（含缩进与换行），避免留下空白行
        const lineStart = content.lastIndexOf('\n', content.indexOf(tag.full)) + 1;
        const lineEnd = content.indexOf('\n', content.indexOf(tag.full));
        const wholeLine = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
        const isWholeLine = wholeLine.trim() === tag.full.trim();

        if (isWholeLine && replacement === '') {
            const cutTo = lineEnd === -1 ? content.length : lineEnd + 1;
            content = content.slice(0, lineStart) + content.slice(cutTo);
        } else {
            content = content.replace(tag.full, replacement);
        }
        changed = true;
    }

    // 清理孤立闭合标签与多余空行
    const before = content;
    content = stripOrphanScriptCloses(content, edits);
    if (content !== before) changed = true;
    content = content.replace(/\n{3,}/g, '\n\n');

    if (changed && !DRY_RUN) {
        fs.writeFileSync(pageFile, content, 'utf-8');
    }
    if (changed) {
        fixedFiles.push({ file: relPage, edits });
    }
}

console.log('========== 本地引用校验 ==========');
console.log(`扫描页面      : ${htmlFiles.length}`);
console.log(`发生修复的文件: ${fixedFiles.length}${DRY_RUN ? '（dry-run，未写盘）' : ''}`);
console.log(`无法自动解决  : ${unresolved.length}`);

if (fixedFiles.length) {
    console.log('\n--- 修复明细 ---');
    for (const f of fixedFiles) {
        console.log(`  ${f.file}`);
        f.edits.forEach((e) => console.log(`      · ${e}`));
    }
}

if (unresolved.length) {
    console.log('\n--- 需人工处理 ---');
    unresolved.forEach((u) => console.log(`  ${u.file}  →  ${u.rel}  (${u.reason})`));
}

// 无论是否修复，都重新解析一遍，确保修复后无残留
let remaining = 0;
for (const pageFile of htmlFiles) {
    const content = fs.readFileSync(pageFile, 'utf-8');
    for (const tag of extractTags(content)) {
        if (!fs.existsSync(path.resolve(path.dirname(pageFile), tag.rel))) {
            remaining++;
            console.error(`✗ 仍有失效引用: ${path.relative(PROJECT_ROOT, pageFile)} → ${tag.rel}`);
        }
    }
}

console.log(`\n最终复核: 失效引用 ${remaining} 处`);
process.exit(remaining > 0 ? 1 : 0);