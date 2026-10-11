/**
 * 批量注入 / 修复 page-fields-config.js 引用到所有 admin HTML 页面
 *
 * 设计要点：
 *   1. 路径由「文件所在目录 → 项目根/js」实际计算得出，不再用层数算术，
 *      因此对任意嵌套深度都正确（历史版本 depth 差一级，导致 228 个页面引用失效）。
 *   2. 具备修复能力：已存在的引用会被纠正为正确路径，历史错误路径与残缺标签一并修复。
 *   3. 幂等：内容已是正确状态时不做任何写入。
 *
 * 用法： cd tools && node inject-config-reference.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const JS_DIR = path.join(PROJECT_ROOT, 'js');
const PAGES_ROOT = path.join(PROJECT_ROOT, 'pages/admin');
const CONFIG_FILE = 'page-fields-config.js';
const RE_NAME = CONFIG_FILE.replace('.', '\\.');
const DRY_RUN = process.argv.includes('--dry-run');

if (!fs.existsSync(JS_DIR)) {
    console.error(`✗ 找不到 js 目录: ${JS_DIR}`);
    process.exit(1);
}

/** 递归收集所有 HTML 文件（不依赖 glob，避免额外依赖与平台差异） */
function collectHtmlFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectHtmlFiles(full));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
            files.push(full);
        }
    }
    return files;
}

/**
 * 计算从 file 所在目录指向 <项目根>/js/ 的相对路径，始终以 ../ 开头、以 / 结尾。
 * 例：pages/admin/system/user.html → '../../../js/'
 */
function resolveJsPath(file) {
    const rel = path.relative(path.dirname(file), JS_DIR);
    return rel.replace(/\\/g, '/').replace(/\/?$/, '/');
}

// 形态 A：完整但路径可能错误的 script 标签
const RE_PROPER_TAG = new RegExp(
    `<script[^>]*src=["'][^"']*${RE_NAME}["'][^>]*>\\s*</script>`,
    'gi'
);
// 形态 B：历史遗留的残缺片段（缺少 `<script src="`，浏览器会静默忽略）。
// 注意 `>` 必须允许出现在引号与 </script> 之间，且不能以 <script 开头。
const RE_BROKEN_FRAGMENT = new RegExp(
    `^(?!<script)[^\\n]*${RE_NAME}["'][^\\n]*</script>[ \\t]*\\r?$`,
    'gim'
);
// 形态 C：尚未注入，需要在 prototype-components.js 之前插入
const RE_INSERT_ANCHOR = new RegExp(
    `(<script[^>]*src=["'](?:\\.\\./)+js/prototype-components\\.js["'][^>]*>)`,
    'i'
);

const htmlFiles = collectHtmlFiles(PAGES_ROOT);
const stats = { repaired: 0, inserted: 0, skipped: 0, unchanged: 0 };
const problems = [];

for (const file of htmlFiles) {
    const relFile = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
    const original = fs.readFileSync(file, 'utf-8');
    const correctTag = `<script src="${resolveJsPath(file)}${CONFIG_FILE}"></script>`;

    let content = original;
    let action = null;

    // 先摘除所有已有的引用（无论正确、错误还是残缺），再统一插入一个正确标签。
    // 这样既能纠正路径，又能顺带消除重复标签。
    // 先摘除所有已有的引用（无论正确、错误还是残缺），再统一插入一个正确标签。
    // 这样既能纠正路径，又能顺带消除重复标签。
    // 摘除必须连同整行（含缩进与换行）一起删掉，否则会留下空白行，
    // 导致每次运行标签都下移一行 —— 脚本将永远无法达到幂等。
    const removeWholeLine = (src, match) => {
        const lineStart = src.lastIndexOf('\n', src.indexOf(match)) + 1;
        const lineEnd = src.indexOf('\n', src.indexOf(match));
        const whole = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd);
        if (whole.trim() !== match.trim()) {
            // 该行还有其它内容，只摘标签本身
            return src.replace(match, '');
        }
        return src.slice(0, lineStart) + src.slice(lineEnd === -1 ? src.length : lineEnd + 1);
    };

    const hadReference = RE_PROPER_TAG.test(content) || RE_BROKEN_FRAGMENT.test(content);
    if (hadReference) {
        RE_PROPER_TAG.lastIndex = 0;
        RE_BROKEN_FRAGMENT.lastIndex = 0;
        content = removeWholeLine(content, content.match(RE_PROPER_TAG)[0]);
        if (RE_BROKEN_FRAGMENT.test(content)) {
            RE_BROKEN_FRAGMENT.lastIndex = 0;
            content = removeWholeLine(content, content.match(RE_BROKEN_FRAGMENT)[0]);
        }
        action = 'repaired';
    }

    if (RE_INSERT_ANCHOR.test(content)) {
        content = content.replace(RE_INSERT_ANCHOR, `${correctTag}\n    $1`);
        action = hadReference ? 'repaired' : 'inserted';
    } else {
        // 该页面不使用页面字段配置（如 login.html / redirect.html）
        stats.skipped++;
        continue;
    }

    // 归一化摘除标签后残留的连续空行 —— 必须在校验「是否与原文一致」之前完成，
    // 否则每次运行都会重写全部文件（内容相同但仍产生 git 噪音）。
    content = content.replace(/\n{3,}/g, '\n\n');

    if (content === original) {
        stats.unchanged++;
        continue;
    }

    // 写入前自检：确保恰好存在一个正确引用，且没有残留的错误引用
    const correctCount = (content.match(new RegExp(`src=["']${resolveJsPath(file)}${CONFIG_FILE.replace('.', '\\.')}["']`, 'g')) || []).length;
    const strayCount = (content.match(new RegExp(`src=["'](?:\\.\\./)*js/${CONFIG_FILE.replace('.', '\\.')}["']`, 'g')) || []).length;
    if (correctCount !== 1 || strayCount !== 1) {
        problems.push(`${relFile}  自检未通过(正确=${correctCount}, 合计=${strayCount})，已跳过写入`);
        stats.skipped++;
        continue;
    }

    if (!DRY_RUN) {
        fs.writeFileSync(file, content, 'utf-8');
    }
    stats[action]++;
    if (!DRY_RUN) {
        console.log(`  ✓ [${action}] ${relFile}  →  ${resolveJsPath(file)}${CONFIG_FILE}`);
    }
}

console.log('\n========== 完成 ==========');
console.log(`扫描 HTML      : ${htmlFiles.length}`);
console.log(`修复引用       : ${stats.repaired}`);
console.log(`新增注入       : ${stats.inserted}`);
console.log(`已正确(未改动) : ${stats.unchanged}`);
console.log(`跳过           : ${stats.skipped}`);
if (DRY_RUN) {
    console.log('\n(dry-run 模式，未写入任何文件)');
}
if (problems.length) {
    console.error('\n⚠ 以下文件存在异常，已跳过：');
    problems.forEach((p) => console.error('  ' + p));
    process.exit(1);
}