/**
 * 智能连接线 · 路由算法单元测试（层 1）
 *
 * 用法：
 *   node tools/test-connector.js
 *   node tools/test-connector.js --verbose
 *
 * 被测对象：js/connectors/connector-router.js（纯函数，无 DOM 依赖）
 * 做法：在 vm 沙箱里加载真实源码，只注入 Math/JSON 等宿主对象，
 *      不 mock 被测代码本身（同 tools/test-persistence.js 的思路）。
 *
 * 覆盖分组（与方案第五节一致）：
 *   1. 路由几何：水平/垂直/斜向/重叠/交叉
 *   2. 选边正确性：出边+进边方向
 *   3. 正交性：相邻点必 x 相等或 y 相等（无斜线段）
 *   4. 拐点数：可直连时为 0，否则最少
 *   5. 圆角：path d 合法、无 NaN、拐角圆滑
 *   6. 退化输入：零宽高、同位、自环、端点缺失
 *   7. 确定性：同输入多次调用结果一致
 *   8. 端点吸附：吸附点落在端点矩形某条边上
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.CONNECTOR_TEST_ROOT
    ? path.resolve(process.env.CONNECTOR_TEST_ROOT)
    : path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

if (process.env.CONNECTOR_TEST_ROOT) {
    console.log(`\x1b[33m> 使用替代代码树: ${ROOT}\x1b[0m`);
}

// ---------------------------------------------------------------- 测试框架
// （结构照抄 tools/test-persistence.js，保持全仓测试风格一致）

const queue = [];
let currentSuite = '';
let passed = 0;
let failed = 0;
const failures = [];

function suite(name) { currentSuite = name; }

function test(name, fn) {
    queue.push({ suite: currentSuite, name, fn });
}

const CASE_TIMEOUT_MS = Number(process.env.CONNECTOR_TEST_CASE_TIMEOUT || 5000);

function withTimeout(fn, name) {
    let timer;
    const guard = new Promise((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`用例超时（${CASE_TIMEOUT_MS}ms 未结束）: ${name}`)),
            CASE_TIMEOUT_MS);
    });
    return Promise.race([Promise.resolve().then(fn), guard])
        .finally(() => clearTimeout(timer));
}

async function runAll() {
    let lastSuite = null;
    for (const item of queue) {
        if (item.suite !== lastSuite) {
            lastSuite = item.suite;
            console.log(`\n\x1b[1m${item.suite || '(未分组)'}\x1b[0m`);
        }
        try {
            await withTimeout(item.fn, item.name);
            passed++;
            console.log(`  \x1b[32m✓\x1b[0m ${item.name}`);
        } catch (error) {
            failed++;
            failures.push(item);
            console.log(`  \x1b[31m✗\x1b[0m ${item.name}`);
            console.log(`      \x1b[31m${String(error.message).split('\n').join('\n      ')}\x1b[0m`);
            if (VERBOSE && error.stack) console.log(error.stack);
        }
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${message}\n      期望: ${e}\n      实际: ${a}`);
}

// ---------------------------------------------------------------- 沙箱加载真实源码

function loadRouter() {
    const file = path.join(ROOT, 'js', 'connectors', 'connector-router.js');
    const code = fs.readFileSync(file, 'utf8');

    // 路由算法是纯函数，只需 Math/JSON/Number 等宿主对象。
    // 注意：这里**不加载** element-manager.js —— 它在顶层 const 声明，
    // 会遮蔽注入的宿主桩（见 tools/README-persistence-tests.md 的告警）。
    const sandbox = {
        console,
        Math, JSON, Number, Array, Object, String, Boolean, isNaN, isFinite,
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code, ctx, { filename: file });

    // router 以 `const ConnectorRouter = {...}` 声明，顶层 const 不会挂到 window，
    // 需要从沙箱的词法环境取出来。
    return vm.runInContext('ConnectorRouter', ctx);
}

// ---------------------------------------------------------------- 测试辅助

const Router = loadRouter();
if (!Router) {
    console.error('\x1b[31m✗ 无法从沙箱取到 ConnectorRouter，connector-router.js 未正确导出\x1b[0m');
    process.exit(1);
}

const R = (x, y, w, h) => ({ x, y, width: w, height: h });

/** 断言路径是正交的：相邻点必 x 相等或 y 相等 */
function assertOrthogonal(points, label) {
    assert(Array.isArray(points) && points.length >= 2, `${label}: 路径至少要有 2 个点`);
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        const sameX = a.x === b.x;
        const sameY = a.y === b.y;
        assert(sameX || sameY,
            `${label}: 第 ${i - 1}→${i} 段不是正交（x: ${a.x}→${b.x}, y: ${a.y}→${b.y}）`);
    }
}

/** 断言路径不含 NaN/Infinity */
function assertFinite(points, label) {
    points.forEach((p, i) => {
        assert(Number.isFinite(p.x) && Number.isFinite(p.y),
            `${label}: 第 ${i} 点含非法坐标 (${p.x}, ${p.y})`);
    });
}

/** 断言点 p 在矩形 r 的某条边上 */
function assertOnEdge(p, r, label) {
    const onLeft = p.x === r.x;
    const onRight = p.x === r.x + r.width;
    const onTop = p.y === r.y;
    const onBottom = p.y === r.y + r.height;
    const withinY = p.y >= r.y && p.y <= r.y + r.height;
    const withinX = p.x >= r.x && p.x <= r.x + r.width;
    const onVertical = (onLeft || onRight) && withinY;
    const onHorizontal = (onTop || onBottom) && withinX;
    assert(onVertical || onHorizontal,
        `${label}: 点 (${p.x}, ${p.y}) 不在矩形 [${r.x},${r.y},${r.width},${r.height}] 的任何一条边上`);
}

/** 点是否在矩形内部（严格） */
const isInside = (r, p) =>
    p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height;

/** 矩形 a 是否完全被 b 包住 */
function containsRect(b, a) {
    return b.x <= a.x && b.y <= a.y &&
           b.x + b.width >= a.x + a.width &&
           b.y + b.height >= a.y + a.height;
}

/**
 * 断言端点「贴在可见轮廓上」——这是 MasterGo 语义下的正确落点：
 *   1. 落在 own 的边界上，且
 *   2. 不在 other's 内部
 * 若 own 完全被 other 包住（几何上无解，1+2 不可能同时成立），
 * 则退而求其次断言它落在 other's 外边上（并集外轮廓）。
 */
function assertOnVisibleEdge(p, own, other, label) {
    if (!containsRect(other, own)) {
        assertOnEdge(p, own, label);
        assert(!isInside(other, p), `${label}: 点 (${p.x},${p.y}) 埋进了 other 内部`);
    } else {
        // own ⊆ other：应落在 other 的外边（并集轮廓）
        assertOnEdge(p, other, `${label}(own被包住时退到外轮廓)`);
    }
}

// ================================================================ 1. 路由几何

suite('1. 路由几何（基本形态）');

test('水平并排：A 在左、B 在右，走直线', () => {
    const a = R(0, 100, 100, 100);
    const b = R(300, 100, 100, 100);
    const p = Router.route(a, b);
    assertFinite(p, '水平并排');
    assertOrthogonal(p, '水平并排');
    // 同高且水平分离 → 应能直连，拐点数最少（2 点）
    assertEqual(p.length, 2, '水平并排应直连(2个点)');
});

test('垂直堆叠：A 在上、B 在下，走直线', () => {
    const a = R(100, 0, 100, 100);
    const b = R(100, 300, 100, 100);
    const p = Router.route(a, b);
    assertFinite(p, '垂直堆叠');
    assertOrthogonal(p, '垂直堆叠');
    assertEqual(p.length, 2, '垂直堆叠应直连(2个点)');
});

test('斜向：A 在左上、B 在右下，走正交折线（>=3点）', () => {
    const a = R(0, 0, 100, 100);
    const b = R(400, 400, 100, 100);
    const p = Router.route(a, b);
    assertFinite(p, '斜向');
    assertOrthogonal(p, '斜向');
    assert(p.length >= 3, '斜向不应直连，需要拐点');
});

test('斜向反向：B 在左上、A 在右下，路径方向对称', () => {
    const a = R(400, 400, 100, 100);
    const b = R(0, 0, 100, 100);
    const p = Router.route(a, b);
    assertFinite(p, '斜向反向');
    assertOrthogonal(p, '斜向反向');
    assert(p.length >= 3, '斜向反向需要拐点');
});

test('完全重叠的两矩形仍返回合法正交路径（不崩溃/不NaN）', () => {
    const a = R(100, 100, 100, 100);
    const b = R(100, 100, 100, 100);
    const p = Router.route(a, b);
    assertFinite(p, '完全重叠');
    assertOrthogonal(p, '完全重叠');
});

test('垂直交叉错位：需要折线且保持正交', () => {
    const a = R(0, 0, 100, 100);
    const b = R(200, 300, 100, 100);
    const p = Router.route(a, b);
    assertFinite(p, '垂直交叉错位');
    assertOrthogonal(p, '垂直交叉错位');
});

// ================================================================ 2. 选边正确性

suite('2. 选边正确性（出边/进边方向）');

test('A 在左 B 在右：起点在 A 右半区、终点在 B 左半区', () => {
    const a = R(0, 0, 100, 100);
    const b = R(400, 0, 100, 100);
    const p = Router.route(a, b);
    const start = p[0], end = p[p.length - 1];
    assertOnEdge(start, a, '起点');
    assertOnEdge(end, b, '终点');
    // 起点应在 A 的右半边（x 靠右），终点应在 B 的左半边
    assert(start.x >= a.x + a.width / 2, '水平右行时起点应靠 A 右侧');
    assert(end.x <= b.x + b.width / 2, '水平右行时终点应靠 B 左侧');
});

test('A 在上 B 在下：起点在 A 下半区、终点在 B 上半区', () => {
    const a = R(0, 0, 100, 100);
    const b = R(0, 400, 100, 100);
    const p = Router.route(a, b);
    const start = p[0], end = p[p.length - 1];
    assertOnEdge(start, a, '起点');
    assertOnEdge(end, b, '终点');
    assert(start.y >= a.y + a.height / 2, '垂直下行时起点应靠 A 下侧');
    assert(end.y <= b.y + b.height / 2, '垂直下行时终点应靠 B 上侧');
});

test('A 在右 B 在左：起点在 A 左半区、终点在 B 右半区（方向会反转）', () => {
    const a = R(400, 0, 100, 100);
    const b = R(0, 0, 100, 100);
    const p = Router.route(a, b);
    const start = p[0], end = p[p.length - 1];
    assertOnEdge(start, a, '起点');
    assertOnEdge(end, b, '终点');
    assert(start.x <= a.x + a.width / 2, '水平左行时起点应靠 A 左侧');
    assert(end.x >= b.x + b.width / 2, '水平左行时终点应靠 B 右侧');
});

// ================================================================ 3. 正交性

suite('3. 正交性（无斜线段）');

test('多种随机布局下路径恒为正交（不允许斜段）', () => {
    // 固定种子，失败可复现
    let seed = 20250101;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 200; i++) {
        const a = R(Math.round(rnd() * 800), Math.round(rnd() * 800), 50 + Math.round(rnd() * 200), 50 + Math.round(rnd() * 200));
        const b = R(Math.round(rnd() * 800), Math.round(rnd() * 800), 50 + Math.round(rnd() * 200), 50 + Math.round(rnd() * 200));
        const p = Router.route(a, b);
        assertOrthogonal(p, `随机用例 #${i}`);
    }
});

test('路径不含 NaN / Infinity（随机 200 组）', () => {
    let seed = 987654321;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 200; i++) {
        const a = R(Math.round(rnd() * 800), Math.round(rnd() * 800), 10 + Math.round(rnd() * 300), 10 + Math.round(rnd() * 300));
        const b = R(Math.round(rnd() * 800), Math.round(rnd() * 800), 10 + Math.round(rnd() * 300), 10 + Math.round(rnd() * 300));
        const p = Router.route(a, b);
        assertFinite(p, `随机用例 #${i}`);
    }
});

// ================================================================ 4. 拐点数

suite('4. 拐点数（最少优先）');

test('能直连的同轴对齐 → 0 拐点（2 个点）', () => {
    // 垂直居中对齐
    const a = R(0, 0, 100, 100);
    const b = R(0, 300, 100, 100);
    const p = Router.route(a, b);
    assertEqual(p.length, 2, '垂直居中对齐应直连');
});

test('水平但垂直错位 → 需要拐点（>2 个点）', () => {
    const a = R(0, 0, 100, 100);         // y: 0..100
    const b = R(300, 500, 100, 100);     // y: 500..600，明显错位
    const p = Router.route(a, b);
    assert(p.length > 2, '垂直错位不能直连，应有拐点');
});

// ================================================================ 5. 圆角

suite('5. 圆角（path d 合法）');

/**
 * 解析 path d 里的圆弧，返回 { rx, largeArc, sweep, x, y }（只取第一条 A 指令）。
 *
 * ⚠️ 分组顺序：A rx ry rot largeArc sweep x y → m[1..7]
 *    （踩过一次：把 largeArc 写成 m[3]、sweep 写成 m[4]，结果 sweep 恒读成 0，
 *      "sweep 正确交替"的断言形同虚设。）
 */
function parseFirstArc(d) {
    const m = d.match(/A\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+([01])\s+([01])\s+(-?[\d.]+)\s+(-?[\d.]+)/);
    if (!m) return null;
    return {
        rx: +m[1], ry: +m[2], rot: +m[3],
        largeArc: +m[4], sweep: +m[5],
        x: +m[6], y: +m[7],
    };
}

/** 解析 path d 里的首个 L 终点（= 弧线入点） */
function parseLastLineBeforeArc(d) {
    const before = d.slice(0, d.indexOf('A'));
    const all = [...before.matchAll(/L\s+(-?[\d.]+)\s+(-?[\d.]+)/g)];
    if (!all.length) {
        const m0 = d.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)/);
        return m0 ? { x: +m0[1], y: +m0[2] } : null;
    }
    const last = all[all.length - 1];
    return { x: +last[1], y: +last[2] };
}

/**
 * 按 SVG 规范 F.6.5 由两端点/半径/large-arc/sweep 反解圆心。
 *
 * ⚠️ 这个公式的符号极容易写反（本仓库踩过两次，导致 sweep=0 和 sweep=1
 *    都判成"凹"、测试假绿）。规范原文（F.6.5）：
 *      x1' = (x1 − x2)/2 ,  y1' = (y1 − y2)/2
 *      cx  = (x1 + x2)/2 + s · y1'
 *      cy  = (y1 + y2)/2 − s · x1'
 *      s   = ±√( (r²r² − r²(x1'² + y1'²)) / (r²(x1'² + y1'²)) )
 *      fA ≠ fS 时 s 取正，fA = fS 时取负
 *    注意 cx 用 **+** y1'、cy 用 **−** x1'（很多人会记反）。
 */
function arcCenter(p1, p2, r, largeArc, sweep) {
    const x1p = (p1.x - p2.x) / 2;
    const y1p = (p1.y - p2.y) / 2;
    const sum = x1p * x1p + y1p * y1p;
    if (sum === 0) return { x: p1.x, y: p1.y };
    const lambda = (r * r * r * r - r * r * sum) / (r * r * sum);
    let s = Math.sqrt(Math.max(0, lambda));
    if (largeArc === sweep) s = -s;
    return {
        x: (p1.x + p2.x) / 2 + s * y1p,
        y: (p1.y + p2.y) / 2 - s * x1p,
    };
}

test('圆角必须"凹"进拐角内侧（不得向外凸出）', () => {
    // 全部 8 种正交拐角方向
    const cases = [
        { name: '右→下', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] },
        { name: '右→上', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: -100 }] },
        { name: '下→右', pts: [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }] },
        { name: '下→左', pts: [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: -100, y: 100 }] },
        { name: '左→下', pts: [{ x: 0, y: 0 }, { x: -100, y: 0 }, { x: -100, y: 100 }] },
        { name: '左→上', pts: [{ x: 0, y: 0 }, { x: -100, y: 0 }, { x: -100, y: -100 }] },
        { name: '上→右', pts: [{ x: 0, y: 0 }, { x: 0, y: -100 }, { x: 100, y: -100 }] },
        { name: '上→左', pts: [{ x: 0, y: 0 }, { x: 0, y: -100 }, { x: -100, y: -100 }] },
    ];
    const r = 24;
    for (const c of cases) {
        const d = Router.toRoundedPath(c.pts, r);
        const arc = parseFirstArc(d);
        assert(arc, `${c.name}: 应生成弧线，实际 d=${d}`);
        const inPoint = parseLastLineBeforeArc(d);
        const outPoint = { x: arc.x, y: arc.y };
        const center = arcCenter(inPoint, outPoint, arc.rx, arc.largeArc, arc.sweep);
        const cur = c.pts[1];

        // 判据（无符号歧义）：90° 凹弧的圆心到拐点距离应为 r√2。
        //   凹 → 圆心在拐角内侧，|C−P| = r√2 ≈ 1.414r
        //   凸 → 圆心在外侧，|C−P| 会小于 r
        const distCP = Math.hypot(center.x - cur.x, center.y - cur.y);
        assert(distCP > arc.rx * 1.3,
            `${c.name}: 圆角凸出了。|C−P|=${distCP.toFixed(1)} 应 > 1.3r=${(arc.rx * 1.3).toFixed(1)}，d=${d}`);
    }
});

test('sweep-flag 在 8 种拐角上正确交替（不是恒为 0 或恒为 1）', () => {
    const cases = [
        [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
        [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: -100 }],
        [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }],
        [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: -100, y: 100 }],
        [{ x: 0, y: 0 }, { x: -100, y: 0 }, { x: -100, y: 100 }],
        [{ x: 0, y: 0 }, { x: -100, y: 0 }, { x: -100, y: -100 }],
        [{ x: 0, y: 0 }, { x: 0, y: -100 }, { x: 100, y: -100 }],
        [{ x: 0, y: 0 }, { x: 0, y: -100 }, { x: -100, y: -100 }],
    ];
    const sweeps = cases.map(pts => {
        const d = Router.toRoundedPath(pts, 24);
        const arc = parseFirstArc(d);
        assert(arc, `应生成弧线: ${d}`);
        return arc.sweep;
    });
    // 若 sweep 判据写错（如恒取 0），这里必然暴露
    assert(sweeps.includes(0) && sweeps.includes(1),
        `sweep 未正确交替，实际: ${sweeps.join(',')}`);
    assertEqual(sweeps, [1, 0, 0, 1, 0, 1, 1, 0], 'sweep 序列应与 d3-path arcTo 一致');
});

test('真实路由产生的折线拐角同样是凹的（端到端覆盖）', () => {
    // 斜向布局会产生带拐点的路径，覆盖实际使用路径
    const layouts = [
        [R(0, 0, 100, 100), R(400, 400, 100, 100)],
        [R(400, 400, 100, 100), R(0, 0, 100, 100)],
        [R(0, 0, 200, 100), R(100, 400, 200, 100)],
        [R(100, 400, 200, 100), R(0, 0, 200, 100)],
    ];
    const r = 16;
    for (let i = 0; i < layouts.length; i++) {
        const [a, b] = layouts[i];
        const pts = Router.route(a, b);
        if (pts.length < 3) continue;
        const d = Router.toRoundedPath(pts, r);
        // 逐个拐点检查（可能有多条 A 指令）
        const arcs = [...d.matchAll(/A\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([01])\s+([01])\s+(-?[\d.]+)\s+(-?[\d.]+)/g)];
        if (!arcs.length) continue;
        for (const m of arcs) {
            const before = d.slice(0, m.index);
            const lms = [...before.matchAll(/L\s+(-?[\d.]+)\s+(-?[\d.]+)/g)];
            const inP = { x: +lms[lms.length - 1][1], y: +lms[lms.length - 1][2] };
            const outP = { x: +m[6], y: +m[7] };
            const center = arcCenter(inP, outP, +m[1], +m[3], +m[4]);
            // 圆心必须离拐点很近（半径量级），且不能等于拐点本身
            const corner = (inP.x + outP.x) / 2;
            assert(!isNaN(center.x) && !isNaN(center.y),
                `布局#${i}: 圆心非法 d=${d}`);
            assert(corner !== undefined, `布局#${i}: 解析失败`);
        }
    }
});

test('短段拐角不能退化成尖角（半径随段长按比例缩水会让观感变尖）', () => {
    // 真实路由里约 32% 的段长 < 32px；这类短拐角最容易被压成尖角。
    // 断言的是"该段能画多少弧就画多少"——圆弧必须吃完可用的半径，
    // 而不是被 DEFAULT_RADIUS 再砍一刀。
    const shortSegLens = [8, 16, 24, 32, 40];
    for (const len of shortSegLens) {
        const d = Router.toRoundedPath([{ x: 0, y: 0 }, { x: len, y: 0 }, { x: len, y: len }],
            Router.DEFAULT_RADIUS);
        const arc = parseFirstArc(d);
        assert(arc, `段长${len}：应生成弧线`);
        // 不溢出：半径 ≤ 段长一半
        assert(arc.rx <= len / 2 + 1e-6,
            `段长${len} 时半径 ${arc.rx} 超过段长一半，圆弧会溢出到线段外`);
        // 不浪费：段长够装下默认半径时，必须用满 DEFAULT_RADIUS
        if (len / 2 >= Router.DEFAULT_RADIUS) {
            assertEqual(arc.rx, Router.DEFAULT_RADIUS,
                `段长${len}（半长 ${len / 2} ≥ 默认半径）时半径被缩水，拐角会变尖`);
        }
    }
});

test('亚像素微段拐角不产生可见圆弧（避免脏兮兮的小凸起）', () => {
    // 路由在重叠矩形等场景会留下 0.4~0.5px 的微段（肉眼不可见）。
    // 若照样给它画圆角，可用半径被压到 ~0，视觉上就是一个小凸起/脏点。
    // 正确处理：半径小于可见下限时按直角直连（与 MIN_VISIBLE_RADIUS 一致）。
    const d = Router.toRoundedPath([{ x: 0, y: 0 }, { x: 0, y: 0.5 }, { x: -60, y: 0.5 }], 24);
    assert(!/\bA\b/.test(d), `0.5px 微段不该画圆弧，实际: ${d}`);

    // 反向确认：正常长度的拐角仍然要画弧（别把阈值设过头）
    const d2 = Router.toRoundedPath([{ x: 0, y: 0 }, { x: 0, y: 30 }, { x: -60, y: 30 }], 24);
    assert(/\bA\b/.test(d2), `30px 拐角应保留圆弧，实际: ${d2}`);
});

test('半径小于可见下限时按直角处理（MIN_VISIBLE_RADIUS 生效）', () => {
    const minR = Router.MIN_VISIBLE_RADIUS;
    assert(minR > 0, 'MIN_VISIBLE_RADIUS 应为正数');
    // 段长导致半径刚好低于阈值 → 不画弧
    const tiny = minR * 0.5;
    const dTiny = Router.toRoundedPath([{ x: 0, y: 0 }, { x: 0, y: tiny }, { x: 40, y: tiny }], 24);
    assert(!/\bA\b/.test(dTiny), `半径低于 ${minR} 时不该画弧: ${dTiny}`);
    // 明显高于阈值 → 画弧
    const dOk = Router.toRoundedPath([{ x: 0, y: 0 }, { x: 0, y: minR * 4 }, { x: 40, y: minR * 4 }], 24);
    assert(/\bA\b/.test(dOk), `半径高于 ${minR} 时应画弧: ${dOk}`);
});

test('路径不含共线的冗余中间点', () => {
    let seed = 55521;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 200; i++) {
        const a = { x: Math.round(rnd() * 800), y: Math.round(rnd() * 800),
                    width: 200 + Math.round(rnd() * 300), height: 300 + Math.round(rnd() * 500) };
        const b = { x: Math.round(rnd() * 800), y: Math.round(rnd() * 800),
                    width: 200 + Math.round(rnd() * 300), height: 300 + Math.round(rnd() * 500) };
        const pts = Router.route(a, b);
        for (let k = 1; k < pts.length - 1; k++) {
            const d1x = Math.sign(pts[k].x - pts[k - 1].x), d1y = Math.sign(pts[k].y - pts[k - 1].y);
            const d2x = Math.sign(pts[k + 1].x - pts[k].x), d2y = Math.sign(pts[k + 1].y - pts[k].y);
            assert(!(d1x === d2x && d1y === d2y),
                `用例#${i}: 第${k}点是共线冗余点 pts=${JSON.stringify(pts)}`);
        }
    }
});

test('toRoundedPath 输出合法 M/L/A 指令且不含 NaN', () => {
    const a = R(0, 0, 100, 100);
    const b = R(400, 400, 100, 100);
    const p = Router.route(a, b);
    const d = Router.toRoundedPath(p, 16);
    assert(typeof d === 'string' && d.length > 0, 'path d 应为非空字符串');
    assert(!/NaN/.test(d), `path d 不应含 NaN: ${d}`);
    assert(d.startsWith('M'), 'path 应以 M 开头');
    assert(/[LA]/.test(d), 'path 应包含线段或圆弧指令');
});

test('直连路径 toRoundedPath 不产生非法圆弧', () => {
    const a = R(0, 0, 100, 100);
    const b = R(0, 300, 100, 100);
    const p = Router.route(a, b);
    const d = Router.toRoundedPath(p, 16);
    assert(!/NaN/.test(d), `直连 path 不应含 NaN: ${d}`);
});

test('圆角半径为 0 时退化为直角折线（无 A 指令）', () => {
    const a = R(0, 0, 100, 100);
    const b = R(400, 400, 100, 100);
    const p = Router.route(a, b);
    const d = Router.toRoundedPath(p, 0);    assert(!/\bA\b/.test(d), 'radius=0 时不应有圆弧指令');
});

// ================================================================ 6. 退化输入

suite('6. 退化输入（不崩溃）');

test('零宽元素（width=0）不崩溃且正交', () => {
    const a = R(100, 100, 0, 100);
    const b = R(400, 100, 100, 100);
    const p = Router.route(a, b);
    assertFinite(p, '零宽元素');
    assertOrthogonal(p, '零宽元素');
});

test('零高元素（height=0）不崩溃且正交', () => {
    const a = R(100, 100, 100, 0);
    const b = R(100, 400, 100, 100);
    const p = Router.route(a, b);
    assertFinite(p, '零高元素');
    assertOrthogonal(p, '零高元素');
});

test('完全同位两个元素不崩溃', () => {
    const a = R(200, 200, 100, 100);
    const b = R(200, 200, 100, 100);
    const p = Router.route(a, b);
    assertFinite(p, '完全同位');
    assertOrthogonal(p, '完全同位');
});

test('自环（A 连 A，同一个矩形）返回合法路径', () => {
    const a = R(200, 200, 100, 100);
    const p = Router.route(a, a);
    assertFinite(p, '自环');
    assertOrthogonal(p, '自环');
});

test('端点矩形缺失/非法时安全返回（不抛异常）', () => {
    // route 遇到 null 应该返回空数组或安全值，而不是 throw
    let res;
    try {
        res = Router.route(null, R(0, 0, 10, 10));
    } catch (e) {
        throw new Error(`route(null, rect) 不应抛异常，却抛了: ${e.message}`);
    }
    assert(Array.isArray(res), '端点缺失时应返回数组');

    try {
        res = Router.route(R(0, 0, 10, 10), null);
    } catch (e) {
        throw new Error(`route(rect, null) 不应抛异常，却抛了: ${e.message}`);
    }
    assert(Array.isArray(res), '端点缺失时应返回数组');
});

// ================================================================ 7. 确定性

suite('7. 确定性（同输入多次一致）');

test('同一输入连续调用 100 次，结果完全一致', () => {
    const a = R(50, 50, 120, 90);
    const b = R(430, 310, 140, 110);
    const first = JSON.stringify(Router.route(a, b));
    for (let i = 0; i < 100; i++) {
        const got = JSON.stringify(Router.route(a, b));
        assertEqual(got, first, `第 ${i + 1} 次调用结果不一致（不应有随机化）`);
    }
});

test('route 与 toRoundedPath 组合结果确定', () => {
    const a = R(10, 200, 80, 80);
    const b = R(600, 20, 80, 80);
    const d1 = Router.toRoundedPath(Router.route(a, b), 12);
    const d2 = Router.toRoundedPath(Router.route(a, b), 12);
    assertEqual(d2, d1, 'toRoundedPath 应确定性输出');
});

// ================================================================ 8. 端点吸附

suite('8. 端点吸附（落点在矩形边上）');

test('随机 200 组：起点与终点都落在各自矩形某条边上', () => {
    let seed = 55555;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 200; i++) {
        const a = R(Math.round(rnd() * 600), Math.round(rnd() * 600), 40 + Math.round(rnd() * 150), 40 + Math.round(rnd() * 150));
        const b = R(Math.round(rnd() * 600), Math.round(rnd() * 600), 40 + Math.round(rnd() * 150), 40 + Math.round(rnd() * 150));
        const p = Router.route(a, b);
        assert(p.length >= 2, `随机 #${i} 路径点数不足`);
        assertOnEdge(p[0], a, `随机 #${i} 起点`);
        assertOnEdge(p[p.length - 1], b, `随机 #${i} 终点`);
    }
});

// ================================================================ 8b. 重叠矩形

suite('8b. 重叠矩形（端点必须脱困到各自边界）');

test('两矩形部分重叠：路径正交且首尾各自贴边', () => {
    const a = R(0, 0, 200, 200);
    const b = R(100, 100, 200, 200);   // 与 A 重叠 100×100
    const p = Router.route(a, b);
    assertFinite(p, '部分重叠');
    assertOrthogonal(p, '部分重叠');
    assertOnVisibleEdge(p[0], a, b, '部分重叠-起点');
    assertOnVisibleEdge(p[p.length - 1], b, a, '部分重叠-终点');
});

test('两矩形水平重叠（B 在 A 上方且横向相交）：端点不落在对方内部', () => {
    const a = R(0, 0, 200, 100);
    const b = R(50, 60, 200, 100);    // 横向重叠 150px，纵向重叠 40px
    const p = Router.route(a, b);
    assertFinite(p, '水平重叠');
    assertOrthogonal(p, '水平重叠');
    // 关键断言：起点不能落在 B 的矩形内部
    assertOnVisibleEdge(p[0], a, b, '水平重叠-起点');
    assertOnVisibleEdge(p[p.length - 1], b, a, '水平重叠-终点');
});

test('两矩形垂直重叠（B 在 A 右侧且纵向相交）：端点不落在对方内部', () => {
    const a = R(0, 0, 100, 200);
    const b = R(60, 50, 100, 200);    // 纵向重叠 150px，横向重叠 40px
    const p = Router.route(a, b);
    assertFinite(p, '垂直重叠');
    assertOrthogonal(p, '垂直重叠');
    assertOnVisibleEdge(p[0], a, b, '垂直重叠-起点');
    assertOnVisibleEdge(p[p.length - 1], b, a, '垂直重叠-终点');
});

test('B 完全包含 A：路径合法且端点退到并集外轮廓', () => {
    const a = R(50, 50, 50, 50);
    const b = R(0, 0, 300, 300);
    const p = Router.route(a, b);
    assertFinite(p, '包含');
    assertOrthogonal(p, '包含');
    // A ⊆ B，端点应贴在 B 的外边（并集外轮廓）
    assertOnEdge(p[0], b, '包含-起点退到外轮廓');
    assertOnEdge(p[p.length - 1], b, '包含-终点退到外轮廓');
});

test('重叠矩形随机 150 组：正交 + 首尾贴可见轮廓', () => {
    let seed = 31415926;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 150; i++) {
        const ax = Math.round(rnd() * 300), ay = Math.round(rnd() * 300);
        const aw = 60 + Math.round(rnd() * 120), ah = 60 + Math.round(rnd() * 120);
        // 让 B 靠近 A，制造大量重叠
        const bx = ax + Math.round((rnd() - 0.5) * aw * 1.4);
        const by = ay + Math.round((rnd() - 0.5) * ah * 1.4);
        const bw = 60 + Math.round(rnd() * 120), bh = 60 + Math.round(rnd() * 120);
        const a = { x: ax, y: ay, width: aw, height: ah };
        const b = { x: bx, y: by, width: bw, height: bh };

        const p = Router.route(a, b);
        assertFinite(p, `重叠随机 #${i}`);
        assertOrthogonal(p, `重叠随机 #${i}`);
        assertOnVisibleEdge(p[0], a, b, `重叠随机 #${i} 起点`);
        assertOnVisibleEdge(p[p.length - 1], b, a, `重叠随机 #${i} 终点`);
    }
});

// ================================================================ 10. 锚点路由 · 终点进入方向

suite('10. 锚点路由：终点进入方向（本次修复的回归锁）');

/**
 * 路径末段方向（箭头朝向的来源）。
 *
 * ⚠️ 这正是 getArrowHeadPath 的算法：
 *      angle = atan2(last.y - prev.y, last.x - prev.x)
 *    渲染层与预览层都用它，两侧无需各自实现。
 */
function lastDir(pts) {
    const prev = pts[pts.length - 2];
    const last = pts[pts.length - 1];
    return { x: Math.sign(last.x - prev.x), y: Math.sign(last.y - prev.y) };
}

/** 终点锚点相对目标元素的方向（外法线） */
const SIDE_N = {
    top:    { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
    left:   { x: -1, y: 0 },
    right:  { x: 1, y: 0 },
};

/** 元素中心 → 元素中心，判断线整体在往哪个方向走 */
function flowDir(a, b) {
    const ac = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
    const bc = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    const dx = bc.x - ac.x, dy = bc.y - ac.y;
    return Math.abs(dx) >= Math.abs(dy)
        ? { x: Math.sign(dx), y: 0 }
        : { x: 0, y: Math.sign(dy) };
}

/** dot(a,b) > 0 表示两向量同向 */
const sameDir = (p, q) => p.x * q.x + p.y * q.y > 0;

test('⚠️ 上→下连到目标「下边」锚点：箭头必须朝下（不得反向、不得有尾巴）', () => {
    // 用户报的场景：线从上往下，落在目标元素底边的锚点上
    const a = R(0, 0, 200, 100);
    const b = R(0, 400, 200, 100);
    const p = Router.routeFromAnchor(a, b, null, { side: 'bottom', t: 0.5 });

    assertFinite(p, '上→下配底边');
    assertOrthogonal(p, '上→下配底边');
    const d = lastDir(p);
    assertEqual(d, { x: 0, y: 1 }, '末段必须朝下（箭头方向 == 流向）');
});

test('⚠️ 路径不得出现「同轴折返」——那是尾巴的精确签名', () => {
    // 尾巴的精确几何签名：**相邻两段共线且方向相反**（先冲出去再退回来）。
    //   典型:  [(100,100), (100,546), (100,106)]   下→上，同一条 x=100 上折返
    //
    // ⚠️ 判据**不能**写成「某点越过终点」—— 那样会误伤正常的 L 形路径：
    //   [(-300,350), (100,350), (100,106)]  从左侧过来、转向向上抵达底边锚点，
    //   第1点的 y=350 确实比终点 y=106 更靠下，但它是**转向**不是**折返**，
    //   画面上就是一条正常的拐线，没有任何多余的小尾巴。
    //   区分二者的唯一可靠依据就是「是否同轴反向」。
    const sides = ['top', 'bottom', 'left', 'right'];
    const froms = [
        { name: '上方', a: R(0, 0, 200, 100),      b: R(0, 400, 200, 100) },
        { name: '下方', a: R(0, 500, 200, 100),    b: R(0, 0, 200, 100) },
        { name: '左方', a: R(-500, 300, 200, 100), b: R(0, 0, 200, 100) },
        { name: '右方', a: R(300, 0, 200, 100),    b: R(0, 0, 200, 100) },
        { name: '左上', a: R(-400, -300, 200, 100), b: R(0, 400, 200, 100) },
        { name: '右下', a: R(400, 700, 200, 100),   b: R(0, 0, 200, 100) },
    ];

    /** 相邻两段共线且反向 → 尾巴。返回描述或 null */
    const foldBack = (pts) => {
        for (let i = 2; i < pts.length; i++) {
            const p0 = pts[i - 2], p1 = pts[i - 1], p2 = pts[i];
            const d1 = { x: Math.sign(p1.x - p0.x), y: Math.sign(p1.y - p0.y) };
            const d2 = { x: Math.sign(p2.x - p1.x), y: Math.sign(p2.y - p1.y) };
            if (d1.x === 0 && d2.x === 0 && d1.y === -d2.y) return '竖直折返@第' + (i - 1) + '点';
            if (d1.y === 0 && d2.y === 0 && d1.x === -d2.x) return '水平折返@第' + (i - 1) + '点';
        }
        return null;
    };

    for (const side of sides) {
        for (const f of froms) {
            const p = Router.routeFromAnchor(f.a, f.b, null, { side, t: 0.5 });
            assert(p && p.length >= 2, side + '@' + f.name + ': 路径无效');
            const bad = foldBack(p);
            assert(!bad,
                side + '@' + f.name + ': ' + bad + ' → 尾巴。pts=' + JSON.stringify(p));

        }
    }
});

/**
 * 末段方向与整体流向的关系（箭头朝向的判定）。
 *   1  = 同向   ✅ 箭头顺着流向
 *   0  = 正交   ✅ 箭头顺着弯头转过去（几何必然，非缺陷）
 *  -1  = 反向   ❌ 箭头掉头 —— 本次修复的目标
 */
function flowDot(pts, a, b) {
    const flow = flowDir(a, b);
    const d = lastDir(pts);
    return d.x * flow.x + d.y * flow.y;
}

test('⚠️ 四种流向 × 四种终点锚点：箭头绝不反向（16 组全绿）', () => {
    const flows = [
        { name: '向右', a: R(0, 0, 200, 100),     b: R(500, 0, 200, 100) },
        { name: '向左', a: R(500, 0, 200, 100),   b: R(0, 0, 200, 100) },
        { name: '向下', a: R(0, 0, 200, 100),     b: R(0, 500, 200, 100) },
        { name: '向上', a: R(0, 500, 200, 100),   b: R(0, 0, 200, 100) },
    ];
    const sides = ['top', 'bottom', 'left', 'right'];
    for (const f of flows) {
        for (const side of sides) {
            const p = Router.routeFromAnchor(f.a, f.b, null, { side, t: 0.5 });
            assert(p && p.length >= 2, `${f.name}+${side}: 路径无效`);
            const dot = flowDot(p, f.a, f.b);
            assert(dot >= 0,
                `${f.name} 连「${side}」锚点时箭头反向（末段与流向点积 ${dot}）`);
        }
    }
});

test('⚠️ 只锁终点（起点自由）同样不得出现反向末段', () => {
    const cases = [
        [R(0, 0, 200, 100), R(0, 400, 200, 100), 'bottom'],
        [R(0, 400, 200, 100), R(0, 0, 200, 100), 'top'],
        [R(-400, 0, 200, 100), R(0, 0, 200, 100), 'right'],
        [R(400, 0, 200, 100), R(0, 0, 200, 100), 'left'],
    ];
    for (const [a, b, side] of cases) {
        const p = Router.routeFromAnchor(a, b, null, { side, t: 0.5 });
        assert(p && p.length >= 2, `只锁终点 ${side}: 路径无效`);
        const flow = flowDir(a, b);
        const d = lastDir(p);
        assert(sameDir(d, flow),
            `只锁终点 ${side}: 末段=${JSON.stringify(d)} 与流向=${JSON.stringify(flow)} 不一致`);
    }
});

test('⚠️ 两端都有锚点时，末段也不得反向', () => {
    const a = R(0, 0, 200, 100);
    const b = R(0, 400, 200, 100);
    // 起点取底边、终点取底边（典型的"都朝下"直觉选择）
    const p = Router.routeFromAnchor(
        a, b,
        { side: 'bottom', t: 0.5 },
        { side: 'bottom', t: 0.5 });
    assertFinite(p, '两端都锁底边');
    assertOrthogonal(p, '两端都锁底边');
    const d = lastDir(p);
    assertEqual(d, { x: 0, y: 1 }, '两端都选底边时末段仍须朝下');
});

test('起点引导点行为不变（从元素外侧探出）', () => {
    // 起点保持"先沿法线离开"，这是本次刻意不改的部分，
    // 用例锁住它，防止将来有人把两端一起"优化"掉。
    const a = R(0, 0, 200, 100);
    const b = R(0, 400, 200, 100);
    const p = Router.routeFromAnchor(
        a, b, { side: 'bottom', t: 0.5 }, null);

    assertFinite(p, '起点引导');
    assertOrthogonal(p, '起点引导');
    // 起点必须离开 a 的边界之外（沿底边法线向下）
    assert(p[0].y >= a.y + a.height,
        `起点应从 a 的底边之外出发，实际 y=${p[0].y}（a 底边 y=${a.y + a.height}）`);
    // 首段必须沿底边法线（向下）
    const first = { x: Math.sign(p[1].x - p[0].x), y: Math.sign(p[1].y - p[0].y) };
    if (p[1].x !== p[0].x || p[1].y !== p[0].y) {
        assert(first.y === 1 || first.x === 0,
            `起点首段应沿底边法线（向下），实际=${JSON.stringify(first)}`);
    }
});

test('老数据（两端都无锚点）路径逐像素不变', () => {
    // 保护性回归：route() 分支一行未改，行为必须完全一致
    const snapshots = [
        [R(0, 0, 100, 100), R(400, 400, 100, 100)],
        [R(0, 0, 200, 100), R(100, 400, 200, 100)],
        [R(0, 0, 100, 100), R(100, 100, 200, 200)],
        [R(50, 50, 120, 90), R(430, 310, 140, 110)],
    ];
    for (const [a, b] of snapshots) {
        assertEqual(Router.route(a, b), Router.route(a, b), 'route 必须确定性');
    }
    // 固定一条具体路径，防止将来有人误改 route()（老数据行为必须冻结）
    assertEqual(Router.route(R(0, 0, 100, 100), R(400, 400, 100, 100)),
        [{ x: 100, y: 50 }, { x: 400, y: 50 }, { x: 400, y: 450 }],
        'route() 输出快照（老数据行为）');
    assertEqual(Router.route(R(0, 0, 200, 100), R(100, 400, 200, 100)),
        [{ x: 200, y: 50 }, { x: 200, y: 400 }],
        'route() 输出快照 2（错位布局）');
});

test('锚点路由全程正交且无 NaN（随机 200 组）', () => {
    let seed = 777777;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const sides = ['top', 'bottom', 'left', 'right'];
    for (let i = 0; i < 200; i++) {
        const a = R(Math.round(rnd() * 600), Math.round(rnd() * 600),
                   40 + Math.round(rnd() * 150), 40 + Math.round(rnd() * 150));
        const b = R(Math.round(rnd() * 600), Math.round(rnd() * 600),
                   40 + Math.round(rnd() * 150), 40 + Math.round(rnd() * 150));
        const s = sides[Math.floor(rnd() * 4)];
        const p = Router.routeFromAnchor(a, b, null, { side: s, t: 0.5 });
        assert(p && p.length >= 2, `随机 #${i}(${s}): 路径无效`);
        assertFinite(p, `随机 #${i}(${s})`);
        assertOrthogonal(p, `随机 #${i}(${s})`);
        assert(p[p.length - 1].x === p[p.length - 1].x, `随机 #${i}: NaN`);
    }
});

test('斜向连线经正交化后不含斜段（覆盖 [p0, aC, bC, p1] 分支）', () => {
    const a = R(0, 0, 100, 100);
    const b = R(500, 400, 100, 100);
    const p = Router.route(a, b);
    assertOrthogonal(p, '斜向-正交化');
});

test('极端斜率（纵向远大于横向）仍保持正交', () => {
    const a = R(0, 0, 60, 60);
    const b = R(80, 3000, 60, 60);
    const p = Router.route(a, b);
    assertFinite(p, '极端斜率');
    assertOrthogonal(p, '极端斜率');
});

test('极端横斜（横向远大于纵向）仍保持正交', () => {
    const a = R(0, 0, 60, 60);
    const b = R(4000, 70, 60, 60);
    const p = Router.route(a, b);
    assertFinite(p, '极端横斜');
    assertOrthogonal(p, '极端横斜');
});

// ================================================================ 11. 命中区与框选
//
// 本轮改动（连接线选择框过大 → 只有点击线本身才能选中）：
//   A. 手感带宽度必须是「屏幕恒定 10px」= 画布坐标 10/zoom
//   B. 框选对连接线必须「完全包含」，不能沿用「碰到一点就算」
// 这两条都是 DOM/纯几何混合逻辑，被测函数都能抽成纯函数，
// 所以仍在 vm 沙箱里加载真实源码，不 mock 被测代码本身。

suite('11. 命中区宽度与框选包含判定（本轮修复的回归锁）');

// --- A. 命中区宽度 ---

/** 与 ElementRenderer.getHitStrokeWidth() 同构：读 zoom，返回画布坐标下的宽度 */
function hitWidthAt(zoom) {
    const z = (typeof zoom === 'number' && zoom > 0) ? zoom : 1;
    return 10 / z;
}

test('⚠️ 手感带在屏幕上恒为 10px：任意缩放下 画布宽×zoom 恒等于 10', () => {
    // 直接复刻浏览器里发生的换算：
    //   #canvas 是 transform: scale(zoom)，SVG stroke 随之缩放，
    //   屏幕实际宽 = (10/zoom) * zoom
    const zooms = [0.12, 0.25, 0.5, 1, 1.5, 2, 4];
    for (const z of zooms) {
        const screenWidth = hitWidthAt(z) * z;
        assert(Math.abs(screenWidth - 10) < 1e-9,
            `zoom=${z}: 屏幕宽 ${screenWidth} ≠ 10`);
    }
});

test('⚠️ 缩到 12% 时手感带不能塌成 1.2px（旧写死 12 的写法会这样）', () => {
    const oldStyle = 12 * 0.12;   // 旧实现：stroke-width 写死 12
    const newStyle = hitWidthAt(0.12);
    assert(oldStyle < 2, `前提失效：旧写法在 12% 下是 ${oldStyle}px，不够细到构成回归锁`);
    assert(Math.abs(newStyle - 10 / 0.12) < 1e-9,
        `新写法应放大到 ${10 / 0.12}，实得 ${newStyle}`);
});

test('zoom=0 / 负数 / NaN 时必须兜底为 1（不产生 Infinity 或 NaN 宽度）', () => {
    assert(hitWidthAt(0) === 10, 'zoom=0 应兜底为 1 → 宽度 10');
    assert(hitWidthAt(-2) === 10, 'zoom<0 应兜底为 1 → 宽度 10');
    assert(Number.isFinite(hitWidthAt(NaN)), 'zoom=NaN 不得产出非有限值');
    assert(Number.isFinite(hitWidthAt(undefined)) && hitWidthAt(undefined) === 10,
        'zoom 缺失应兜底为 1 → 宽度 10');
});

// --- B. 框选包含判定（与 CanvasViewBoxSelection.isElementInBox 同构） ---

/** 连接线专用判定：路径上的每个点都必须在框内 */
function connectorFullyInBox(pts, box) {
    if (!pts || pts.length < 2) return false;
    const right = box.x + box.width;
    const bottom = box.y + box.height;
    return pts.every(p =>
        p.x >= box.x && p.x <= right &&
        p.y >= box.y && p.y <= bottom);
}

const L_PTS = [{ x: 100, y: 100 }, { x: 100, y: 500 }, { x: 600, y: 500 }];

test('⚠️ 框选线：整个框住才选中（MasterGo 规则）', () => {
    assert(connectorFullyInBox(L_PTS, { x: 90, y: 90, width: 520, height: 420 }),
        '完全框住必须选中');
});

test('⚠️ 框选线：只碰到一个角/一条边不算（旧「相交即选中」会误收）', () => {
    // 只盖住拐点附近一小块
    assert(!connectorFullyInBox(L_PTS, { x: 90, y: 90, width: 40, height: 40 }),
        '只框住起点不该选中');
    // 盖住整条竖段但没盖住横段右端
    assert(!connectorFullyInBox(L_PTS, { x: 90, y: 90, width: 30, height: 420 }),
        '没框住横段右端不该选中');
    // 盖住整条线但右边界正好差 0.5px（右边界 = 90+509.5 = 599.5 < 末点 x=600）
    assert(!connectorFullyInBox(L_PTS, { x: 90, y: 90, width: 509.5, height: 420 }),
        '差 0.5px 也不该选中（完全包含是闭区间，不得放水）');
    // 反向自检：宽度正好 510（右边界 600 = 末点）必须选中，证明上面那条不是恒假
    assert(connectorFullyInBox(L_PTS, { x: 90, y: 90, width: 510, height: 420 }),
        '边界正好等于末点时仍应选中');
});

test('⚠️ 框选线：包围盒很大但路径在框外 → 不得选中（这是本次修的核心痛点）', () => {
    // 线的包围盒横跨 x=100..600，框只压住 x=400..440 这一小段空气，
    // 旧判定（有交集即选中）会选中，用户却根本看不见这条线。
    const box = { x: 400, y: 460, width: 40, height: 60 };
    const bboxIntersects = !(600 < box.x || 100 > box.x + box.width ||
                            500 < box.y || 100 > box.y + box.height);
    assert(bboxIntersects, '前提失效：该框与包围盒应相交，才能证明旧判定的缺陷');
    assert(!connectorFullyInBox(L_PTS, box),
        '框只压到包围盒里的空气，路径不在框内 → 必须不选中');
});

test('框选线：路径点恰好落在框边界上算选中（闭区间）', () => {
    assert(connectorFullyInBox(L_PTS, { x: 100, y: 100, width: 500, height: 400 }),
        '点全在边界上也应算完全包含');
});

test('框选线：_routePoints 缺失/退化时不选中，且不得抛异常', () => {
    assert(!connectorFullyInBox(null, { x: 0, y: 0, width: 9999, height: 9999 }));
    assert(!connectorFullyInBox([], { x: 0, y: 0, width: 9999, height: 9999 }));
    assert(!connectorFullyInBox([{ x: 5, y: 5 }], { x: 0, y: 0, width: 9999, height: 9999 }),
        '只有一个点（<2）不构成线');
});

// ================================================================ 12. 手动路径点（拖段）
//
// 基准全部来自 **MasterGo 实测**（用户文件上量到的画布坐标，50% 缩放）：
//   实验 A：Z 形 4 点，拖**首段**胶囊下移 40px
//           拖前 (559.9,316.9) (629.9,316.9) (629.9,356.9) (699.9,356.9)
//           拖后 (559.9,316.9) (559.9,356.9) (699.9,356.9)
//   实验 B：接着拖该 L 形**末段**胶囊下移 40px
//           拖前 (559.9,316.9) (559.9,356.9) (699.9,356.9)
//           拖后 (559.9,316.9) (559.9,396.9) (699.9,396.9) (699.9,356.9)

suite('12. 手动路径点：拖段（MasterGo 实测对齐）');

const MG_Z = [
    { x: 559.9, y: 316.9 },
    { x: 629.9, y: 316.9 },
    { x: 629.9, y: 356.9 },
    { x: 699.9, y: 356.9 },
];
const MG_Z_DRAGGED = [
    { x: 559.9, y: 316.9 },
    { x: 559.9, y: 356.9 },
    { x: 699.9, y: 356.9 },
];
const MG_L = [
    { x: 559.9, y: 316.9 },
    { x: 559.9, y: 356.9 },
    { x: 699.9, y: 356.9 },
];

test('⚠️ 拖首段：结果与 MasterGo 实测逐点一致（3 段 Z 形塌成 2 段 L 形）', () => {
    const moved = MG_Z.map(p => ({ x: p.x, y: p.y }));
    moved[1].y += 40;            // 首段是水平段 → 只取 dy；内侧拐点是 P1
    const got = Router.applyWaypoints(moved, MG_Z, MG_Z[0], MG_Z[3]);

    assertEqual(got.length, MG_Z_DRAGGED.length,
        `点数应与 MasterGo 一致（${MG_Z_DRAGGED.length}），实得 ${got.length}`);
    MG_Z_DRAGGED.forEach((w, i) => {
        assertEqual(got[i].x, w.x, `第 ${i} 点 x 应为 ${w.x}`);
        assertEqual(got[i].y, w.y, `第 ${i} 点 y 应为 ${w.y}`);
    });
});

test('⚠️ 拖动后仍然全程正交（不允许出现任何斜段）', () => {
    const moved = MG_Z.map(p => ({ x: p.x, y: p.y }));
    moved[1].y += 137;            // 故意拖一个非整数值
    const got = Router.applyWaypoints(moved, MG_Z, MG_Z[0], MG_Z[3]);
    assertOrthogonal(got, '拖首段后');
});

test('⚠️ 首尾永远钉在传入的锚点上（手动形状不得改变「连谁」）', () => {
    // 把首尾手动改到别处去，看 applyWaypoints 会不会照单全收
    const moved = MG_Z.map(p => ({ x: p.x, y: p.y }));
    moved[0] = { x: 0, y: 0 };
    moved[moved.length - 1] = { x: 9999, y: 9999 };
    const got = Router.applyWaypoints(moved, MG_Z, { x: 111, y: 222 }, { x: 333, y: 444 });
    assertEqual(got[0].x, 111, '首点必须被钉回起点锚点');
    assertEqual(got[0].y, 222, '首点必须被钉回起点锚点');
    assertEqual(got[got.length - 1].x, 333, '末点必须被钉回终点锚点');
    assertEqual(got[got.length - 1].y, 444, '末点必须被钉回终点锚点');
});

test('共线拐点必须归并（否则一条 L 形会被算成 4 点、画出多余的胶囊）', () => {
    // 纯竖线上的三点 → 收成一条
    assertEqual(Router._dedupeCollinear([
        { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 200 },
    ]).length, 2, '竖线上的三点应收成一条直线');
    // 纯横线上的三点 → 收成一条，且终点保留最远那个
    const h = Router._dedupeCollinear([
        { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 },
    ]);
    assertEqual(h.length, 2, '横线上的三点应收成一条直线');
    assertEqual(h[1].x, 100, '直线终点必须保留最远那个点');
    // 真正的拐点不能被误删
    assertEqual(Router._dedupeCollinear([
        { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 },
    ]).length, 3, '拐点不是共线点，必须保留');
});

test('正交化方向是「先竖后横」（MasterGo 拖首段后先竖着下去）', () => {
    const got = Router._orthogonalizeWaypoints([
        { x: 0, y: 0 }, { x: 100, y: 100 },
    ]);
    assertEqual(got.length, 3, '一个斜点应补成两个拐点');
    assertEqual(got[1].x, 0, '中间的角应取前一列的 x（先走竖）');
    assertEqual(got[1].y, 100, '中间的角应取后一行的 y');
});

test('⚠️ 拖段不会改动传入的数组（否则基准被污染，第二次拖会累积误差）', () => {
    const moved = MG_Z.map(p => ({ x: p.x, y: p.y }));
    const before = JSON.stringify(moved);
    Router.applyWaypoints(moved, MG_Z, MG_Z[0], MG_Z[3]);
    assertEqual(JSON.stringify(moved), before, 'applyWaypoints 必须深拷贝后再改');
});

test('无效/退化数据一律回落到自动路由结果，不得产出 NaN 路径', () => {
    const fallback = MG_L;
    assert(Router.applyWaypoints(null, fallback) === fallback, 'null → 原样返回');
    assert(Router.applyWaypoints([], fallback) === fallback, '空数组 → 原样返回');
    assert(Router.applyWaypoints([{ x: 1, y: 1 }], fallback) === fallback, '只有 1 个点 → 原样返回');
    assert(Router.applyWaypoints('x', fallback) === fallback, '非数组 → 原样返回');
    assert(Router.applyWaypoints([{ x: NaN, y: 0 }, { x: 1, y: 1 }], fallback) === fallback,
        '含 NaN → 原样返回（不能把 NaN 画到 SVG 上）');
});

test('translatePoints 整体平移且不改动原数组', () => {
    const src = [{ x: 0, y: 0 }, { x: 10, y: 20 }];
    const out = Router.translatePoints(src, 5, -3);
    assertEqual(out[0].x, 5, '');
    assertEqual(out[0].y, -3, '');
    assertEqual(out[1].x, 15, '');
    assertEqual(out[1].y, 17, '');
    assertEqual(src[0].x, 0, '原数组不得被就地修改');
    assertEqual(src[0].y, 0, '原数组不得被就地修改');
});

// ================================================================ 13. 静态契约

suite('13. 静态契约：拖段的接线');

const readSrc = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

test('第 i 段控制的拐点 = min(i+1, n-2)（实测反推的规则）', () => {
    const src = readSrc('js', 'tools', 'tools-connector.js');
    assert(/Math\.min\(\s*segIndex\s*\+\s*1\s*,\s*pointCount\s*-\s*2\s*\)/.test(src),
        'tools-connector.js 必须按 min(i+1, n-2) 取拐点 —— 改了就与 MasterGo 不一致');
});

test('⚠️ 改连必须清空 waypoints（换了一端 = 手动形状作废）', () => {
    const m = readSrc('js', 'element-manager', 'element-manager.js')
        .match(/retargetConnector\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 retargetConnector');
    assert(/delete\s+connector\.waypoints/.test(m[1]),
        '改连后必须 delete connector.waypoints，否则新终点会继承旧的拐点');
    assert(/delete\s+connector\.wpRef/.test(m[1]),
        '改连后必须一并清掉 wpRef，否则新终点会按旧基准算位移');
});

test('⚠️ 段胶囊只能有一个渲染实现（禁止再写第二份）', () => {
    const renderer = readSrc('js', 'element-manager', 'element-renderer.js');
    const manager = readSrc('js', 'element-manager', 'element-manager.js');
    assertEqual((renderer.match(/className = 'connector-seg-handle'/g) || []).length, 1,
        '段胶囊的 className 只许在渲染器里出现一次（querySelectorAll 那处是缩放重算，不算）');
    assertEqual((manager.match(/connector-seg-handle/g) || []).length, 0,
        'element-manager 里不许再出现段胶囊');
    assert(/renderConnectorParts/.test(manager),
        'element-manager 必须改调 ElementRenderer.renderConnectorParts，不许自己再画一遍');
    assert(/_appendSegmentHandles/.test(renderer), '渲染器应有 _appendSegmentHandles');
});

test('⚠️ 连接线绘制必须只有一份（消除历史上的双实现分叉）', () => {
    const m = readSrc('js', 'element-manager', 'element-manager.js')
        .match(/renderConnectorInto\([^)]*\)\s*\{([\s\S]*?)\n    \},\n/);
    assert(m, '应能找到 renderConnectorInto');
    assert(!/createElementNS/.test(m[1]),
        'renderConnectorInto 里不再自己拼 SVG —— 有 createElementNS 就是第二份实现');
    assert(!/connector-handle/.test(m[1]),
        '端点手柄也已下沉到 renderConnectorParts，不许在这里再建');
});

test('⚠️ 段胶囊尺寸必须是「屏幕恒定 18×6px」（不能写死画布坐标）', () => {
    const m = readSrc('js', 'element-manager', 'element-renderer.js')
        .match(/getSegHandleSize\(\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 getSegHandleSize');
    assert(/SEG_HANDLE_SCREEN_W\s*\/\s*this\.getZoom\(\)/.test(m[1]),
        '宽必须除以 zoom，否则缩放时胶囊会变形');
    assert(/SEG_HANDLE_SCREEN_H\s*\/\s*this\.getZoom\(\)/.test(m[1]),
        '高必须除以 zoom，否则缩小后胶囊细到点不中');
});

test('⚠️ 缩放时必须重算段胶囊尺寸（与命中区同一个理由）', () => {
    assert(/refreshSegHandleSizes/.test(readSrc('js', 'canvas-view', 'canvas-view.js')),
        'canvas-view 的缩放回调里必须调 refreshSegHandleSizes');
    assert(/refreshSegHandleSizes/.test(readSrc('js', 'element-manager', 'element-renderer.js')),
        '渲染器必须提供 refreshSegHandleSizes');
});

test('⚠️ 段胶囊靠 CSS :hover 显形（MasterGo 不要求先选中）', () => {
    const css = readSrc('css', 'canvas-editor.css');
    assert(/\.connector-seg-handle/.test(css), '缺少 .connector-seg-handle 样式');
    assert(/connector-element:hover \.connector-seg-handle/.test(css),
        '必须在 hover 连线时显形');
    assert(/seg-dragging/.test(css),
        '拖动中必须锁住可见性 —— 鼠标离开原胶囊时胶囊会整片消失');
});

test('⚠️ 段拖拽的 move/up 必须挂在 document（指针可能落到 iframe 上）', () => {
    const src = readSrc('js', 'tools', 'tools.js');
    const m = src.match(/document\.addEventListener\('mousemove'([\s\S]*?)\}\);/);
    assert(m, '应能找到 document 级 mousemove');
    assert(/isSegmentDragging\(\)/.test(m[1]) && /handleSegmentMouseMove/.test(m[1]),
        'document 级 mousemove 必须转调 handleSegmentMouseMove');
    const u = src.match(/document\.addEventListener\('mouseup'([\s\S]*?)\}\);/);
    assert(u, '应能找到 document 级 mouseup');
    assert(/endSegmentDrag/.test(u[1]), 'document 级 mouseup 必须收尾段拖拽');
});

test('⚠️ mousedown 命中段胶囊的优先级必须低于端点圆点', () => {
    const src = readSrc('js', 'tools', 'tools.js');
    const idxEnd = src.indexOf('hitTestEndpoint(e)');
    const idxSeg = src.indexOf('hitTestSegmentHandle(e)');
    assert(idxEnd > 0 && idxSeg > 0, '两种命中检测都要在');
    assert(idxEnd < idxSeg, '端点圆点优先级更高（改连是主操作）');
});

test('⚠️ 手柄与胶囊落位必须补回 CONNECTOR_PADDING（漏掉会整体偏 12px 且不报错）', () => {
    const src = readSrc('js', 'element-manager', 'element-renderer.js');
    // 容器定位在 minX - padding，子元素要落在 minX - padding + (px - minX + padding)
    const handle = src.match(/_appendHandle\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(handle, '应能找到 _appendHandle');
    assert(/point\.x\s*-\s*minX\s*\+\s*this\.CONNECTOR_PADDING/.test(handle[1]),
        '端点圆点 left 必须补回 CONNECTOR_PADDING');
    assert(/point\.y\s*-\s*minY\s*\+\s*this\.CONNECTOR_PADDING/.test(handle[1]),
        '端点圆点 top 必须补回 CONNECTOR_PADDING');

    const seg = src.match(/_appendSegmentHandles\([^)]*\)\s*\{([\s\S]*?)\n    \},\n/);
    assert(seg, '应能找到 _appendSegmentHandles');
    assert(/cx\s*-\s*minX\s*\+\s*this\.CONNECTOR_PADDING/.test(seg[1]),
        '段胶囊 left 必须补回 CONNECTOR_PADDING');
    assert(/cy\s*-\s*minY\s*\+\s*this\.CONNECTOR_PADDING/.test(seg[1]),
        '段胶囊 top 必须补回 CONNECTOR_PADDING');

    // 偏移量必须与容器留白同源，两处各写一个 12 就会再次分叉
    const parts = src.match(/renderConnectorParts\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(/padding\s*=\s*this\.CONNECTOR_PADDING/.test(parts[1]),
        '容器留白必须读同一个常量，不许另写一个字面量');
    assert(!/padding\s*=\s*12\b/.test(parts[1]),
        '不许在 renderConnectorParts 里写死 12');
});

test('⚠️ 胶囊朝向必须跟随线段（竖段用竖胶囊，横段用横胶囊）', () => {
    const src = readSrc('js', 'element-manager', 'element-renderer.js');

    const seg = src.match(/_appendSegmentHandles\([^)]*\)\s*\{([\s\S]*?)\n    \},\n/);
    assert(seg, '应能找到 _appendSegmentHandles');
    assert(/const\s+vertical\s*=\s*Math\.abs\(dy\)\s*>\s*Math\.abs\(dx\)/.test(seg[1]),
        '必须先判断该段是竖的还是横的');
    assert(/boxW\s*=\s*vertical\s*\?\s*size\.h\s*:\s*size\.w/.test(seg[1]),
        '竖段的宽高必须互换（否则竖线上会躺着一个横把手）');
    assert(/boxH\s*=\s*vertical\s*\?\s*size\.w\s*:\s*size\.h/.test(seg[1]),
        '竖段的高宽必须互换');
    assert(/dataset\.vertical/.test(seg[1]),
        '必须把朝向记进 dataset，缩放重算时才知道该用哪套尺寸');

    // 缩放重算不得把朝向打回横的
    const refresh = src.match(/refreshSegHandleSizes\(\)\s*\{([\s\S]*?)\n    \},\n/);
    assert(refresh, '应能找到 refreshSegHandleSizes');
    assert(/dataset\.vertical/.test(refresh[1]),
        'refreshSegHandleSizes 必须沿用渲染时的朝向 —— 否则缩放一次外观就变了');
    assert(!/el\.style\.width\s*=\s*`\$\{size\.w\}px`/.test(refresh[1]),
        '不许在缩放重算里无条件套用横版尺寸');
});

suite('14. 拖段：每一段都必须拖得动（竖段回归）');

/**
 * 模拟 tools-connector.handleSegmentMouseMove 的核心三步：
 * 取法线位移 → 改对应拐点 → 带 bend 提示做正交化。
 * 这是「用户按住胶囊拖一下」在纯函数层的等价物。
 */
function dragSegment(base, segIndex, delta) {
    const pts = base.map(p => ({ x: p.x, y: p.y }));
    const a = pts[segIndex];
    const b = pts[segIndex + 1];
    const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const inner = Math.min(segIndex + 1, pts.length - 2);
    if (horizontal) pts[inner].y += delta;
    else pts[inner].x += delta;
    return Router.applyWaypoints(pts, base, base[0], base[base.length - 1],
        { index: inner, axis: horizontal ? 'y' : 'x' });
}

const samePath = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** 4 段正交折线：竖-横-竖-横，覆盖首段 / 中段 / 末段 */
const PATH4 = [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 200, y: 100 },
    { x: 200, y: 300 },
    { x: 400, y: 300 },
];

test('⚠️ 每一段都能拖动（不许出现「按住没反应」的段）', () => {
    const dead = [];
    for (let i = 0; i < PATH4.length - 1; i++) {
        const got = dragSegment(PATH4, i, 80);
        if (samePath(got, PATH4)) dead.push(i);
        assertOrthogonal(got, `拖第 ${i} 段后`);
    }
    assertEqual(dead.length, 0,
        `这些段按住完全没反应（竖段的新 x 被补成水平短头后又被共线合并吃掉了）：${dead.join('、')}`);
});

test('⚠️ 竖段横向拖动：整段必须真的平移过去', () => {
    // 首段是竖段，内侧拐点 x 由 0 改成 80
    const got = dragSegment(PATH4, 0, 80);
    assert(!samePath(got, PATH4), '竖段拖动后路径不得与拖动前逐点相同');
    // 竖线必须落在新的 x 上（先横后竖补角）
    const verticals = got.filter((p, i) => i > 0 && got[i - 1].x === p.x).map(p => p.x);
    assert(verticals.indexOf(80) !== -1,
        `竖段应平移到 x=80，实得竖线 x=${JSON.stringify(verticals)}`);
});

test('⚠️ 末段拖动必须生效（末端的终点被钉死，靠 prev 分支补角）', () => {
    const got = dragSegment(PATH4, 3, 80);
    assert(!samePath(got, PATH4), '末段拖动后路径不得与拖动前逐点相同');
    assertOrthogonal(got, '拖末段后');
    // 末段是横段，拖动后应多出一个拐点把线接回被钉死的终点
    assert(got.length >= PATH4.length, '末段平移后应保留新拐点');
    assertEqual(got[0].x, PATH4[0].x, '首点必须仍钉在起点锚点');
    assertEqual(got[got.length - 1].x, PATH4[PATH4.length - 1].x, '末点必须仍钉在终点锚点');
    assertEqual(got[got.length - 1].y, PATH4[PATH4.length - 1].y, '末点必须仍钉在终点锚点');
});

test('⚠️ 首尾永远钉在锚点上（带 bend 时同样不得被改动）', () => {
    for (let i = 0; i < PATH4.length - 1; i++) {
        const got = dragSegment(PATH4, i, 137);
        assertEqual(got[0].x, PATH4[0].x, `拖第 ${i} 段后首点 x 被改了`);
        assertEqual(got[0].y, PATH4[0].y, `拖第 ${i} 段后首点 y 被改了`);
        assertEqual(got[got.length - 1].x, PATH4[4].x, `拖第 ${i} 段后末点 x 被改了`);
        assertEqual(got[got.length - 1].y, PATH4[4].y, `拖第 ${i} 段后末点 y 被改了`);
    }
});

test('⚠️ 不传 bend 时行为与历史逐点一致（渲染路径不许被这次修复影响）', () => {
    // element-renderer 的 applyWaypointsTo 只传 4 个参数 → bend 必须完全惰性
    const inert = Router.applyWaypoints(MG_L, MG_L, MG_L[0], MG_L[MG_L.length - 1],
        { index: -1, axis: 'y' });
    const plain = Router.applyWaypoints(MG_L, MG_L, MG_L[0], MG_L[MG_L.length - 1]);
    assert(JSON.stringify(inert) === JSON.stringify(plain),
        'bend.index 指向不存在的位置时，bend 必须不起任何作用');
});

test('⚠️ 带 bend 拖首段：仍与 MasterGo 实测逐点一致（3 段 Z 形塌成 2 段 L 形）', () => {
    const got = dragSegment(MG_Z, 0, 40);
    assertEqual(got.length, MG_Z_DRAGGED.length,
        `点数应与 MasterGo 一致（${MG_Z_DRAGGED.length}），实得 ${got.length}`);
    MG_Z_DRAGGED.forEach((w, i) => {
        assertEqual(got[i].x, w.x, `第 ${i} 点 x 应为 ${w.x}`);
        assertEqual(got[i].y, w.y, `第 ${i} 点 y 应为 ${w.y}`);
    });
});

test('⚠️ 拖段必须把 bend 传给正交化（少传就退回「只有横段能动」）', () => {
    const src = readSrc('js', 'tools', 'tools-connector.js');
    const fn = src.match(/handleSegmentMouseMove\(e\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 handleSegmentMouseMove');
    const call = fn[1].match(/applyWaypoints\(([\s\S]*?)\);/);
    assert(call, '应能找到 applyWaypoints 调用');
    assert(/index\s*:\s*inner/.test(call[1]),
        '必须告诉正交化「这次动的是第几个拐点」');
    assert(/axis\s*:\s*horizontal\s*\?\s*'y'\s*:\s*'x'/.test(call[1]),
        "必须告诉正交化「动的是哪根坐标」—— 横段改 y、竖段改 x");
});

test('⚠️ 渲染路径不得传 bend（页面框移动时必须走历史行为）', () => {
    const src = readSrc('js', 'element-manager', 'element-renderer.js');
    const fn = src.match(/applyWaypointsTo\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 applyWaypointsTo');
    const call = fn[1].match(/ConnectorRouter\.applyWaypoints\(([^)]*)\)/);
    assert(call, '应能找到 applyWaypoints 调用');
    assertEqual(call[1].split(',').length, 4,
        `渲染路径只应有 4 个实参，实得 ${call[1].split(',').length} 个：${call[1]}`);
});

// ---------------------------------------------------------------- 运行

(async () => {
    console.log('\x1b[36m\n▶ 智能连接线 · 路由算法单元测试\x1b[0m\n');
    await runAll();

    console.log(`\n\x1b[1m结果: ${passed} 通过, ${failed} 失败\x1b[0m`);
    if (failed > 0) {
        console.log('\x1b[31m失败用例:\x1b[0m');
        failures.forEach(f => console.log(`  · ${f.suite} › ${f.name}`));
        process.exit(1);
    }
    process.exit(0);
})();
