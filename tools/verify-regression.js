/**
 * 回归有效性验证
 *
 * 目的：证明 tools/test-persistence.js 不是"永远绿"的摆设。
 * 做法：把当前代码复制到临时目录，把三处修复回滚成修复前的原始实现，
 *       再用同一套用例跑一遍 —— 必须出现失败，且失败项落在预期的缺陷上。
 *
 * 用法：node tools/verify-regression.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, '.baseline-prefix');

// ---------------------------------------------------------------- 基线构造

/** 把"修复后的代码"替换回"修复前的原始实现" */
const REVERTS = [
    {
        file: 'js/storage.js',
        // 1) 自动保存失败静默：只 Debug.error，无任何 UI 反馈
        pairs: [[
            /        if \(result\.ok\) \{\n            Debug\.log\('自动保存成功:', new Date\(\)\.toLocaleTimeString\(\)\);\n        \} else \{\n            this\._reportSaveFailure\(result, \{ silent: true \}\);\n        \}\n        return result;/,
            `        if (result.ok) {\n            Debug.log('自动保存成功:', new Date().toLocaleTimeString());\n        } else {\n            Debug.error('自动保存失败:', result.error);\n        }\n        return result;`
        ]],
    },
    {
        file: 'js/page-manager/page-manager.js',
        // 3) 串行 + 无超时 + 探测失败即删除元素
        pairs: [[
            /    async cleanInvalidPageReferences\(elements\) \{[\s\S]*?\n        return validElements;\n    \},\n\n    \/\/ 重置为一个空白页面/,
            `    async cleanInvalidPageReferences(elements) {\n` +
            `        const validElements = [];\n` +
            `        let invalidCount = 0;\n` +
            `\n` +
            `        for (const element of elements) {\n` +
            `            if (element.type === 'page') {\n` +
            `                const pageInfo = PageLibrary.getPageInfo(element.pageId);\n` +
            `                if (pageInfo && pageInfo.isValid !== false) {\n` +
            `                    const exists = await PageLibrary.checkPageExists(pageInfo.filePath);\n` +
            `                    if (exists) {\n` +
            `                        validElements.push(element);\n` +
            `                    } else {\n` +
            `                        invalidCount++;\n` +
            `                    }\n` +
            `                } else {\n` +
            `                    invalidCount++;\n` +
            `                }\n` +
            `            } else {\n` +
            `                validElements.push(element);\n` +
            `            }\n` +
            `        }\n` +
            `\n` +
            `        return validElements;\n` +
            `    },\n\n    // 重置为一个空白页面`
        ]],
    },
    {
        file: 'js/page-library/page-library.js',
        // 3) 无超时；任何异常都当作"文件不存在"
        pairs: [[
            /    async probePage\(filePath, \{ timeout = 3000 \} = \{\}\) \{[\s\S]*?\n        \}\n    \},\n\n    \/\/ 批量探测/,
            `    async probePage(filePath, { timeout = 3000 } = {}) {\n` +
            `        if (window.location.protocol === 'file:') {\n` +
            `            return 'exists';\n` +
            `        }\n` +
            `        try {\n` +
            `            const response = await fetch(filePath, { method: 'HEAD' });\n` +
            `            return response.ok ? 'exists' : 'missing';\n` +
            `        } catch (error) {\n` +
            `            return 'missing';\n` +
            `        }\n` +
            `    },\n\n    // 批量探测`
        ]],
    },
    {
        file: 'js/storage.js',
        // 2) 只删画布主键，不停定时器、不清内存
        pairs: [[
            /    \/\/ 清空浏览器缓存\n    clearBrowserCache\(\) \{[\s\S]*?\n    \}\n\};/,
            `    // 清空浏览器缓存\n` +
            `    clearBrowserCache() {\n` +
            `        ModalManager.showConfirm(\n` +
            `            '确定要清空浏览器缓存吗?\\n\\n此操作将删除 localStorage 中保存的画布数据,且不可恢复!',\n` +
            `            '清空浏览器缓存',\n` +
            `            () => {\n` +
            `                try {\n` +
            `                    localStorage.removeItem(this.STORAGE_KEY);\n` +
            `                    if (localStorage.getItem(this.STORAGE_KEY) === null) {\n` +
            `                        PageLibrary.showHint('✅ 浏览器缓存已清空');\n` +
            `                    } else {\n` +
            `                        PageLibrary.showHint('❌ 清空失败');\n` +
            `                    }\n` +
            `                } catch (error) {\n` +
            `                    Debug.error('清空缓存失败:', error);\n` +
            `                    alert('清空缓存失败：' + error.message);\n` +
            `                }\n` +
            `            }\n` +
            `        );\n` +
            `    }\n` +
            `};`
        ]],
    },
];

function buildBaseline() {
    fs.rmSync(BASELINE, { recursive: true, force: true });
    fs.mkdirSync(BASELINE, { recursive: true });
    fs.cpSync(path.join(ROOT, 'js'), path.join(BASELINE, 'js'), { recursive: true });

    let reverted = 0;
    for (const { file, pairs } of REVERTS) {
        const p = path.join(BASELINE, file);
        // Windows 仓库是 CRLF，先归一化，否则下面的正则（按 \n 写）匹配不到
        let src = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
        for (const [pattern, replacement] of pairs) {
            if (!pattern.test(src)) {
                throw new Error(`回滚失败：${file} 中未匹配到模式\n${pattern}`);
            }
            src = src.replace(pattern, replacement);
            reverted++;
        }
        fs.writeFileSync(p, src, 'utf8');
    }
    return reverted;
}

// ---------------------------------------------------------------- 执行

function main() {
    const KEEP = process.argv.includes('--keep');
    console.log('\x1b[1m回归有效性验证：把三处修复回滚后，用例是否真的会红？\x1b[0m\n');
    const reverted = buildBaseline();
    console.log(`已构建修复前基线: ${BASELINE}（回滚 ${reverted} 处）\n`);

    let output = '';
    try {
        // 超时用例在旧代码下会永久挂起，这里再加一道外层保险
        output = execFileSync(process.execPath, [path.join(__dirname, 'test-persistence.js')], {
            env: { ...process.env, PERSIST_TEST_ROOT: BASELINE, PERSIST_TEST_CASE_TIMEOUT: '3000' },
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 120000,
        });
    } catch (e) {
        output = (e.stdout || '') + (e.stderr || '');
    }

    // 直接回放基线跑出来的完整输出（去掉颜色码），便于逐条核对
    console.log(output.replace(/\x1b\[[0-9;]*m/g, ''));
    console.log('');

    const plain = output.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = plain.split(/\r?\n/);

    const failedNames = [];
    for (const l of lines) {
        const m = l.match(/^\s*·\s*\[(.+?)\]\s*(.+)$/);
        if (m) failedNames.push({ suite: m[1], name: m[2].trim() });
    }

    if (failedNames.length === 0) {
        console.log('\n\x1b[31m✗ 基线仍然全绿 —— 用例没有覆盖到这三个缺陷，测试是无效的。\x1b[0m');
        process.exit(1);
    }

    console.log(`\n\x1b[31m基线失败 ${failedNames.length} 项（预期会红）：\x1b[0m`);
    failedNames.forEach(f => console.log(`  · ${f.name}`));

    // 三个缺陷必须各至少命中一个用例
    const need = [
        { key: '问题 1', label: '配额/存储失败静默', hit: failedNames.some(f => f.suite.includes('问题 1')) },
        { key: '问题 2', label: '清空缓存只删一半', hit: failedNames.some(f => f.suite.includes('问题 2')) },
        { key: '问题 3', label: '串行探测/超时/误删', hit: failedNames.some(f => f.suite.includes('问题 3')) },
    ];
    console.log('');
    let allHit = true;
    need.forEach(n => {
        const mark = n.hit ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        if (!n.hit) allHit = false;
        console.log(`  ${mark} ${n.label}`);
    });

    if (!allHit) {
        if (!KEEP) fs.rmSync(BASELINE, { recursive: true, force: true });
        console.log('\n\x1b[31m存在未被覆盖的缺陷，用例需要补充。\x1b[0m');
        process.exit(1);
    }
    if (KEEP) {
        console.log('\n\x1b[33m(--keep 已保留基线目录供排查)\x1b[0m');
    } else {
        fs.rmSync(BASELINE, { recursive: true, force: true });
    }
    console.log('\n\x1b[32m✓ 三处缺陷均被用例捕获，当前代码全绿 —— 测试有效。\x1b[0m');
    process.exit(0);
}

main();
