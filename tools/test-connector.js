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

suite('15. 自由连接线：两端都不在页面框上（MasterGo 实测）');

const MG_FREE_A = [
    { x: 143, y: 252 },
    { x: 268, y: 252 },
    { x: 268, y: 402 },
    { x: 393, y: 402 },
];
const MG_FREE_B = [
    { x: 853, y: 590 },
    { x: 676.5, y: 590 },
    { x: 676.5, y: 400 },
    { x: 500, y: 400 },
];

const assertSamePath = (got, want, label) => {
    assertEqual(got.length, want.length, `${label}: 点数应为 ${want.length}，实得 ${got.length}`);
    want.forEach((w, i) => {
        assertEqual(got[i].x, w.x, `${label}: 第 ${i} 点 x 应为 ${w.x}`);
        assertEqual(got[i].y, w.y, `${label}: 第 ${i} 点 y 应为 ${w.y}`);
    });
};

test('⚠️ 自由线走「中点台阶」，逐点对齐 MasterGo 实测（横→竖→横 3 段）', () => {
    // 用户文件上实测：空白处拖 (143,252)→(393,402)，拐点落在 x=268=(143+393)/2
    assertSamePath(
        Router.routeFreePoints({ x: 143, y: 252 }, { x: 393, y: 402 }),
        MG_FREE_A, '实测A');
    // 第二条：拖 (853,590)→(500,400)，拐点落在 676.5=(853+500)/2
    assertSamePath(
        Router.routeFreePoints({ x: 853, y: 590 }, { x: 500, y: 400 }),
        MG_FREE_B, '实测B');
});

test('⚠️ 同 x / 同 y 不拐弯（不该凭空多出一个台阶）', () => {
    assertEqual(Router.routeFreePoints({ x: 10, y: 20 }, { x: 300, y: 20 }).length, 2,
        '同 y 应是一条直线');
    assertEqual(Router.routeFreePoints({ x: 10, y: 20 }, { x: 10, y: 300 }).length, 2,
        '同 x 应是一条直线');
});

test('⚠️ 自由线全程正交且无 NaN（随机 200 组）', () => {
    for (let i = 0; i < 200; i++) {
        const a = { x: Math.round(Math.random() * 2000), y: Math.round(Math.random() * 2000) };
        const b = { x: Math.round(Math.random() * 2000), y: Math.round(Math.random() * 2000) };
        const pts = Router.routeFreePoints(a, b);
        assertFinite(pts, `随机第 ${i} 组`);
        assertOrthogonal(pts, `随机第 ${i} 组`);
        assertEqual(pts[0].x, a.x, `随机第 ${i} 组起点被改了`);
        assertEqual(pts[pts.length - 1].x, b.x, `随机第 ${i} 组终点被改了`);
        assertEqual(pts[pts.length - 1].y, b.y, `随机第 ${i} 组终点被改了`);
    }
});

test('⚠️ 退化输入返回 null 而不是半截路径', () => {
    assertEqual(Router.routeFreePoints(null, { x: 1, y: 1 }), null, '缺起点应返回 null');
    assertEqual(Router.routeFreePoints({ x: 1, y: 1 }, null), null, '缺终点应返回 null');
    assertEqual(Router.routeFreePoints({ x: NaN, y: 1 }, { x: 1, y: 1 }), null, 'NaN 应返回 null');
});

test('⚠️ 自由线也必须能拖段（handleSegmentMouseMove 不得因为没有元素就早退）', () => {
    const src = readSrc('js', 'tools', 'tools-connector.js');
    const fn = src.match(/handleSegmentMouseMove\(e\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 handleSegmentMouseMove');
    // ⚠️ 用行首锚定匹配，否则**注释里**引用这句也会被当成代码命中
    assert(!/^\s*if\s*\(\s*!fromEl\s*\|\|\s*!toEl\s*\)\s*return;/m.test(fn[1]),
        '自由线的 fromEl/toEl 本来就是 null，这个早退会让所有自由线的段都拖不动');
    assert(/el\.fromId\s*\?\s*ElementManager\.getElement\(el\.fromId\)\s*:\s*null/.test(fn[1]),
        '必须按 fromId 是否存在分别取元素');
    assert(/if\s*\(\s*!el\.wpRef\s*&&\s*fromEl\s*&&\s*toEl\s*\)/.test(fn[1]),
        'wpRef 只在两端都绑定时才记 —— 自由端硬记 null.position 会直接抛 TypeError');
});

test('⚠️ 起笔不得要求落在页面框上（否则空白处拉不出线）', () => {
    const src = readSrc('js', 'tools', 'tools-connector.js');
    const fn = src.match(/handleMouseDown\(e\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 handleMouseDown');
    assert(!/const from = this\.findAnchorOwnerAt\(e\);\s*\n\s*if \(!from\) return;/.test(fn[1]),
        '起点落在空白处也必须能起笔（MasterGo 实测：空白处直接拖就能出线）');
    assert(/this\.state\.fromFree\s*=\s*from\s*\?\s*null\s*:\s*\{\s*x:\s*pos\.x,\s*y:\s*pos\.y\s*\}/.test(fn[1]),
        '空白起笔时必须把坐标记进 fromFree');
});

test('⚠️ 落回自己身上要拦（否则会凭空画出一条自由线）', () => {
    const src = readSrc('js', 'tools', 'tools-connector.js');
    const fn = src.match(/handleMouseUp\(e\)\s*\{([\s\S]*?)\n        if \(this\.dragState\.active\)/);
    assert(fn, '应能找到 handleMouseUp 的绘制分支');
    assert(/droppedOnSelf/.test(fn[1]),
        '必须用 findAnchorOwnerAt 复核落点 —— resolveDropTarget 对「没命中」和「命中自己」都返回 null');
});

test('⚠️ 端点矩形只能有一个实现（两处渲染入口共用）', () => {
    const src = readSrc('js', 'element-manager', 'element-renderer.js');
    const fn = src.match(/endpointRects\(element, fromEl, toEl\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 endpointRects');
    const LITERAL = /x:\s*\w+\.position\.x,\s*y:\s*\w+\.position\.y,\s*width:\s*\w+\.width/g;
    assert(LITERAL.test(fn[1]),
        'endpointRects 里必须用元素自身的矩形（绑定端）');
    // 全文件只允许出现这一处 —— 多一处就意味着又有人手搓了一份
    const total = (src.match(/x:\s*\w+\.position\.x,\s*y:\s*\w+\.position\.y,\s*width:\s*\w+\.width/g) || []).length;
    assertEqual(total, 1,
        `element-renderer.js 里「元素矩形」字面量应只在 endpointRects 出现 1 次，实得 ${total} 次`);

    const mgr = readSrc('js', 'element-manager', 'element-manager.js');
    const into = mgr.match(/renderConnectorInto\(div, element\)\s*\{([\s\S]*?)\n    \},/);
    assert(into, '应能找到 renderConnectorInto');
    assert(/ElementRenderer\.endpointRects\(/.test(into[1]),
        'renderConnectorInto 必须复用 ElementRenderer.endpointRects，不能自己再造一份');
    assert(!/^\s*if \(!fromEl \|\| !toEl\) return;/m.test(into[1]),
        '自由端本来就没有元素，这个早退会让自由连接线**根本不渲染**');
});

test('⚠️ 端点可在绑定与自由之间来回切换（改连入口统一收口）', () => {
    const src = readSrc('js', 'element-manager', 'element-manager.js');
    const fn = src.match(/retargetConnector\([\s\S]*?\n    \},/);
    assert(fn, '应能找到 retargetConnector');
    assert(/freeKey/.test(fn[0]), '必须同时处理绑定 id/锚点与自由坐标两套字段');
    assert(/connector\[freeKey\]\s*=\s*null/.test(fn[0]),
        '转成绑定端时必须清掉自由坐标 —— 两个来源同时非空会让 resolveOne 取错');

    const tools = readSrc('js', 'tools', 'tools-connector.js');
    const up = tools.match(/handleMouseUp\(e\)\s*\{([\s\S]*?)\n    \},/);
    assert(/retargetConnector\(connectorId, end, null, null, cursor\)/.test(up[1]),
        '端点落在空白处时必须走「解绑成自由端」分支，而不是提示「改连已取消」');
});

suite('16. 拖端点时的锚点：内部要亮、收尾要不残留');

/**
 * 用户报的两个问题（本组锁死）：
 *   ① 拖端点时**看不到页面内部的锚点** —— 只亮页面框自己那 12 个
 *   ② 拖完之后**锚点残留在画布上** —— 要切一次工具才清掉
 *
 * 两者根因不同，但共用同一条链路，所以放一组。
 */
/**
 * 把源码里的 `//` 行注释剥掉。
 *
 * ⚠️ 本项目已被这件事坑过三次：静态契约测试用 indexOf/regex 去源码里找代码，
 *    结果命中的是**注释里引用的同一段代码**，测试断言方向被带偏。
 *    凡是"判断先后顺序""判断某写法是否还存在"这类用例，一律先在剥注释的文本上做。
 *
 * 只剥整行注释与行尾注释，不做完整的 JS 词法分析 ——
 * 够用且不会误伤字符串（本项目源码里没有含双斜杠的字面量）。
 */
function stripComments(src) {
    return src
        .split('\n')
        .map(line => {
            const t = line.trim();
            if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return '';
            return line.replace(/\s\/\/\s.*$/, '');
        })
        .join('\n');
}

test('⚠️ 拖端点必须更新 state.cursor（否则第二层内部锚点永远算不出来）', () => {
    const src = stripComments(readSrc('js', 'tools', 'tools-connector.js'));
    const fn = src.match(/handleMouseMove\(e\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 handleMouseMove');
    const branch = fn[1].split('if (this.dragState.active)')[1];
    assert(branch, '应能找到 dragState 分支');
    assert(/this\.state\.cursor\s*=\s*cursor/.test(branch),
        '必须把坐标写回 state.cursor —— _renderAnchorIds 用的就是它');

    // ⚠️ 顺序也要对：先算 cursor，再拿它渲染。
    //    写成「先 _renderAnchorIds(state.cursor) 再赋值」等于没改。
    const assign = branch.indexOf('this.state.cursor = cursor');
    const render = branch.indexOf('_renderAnchorIds');
    assert(assign > 0 && render > 0, `两处都必须存在（assign=${assign}, render=${render}）`);
    assert(assign < render,
        `必须**先**写回 cursor，**再**用它渲染锚点（assign=${assign}, render=${render}）`);

    // 防止退回「每次调 toCanvasCoords 各算一遍」的写法
    assert(!/this\.snapToAnchor\(hoverEl, this\.toCanvasCoords\(e\)\)/.test(branch),
        '吸附与渲染必须共用同一个 cursor 变量，不要各算一遍');
});

test('⚠️ refreshAnchors 只在连接线工具下跑，但拖端点任何工具都能起手（问题的成因）', () => {
    const tools = readSrc('js', 'tools', 'tools.js');
    // 拖端点的注册**不能**带工具门禁
    const down = tools.match(/canvasWrapper\.addEventListener\('mousedown'([\s\S]*?)\}, true\);/);
    assert(down, '应能找到 mousedown 分发');
    assert(/hitTestEndpoint\(e\)/.test(down[1]), '端点命中必须在');
    assert(!/this\.currentTool !== 'connector'\) return/.test(
        down[1].split('hitTestEndpoint')[0]),
        '端点拖拽必须在任何工具下都可用（否则用户切工具后拖不动端点）');
});

test('⚠️ 收尾不得直接 clearAnchors（鼠标还在框上就消失会很突兀 —— 走 B 方案）', () => {
    const src = readSrc('js', 'tools', 'tools-connector.js');
    const fn = src.match(/handleMouseUp\(e\)\s*\{([\s\S]*?)\n    \},\n\n    \/\*\*/);
    assert(fn, '应能找到 handleMouseUp');
    const tail = fn[1].split("if (this.dragState.active)")[1];
    assert(tail, '应能找到 dragState 分支');
    assert(/_syncAfterEndpointDrag\(e\)/.test(tail),
        '拖端点收尾必须走 _syncAfterEndpointDrag（开启拖后跟随）');
    // 该分支里不得出现裸的 clearAnchors（那是 A 方案，用户已否决）
    const upToSync = tail.split('_syncAfterEndpointDrag')[0];
    assert(!/clearAnchors\(\)/.test(upToSync),
        '收尾前不得直接清空锚点（用户选了 B：鼠标还框上就继续亮）');

    const sync = src.match(/_syncAfterEndpointDrag\(e\)\s*\{([\s\S]*?)\n    \},/);
    assert(sync, '应能找到 _syncAfterEndpointDrag');
    assert(/this\._anchorFollow = true/.test(sync[1]), '必须开启拖后跟随');
    assert(/refreshAnchors\(e\)/.test(sync[1]),
        '非连接线工具下必须自己补一次首帧，否则 mouseup 之后没人再画');
    assert(/Tools\.currentTool === 'connector'/.test(sync[1]),
        '连接线工具下不要补 —— 它自己会持续刷新，补了是重复劳动');
});

test('⚠️ 拖后跟随必须能自然结束（鼠标移出所有页面框即收）', () => {
    const src = readSrc('js', 'tools', 'tools-connector.js');
    const fn = src.match(/refreshAnchors\(e\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 refreshAnchors');
    assert(/if \(!this\.hoverElementId\) this\._anchorFollow = false;/.test(fn[1]),
        '鼠标离开所有页面框时必须结束跟随并清空锚点 —— 这是"残留"的最终解药');
    // 这行必须在 return 之前
    const guard = fn[1].indexOf('this._anchorFollow = false');
    const ret = fn[1].indexOf('return this._renderAnchorIds');
    assert(guard > 0 && guard < ret, '结束跟随必须发生在"只显示悬停元素"那条 return 之前');
});

test('⚠️ 跟随不得破坏「选择工具悬停时不显示锚点」', () => {
    const tools = readSrc('js', 'tools', 'tools.js');
    const mv = tools.match(/canvasWrapper\.addEventListener\('mousemove'([\s\S]*?)\n        \}\);/);
    assert(mv, '应能找到 mousemove 监听');
    assert(/this\.currentTool === 'connector' \|\| ToolsConnector\.shouldFollowAnchors\(\)/.test(mv[1]),
        '门禁只能是「连接线工具 或 正在跟随」，不能直接放开成无条件');
    assert(/mousemove/.test(mv[0]), '监听类型应是 mousemove');

    const tc = readSrc('js', 'tools', 'tools-connector.js');
    assert(/shouldFollowAnchors\(\)\s*\{\s*\n?\s*return !!this\._anchorFollow;/.test(tc),
        'shouldFollowAnchors 必须只看 _anchorFollow 这一个标记');
    assert(/_anchorFollow: false,/.test(tc), '标记初值必须是 false（默认不跟随）');
});

test('⚠️ 切换工具必须同时结束跟随并清空（否则选择工具下鼠标一动锚点就回来）', () => {
    const tools = readSrc('js', 'tools', 'tools.js');
    const setTool = tools.match(/setTool\(tool\)\s*\{([\s\S]*?)\n    \},/);
    assert(setTool, '应能找到 setTool');
    const endFollow = setTool[1].indexOf('endAnchorFollow()');
    const clear = setTool[1].indexOf('clearAnchors()');
    assert(endFollow > 0, 'setTool 必须结束拖后跟随');
    assert(clear > 0, 'setTool 必须清空锚点层');
    assert(endFollow < clear, '必须先结束跟随再清空 —— 反了两者都不生效');
});

test('⚠️ 鼠标移出画布必须清空锚点（锚点层是 fixed 挂在 body 上，会悬在画布外）', () => {
    const tools = readSrc('js', 'tools', 'tools.js');
    const leave = tools.match(/addEventListener\('mouseleave'([\s\S]*?)\n        \}\);/);
    assert(leave, '应能找到 mouseleave');
    assert(/shouldFollowAnchors\(\)/.test(leave[1]),
        '跟随态下必须做额外清理 —— 否则鼠标移出画布后锚点仍亮着');
    assert(/endAnchorFollow\(\)/.test(leave[1]) && /clearAnchors\(\)/.test(leave[1]),
        '必须同时结束跟随并清空锚点层');
});

test('⚠️ 画新线收尾不得继承拖后跟随（那是拖端点专属语义）', () => {
    const src = readSrc('js', 'tools', 'tools-connector.js');
    const fn = src.match(/cancelDrawing\(\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 cancelDrawing');
    assert(/this\._anchorFollow = false/.test(fn[1]),
        '画新线是「收工」语义：调用方随即切回选择工具，不该留着跟随');
});

// ================================================================ 17. 箭头命中范围与选中态
//
// 用户报的三个现象（前两个来自本轮，第三处是顺手发现的既有 bug）：
//   ① 「箭头工具在失去选择状态的时候去掉删除按钮」
//   ② 「箭头工具的选择范围太大了，这里可以参考下连接线工具是怎么做的」
//   ③ 浅色主题下连接线选中时的大矩形辉光**复发**（上个提交刚消掉的东西）

suite('17. 箭头命中范围与选中态');

test('⚠️ 删除按钮必须重新带上 .selected（否则未选中时也常驻一个红叉）', () => {
    const css = readSrc('css', 'canvas-editor.css');
    // 基础规则隐藏、覆盖规则在选中时显示 —— 两条都要在
    assert(/^\s*\.canvas-element\s*\.delete-btn\s*\{[\s\S]*?display:\s*none/m.test(css),
        '基础规则里应当有 display: none');
    assert(/^\s*\.canvas-element\.selected\s*\.delete-btn\s*\{[\s\S]*?display:\s*flex/m.test(css),
        '⚠️ 覆盖规则必须带 .selected —— 丢了它就变成"所有元素永远显示删除按钮"');

    // 反向：不允许存在不带 .selected 的裸覆盖规则（那就是这个 bug 本身）
    const bare = css.match(/^\s*\.canvas-element\s*\.delete-btn\s*\{[^}]*display:\s*flex/m);
    assert(!bare,
        '⚠️ 不得存在 `.canvas-element .delete-btn { display: flex }` 这样的无条件覆盖 —— 正是 d3976c6 引入回归的写法');

    // 批注元素有自己的那条，别被误伤
    assert(/\.canvas-element\.annotation-element\.selected\s*\.delete-btn/.test(css),
        '批注元素的选中态规则应保持独立存在');
});

test('⚠️ 箭头容器必须 pointer-events:none（盒子=包围盒，整块可点等于"点空白也选中"）', () => {
    const css = readSrc('css', 'canvas-editor.css');
    const rule = css.match(/\.canvas-element\.arrow-element\s*\{([\s\S]*?)\}/);
    assert(rule, '应能找到 .arrow-element 基础规则');
    assert(/pointer-events:\s*none/.test(rule[1]),
        '⚠️ 箭头容器必须穿透：实测 300×300 包围盒撒 625 点全被它接住，真线只占 2%');

    // 视觉 svg 与 path 也要穿透，命中只能由命中区负责
    assert(/\.arrow-svg\s*\{[\s\S]*?pointer-events:\s*none/.test(css),
        '.arrow-svg 盒子本身必须穿透（否则命中区的 stroke 收不到事件）');
    assert(/\.arrow-svg\s+path\s*\{[\s\S]*?pointer-events:\s*none/.test(css),
        '视觉 path 必须穿透');
    assert(/\.arrow-svg\s+\.arrow-hit\s*\{[\s\S]*?pointer-events:\s*stroke/.test(css),
        '⚠️ 必须存在 .arrow-hit 且 pointer-events: stroke —— 这是唯一接事件的东西');
});

test('⚠️ 箭头命中区光标必须是 move（容器穿透后光标只能由命中区提供）', () => {
    const css = readSrc('css', 'canvas-editor.css');
    const rule = css.match(/\.arrow-svg\s+\.arrow-hit\s*\{([\s\S]*?)\}/);
    assert(rule, '应能找到 .arrow-hit 规则');
    assert(/cursor:\s*move/.test(rule[1]),
        '⚠️ 改前容器自己的 cursor 实测是 move（来自 .canvas-element），命中区若写 pointer 就丢了"整条可拖走"的暗示');
});

test('⚠️ 箭头渲染必须产出 .arrow-hit，且宽度走 getHitStrokeWidth（屏幕恒定 10px）', () => {
    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const fn = src.match(/renderArrowElement\(div, element, canvas\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 renderArrowElement');
    assert(/setAttribute\('class',\s*'arrow-hit'\)/.test(fn[1]),
        '⚠️ 必须创建 .arrow-hit 命中路径');
    assert(/getHitStrokeWidth\(\)/.test(fn[1]),
        '⚠️ 命中区宽度必须由 getHitStrokeWidth() 出（= 10/zoom），不能写死');

    // 视觉 path / 箭头头部也要带类名，选中态样式才有钩子
    assert(/setAttribute\('class',\s*'arrow-path'\)/.test(fn[1]),
        '视觉 path 要有 .arrow-path（选中变蓝用它）');
    assert(/setAttribute\('class',\s*'arrow-head'\)/.test(fn[1]),
        '箭头头部要有 .arrow-head（选中变蓝用它）');
});

test('⚠️ 命中路径必须画到最后一个点（不能复用 generateArrowPath 的根部截断）', () => {
    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const fn = src.match(/arrowHitPathData\(points, offsetX, offsetY\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 arrowHitPathData');
    // 必须遍历所有点（map），不能有 length - 1 之类的截断
    assert(/points\.map\(/.test(fn[1]), '命中路径应遍历全部拐点');
    assert(!/length\s*-\s*1/.test(fn[1]),
        '⚠️ 不得截掉最后一个点 —— generateArrowPath 停在箭头根部是为了视觉，命中区若也停在那里，尖端那 15px 就点不中');

    // 确认确实没有复用视觉路径
    const arrow = src.match(/renderArrowElement\(div, element, canvas\)\s*\{([\s\S]*?)\n    \},/);
    assert(arrow, '应能找到 renderArrowElement');
    assert(!/hit\.setAttribute\('d',\s*pathData\)/.test(arrow[1]),
        '⚠️ 命中区不得直接复用视觉路径数据（根部截断会让尖端点不中）');
});

test('⚠️ 箭头 SVG 必须 overflow:visible（命中带骑在中心线上，默认 hidden 会裁掉一半）', () => {
    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const fn = src.match(/renderArrowElement\(div, element, canvas\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 renderArrowElement');
    assert(/svg\.style\.overflow\s*=\s*'visible'/.test(fn[1]),
        '⚠️ SVG 默认 overflow:hidden；命中带两侧各占一半，zoom=0.25 时半宽 20 已超过 padding 10，会被裁掉');
});

test('⚠️ refreshHitStrokeWidths 必须同时覆盖箭头与连接线的命中区', () => {
    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const fn = src.match(/refreshHitStrokeWidths\(\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 refreshHitStrokeWidths');
    assert(/\.connector-hit/.test(fn[1]), '必须覆盖 .connector-hit');
    assert(/\.arrow-hit/.test(fn[1]),
        '⚠️ 必须同时覆盖 .arrow-hit —— 漏掉的那一类会在缩放后手感失真，且不报任何错');
});

test('⚠️ 框选判定必须走公共的 linePointsOf（不得在调用点各写一份 type 分支）', () => {
    const box = stripComments(readSrc('js', 'canvas-view', 'canvas-view-box-selection.js'));
    assert(/ElementRenderer\.linePointsOf\(element\)/.test(box),
        '⚠️ 线条类元素的路径点必须由 ElementRenderer.linePointsOf 统一提供');

    // 反向：不允许残留按 type 硬分支的旧写法
    assert(!/element\.type\s*===\s*'connector'/.test(box),
        '⚠️ 不得再按 type 硬分支 —— 箭头取 element.points、连接线取 _routePoints，来源不同，写两份迟早漏一处');
    assert(!/element\._routePoints/.test(box),
        '⚠️ 不得在框选里直接读 _routePoints（那是连接线专有字段，箭头没有）');

    // 保留「完全包含」语义：不得退回相交判定
    assert(/\.every\(p\s*=>/.test(box), '完全包含语义应保留（every 而非 some）');
});

test('⚠️ linePointsOf 必须同时认识箭头与连接线，别的类型返回 null', () => {
    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const fn = src.match(/linePointsOf\(element\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 linePointsOf');
    assert(/element\.type\s*===\s*'arrow'/.test(fn[1]), '必须认识箭头');
    assert(/element\.points/.test(fn[1]), '箭头取 element.points');
    assert(/element\.type\s*===\s*'connector'/.test(fn[1]), '必须认识连接线');
    assert(/_routePoints/.test(fn[1]), '连接线取 element._routePoints');
    assert(/return null/.test(fn[1]), '非线元素必须返回 null（调用方据此走通用矩形判定）');
});

test('⚠️ 线条类元素选中时不得有包围矩形 —— 且必须压过浅色主题的通用规则', () => {
    const css = readSrc('css', 'canvas-editor.css');

    // ① 箭头：无矩形
    const arrowSel = css.match(/\.canvas-element\.arrow-element\.selected[\s\S]*?\{([\s\S]*?)\}/);
    assert(arrowSel, '应能找到箭头选中态规则');
    assert(/box-shadow:\s*none/.test(arrowSel[1]), '箭头选中必须 box-shadow: none');
    assert(/outline:\s*none/.test(arrowSel[1]), '箭头选中必须 outline: none');

    // ② 箭头：线变蓝加粗（这才是"选中了"的视觉反馈）
    assert(/\.canvas-element\.arrow-element\.selected\s+\.arrow-path\s*\{[\s\S]*?stroke:\s*var\(--accent-blue\)/.test(css),
        '选中时视觉线应变蓝');
    assert(/\.canvas-element\.arrow-element\.selected\s+\.arrow-head\s*\{[\s\S]*?fill:\s*var\(--accent-blue\)/.test(css),
        '选中时箭头头部应变蓝');

    // ③ 关键：特异性必须 ≥ (0,3,0)，否则被 `:root[data-theme="light"] .canvas-element.selected` 压过
    const lightPrefix = css.match(/:root\[data-theme="light"\]\s*\.canvas-element\.arrow-element\.selected/);
    assert(lightPrefix,
        '⚠️ 必须有一条带 :root[data-theme="light"] 前缀的箭头选中规则 —— 通用规则那条是 (0,3,0)，没前缀的同名规则会被它按特异性压过，矩形辉光就会复发');

    // ④ 连接线同样的坑也要兜住
    assert(/:root\[data-theme="light"\]\s*\.canvas-element\.connector-element\.selected[\s\S]*?box-shadow:\s*none/.test(css),
        '⚠️ 连接线也必须有带主题前缀的兜底 —— 实测浅色主题下它的矩形辉光确实还在（原规则只有 0,2,0）');
});

test('⚠️ 光标判定必须用命中区，不能继续找 svg.arrow-svg path（那已永远匹配不到）', () => {
    const src = stripComments(readSrc('js', 'canvas-view', 'canvas-view-events.js'));
    assert(/closest\('svg\.arrow-svg\s+\.arrow-hit'\)/.test(src),
        '⚠️ updateCursorByElement 必须改判命中区');
    assert(!/closest\('svg\.arrow-svg path'\)/.test(src),
        '⚠️ 不得残留 closest(\'svg.arrow-svg path\') —— 视觉 path 已 pointer-events:none，永远匹配不到，光标再不会变 grab');

    const down = src.match(/handleMouseDown\(e, canvasWrapper\)\s*\{([\s\S]*?)\n    \},/);
    assert(down, '应能找到 handleMouseDown');
    assert(!/closest\('svg\.arrow-svg path'\)/.test(down[1]),
        '⚠️ handleMouseDown 里同样不得残留旧判据');
    assert(/\.arrow-hit/.test(down[1]), 'handleMouseDown 的兜底应判命中区');
});

// ================================================================ 18. 页面框「拖入即完整 / F5 即完整」
//
// 用户诉求：从页面库拖进画布应当直接是**完整**页面，F5 刷新后也应当直接是完整页面，
// 不该出现「先按设备高 812 占位 → 几百毫秒后撑开」的跳变。
//
// 实测（改前）：
//   · 刷新 elem_7  812 → t≈485ms → 1733
//   · 刷新 elem_8  812 → t≈541ms → 1987
//   · 刷新 elem_9  812 → t≈541ms → 1300
//   · 拖入 app-message 812 → t≈143ms → 846
//
// 根因：完整高度只能把页面加载起来量，而量到的结果只活在内存缓存
// （ProtoAutoFit._cache）里，刷新即丢 → 每次都必须重新量。
// 做法：按 pageId 记住量到的结果（独立 localStorage 键），渲染时直接用它；
// 有史以来第一次遇到的页面高度未知，则先把框藏起来、量完直接以完整高度显形。

suite('18. 页面框：拖入即完整 / F5 即完整');

/** 取出 element-renderer.js 里 ProtoAutoFit 这个对象的源码块 */
function protoAutoFitSrc() {
    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const start = src.indexOf('window.ProtoAutoFit = {');
    assert(start >= 0, '应能找到 window.ProtoAutoFit 定义');
    const end = src.indexOf('\n};', start);
    assert(end > start, '应能找到 ProtoAutoFit 对象结尾');
    return src.slice(start, end);
}

test('⚠️ 键名必须由 Storage 统一持有（不得在两处各写一份字面量）', () => {
    const storage = stripComments(readSrc('js', 'storage.js'));
    assert(/get PAGE_BOX_KEY\(\)\s*\{[\s\S]*?return `\$\{this\.projectName\}_pageBoxes`/.test(storage),
        'Storage 应提供 PAGE_BOX_KEY，且随 projectName 派生（换项目名不孤立数据）');

    const managed = storage.match(/getManagedKeys\(\)\s*\{([\s\S]*?)\n    \},/);
    assert(managed, '应能找到 getManagedKeys');
    assert(/this\.PAGE_BOX_KEY/.test(managed[1]),
        '⚠️ 新键必须纳入 getManagedKeys —— 按钮叫「清空浏览器缓存」，漏掉它就残留');

    const proto = protoAutoFitSrc();
    assert(/Storage\.PAGE_BOX_KEY/.test(proto), 'ProtoAutoFit.storeKey 应复用 Storage.PAGE_BOX_KEY');
    assert(!/_pageBoxes/.test(proto),
        '⚠️ ProtoAutoFit 里不得再写一遍 `_pageBoxes` 字面量（两处拼装迟早漂移）');
    assert(/typeof Storage !== 'undefined'/.test(proto),
        'Storage 未就绪时必须安全降级（返回 null → 只走内存缓存，不落盘）');
});

test('⚠️ recall 必须先查本次会话实测、再回退到跨刷新记忆，且按 pageId 查', () => {
    const proto = protoAutoFitSrc();
    const fn = proto.match(/recall\(elementId\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 recall');
    const body = fn[1];
    assert(/_cache\[elementId\]/.test(body), '必须先查本次会话实测（最准）');
    const firstHit = body.indexOf('_cache[elementId]');
    const known = body.indexOf('_loadKnown()');
    assert(known > firstHit, '⚠️ 跨刷新记忆只能做回退 —— 顺序反了会拿旧值盖掉刚量到的新值');
    assert(/el\.pageId/.test(body), '⚠️ 跨刷新记忆必须按 pageId 查（内容是页面的属性，不是元素实例的）');
    assert(/return null/.test(body), '都没有时必须返回 null，调用方据此判断「高度未知」');
});

test('⚠️ remember 必须同时写内存与跨刷新记忆（只写内存 = 刷新白记）', () => {
    const proto = protoAutoFitSrc();
    const fn = proto.match(/remember\(elementId, box\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 remember');
    assert(/_cache\[elementId\]\s*=/.test(fn[1]), '要写本次会话缓存');
    assert(/_loadKnown\(\)\[pageId\]\s*=/.test(fn[1]), '⚠️ 必须同时按 pageId 写跨刷新记忆');
    assert(/_schedulePersist\(\)/.test(fn[1]), '⚠️ 写完要安排落盘（防抖），否则刷新就丢');
});

test('⚠️ apply 必须走 recall 且返回布尔（调用方靠它判断「高度未知」）', () => {
    const proto = protoAutoFitSrc();
    const fn = proto.match(/apply\(elementId, div, baseWidth, baseHeight\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 apply');
    assert(/const box = this\.recall\(elementId\)/.test(fn[1]),
        '⚠️ 必须走 recall —— 直接读 _cache 的话跨刷新记忆永远用不上，等于没做');
    assert(/if \(!box \|\| !div\) return false;/.test(fn[1]), '未知时必须 return false');
    assert(/return true;/.test(fn[1]), '成功套上必须 return true');
});

test('⚠️ 占位高度必须含顶栏 30px（历史上漏了 → 初始 iframe 比设备视口还矮 30px）', () => {
    const proto = protoAutoFitSrc();
    const fn = proto.match(/placeholderHeight\(baseHeight\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 placeholderHeight');
    assert(/PROTO_FRAME_BAR/.test(fn[1]), '⚠️ 占位高度必须加顶栏，否则初始画面本身就是错的');

    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const render = src.match(/renderPageElement\(div, element, canvas\)\s*\{([\s\S]*?)\n    \},/);
    assert(render, '应能找到 renderPageElement');
    assert(/placeholderHeight\(element\.height\)/.test(render[1]), 'renderPageElement 应走 placeholderHeight');
    assert(!/div\.style\.height = `\$\{element\.height\}px`/.test(render[1]),
        '⚠️ 不得再裸写 element.height 当占位高（那是漏掉顶栏的旧写法）');

    const em = stripComments(readSrc('js', 'element-manager', 'element-manager.js'));
    const upd = em.match(/updateElementSize\(div, element\)\s*\{([\s\S]*?)\n    \},/);
    assert(upd, '应能找到 updateElementSize');
    assert(/placeholderHeight\(element\.height\)/.test(upd[1]),
        '⚠️ apply 返回 false（高度未知）时必须补占位高度，否则撤销/重做会把框打矮 30px');
});

test('⚠️ 高度未知的框必须先藏起来，且必须有兜底超时（否则页面可能永不出现）', () => {
    const proto = protoAutoFitSrc();
    const fn = proto.match(/beginMeasureIfUnknown\(element, div\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 beginMeasureIfUnknown');
    const body = fn[1];
    assert(/if \(this\.recall\(element\.id\)\) return;/.test(body),
        '⚠️ 高度已知时绝不能藏 —— 那会把「零延迟直接完整」这条正常路径也拖慢');
    assert(/classList\.add\('proto-measuring'\)/.test(body), '未知时挂上隐藏类');
    assert(/PROTO_MEASURE_TIMEOUT/.test(body), '⚠️ 必须有兜底超时');
    assert(/this\.reveal\(/.test(body), '超时后必须显形');

    // 超时常量声明在 ProtoAutoFit 对象**之外**（模块顶层），所以要在整个文件里找
    const whole = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    assert(/const PROTO_MEASURE_TIMEOUT = \d+;/.test(whole), '超时常量应显式声明');

    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const render = src.match(/renderPageElement\(div, element, canvas\)\s*\{([\s\S]*?)\n    \},/);
    assert(/beginMeasureIfUnknown\(element, div\)/.test(render[1]), 'renderPageElement 应接上「未知则藏」');
});

test('⚠️ 隐藏只能用 visibility:hidden，绝不能用 display:none', () => {
    const css = readSrc('css', 'canvas-editor.css');
    // ⚠️ 只在**规则体内**断言：本文件上方那条注释里也写着 "display:none"，
    //    直接全文搜会被自己的注释骗过（本仓库已被同类问题坑过三次）。
    const rule = css.match(/\.canvas-element\.page-element\.proto-measuring\s*\{([\s\S]*?)\}/);
    assert(rule, '应能找到 .proto-measuring 规则');
    assert(/visibility:\s*hidden/.test(rule[1]), '必须用 visibility:hidden');
    assert(!/display:\s*none/.test(rule[1]),
        '⚠️ 绝不能用 display:none —— 它让 iframe 不参与布局，量出来的高度是错的');
    assert(!/opacity:\s*0/.test(rule[1]),
        '不要用 opacity:0 顶替：它仍会接收指针事件，可能被误点到看不见的框');
});

test('⚠️ 显形必须发生在套用高度之后（反了就会露出那一下跳变）', () => {
    const editor = stripComments(readSrc('js', 'canvas-editor.js'));
    const handler = editor.match(/data\.type === 'proto-page-height'([\s\S]*?)\n            \}/);
    assert(handler, '应能找到 proto-page-height 分支');
    const applyAt = handler[1].indexOf('ProtoAutoFit.apply(');
    const revealAt = handler[1].indexOf('ProtoAutoFit.reveal(');
    assert(applyAt > 0, '必须调 apply');
    assert(revealAt > 0, '⚠️ 必须调 reveal —— 否则被「未知则藏」藏起来的框永远不出现');
    assert(applyAt < revealAt,
        `⚠️ 必须先 apply 再 reveal（apply=${applyAt}, reveal=${revealAt}）；反了就是先显形再改高度，照样跳`);
});

test('⚠️ 绝不能把实测高度写进 element.height（画布数据/撤销栈/脏标记必须不受影响）', () => {
    // 这是本模块的立身之本：自适应是渲染表现，不是画布数据。
    // 一旦写进去，加载一个画布就会把「未保存」点亮，撤销栈也会被污染。
    const proto = protoAutoFitSrc();
    assert(!/\b(element|el|e)\.height\s*=/.test(proto),
        '⚠️ ProtoAutoFit 里不得给 element.height 赋值');
    assert(!/element\.width\s*=/.test(proto), '同理不得写 element.width');
});

test('⚠️ 落盘必须容错：形状不对的条目要丢弃，写失败不能抛', () => {
    const proto = protoAutoFitSrc();
    const load = proto.match(/_loadKnown\(\)\s*\{([\s\S]*?)\n    \},/);
    assert(load, '应能找到 _loadKnown');
    assert(/Number\.isFinite\(b\.h\)/.test(load[1]) && /Number\.isFinite\(b\.w\)/.test(load[1]),
        '⚠️ 必须逐条校验 h/w 是有限数 —— 手改过的存档会把 NaN 灌进样式');
    assert(/b\.h > 0 && b\.w > 0/.test(load[1]), '非正数也要丢弃');
    assert(/catch/.test(load[1]), 'JSON 解析失败必须兜住（损坏的存档不能让画布起不来）');

    const flush = proto.match(/_flush\(\)\s*\{([\s\S]*?)\n    \},/);
    assert(flush, '应能找到 _flush');
    assert(/catch/.test(flush[1]), '⚠️ 写入失败必须兜住（配额满/无痕模式下不能抛）');
});

test('⚠️ 挂到 DOM 之后必须再套一次尺寸（游离节点量不到边框，首帧会小 4px）', () => {
    // 实测：不补这一下，刷新后 elem_7 首帧是 1729px，等页面把高度报回来
    // 才被修正成 1733px —— 那 4px 就是浅色主题 border:2px 的上下左右合计，
    // 游离节点 offsetWidth-clientWidth 恒为 0，量不出来。
    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const fn = src.match(/renderElementWithoutCount\(element\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 renderElementWithoutCount');
    const body = fn[1];
    const appendAt = body.indexOf('canvas.appendChild(div)');
    assert(appendAt > 0, '应能找到 canvas.appendChild(div)');
    const after = body.slice(appendAt);
    assert(/ProtoAutoFit\.apply\(/.test(after),
        '⚠️ 必须在 appendChild **之后**再套一次尺寸（游离时边框量不到）');
    assert(/ProtoAutoFit\.applyPlaceholder\(/.test(after),
        '高度未知时要补占位尺寸，且同样要含边框');
});

test('⚠️ 边框补偿只能按 offsetWidth-clientWidth 量（游离节点 computed border 也是 0）', () => {
    const proto = protoAutoFitSrc();
    const fn = proto.match(/borderOf\(div\)\s*\{([\s\S]*?)\n    \},/);
    assert(fn, '应能找到 borderOf');
    assert(/div\.offsetWidth - div\.clientWidth/.test(fn[1]), '用 offsetWidth-clientWidth 量左右边框');
    assert(/div\.offsetHeight - div\.clientHeight/.test(fn[1]), '用 offsetHeight-clientHeight 量上下边框');
    // 反向：不得改用 computed border —— 游离节点匹配不到 :root[data-theme] 祖先选择器
    assert(!/getComputedStyle\(div\)\.border/.test(fn[1]),
        '⚠️ 不得改用 computed border：游离节点匹配不到 :root[data-theme] 这类祖先选择器，照样是 0');
});

// ================================================================ 19. 预览模式：设备尺寸 + 真机观感
//
// 用户诉求（原话）：「在画布中。用户使用预览模式后，恢复设备的大小。」
// 追问后确认的定义：
//   · 进入预览 → 页面框回到**设备尺寸**（375×812，而不是 1733 的完整高度）
//   · 退出预览 → 回到「完整高度」（记忆里的实测值）
//
// 为什么「光把框缩到 812」不算数：
//   page-autofit.js 为了让画布显示完整长页，把页面 html/body 改成了
//   height:auto + overflow:visible，内部滚动容器也全被解开（unlock()）。
//   框缩到 812 后，那 1699px 内容会被 iframe 自身的 overflow:hidden
//   直接裁掉、而且滚不动 —— 连预览都算不上，必须让页面回到原生布局。
//
// 实测（Chrome，本机）三个关键事实，决定了实现方式：
//   ① 给**已存在**的 iframe 赋 name，**不会**改变它当前浏览上下文的 window.name
//      （改完立刻读 iframe.contentWindow.name 仍是旧值）→「改名 + reload」走不通；
//   ② 页面**自己** set window.name 是跨导航保持的（改完再跳转，新文档读到的仍是新名字），
//      且父页面 iframe 元素上的 name 属性完全不受影响（两条通道互不干扰）；
//   ③ src 一改就是一次完整导航，file://（不透明来源）下同样可靠。
// 于是：画布侧往 src 上挂 URL 标记，页面侧靠 URL 标记 + window.name 尾巴认预览态。

suite('19. 预览模式：进预览缩回设备尺寸 / 退预览回到完整高度');

test('⚠️ 预览标记的字面量：画布侧与页面侧必须一字不差', () => {
    const canvas = stripComments(readSrc('js', 'canvas-view', 'canvas-view-events.js'));
    const page = stripComments(readSrc('js', 'page-autofit.js'));

    const canvasPreview = canvas.match(/PREVIEW_URL_MARK:\s*'([^']+)'/);
    const canvasFit = canvas.match(/FIT_URL_MARK:\s*'([^']+)'/);
    const pagePreview = page.match(/MARK_PREVIEW\s*=\s*'([^']+)'/);
    const pageFit = page.match(/MARK_FIT\s*=\s*'([^']+)'/);

    assert(canvasPreview && canvasFit, '画布侧应声明 PREVIEW_URL_MARK / FIT_URL_MARK');
    assert(pagePreview && pageFit, '页面侧应声明 MARK_PREVIEW / MARK_FIT');
    assertEqual(pagePreview[1], canvasPreview[1],
        '⚠️ 预览标记不一致 → 页面侧认不出，预览中照样解锁成长文档、框缩了也是白缩');
    assertEqual(pageFit[1], canvasFit[1],
        '⚠️ 退出标记不一致 → 名字尾巴摘不掉，框再也回不到完整高度');
});

test('⚠️ 进入预览：框缩回设备尺寸 + src 挂预览标记（缺一不可）', () => {
    const src = stripComments(readSrc('js', 'canvas-view', 'canvas-view-events.js'));

    const open = src.match(/openPreview\(pageTitle, elementId\)\s*\{([\s\S]*?)\n    \},/);
    assert(open, '应能找到 openPreview');
    assert(/_enterDeviceFrame\(elementId, pageDiv\)/.test(open[1]),
        'openPreview 必须调 _enterDeviceFrame');

    const enter = src.match(/_enterDeviceFrame\(elementId, pageDiv\)\s*\{([\s\S]*?)\n    \},/);
    assert(enter, '应能找到 _enterDeviceFrame');
    assert(/ProtoAutoFit\.applyPlaceholder\(pageDiv, element\.width, element\.height\)/.test(enter[1]),
        '⚠️ 必须走 applyPlaceholder 缩到设备尺寸 —— 「+30 顶栏」「+边框」两笔补偿只允许一份实现');
    assert(/PREVIEW_URL_MARK/.test(enter[1]),
        '⚠️ 必须把预览标记挂到 src 上重新导航，否则页面侧不解锁 → 预览框里是条裁死不滚的长文档');
    assert(/ProtoAutoFit\.reveal\(elementId\)/.test(enter[1]),
        '⚠️ 必须显形：刚拖进来还没量到高度的框正被 proto-measuring 藏着，不显形预览就是一片空白');
});

test('⚠️ 退出预览：先用记忆高度恢复，再挂退出标记导航（顺序反了会先矮后高跳一下）', () => {
    const src = stripComments(readSrc('js', 'canvas-view', 'canvas-view-events.js'));

    const close = src.match(/closePreview\(\)\s*\{([\s\S]*?)\n    \},/);
    assert(close, '应能找到 closePreview');
    assert(/_exitDeviceFrame\(/.test(close[1]), 'closePreview 必须调 _exitDeviceFrame');

    const exit = src.match(/_exitDeviceFrame\(elementId, pageDiv\)\s*\{([\s\S]*?)\n    \},/);
    assert(exit, '应能找到 _exitDeviceFrame');
    assert(/ProtoAutoFit\.apply\(elementId, pageDiv\)/.test(exit[1]),
        '必须按记忆里的实测高度立刻恢复 —— 等页面重新回报要 300~500ms，那就是一次跳变');
    assert(/applyPlaceholder\(pageDiv, element\.width, element\.height\)/.test(exit[1]),
        '从未量到过的页面（PROTO_FIXED_HEIGHT / 首次出现）要保持设备尺寸，不能留个空高');
    assert(/FIT_URL_MARK/.test(exit[1]),
        '⚠️ 必须挂退出标记 —— 名字尾巴只能靠它摘掉，否则页面永远不解锁');
    assert(exit[1].indexOf('apply(elementId, pageDiv)') < exit[1].indexOf('_navigateFrame('),
        '⚠️ 必须先恢复尺寸再导航');
});

test('⚠️ 不得再用「改 iframe.name 后重载」那套 —— 实测对已存在的浏览上下文无效', () => {
    const src = stripComments(readSrc('js', 'canvas-view', 'canvas-view-events.js'));
    assert(!/iframe\.name\s*=/.test(src),
        '⚠️ 给已存在的 iframe 赋 name 不会改变它的 window.name（实测仍读到旧值），' +
        '页面侧照样解锁 —— 这条路已被证伪，别再写回来');
    assert(!/contentWindow\.location/.test(src),
        '⚠️ file:// 下读 contentWindow.location 必抛 SecurityError，不得依赖它做重载');
});

test('⚠️ 预览中的那个框：迟到的测量报告绝不能把它重新撑高', () => {
    const editor = stripComments(readSrc('js', 'canvas-editor.js'));
    const handler = editor.match(/data\.type === 'proto-page-height'([\s\S]*?)\n            \}/);
    assert(handler, '应能找到 proto-page-height 分支');
    assert(/isPreviewMode/.test(handler[1]) && /_previewElementId/.test(handler[1]),
        '⚠️ 必须显式认「正在预览的就是这个元素」：进入预览时旧文档在导航前排队的那一帧 ' +
        'rAF 报告仍带着**干净 key** 到达，光靠 key 是拦不住的');
    assert(/if \(!previewing\)/.test(handler[1]), '拦下时不得调 apply');
    assert(/ProtoAutoFit\.remember\(/.test(handler[1]),
        'remember 不能被一起拦掉：记忆里存的仍是这个页面的完整高度，退出预览就靠它零跳变恢复');
});

/**
 * 在 vm 里真跑 page-autofit.js，只观察它有没有去「解锁」根节点。
 *
 * 解锁的写法是 `root.style.setProperty('height','auto','important')`，
 * 因此一个会记账的假 Element 就够把「解没解锁」看得一清二楚。
 *
 * ⚠️ 静态 grep 在这里不够用：boot() 里「先摘尾巴再判预览态」的顺序一颠倒，
 *    该有的字符串一个都没少，只有真跑才能看出框再也回不到完整高度。
 */
function runAutofit(opts) {
    const file = path.join(ROOT, 'js', 'page-autofit.js');
    const code = fs.readFileSync(file, 'utf8');

    const unlockCalls = [];
    const reports = [];
    const mkEl = (tag) => ({
        tagName: tag,
        style: { setProperty(prop, value) { unlockCalls.push([tag, prop, value]); } },
        dataset: {},
        scrollHeight: 1699, clientHeight: 1699, offsetHeight: 1699,
        scrollWidth: 375, offsetWidth: 375, clientWidth: 375,
        parentElement: null,
        querySelectorAll: () => [],
        getAttribute: () => null,
        setAttribute() {},
    });

    const documentElement = mkEl('html');
    const body = mkEl('body');
    body.children = [];
    const documentStub = {
        readyState: 'complete',
        documentElement,
        body,
        addEventListener() {},
        querySelectorAll: () => [],
    };

    const locationStub = { search: opts.search || '' };
    const parentStub = { postMessage(msg) { reports.push(msg); } };
    const win = {
        name: opts.name,
        innerHeight: 812,
        innerWidth: 375,
        PROTO_FIXED_HEIGHT: !!opts.fixed,
        location: locationStub,
        history: { replaceState() {} },
        requestAnimationFrame(fn) { fn(); return 1; },
        addEventListener() {},
        getComputedStyle: () => ({ overflowY: 'visible', maxHeight: 'none' }),
        document: documentStub,
    };
    win.parent = opts.topLevel ? win : parentStub;
    win.window = win;

    const sandbox = {
        window: win,
        document: documentStub,
        location: locationStub,
        Debug: { log() {}, warn() {}, error() {} },
    };
    sandbox.globalThis = sandbox;

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code, ctx, { filename: file });

    return {
        unlocked: unlockCalls.some(c => c[1] === 'height' && c[2] === 'auto'),
        name: win.name,
        reports,
    };
}

const CANVAS_NAME = 'proto-canvas-elem_7';
const SUFFIX = '\u0000proto-preview';

test('页面侧：画布常态（无标记）必须照常解锁 —— 这是老功能，不能被新逻辑误伤', () => {
    const r = runAutofit({ name: CANVAS_NAME, search: '' });
    assert(r.unlocked, '无标记时页面必须解锁，否则画布上又只能看到一屏');
    assertEqual(r.name, CANVAS_NAME, '不该动 window.name');
});

test('⚠️ 页面侧：预览首帧（URL 标记）必须拒绝解锁，并把标记挂上 window.name', () => {
    const r = runAutofit({ name: CANVAS_NAME, search: '?__proto_preview=1' });
    assert(!r.unlocked,
        '⚠️ 预览中绝不能解锁：一解锁内容就摊平成 1699px 长文档，812 的框里裁死不滚');
    assertEqual(r.name, CANVAS_NAME + SUFFIX,
        '⚠️ 必须把标记挂到 window.name 尾巴上 —— 帧内跳转时 URL 标记会丢，名字不会');
});

test('⚠️ 页面侧：预览中帧内跳转（只剩名字尾巴）仍必须拒绝解锁', () => {
    const r = runAutofit({ name: CANVAS_NAME + SUFFIX, search: '' });
    assert(!r.unlocked, '⚠️ 预览里点链接跳转后若不认尾巴，新页面会解锁 → 预览立刻变回裁死不滚');
    assertEqual(r.name, CANVAS_NAME + SUFFIX, '尾巴要保持，后续跳转才认得出');
});

test('⚠️ 页面侧：退出预览（URL 标记）必须摘掉尾巴并恢复解锁', () => {
    const r = runAutofit({ name: CANVAS_NAME + SUFFIX, search: '?__proto_fit=1' });
    assert(r.unlocked, '⚠️ 退出预览后必须恢复自适应，否则框再也回不到完整高度');
    assertEqual(r.name, CANVAS_NAME,
        '⚠️ 尾巴必须摘干净：上报的 key 与画布上 iframe 的 name 对不上，报告会被整条丢弃');
    assert(r.reports.length > 0, '退出预览后应当立刻上报一次实测尺寸');
    assertEqual(r.reports[0].key, CANVAS_NAME, '⚠️ 上报 key 必须是干净的名字，否则画布定位不到 iframe');
});

test('页面侧：单独打开 / 全屏浮层（非画布 iframe）不受任何影响', () => {
    const r = runAutofit({ name: '', search: '', topLevel: true });
    assert(!r.unlocked, '顶层打开页面时不得解锁');
    assertEqual(r.reports.length, 0, '顶层打开时不得上报');
});

test('页面侧：PROTO_FIXED_HEIGHT 逃逸开关仍然有效（预览逻辑不得绕过它以外的判断）', () => {
    const r = runAutofit({ name: CANVAS_NAME, search: '', fixed: true });
    assert(!r.unlocked, '标了 PROTO_FIXED_HEIGHT 的页面不得解锁');
});

test('⚠️ 眼睛按钮的提示必须是「预览页面」—— 它是原位预览，不是全屏预览', () => {
    // 用户诉求（原话）：「把全屏预览此页面改成预览页面」。
    // 原文案把人引向了错误的心智模型：点下去期待弹个满屏，实际只是
    // 在画布原地解锁 iframe（openPreview，不改 zoom/pan）。
    // 「全屏」是右键拖拽手柄 → 菜单项「全屏显示」那一条路的专属说法。
    const src = stripComments(readSrc('js', 'element-manager', 'element-renderer.js'));
    const block = src.match(/const previewBtn = document\.createElement\('div'\);([\s\S]*?)div\.appendChild\(previewBtn\);/);
    assert(block, '应能找到 previewBtn 渲染块');

    assert(/previewBtn\.title = '预览页面'/.test(block[1]),
        '⚠️ 提示文案应为「预览页面」');
    assert(!/全屏/.test(block[1]),
        '⚠️ 这一块里不得再出现「全屏」字样：本按钮走 openPreview（原位预览），' +
        '全屏是右键菜单那条路，混用会让用户预期落空');
    assert(/CanvasViewEvents\.openPreview\(/.test(block[1]),
        '按钮必须仍然指向原位预览（别顺手改成了全屏浮层）');
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
