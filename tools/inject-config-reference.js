/**
 * 批量注入 page-fields-config.js 引用到所有 admin HTML 页面
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const PAGES_ROOT = path.join(__dirname, '../pages/admin');

// 查找所有引用了 prototype-components.js 的 HTML 文件
const htmlFiles = glob.sync('**/*.html', {
    cwd: PAGES_ROOT,
    absolute: true,
    windowsPathsNoEscape: true
});

let modifiedCount = 0;
let skippedCount = 0;

for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf-8');

    // 检查是否已包含 page-fields-config.js
    if (content.includes('page-fields-config.js')) {
        skippedCount++;
        continue;
    }

    // 检查是否引用了 prototype-components.js
    if (!content.includes('prototype-components.js')) {
        skippedCount++;
        continue;
    }

    // 确定正确的相对路径
    const depth = path.relative(PAGES_ROOT, file).split(path.sep).length - 1;
    const jsPath = '../'.repeat(depth) + 'js/';

    let newContent = content;

    // 在 prototype-components.js 之前添加配置文件引用
    // 支持多种 script 标签格式
    newContent = newContent.replace(
        /(<script[^>]*src=["'](?:\.\.\/)+js\/prototype-components\.js["'][^>]*>)/i,
        `<script src="${jsPath}page-fields-config.js"></script>\n    $1`
    );

    if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf-8');
        modifiedCount++;
        console.log(`  ✓ ${path.relative(PAGES_ROOT, file).replace(/\\/g, '/')}`);
    }
}

console.log(`\n========== 完成 ==========`);
console.log(`修改文件: ${modifiedCount} 个`);
console.log(`跳过文件: ${skippedCount} 个（已包含引用或未使用 prototype-components.js）`);
