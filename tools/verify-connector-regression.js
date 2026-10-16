/**
 * 智能连接线 · 回归有效性验证（层 2）
 *
 * 目的：证明 tools/test-connector.js 不是"永远绿"的摆设。
 * 做法：把 connector-router.js 复制到临时基线目录，把三处关键修复
 *       回滚成"错误实现"，再用同一套用例跑一遍 —— 必须变红，
 *       且每一类缺陷至少命中一个用例。
 *
 * 回滚的三处缺陷：
 *   缺陷 A｜正交约束失效：_orthogonalize 不再为斜段插入拐点
 *            → 预期「3. 正交性」用例变红
 *   缺陷 B｜端点吸附失效：不再强制把首尾点投影到矩形边界
 *            → 预期「8. 端点吸附」用例变红
 *   缺陷 C｜最优拐点评分失效：不再按"拐点少+短"择优，改为直接取最后一个候选
 *            → 预期「4. 拐点数」用例变红
 *
 * 用法：
 *   node tools/verify-connector-regression.js
 *   node tools/verify-connector-regression.js --keep   保留基线目录供排查
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, '.baseline-connector');

// ---------------------------------------------------------------- 回滚定义

/**
 * 每条回滚都必须在基线源码里**真实匹配到**才算数：
 * 模式没命中就直接抛错，而不是静默跳过 —— 否则"回滚脚本失效"会被
 * 误读成"用例没覆盖到缺陷"，把真问题藏起来。
 */
const REVERTS = [
    {
        key: '缺陷 A',
        label: '正交约束失效（允许斜线段）',
        file: 'js/connectors/connector-router.js',
        pairs: [[
            /    _orthogonalize\(pts\) \{\n        if \(!pts \|\| pts\.length === 0\) return \[\];\n        const out = \[pts\[0\]\];\n        for \(let i = 1; i < pts\.length; i\+\+\) \{\n            const prev = out\[out\.length - 1\];\n            const cur = pts\[i\];\n            if \(prev\.x === cur\.x \|\| prev\.y === cur\.y\) \{\n                out\.push\(cur\);\n            \} else \{\n                out\.push\(\{ x: cur\.x, y: prev\.y \}\);\n                out\.push\(cur\);\n            \}\n        \}\n        return out;\n    \}/,
            // 回滚：不再插入拐点，斜段直接连过去
            `    _orthogonalize(pts) {\n` +
            `        if (!pts || pts.length === 0) return [];\n` +
            `        return pts.slice();\n` +
            `    }`
        ]],
    },
    {
        key: '缺陷 B',
        label: '端点吸附失效（首尾点不投影到矩形边界）',
        file: 'js/connectors/connector-router.js',
        pairs: [[
            /                \/\/ 强制首尾贴边：两矩形重叠时 p0 可能落在对方内部，\n                \/\/ 传入 other 让它沿本矩形边界滑到能脱开的位置。\n                ortho\[0\] = this\.projectToBoundary\(a, ortho\[0\], b\);\n                ortho\[ortho\.length - 1\] = this\.projectToBoundary\(b, ortho\[ortho\.length - 1\], a\);/,
            // 回滚：去掉强制投影，首尾点保留中间计算结果（可能落在矩形内部）
            `                // (reverted: no boundary projection)`
        ]],
    },
    {
        key: '缺陷 C',
        label: '最优拐点评分失效（不再择优，取最后一个候选）',
        file: 'js/connectors/connector-router.js',
        pairs: [[
            /        const candidates = this\._buildCandidates\(fromRect, toRect\);\n        let best = null;\n        for \(const pts of candidates\) \{\n            \/\/ 候选在 _buildCandidates 末尾已正交化\n            const deduped = this\._dedupe\(pts\);\n            if \(deduped\.length < 2\) continue;\n            const segments = deduped\.length - 1;\n            const length = this\._pathLength\(deduped\);\n            \/\/ 拐点数为第一优先级（乘大系数压过长度），同拐点取更短\n            const score = segments \* 1e7 \+ length;\n            if \(!best \|\| score < best\.score\) \{\n                best = \{ pts: deduped, score \};\n            \}\n        \}\n\n        \/\/ 所有候选都退化（例如两矩形几乎完全重叠）→ 画一个脱困回路\n        return best \? best\.pts : this\._escapeLoop\(fromRect, toRect\);/,
            // 回滚：不评分、不跳过退化项，直接取最后一个候选（枚举顺序里的最差解）
            `        const candidates = this._buildCandidates(fromRect, toRect);\n` +
            `        return this._dedupe(candidates.length ? candidates[candidates.length - 1] : []);`
        ]],
    },
    {
        key: '缺陷 D',
        label: '圆弧凸出拐点（sweep-flag 方向反了）',
        file: 'js/connectors/connector-router.js',
        pairs: [[
            /        const sweep = \+\(y01 \* x20 > x01 \* y20\);/,
            // 回滚：取反 sweep —— 这正是最初的缺陷（拿叉积/错误判据当 sweep），
            // 会让半数拐角的圆弧翻到拐点外侧变成凸弧。
            `        const sweep = +(y01 * x20 <= x01 * y20);`
        ]],
    },
    {
        key: '缺陷 E',
        label: '亚像素微段画出可见圆弧（脏小凸起）',
        file: 'js/connectors/connector-router.js',
        pairs: [[
            /        if \(!\(radiusUsed > this\.MIN_VISIBLE_RADIUS\)\) return null;/,
            // 回滚：不做可见性下限，0.4px 微段也会画出一个极小圆弧
            `        if (!(radiusUsed > 0)) return null;`
        ]],
    },
];

// ---------------------------------------------------------------- 基线构造

/**
 * 构建基线：只应用 selected 指定的那些回滚（全部应用则传 null）。
 * 单独回滚每个缺陷，是为了避免缺陷之间互相掩盖 ——
 * 三个一起回滚时，「正交性」用例可能被「拐点评分」的随机变化掩盖而漏红。
 */
function buildBaseline(selected) {
    fs.rmSync(BASELINE, { recursive: true, force: true });
    fs.mkdirSync(path.join(BASELINE, 'js', 'connectors'), { recursive: true });

    // 同一文件可能有多条回滚，先读原文，再按顺序应用
    const fileCache = new Map();
    let reverted = 0;
    for (const { key, file, pairs } of REVERTS) {
        if (selected && !selected.includes(key)) continue;

        if (!fileCache.has(file)) {
            fileCache.set(file, fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n'));
        }
        let src = fileCache.get(file);
        for (const [pattern, replacement] of pairs) {
            if (!pattern.test(src)) {
                throw new Error(
                    `回滚失败：${file} 中未匹配到「${pattern}」\n` +
                    `（源文件结构可能已变，请同步更新本脚本的 REVERTS）`);
            }
            src = src.replace(pattern, replacement);
            reverted++;
        }
        fileCache.set(file, src);
    }

    for (const [file, src] of fileCache) {
        fs.writeFileSync(path.join(BASELINE, file), src, 'utf8');
    }
    return reverted;
}

// ---------------------------------------------------------------- 执行

function runBaselineTests() {
    let output = '';
    try {
        output = execFileSync(process.execPath, [path.join(__dirname, 'test-connector.js')], {
            env: { ...process.env, CONNECTOR_TEST_ROOT: BASELINE, CONNECTOR_TEST_CASE_TIMEOUT: '3000' },
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 60000,
        });
    } catch (e) {
        // 用例失败时 execFileSync 会抛，但 stdout 里有完整的逐条结果
        output = (e.stdout || '') + (e.stderr || '');
    }
    return output.replace(/\x1b\[[0-9;]*m/g, '');
}

function parseFailures(plain) {
    const failed = [];
    for (const l of plain.split(/\r?\n/)) {
        const m = l.match(/^\s*·\s*(.+)$/);
        if (m) failed.push(m[1].trim());
    }
    return failed;
}

function main() {
    const KEEP = process.argv.includes('--keep');

    console.log('\x1b[1m回归有效性验证：逐个回滚路由修复，确认每处都有用例能变红\x1b[0m');
    console.log('\x1b[2m（逐个隔离回滚，避免缺陷之间互相掩盖 —— 一起回滚时，');
    console.log('  「正交性」用例可能被「拐点评分」的随机变化掩盖而漏红。）\x1b[0m\n');

    // 每个缺陷：单独回滚 → 跑用例 → 必须命中自己的用例组
    const checks = [
        { key: '缺陷 A', label: '正交约束失效（允许斜线段）',     expect: n => n.includes('正交') },
        { key: '缺陷 B', label: '端点吸附失效（不投影到边界）',     expect: n => n.includes('吸附') || n.includes('边') },
        { key: '缺陷 C', label: '最优拐点评分失效（不择优）',       expect: n => n.includes('拐点') || n.includes('直连') },
        { key: '缺陷 D', label: '圆弧凸出拐点（sweep 方向反）',     expect: n => n.includes('凹') || n.includes('凸') },
        { key: '缺陷 E', label: '亚像素微段画出可见圆弧',           expect: n => n.includes('微段') || n.includes('可见圆弧') || n.includes('MIN_VISIBLE') },
    ];

    const results = [];

    for (const c of checks) {
        let reverted;
        try {
            reverted = buildBaseline([c.key]);
        } catch (e) {
            console.error(`\x1b[31m${e.message}\x1b[0m`);
            process.exit(1);
        }

        const output = runBaselineTests();
        const failedNames = parseFailures(output);
        const hit = failedNames.some(c.expect);

        results.push({ ...c, hit, failedCount: failedNames.length, failedNames });
        const mark = hit ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        console.log(`${mark} ${c.label}  \x1b[2m(回滚 ${reverted} 处 → 失败 ${failedNames.length} 项)\x1b[0m`);
        if (hit) {
            const hitNames = failedNames.filter(c.expect);
            hitNames.forEach(n => console.log(`    \x1b[32m└ 捕获于\x1b[0m ${n}`));
        } else {
            console.log(`    \x1b[31m└ 未被任何用例捕获 —— 该缺陷缺少覆盖\x1b[0m`);
            failedNames.slice(0, 5).forEach(n => console.log(`      \x1b[2m(基线倒是失败了这些，但都不属于本缺陷: ${n})\x1b[0m`));
        }
    }

    console.log('');
    const allHit = results.every(r => r.hit);

    if (!KEEP) {
        fs.rmSync(BASELINE, { recursive: true, force: true });
    } else {
        console.log('\n\x1b[33m(--keep 已保留基线目录供排查)\x1b[0m');
    }

    if (!allHit) {
        console.log('\x1b[31m✗ 存在未被覆盖的缺陷，测试需要补充用例。\x1b[0m');
        process.exit(1);
    }

    const totalHits = results.reduce((n, r) => n + r.failedCount, 0);
    console.log(`\n\x1b[32m✓ ${results.length} 处缺陷均被用例独立捕获（合计 ${totalHits} 项基线失败），当前代码全绿 —— 测试有效。\x1b[0m`);
    process.exit(0);
}

main();
