/**
 * 智能连接线 · 锚点系统「回归有效性」验证（层 2）
 *
 * 用法：
 *   node tools/verify-anchor-regression.js
 *
 * 目的：证明 tools/test-anchor.js 不是"永远绿"的摆设。
 * 做法：在临时目录里复制代码树，对源码逐个注入**已知缺陷**，
 *       要求每个缺陷都让测试变红。任何一个缺陷没被抓到就退出非零。
 *
 * 这与 tools/verify-connector-regression.js 是同一套思路，
 * 但针对的是锚点系统（描述符解析 / 枚举 / 跨模块一致性 / 协议常量）。
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TEST = path.join(ROOT, 'tools', 'test-anchor.js');

// 需要复制进临时树的文件（测试会读取其中若干做静态校验）
const COPY = [
    'js/connectors/anchor-provider.js',
    'js/connectors/connector-router.js',
    'js/connectors/anchor-bridge.js',
    'js/connectors/anchor-session.js',
    'js/topbar.js',
];

/**
 * 缺陷定义。
 *
 * 每条含：
 *   name      缺陷说明
 *   file      要改的文件（相对 ROOT）
 *   find      必须精确匹配到源码里的字符串（匹配不到直接报错，
 *             防止源码重构后验证脚本"悄悄失效"变成永远绿）
 *   replace   注入缺陷后的代码
 *   expectRed 期望变红的用例关键词（用于给出可读的失败信息）
 */
const DEFECTS = [
    {
        name: 'A. 锚点外移方向搞反（把锚点画进元素内部）',
        file: 'js/connectors/anchor-provider.js',
        find: "        const n = this.normalOf(side);\n        return { x: point.x + n.x * distance, y: point.y + n.y * distance };",
        replace: "        const n = this.normalOf(side);\n        return { x: point.x - n.x * distance, y: point.y - n.y * distance };",
        expectRed: '锚点圆心应比边界点更远离中心',
    },
    {
        name: 'B. 归一化不做夹取（t 越界直接透传）',
        file: 'js/connectors/anchor-provider.js',
        find: "    _clamp01(v) {\n        const n = Number(v);\n        if (!Number.isFinite(n)) return 0.5;\n        return n < 0 ? 0 : (n > 1 ? 1 : n);\n    },",
        replace: "    _clamp01(v) {\n        const n = Number(v);\n        if (!Number.isFinite(n)) return 0.5;\n        return n;\n    },",
        expectRed: 't=-3 应夹到 0',
    },
    {
        name: 'C. 最小尺寸阈值失效（过小元素也产锚点 → 会重叠成团）',
        file: 'js/connectors/anchor-provider.js',
        find: "            const along = (side === 'left' || side === 'right') ? rect.height : rect.width;\n            if (along < this.MIN_HOST_SIZE) continue;",
        replace: "            const along = (side === 'left' || side === 'right') ? rect.height : rect.width;\n            if (false) continue;",
        expectRed: '过小的宿主不应产生锚点',
    },
    {
        name: 'D. 跨模块外移量不一致（锚点画在一处、线从另一处出发）',
        file: 'js/connectors/connector-router.js',
        find: '    ANCHOR_OFFSET: 6,',
        replace: '    ANCHOR_OFFSET: 9,',
        expectRed: '锚点外移量在两个模块各存一份',
    },
    {
        name: 'E. 锚点路由首段不沿法线（线从元素内部穿出）',
        file: 'js/connectors/connector-router.js',
        find: "        const lead = (rect, side) => {\n            const n = this._anchorNormal(side);",
        replace: "        const lead = (rect, side) => {\n            const n = { x: -this._anchorNormal(side).x, y: -this._anchorNormal(side).y };",
        expectRed: '首段应向法线方向前进',
    },
    {
        name: 'F. 圆角与 MasterGo 不一致（改回 24）',
        file: 'js/connectors/connector-router.js',
        find: '    DEFAULT_RADIUS: 16,',
        replace: '    DEFAULT_RADIUS: 24,',
        expectRed: 'MasterGo 连接线属性面板显示圆角 16',
    },
    {
        name: 'G. iframe 坐标换算漏掉 iframe 下沉量（锚点整体上移 30px）',
        file: 'js/connectors/anchor-bridge.js',
        find: '            y: pageElement.position.y + this.IFRAME_TOP_OFFSET + innerRect.top,',
        replace: '            y: pageElement.position.y + innerRect.top,',
        expectRed: '画布坐标应含页面元素偏移与 iframe 顶部下沉',
    },
    {
        name: 'H. CSS 选择器忽略同标签兄弟序号（会选错元素）',
        file: 'js/connectors/anchor-bridge.js',
        find: '                if (sameTag.length > 1) {',
        replace: '                if (false) {',
        expectRed: '第二个 li 应带序号',
    },
    {
        name: 'I. 内部宿主不做面积截断（锚点数量爆炸）',
        file: 'js/connectors/anchor-bridge.js',
        find: '        found.sort((a, b) => b.area - a.area || a.depth - b.depth);\n        return found.slice(0, maxHosts);',
        replace: '        found.sort((a, b) => b.area - a.area || a.depth - b.depth);\n        return found;',
        expectRed: '应被截断到 5 个',
    },
    {
        name: 'J. 上报数据不做尺寸阈值（下游少了第二道闸）',
        file: 'js/connectors/anchor-bridge.js',
        find: '            if (width < this.MIN_HOST_SIZE || height < this.MIN_HOST_SIZE) continue;',
        replace: '            if (false) continue;',
        expectRed: '宽度低于阈值的上报项应被丢弃',
    },
    {
        name: 'K. topbar.js 协议常量与 bridge 分叉（file:// 下锚点彻底失效）',
        file: 'js/topbar.js',
        find: "        var ANCHOR_RES = 'connector-anchor-response';",
        replace: "        var ANCHOR_RES = 'connector-anchor-reply';",
        expectRed: '两侧协议已分叉',
    },
    {
        name: 'L. 重叠时端点被 projectToBoundary 换边（偷偷改了用户的锚点）',
        file: 'js/connectors/connector-router.js',
        find: "                if (lockStart) {\n                    ortho[0] = this._fixLockedEndpoint(a, fromAnchor, b);",
        replace: "                if (lockStart) {\n                    ortho[0] = this.projectToBoundary(a, this._anchorPoint(a, fromAnchor), b);",
        expectRed: '换边说明锚点被偷改了',
    },
];

// ---------------------------------------------------------------- 工具

function rmrf(p) {
    fs.rmSync(p, { recursive: true, force: true });
}

function copyTree(dest) {
    for (const rel of COPY) {
        const src = path.join(ROOT, rel);
        const dst = path.join(dest, rel);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    }
    // 测试脚本本身也要复制（它会以 ANCHOR_TEST_ROOT 指向临时树）
    const testDst = path.join(dest, 'tools', 'test-anchor.js');
    fs.mkdirSync(path.dirname(testDst), { recursive: true });
    fs.copyFileSync(TEST, testDst);
}

function runTests(treeRoot) {
    const r = spawnSync(process.execPath, [path.join(treeRoot, 'tools', 'test-anchor.js')], {
        cwd: treeRoot,
        env: { ...process.env, ANCHOR_TEST_ROOT: treeRoot },
        encoding: 'utf8',
    });
    return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

// ---------------------------------------------------------------- 主流程

console.log('\x1b[1m智能连接线 · 锚点系统回归有效性验证\x1b[0m');
console.log(`源码树: ${ROOT}\n`);

const baseline = runTests(ROOT);
if (baseline.code !== 0) {
    console.error('\x1b[31m✗ 基线测试未通过，无法进行回归验证\x1b[0m');
    console.error(baseline.out.split('\n').slice(-25).join('\n'));
    process.exit(1);
}
console.log('\x1b[32m✓ 基线：全部用例通过\x1b[0m\n');

let caught = 0;
const missed = [];
const broken = [];

for (const d of DEFECTS) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-regress-'));
    try {
        copyTree(tmp);
        const target = path.join(tmp, d.file);
        const code = fs.readFileSync(target, 'utf8');

        if (!code.includes(d.find)) {
            broken.push(d.name);
            console.log(`  \x1b[31m✗ ${d.name}\x1b[0m`);
            console.log(`      \x1b[31m注入点未匹配到源码 —— 源码已重构，本验证脚本需要同步更新\x1b[0m`);
            continue;
        }

        fs.writeFileSync(target, code.replace(d.find, d.replace));
        const res = runTests(tmp);

        if (res.code === 0) {
            missed.push(d.name);
            console.log(`  \x1b[31m✗ ${d.name}\x1b[0m`);
            console.log(`      \x1b[31m缺陷注入后测试仍然全绿 —— 这条用例没有真正锁住该行为\x1b[0m`);
        } else if (!res.out.includes(d.expectRed)) {
            // 变红了，但不是期望的那条用例：可能是被别的用例顺带抓到。
            // 这仍然算"抓到了"，但必须提示出来，避免误导。
            caught++;
            console.log(`  \x1b[33m~ ${d.name}\x1b[0m`);
            console.log(`      \x1b[33m已变红，但期望用例「${d.expectRed}」未出现在失败列表（由其它用例抓到）\x1b[0m`);
        } else {
            caught++;
            console.log(`  \x1b[32m✓ ${d.name}\x1b[0m`);
        }
    } finally {
        rmrf(tmp);
    }
}

console.log(`\n${'─'.repeat(58)}`);
const total = DEFECTS.length;
if (missed.length === 0 && broken.length === 0) {
    console.log(`\x1b[32m✓ 回归有效：${caught}/${total} 处缺陷均被测试捕获\x1b[0m`);
    process.exit(0);
}

if (broken.length) {
    console.log(`\x1b[31m✗ ${broken.length} 处注入点失效（源码已重构，需更新验证脚本）：\x1b[0m`);
    for (const n of broken) console.log(`  \x1b[31m- ${n}\x1b[0m`);
}
if (missed.length) {
    console.log(`\x1b[31m✗ ${missed.length} 处缺陷未被捕获（测试形同虚设）：\x1b[0m`);
    for (const n of missed) console.log(`  \x1b[31m- ${n}\x1b[0m`);
}
process.exit(1);
