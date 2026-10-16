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
    'js/element-manager/element-renderer.js',
    'js/tools/tools-connector.js',
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
        name: 'I. 重新引入按声明高度的裁剪（页面下半部分永远没锚点）',
        file: 'js/connectors/anchor-bridge.js',
        find: '                    if (canvasRect && this.isUsableHost(canvasRect)) {',
        replace: '                    if (canvasRect && this.isUsableHost(canvasRect) && canvasRect.y + canvasRect.height <= pageElement.position.y + pageElement.height) {',
        expectRed: '页面下半部分也产生锚点',
    },
    {
        name: 'J. file:// 上报路径重新引入裁剪（两条路径行为不一致）',
        file: 'js/connectors/anchor-bridge.js',
        find: '            if (!rect || !this.isUsableHost(rect)) continue;',
        replace: '            if (!rect || !this.isUsableHost(rect) || rect.height > pageElement.height) continue;',
        expectRed: '上报项同样不做裁剪',
    },
    {
        name: 'M. 尺寸过滤被绕过（小头像/数字冒锚点）',
        file: 'js/connectors/anchor-bridge.js',
        find: '    isUsableHost(rect) {\n        if (!rect) return false;\n        if (rect.width < this.MIN_HOST_EDGE || rect.height < this.MIN_HOST_EDGE) return false;\n        return rect.width * rect.height >= this.MIN_HOST_AREA;\n    },',
        replace: '    isUsableHost(rect) {\n        return !!rect;\n    },',
        expectRed: '应产生锚点宿主',
    },
    {
        name: 'N. 锚点归属不认外扩带（框外锚点点不中 → 选了 A 连到 B）',
        file: 'js/connectors/anchor-session.js',
        find: '        const band = this.BAND;\n        let best = null;',
        replace: '        const band = 0;\n        let best = null;',
        expectRed: '框外锚点必须能归属到宿主元素',
    },
    {
        name: 'O. 命中不用渲染清单（退回几何推导 → 选了 A 连到 B）',
        file: 'js/connectors/anchor-session.js',
        find: '    hitRendered(point, tolerance) {\n        if (!point || !this._rendered.length) return null;',
        replace: '    hitRendered(point, tolerance) {\n        if (!point || true) return null;',
        expectRed: '应命中',
    },
    {
        name: 'P. clearAnchors 不同步清清单（幽灵锚点：画布空了还能点中）',
        file: 'js/element-manager/element-renderer.js',
        // ⚠️ element-renderer.js 是既有 CRLF 文件，多行 find 必须用 \r\n，
        //    否则注入点永远匹配不上 —— 而"匹配不上"比"没注入"更危险：
        //    它会让本脚本看起来在工作，实际却漏检这一项。
        find: '        AnchorSession.setRendered([]);\r\n    }\r\n};',
        replace: '    }\r\n};',
        expectRed: 'clearAnchors 必须清空锚点清单',
    },
    {
        name: 'Q. 不剔除与页面框等大的根容器（锚点与页面框重复，纯噪音）',
        file: 'js/connectors/anchor-bridge.js',
        find: 'if (ratio < this.HOST_VS_PAGE_RATIO) {',
        replace: 'if (true) {',
        expectRed: '铺满全屏的根容器不产生锚点',
    },
    {
        name: 'R. 不做宿主去重叠（嵌套容器锚点叠在同一位置）',
        file: 'js/connectors/anchor-bridge.js',
        find: '        const deduped = opts.dedupe === false ? found : this.dedupeHosts(found);',
        replace: '        const deduped = found;',
        expectRed: '边几乎重合的嵌套容器只应保留一个宿主',
    },
    {
        name: 'S. 不做两层模型（一次全亮 128 个 → 糊成一片）',
        file: 'js/element-manager/element-renderer.js',
        find: '            const layers = AnchorSession.pageLevelHosts(hosts).slice();\r\n            const inner = AnchorSession.hoveredInnerHost(cursor, hosts);\r\n            if (inner) layers.push(inner);',
        replace: '            const layers = hosts.slice();',
        expectRed: 'hover 页面框：只返回页面级锚点',
    },
    {
        name: 'T. 第二层命中不取最内层（大容器盖住里面的按钮）',
        file: 'js/connectors/anchor-session.js',
        find: '            if (area < bestArea) {',
        replace: '            if (area > bestArea) {',
        expectRed: '应取面积最小的最内层',
    },
    {
        name: 'U. 第二层把页面框也算进去（页面框既当第一层又当高亮层）',
        file: 'js/connectors/anchor-session.js',
        find: "            if (!h || h.kind !== 'inner' || !h.rect) continue;",
        replace: '            if (!h || !h.rect) continue;',
        expectRed: '只命中页面框本身时，第二层应为空',
    },
    {
        name: 'V. renderPreview 用页面框矩形而非解析出的内部元素矩形（预览/落线分叉）',
        file: 'js/tools/tools-connector.js',
        // 模拟真实分叉：调用了公共入口，但**只用元素级矩形**（丢掉 inner 解析）。
        // 这是最隐蔽的一类：字面上"走了公共入口"，行为上仍然与落线不同。
        find: '            fromRect = ep.fromRect; toRect = ep.toRect;',
        replace: '            const _fe = ElementManager.getElement(fromId); const _te = ElementManager.getElement(toId);\n            fromRect = _fe ? this.rectOf(_fe) : null; toRect = _te ? this.rectOf(_te) : null;',
        expectRed: '必须把 ep 的矩形用于算路径',
    },
    {
        name: 'W. 端点解析退回页面框矩形（inner 锚点解析失败也不降级到内部矩形）',
        file: 'js/connectors/anchor-session.js',
        find: '            const r = getInnerRect(el.id, anchorRef.selector);\n            if (r) return r;',
        replace: '            const r = getInnerRect(el.id, anchorRef.selector);',
        expectRed: '终点必须用**内部子元素**的矩形',
    },
    {
        name: 'X. hostsOf 退回声明高度（内容溢出时上下边锚点错位 → 只显示一半）',
        file: 'js/connectors/anchor-session.js',
        find: '        const rect = this.measuredRectOf(pageElement);',
        replace: '        const rect = { x: pageElement.position.x, y: pageElement.position.y,\n            width: pageElement.width, height: pageElement.height };',
        expectRed: 'hostsOf 必须调用 measuredRectOf',
    },
    {
        name: 'Y. 锚点半径除以 zoom（缩小反而放大到 40px）',
        file: 'js/element-manager/element-renderer.js',
        find: "                    c.setAttribute('r', AnchorProvider.RADIUS);",
        replace: "                    c.setAttribute('r', AnchorProvider.RADIUS / (view.zoom || 1));",
        expectRed: 'r 不得除以 zoom',
    },
    {
        name: 'Z. 实测高度比声明高度小时也采用（元素折叠时锚点塌缩）',
        file: 'js/connectors/anchor-session.js',
        find: '        if (h <= declared.height) return declared;',
        replace: '        if (h > 1e9) return declared;',
        expectRed: '异常偏小的实测值不应采用',
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
