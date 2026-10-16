/**
 * 智能连接线 · 锚点系统单元测试
 *
 * 用法：
 *   node tools/test-anchor.js
 *   node tools/test-anchor.js --verbose
 *
 * 被测对象：
 *   js/connectors/anchor-provider.js  （锚点枚举 + 描述符↔坐标）
 *   js/connectors/connector-router.js （锚点出边约束下的路由）
 *
 * 做法同 tools/test-connector.js：vm 沙箱加载真实源码，不 mock 被测代码。
 *
 * 覆盖分组：
 *   1. 描述符 → 坐标：四条边 × 三个采样点，外移量正确
 *   2. 归一化：t 越界夹取、非法描述符拒绝（旧数据兼容的关键）
 *   3. 枚举：数量、顺序、确定性
 *   4. 最小尺寸：过小的宿主不产生锚点（防重叠成团）
 *   5. 锚点跟随：元素移动/缩放后，同描述符解析出不同坐标
 *   6. 稳定标识：anchorKey 不含坐标，元素移动后不变
 *   7. 法线方向：出边法线指向元素外侧
 *   8. 与路由协作：从指定锚点出边的路径，首段方向与法线一致
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.ANCHOR_TEST_ROOT
    ? path.resolve(process.env.ANCHOR_TEST_ROOT)
    : path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

if (process.env.ANCHOR_TEST_ROOT) {
    console.log(`\x1b[33m> 使用替代代码树: ${ROOT}\x1b[0m`);
}

// ---------------------------------------------------------------- 测试框架
// （结构照抄 tools/test-persistence.js / test-connector.js，保持全仓风格一致）

const queue = [];
let currentSuite = '';
let passed = 0;
let failed = 0;
const failures = [];

function suite(name) { currentSuite = name; }

function test(name, fn) {
    queue.push({ suite: currentSuite, name, fn });
}

const CASE_TIMEOUT_MS = Number(process.env.ANCHOR_TEST_CASE_TIMEOUT || 5000);

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

function assertClose(actual, expected, tol, message) {
    if (!(Math.abs(actual - expected) <= tol)) {
        throw new Error(`${message}\n      期望: ${expected} ±${tol}\n      实际: ${actual}`);
    }
}

// ---------------------------------------------------------------- 沙箱加载真实源码

function loadSources() {
    const sandbox = {
        console,
        Math, JSON, Number, Array, Object, String, Boolean, isNaN, isFinite,
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    const ctx = vm.createContext(sandbox);

    for (const rel of [
        ['js', 'connectors', 'anchor-provider.js'],
        ['js', 'connectors', 'connector-router.js'],
        ['js', 'connectors', 'anchor-bridge.js'],
    ]) {
        const file = path.join(ROOT, ...rel);
        vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
    }

    return {
        Anchor: vm.runInContext('AnchorProvider', ctx),
        Router: vm.runInContext('ConnectorRouter', ctx),
        Bridge: vm.runInContext('AnchorBridge', ctx),
    };
}

const { Anchor, Router, Bridge } = loadSources();
if (!Anchor) {
    console.error('\x1b[31m✗ 无法从沙箱取到 AnchorProvider，anchor-provider.js 未正确导出\x1b[0m');
    process.exit(1);
}
if (!Router) {
    console.error('\x1b[31m✗ 无法从沙箱取到 ConnectorRouter\x1b[0m');
    process.exit(1);
}

const R = (x, y, w, h) => ({ x, y, width: w, height: h });

// ================================================================ 1. 描述符 → 坐标

suite('1. 描述符 → 坐标');

test('四条边的中点在正确的边界上', () => {
    const r = R(100, 200, 400, 300);   // 中心 (300, 350)
    assertEqual(Anchor.pointInRect(r, 'left', 0.5), { x: 100, y: 350 }, '左边中点');
    assertEqual(Anchor.pointInRect(r, 'right', 0.5), { x: 500, y: 350 }, '右边中点');
    assertEqual(Anchor.pointInRect(r, 'top', 0.5), { x: 300, y: 200 }, '上边中点');
    assertEqual(Anchor.pointInRect(r, 'bottom', 0.5), { x: 300, y: 500 }, '下边中点');
});

test('竖直边按高度取样，水平边按宽度取样', () => {
    const r = R(0, 0, 400, 300);
    // 竖直边 t=0.25 → y = 300 * 0.25 = 75
    assertEqual(Anchor.pointInRect(r, 'left', 0.25), { x: 0, y: 75 }, '左边 t=0.25');
    // 水平边 t=0.25 → x = 400 * 0.25 = 100
    assertEqual(Anchor.pointInRect(r, 'top', 0.25), { x: 100, y: 0 }, '上边 t=0.25');
});

test('外移：锚点圆心落在边界外侧 OFFSET 处', () => {
    const r = R(100, 200, 400, 300);
    const off = Anchor.OFFSET;
    assertEqual(Anchor.resolvePoint(r, { side: 'left', t: 0.5 }),
        { x: 100 - off, y: 350 }, '左边锚点应在边框左侧外');
    assertEqual(Anchor.resolvePoint(r, { side: 'right', t: 0.5 }),
        { x: 500 + off, y: 350 }, '右边锚点应在边框右侧外');
    assertEqual(Anchor.resolvePoint(r, { side: 'top', t: 0.5 }),
        { x: 300, y: 200 - off }, '上边锚点应在边框上侧外');
    assertEqual(Anchor.resolvePoint(r, { side: 'bottom', t: 0.5 }),
        { x: 300, y: 500 + off }, '下边锚点应在边框下侧外');
});

test('外移距离可被描述符覆盖（anchor.offset）', () => {
    const r = R(0, 0, 100, 100);
    const p = Anchor.resolvePoint(r, { side: 'left', t: 0.5, offset: 20 });
    assertEqual(p, { x: -20, y: 50 }, '自定义外移量应生效');
});

test('未知 side 返回 null，不抛异常', () => {
    const r = R(0, 0, 100, 100);
    assertEqual(Anchor.pointInRect(r, 'diagonal', 0.5), null, '未知边应返回 null');
    assertEqual(Anchor.resolvePoint(r, { side: 'diagonal', t: 0.5 }), null, '未知边解析应返回 null');
});

// ================================================================ 2. 归一化

suite('2. 描述符归一化（旧数据兼容入口）');

test('t 越界被夹到 [0,1]', () => {
    assertClose(Anchor.normalizeAnchor({ side: 'left', t: -3 }).t, 0, 1e-9, 't=-3 应夹到 0');
    assertClose(Anchor.normalizeAnchor({ side: 'left', t: 7 }).t, 1, 1e-9, 't=7 应夹到 1');
});

test('非法描述符一律返回 null', () => {
    for (const bad of [null, undefined, 0, '', 'left', [], {}, { side: 'left' },
                       { t: 0.5 }, { side: 'x', t: 0.5 }, { side: 'left', t: NaN },
                       { side: 'left', t: 'abc' }]) {
        assertEqual(Anchor.normalizeAnchor(bad), null,
            `非法描述符应被拒: ${JSON.stringify(bad)}`);
    }
});

test('合法描述符保留 side 与 t', () => {
    assertEqual(Anchor.normalizeAnchor({ side: 'bottom', t: 0.25 }),
        { side: 'bottom', t: 0.25 }, '合法描述符应原样返回');
});

test('归一化结果可直接喂给 resolvePoint', () => {
    const r = R(0, 0, 200, 100);
    const a = Anchor.normalizeAnchor({ side: 'right', t: 0.5 });
    assertEqual(Anchor.resolvePoint(r, a), { x: 200 + Anchor.OFFSET, y: 50 }, '归一化后应能解析');
});

// ================================================================ 3. 枚举

suite('3. 锚点枚举');

test('尺寸充足的矩形产生 12 个锚点（四边 × 3 采样）', () => {
    const list = Anchor.anchorsOfRect(R(0, 0, 200, 120));
    // 200 宽 / 120 高 → 水平边沿 200 取样 (200/4=50 ≥ 16)，竖直边沿 120 取样 (120/4=30 ≥ 16)
    // 四边都用 3 采样 → 12 个
    assertEqual(list.length, 12, '应为 4 边 × 3 采样 = 12 个锚点');
});

test('边太短时降级为单中点（这是让锚点不重叠成团的关键）', () => {
    // 边长 48 → 48/4 = 12 < MIN_ANCHOR_SPACING(16) → 该边只留中点
    const list = Anchor.anchorsOfRect(R(0, 0, 48, 48));
    assertEqual(list.length, 4, '短边应降级为每边 1 个锚点（共 4 个）');
    for (const a of list) {
        assertClose(a.t, 0.5, 1e-9, '降级后只应保留中点');
    }
});

test('降级阈值：刚好达到 4×MIN_ANCHOR_SPACING 时用 3 采样', () => {
    const exact = Anchor.MIN_ANCHOR_SPACING * 4;
    const list = Anchor.anchorsOfRect(R(0, 0, exact, exact));
    assertEqual(list.length, 12, `边长 ${exact} 应刚好够放 3 采样`);

    const justBelow = exact - 1;
    const list2 = Anchor.anchorsOfRect(R(0, 0, justBelow, justBelow));
    assertEqual(list2.length, 4, `边长 ${justBelow} 应降级为单中点`);
});

test('浏览器实测场景：375×812 页面框仍是 12 个锚点（不因降级而变少）', () => {
    const list = Anchor.anchorsOfRect(R(0, 0, 375, 812));
    assertEqual(list.length, 12, '真实页面尺寸应保持 12 个锚点，与 MasterGo 观感一致');
});

test('coarse 密度：每边只留中点（内部目标用）', () => {
    const list = Anchor.anchorsOfRect(R(0, 0, 375, 812), { density: 'coarse' });
    assertEqual(list.length, 4, 'coarse 应为每边 1 个，共 4 个');
    for (const a of list) {
        assertClose(a.t, 0.5, 1e-9, 'coarse 只保留中点');
    }
});

test('内部宿主用 coarse 后，一次 hover 的锚点总量可控（实测 300 → 约 40）', () => {
    // 模拟浏览器实测场景：1 个页面框 + 6 个内部目标
    const page = R(0, 0, 375, 812);
    const total = Anchor.anchorsOfRect(page).length
        + 6 * Anchor.anchorsOfRect(R(0, 0, 300, 120), { density: 'coarse' }).length;
    // 12（页面框）+ 6×4（内部）= 36，与 MasterGo 实测的十来个量级一致
    assertEqual(total, 36, '锚点总量应与 MasterGo 观感同量级');
    assert(total < 50, `锚点总量 ${total} 过多，用户会点不准`);
});

test('枚举顺序确定：left → right → top → bottom', () => {
    const list = Anchor.anchorsOfRect(R(0, 0, 200, 120));
    assertEqual(list.slice(0, 3).map(a => a.side), ['left', 'left', 'left'], '前 3 个应是 left');
    assertEqual(list.slice(3, 6).map(a => a.side), ['right', 'right', 'right'], '接着 3 个应是 right');
    assertEqual(list.slice(6, 9).map(a => a.side), ['top', 'top', 'top'], '接着 3 个应是 top');
    assertEqual(list.slice(9, 12).map(a => a.side), ['bottom', 'bottom', 'bottom'], '最后 3 个应是 bottom');
});

test('采样位置是 0.25 / 0.5 / 0.75，不含角点 0 与 1', () => {
    const list = Anchor.anchorsOfRect(R(0, 0, 200, 120));
    const ts = list.filter(a => a.side === 'left').map(a => a.t);
    assertEqual(ts, [0.25, 0.5, 0.75], '采样点');
    for (const a of list) {
        assert(a.t > 0 && a.t < 1, `锚点不应落在角点上，实际 t=${a.t}`);
    }
});

test('枚举是纯函数：同输入两次结果完全一致', () => {
    const r = R(10, 20, 300, 200);
    assertEqual(Anchor.anchorsOfRect(r), Anchor.anchorsOfRect(r), '两次枚举应一致');
});

test('非法矩形返回空数组，不抛异常', () => {
    for (const bad of [null, undefined, {}, R(0, 0, NaN, 10)]) {
        assertEqual(Anchor.anchorsOfRect(bad), [], `非法矩形应返回空: ${JSON.stringify(bad)}`);
    }
});

// ================================================================ 4. 最小尺寸（防重叠成团）

suite('4. 最小尺寸阈值');

test('小于 MIN_HOST_SIZE 的宿主不产生锚点', () => {
    const small = Anchor.MIN_HOST_SIZE - 1;
    assertEqual(Anchor.anchorsOfRect(R(0, 0, small, small)), [],
        '过小的宿主不应产生锚点（否则嵌套深的页面会锚点重叠成团）');
});

test('恰好等于 MIN_HOST_SIZE 时产生锚点', () => {
    const s = Anchor.MIN_HOST_SIZE;
    const list = Anchor.anchorsOfRect(R(0, 0, s, s));
    assert(list.length > 0, '恰好达阈值应产生锚点');
});

test('宽度不足但高度充足时，水平边不产生锚点', () => {
    const list = Anchor.anchorsOfRect(R(0, 0, 5, 200));
    assertEqual(list.filter(a => a.side === 'top').length, 0, '窄矩形上边不应有锚点');
    assertEqual(list.filter(a => a.side === 'bottom').length, 0, '窄矩形下边不应有锚点');
    // 竖直边按高度取样，高度 200 足够 → 每边 3 个
    assertEqual(list.filter(a => a.side === 'left').length, 3, '窄矩形左边仍应有 3 个锚点');
});

test('锚点间距不足时不会互相压住（可点击性约束）', () => {
    // 任意同边相邻锚点的间距必须 ≥ MIN_ANCHOR_SPACING，
    // 否则锚点（直径约 10px）会互相覆盖，用户点不准。
    for (const [w, h] of [[375, 812], [200, 120], [48, 48], [100, 30], [30, 100], [64, 64]]) {
        const r = R(0, 0, w, h);
        const list = Anchor.anchorsOfRect(r);
        const bySide = {};
        for (const a of list) (bySide[a.side] = bySide[a.side] || []).push(a.t);
        for (const side of Object.keys(bySide)) {
            const ts = bySide[side].sort((x, y) => x - y);
            const along = (side === 'left' || side === 'right') ? h : w;
            for (let i = 1; i < ts.length; i++) {
                const gap = (ts[i] - ts[i - 1]) * along;
                assert(gap >= Anchor.MIN_ANCHOR_SPACING,
                    `${w}×${h} 的 ${side} 边锚点间距 ${gap.toFixed(1)}px < ${Anchor.MIN_ANCHOR_SPACING}px，会互相压住`);
            }
        }
    }
});

// ================================================================ 5. 锚点跟随

suite('5. 锚点跟随元素（MasterGo「自动跟随」的核心）');

test('元素平移后，同一描述符解析出平移后的坐标', () => {
    const a = { side: 'right', t: 0.5 };
    const p1 = Anchor.resolvePoint(R(0, 0, 100, 100), a);
    const p2 = Anchor.resolvePoint(R(50, 30, 100, 100), a);
    assertClose(p2.x - p1.x, 50, 1e-9, 'x 应跟随平移 50');
    assertClose(p2.y - p1.y, 30, 1e-9, 'y 应跟随平移 30');
});

test('元素缩放后，锚点按新尺寸重算（t 是归一化位置）', () => {
    const a = { side: 'left', t: 0.5 };
    const p1 = Anchor.resolvePoint(R(0, 0, 100, 100), a);
    const p2 = Anchor.resolvePoint(R(0, 0, 100, 400), a);
    assertClose(p1.y, 50, 1e-9, '原始中点 y=50');
    assertClose(p2.y, 200, 1e-9, '高度翻 4 倍后中点 y=200');
});

test('描述符本身不含任何像素坐标（所以不需要迁移已存数据）', () => {
    const list = Anchor.anchorsOfRect(R(123, 456, 789, 321));
    for (const a of list) {
        const keys = Object.keys(a).sort();
        assertEqual(keys, ['side', 't'],
            `锚点描述符只应含 side/t，实际含 ${keys.join(',')}`);
    }
});

// ================================================================ 6. 稳定标识

suite('6. 锚点稳定标识');

test('anchorKey 不含坐标，元素移动后不变', () => {
    const a = { side: 'bottom', t: 0.25 };
    const k1 = Anchor.anchorKey(a);
    const k2 = Anchor.anchorKey({ side: 'bottom', t: 0.25 });
    assertEqual(k1, k2, '相同描述符的 key 应一致');
});

test('不同 side 或不同 t 的 key 不冲突', () => {
    const keys = new Set();
    for (const side of Anchor.SIDES) {
        for (const t of Anchor.SIDE_SAMPLES) {
            keys.add(Anchor.anchorKey({ side, t }));
        }
    }
    assertEqual(keys.size, 12, '12 个锚点的 key 应互不相同');
});

// ================================================================ 7. 法线

suite('7. 出边法线方向');

test('四条边的法线指向元素外侧', () => {
    assertEqual(Anchor.normalOf('left'), { x: -1, y: 0 }, 'left → 向左');
    assertEqual(Anchor.normalOf('right'), { x: 1, y: 0 }, 'right → 向右');
    assertEqual(Anchor.normalOf('top'), { x: 0, y: -1 }, 'top → 向上');
    assertEqual(Anchor.normalOf('bottom'), { x: 0, y: 1 }, 'bottom → 向下');
});

test('锚点圆心确实在边界沿法线方向外侧', () => {
    const r = R(100, 100, 200, 200);
    const c = { x: 200, y: 200 };
    for (const side of Anchor.SIDES) {
        const base = Anchor.pointInRect(r, side, 0.5);
        const p = Anchor.resolvePoint(r, { side, t: 0.5 });
        const n = Anchor.normalOf(side);
        // 从边界点沿法线走 OFFSET 应正好到锚点
        assertClose(p.x, base.x + n.x * Anchor.OFFSET, 1e-9, `${side} 锚点 x 应在法线外侧`);
        assertClose(p.y, base.y + n.y * Anchor.OFFSET, 1e-9, `${side} 锚点 y 应在法线外侧`);
        // 锚点应比边界点离中心更远
        const dBase = Math.hypot(base.x - c.x, base.y - c.y);
        const dAnchor = Math.hypot(p.x - c.x, p.y - c.y);
        assert(dAnchor > dBase, `${side} 锚点应比边界点更远离中心`);
    }
});

// ================================================================ 8. 与路由协作

suite('8. 锚点约束下的路由');

test('从指定锚点出边时，路径首段方向与该边法线一致', () => {
    const a = R(0, 0, 200, 200);
    const b = R(600, 400, 200, 200);
    for (const side of Anchor.SIDES) {
        const anchor = { side, t: 0.5 };
        const start = Anchor.resolvePoint(a, anchor);
        const pts = Router.routeFromAnchor(a, b, anchor, null);
        assert(Array.isArray(pts) && pts.length >= 2, `${side}: 应能算出路径`);
        const second = pts[1];
        const n = Anchor.normalOf(side);
        const dx = second.x - start.x;
        const dy = second.y - start.y;
        // 首段必须沿法线方向前进（正交路径，所以只能是 ±x 或 ±y 之一）
        const along = dx * n.x + dy * n.y;
        assert(along > 0,
            `${side}: 首段应向法线方向前进，法线=(${n.x},${n.y})，实际位移=(${dx},${dy})`);
    }
});

test('两端都指定锚点时，路径首尾分别贴合各自锚点', () => {
    const a = R(0, 0, 200, 200);
    const b = R(600, 400, 200, 200);
    const fromAnchor = { side: 'right', t: 0.5 };
    const toAnchor = { side: 'left', t: 0.5 };
    const pts = Router.routeFromAnchor(a, b, fromAnchor, toAnchor);
    const start = Anchor.resolvePoint(a, fromAnchor);
    const end = Anchor.resolvePoint(b, toAnchor);
    assertClose(pts[0].x, start.x, 1e-6, '首点 x 应等于起点锚点');
    assertClose(pts[0].y, start.y, 1e-6, '首点 y 应等于起点锚点');
    assertClose(pts[pts.length - 1].x, end.x, 1e-6, '末点 x 应等于终点锚点');
    assertClose(pts[pts.length - 1].y, end.y, 1e-6, '末点 y 应等于终点锚点');
});

test('只指定起点锚点（终点自由）时仍能算出合法正交路径', () => {
    const a = R(0, 0, 200, 200);
    const b = R(600, 400, 200, 200);
    const pts = Router.routeFromAnchor(a, b, { side: 'bottom', t: 0.5 }, null);
    assert(pts.length >= 2, '应能算出路径');
    for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i];
        assert(p.x === q.x || p.y === q.y,
            `第 ${i - 1}→${i} 段应正交，实际 (${p.x},${p.y})→(${q.x},${q.y})`);
    }
    for (const p of pts) {
        assert(Number.isFinite(p.x) && Number.isFinite(p.y), '路径不应含 NaN');
    }
});

test('锚点为 null 时 routeFromAnchor 退化为普通 route（旧数据兼容）', () => {
    const a = R(0, 0, 200, 200);
    const b = R(600, 400, 200, 200);
    const withNull = Router.routeFromAnchor(a, b, null, null);
    const plain = Router.route(a, b);
    assertEqual(withNull, plain, '两端锚点均为 null 时应与普通路由一致');
});

// ================================================================ 9. 跨模块常量一致性

suite('9. 跨模块常量一致性');

test('AnchorProvider.OFFSET 与 ConnectorRouter.ANCHOR_OFFSET 必须相同', () => {
    assertEqual(Router.ANCHOR_OFFSET, Anchor.OFFSET,
        '锚点外移量在两个模块各存一份，必须一致：\n' +
        '      不一致会导致「锚点画在这里」而「线从那里出发」，看起来像没连上');
});

test('两侧对同一描述符解析出相同坐标（真正的行为一致性）', () => {
    const r = R(37, 53, 211, 149);
    for (const side of Anchor.SIDES) {
        for (const t of Anchor.SIDE_SAMPLES) {
            const viaProvider = Anchor.resolvePoint(r, { side, t });
            const viaRouter = Router._anchorPoint(r, { side, t });
            assertEqual(viaRouter, viaProvider,
                `${side} t=${t}: 两个模块解析出的锚点坐标必须一致`);
        }
    }
});

test('两侧对非法描述符都返回 null，不会一个崩一个不崩', () => {
    const r = R(0, 0, 100, 100);
    for (const bad of [{ side: 'diagonal', t: 0.5 }, null, undefined]) {
        assertEqual(Anchor.resolvePoint(r, bad), null, `provider 应拒 ${JSON.stringify(bad)}`);
        assertEqual(Router._anchorPoint(r, bad), null, `router 应拒 ${JSON.stringify(bad)}`);
    }
});

// ================================================================ 10. 圆角与 MasterGo 对齐

suite('10. 圆角对齐');

test('默认圆角为 16（实测 MasterGo 连接线的圆角值）', () => {
    assertEqual(Router.DEFAULT_RADIUS, 16,
        'MasterGo 连接线属性面板显示圆角 16，应与之对齐');
});

test('圆角 16 下生成的 path 合法且不含 NaN', () => {
    const a = R(0, 0, 200, 200);
    const b = R(600, 400, 200, 200);
    const pts = Router.routeFromAnchor(a, b, { side: 'right', t: 0.5 }, { side: 'left', t: 0.5 });
    const d = Router.toRoundedPath(pts, Router.DEFAULT_RADIUS);
    assert(typeof d === 'string' && d.length > 0, 'path d 不应为空');
    assert(!/NaN|Infinity|undefined/.test(d), `path d 不应含非法值: ${d}`);
    assert(d.startsWith('M '), 'path 应以 M 开头');
});

// ================================================================ 11. iframe 桥 · 坐标换算

suite('11. iframe 桥 · 坐标换算');

const PAGE = { id: 'p1', position: { x: 1000, y: 500 }, width: 375, height: 812 };

test('内部 rect → 画布坐标：加上页面元素位置与 iframe 下沉量', () => {
    const r = Bridge.toCanvasRect({ left: 20, top: 40, width: 100, height: 50 }, PAGE);
    assertEqual(r, {
        x: 1000 + 20,
        y: 500 + Bridge.IFRAME_TOP_OFFSET + 40,
        width: 100,
        height: 50,
    }, '画布坐标应含页面元素偏移与 iframe 顶部下沉');
});

test('IFRAME_TOP_OFFSET 必须与 element-renderer 的 marginTop 一致（30）', () => {
    assertEqual(Bridge.IFRAME_TOP_OFFSET, 30,
        'element-renderer.js 给 iframe 设了 marginTop:30px 且 clickOverlay 的 top 也是 30px，\n' +
        '      三者必须一致，否则 iframe 内锚点会整体错位 30px');
});

test('内部 rect 已含滚动量，不再二次减 scrollTop', () => {
    // 内部元素滚到视口外（top 为负）时应如实反映为负偏移
    const r = Bridge.toCanvasRect({ left: 0, top: -120, width: 80, height: 40 }, PAGE);
    assertEqual(r.y, 500 + Bridge.IFRAME_TOP_OFFSET - 120, '负 top 应如实换算');
});

test('非法入参返回 null，不产生 NaN 坐标', () => {
    for (const bad of [
        [null, PAGE],
        [{ left: 0, top: 0, width: 10, height: 10 }, null],
        [{ left: NaN, top: 0, width: 10, height: 10 }, PAGE],
        [{ left: 0, top: 0, width: 10, height: 10 }, { position: { x: 1, y: NaN } }],
    ]) {
        assertEqual(Bridge.toCanvasRect(bad[0], bad[1]), null,
            `非法入参应返回 null: ${JSON.stringify(bad)}`);
    }
});

// ================================================================ 12. iframe 桥 · 选择器

suite('12. iframe 桥 · CSS 选择器生成');

/** 造一个假节点（鸭子类型：tagName/id/parentElement/children） */
function fakeEl(tagName, opts = {}) {
    const el = {
        tagName: tagName.toUpperCase(),
        id: opts.id || '',
        children: [],
        parentElement: null,
    };
    for (const c of (opts.children || [])) {
        c.parentElement = el;
        el.children.push(c);
    }
    return el;
}

test('有 id 时直接用 #id，不再往上拼', () => {
    const root = fakeEl('body', { children: [fakeEl('div', { id: 'app' })] });
    assertEqual(Bridge.cssPath(root.children[0]), '#app', '应优先用 id');
});

test('无 id 时从 body 起逐级拼（比省略 body 更不易选错）', () => {
    const inner = fakeEl('span');
    const outer = fakeEl('div', { children: [inner] });
    const root = fakeEl('body', { children: [outer] });
    // 保留 body 前缀：同一段选择器在别的容器里重用时仍能唯一定位，
    // 去掉它反而容易选中同结构的其它元素。
    assertEqual(Bridge.cssPath(inner), 'body > div > span', '应逐级拼接并保留 body');
});

test('同标签兄弟自动加 nth-of-type，避免选错元素', () => {
    const a = fakeEl('li');
    const b = fakeEl('li');
    const list = fakeEl('ul', { children: [a, b] });
    const root = fakeEl('body', { children: [list] });
    // 两个 li 都有歧义 → 都加序号。
    // 只给第二个加会让选择器风格不一致，且第一个在别处复用时可能选错。
    assertEqual(Bridge.cssPath(b), 'body > ul > li:nth-of-type(2)', '第二个 li 应带序号');
    assertEqual(Bridge.cssPath(a), 'body > ul > li:nth-of-type(1)', '第一个 li 同样有歧义，也应带序号');
});

test('同标签兄弟唯一时不加序号（选择器保持简洁）', () => {
    const only = fakeEl('li');
    const list = fakeEl('ul', { children: [only] });
    const root = fakeEl('body', { children: [list] });
    assertEqual(Bridge.cssPath(only), 'body > ul > li', '唯一子元素无需序号');
});

test('遇到 html 就停止，不无限上溯', () => {
    const leaf = fakeEl('p');
    const html = fakeEl('html', { children: [fakeEl('body', { children: [leaf] })] });
    const p = Bridge.cssPath(leaf);
    assert(!p.includes('html'), `选择器不应包含 html: ${p}`);
    assertEqual(p, 'body > p', '应从 body 开始');
});

test('畸形节点返回空串，不抛异常', () => {
    assertEqual(Bridge.cssPath(null), '', 'null 应返回空串');
    assertEqual(Bridge.cssPath({}), '', '无 tagName 应返回空串');
});

// ================================================================ 13. iframe 桥 · 宿主收集

suite('13. iframe 桥 · 内部宿主收集');

/** 造一个带 getRect 的假节点树 */
function tree(spec) {
    // spec: { tag, id, rect:[l,t,w,h], children:[...] }
    const el = {
        tagName: spec.tag.toUpperCase(),
        id: spec.id || '',
        children: [],
        parentElement: null,
        getBoundingClientRect: () => {
            const r = spec.rect || [0, 0, 0, 0];
            return { left: r[0], top: r[1], width: r[2], height: r[3] };
        },
    };
    for (const c of (spec.children || [])) {
        const child = tree(c);
        child.parentElement = el;
        el.children.push(child);
    }
    return el;
}

test('递归收集：孙元素也被收集到（对应 MasterGo 的不限深度递归）', () => {
    const root = tree({
        tag: 'body', children: [{
            tag: 'div', id: 'outer', rect: [0, 0, 300, 300], children: [{
                tag: 'div', id: 'inner', rect: [10, 10, 100, 100], children: [{
                    tag: 'button', id: 'deep', rect: [20, 20, 60, 30],
                }],
            }],
        }],
    });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE });
    const ids = hosts.map(h => h.selector).sort();
    assertEqual(ids, ['#deep', '#inner', '#outer'], '三层都应被收集');
});

test('尺寸不足的元素被跳过（防锚点重叠成团的第一道闸）', () => {
    const root = tree({
        tag: 'body', children: [
            { tag: 'div', id: 'big', rect: [0, 0, 200, 200] },
            { tag: 'i', id: 'icon', rect: [0, 0, 8, 8] },
        ],
    });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE });
    assertEqual(hosts.map(h => h.selector), ['#big'], '8×8 的图标应被跳过');
});

test('数量上限：按面积从大到小截断（防重叠成团的第二道闸）', () => {
    const children = [];
    for (let i = 0; i < 40; i++) {
        children.push({ tag: 'div', id: `d${i}`, rect: [0, 0, 20 + i, 20 + i] });
    }
    const root = tree({ tag: 'body', children });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE, maxHosts: 5 });
    assertEqual(hosts.length, 5, '应被截断到 5 个');
    // 面积最大的 d39 应排第一
    assertEqual(hosts[0].selector, '#d39', '面积最大的应优先保留');
});

test('结构性标签被跳过（html/head/script 等不是连接目标）', () => {
    const root = tree({
        tag: 'body', children: [
            { tag: 'script', id: 's', rect: [0, 0, 100, 100] },
            { tag: 'style', id: 'st', rect: [0, 0, 100, 100] },
            { tag: 'div', id: 'real', rect: [0, 0, 100, 100] },
        ],
    });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE });
    assertEqual(hosts.map(h => h.selector), ['#real'], 'script/style 应被跳过');
});

test('收集结果的 rect 是画布坐标（已换算）', () => {
    const root = tree({ tag: 'body', children: [{ tag: 'div', id: 'x', rect: [5, 6, 50, 40] }] });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE });
    assertEqual(hosts[0].rect, {
        x: 1000 + 5,
        y: 500 + Bridge.IFRAME_TOP_OFFSET + 6,
        width: 50,
        height: 40,
    }, '应已换算为画布坐标');
});

test('每个宿主都带 depth，便于调试与裁剪', () => {
    const root = tree({
        tag: 'body', children: [{
            tag: 'div', id: 'a', rect: [0, 0, 200, 200],
            children: [{ tag: 'div', id: 'b', rect: [0, 0, 100, 100] }],
        }],
    });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE });
    const byId = Object.fromEntries(hosts.map(h => [h.selector, h.depth]));
    assertEqual(byId['#a'], 1, '第一层 depth=1');
    assertEqual(byId['#b'], 2, '第二层 depth=2');
});

// ================================================================ 14. iframe 桥 · 上报数据校验

suite('14. iframe 桥 · 上报数据校验（不可信输入）');

test('非法上报项被逐项丢弃，合法项保留', () => {
    const reported = [
        { selector: '#ok', rect: { left: 1, top: 2, width: 50, height: 50 } },
        { selector: '', rect: { left: 1, top: 2, width: 50, height: 50 } },
        { selector: '#nan', rect: { left: NaN, top: 2, width: 50, height: 50 } },
        { selector: '#tiny', rect: { left: 1, top: 2, width: 3, height: 3 } },
        { selector: '#norect' },
        null,
        'garbage',
    ];
    const out = Bridge._normalizeReported(reported, PAGE);
    assertEqual(out.map(h => h.selector), ['#ok'], '只有合法项应存活');
});

test('上报项会被换算为画布坐标并按面积降序', () => {
    const reported = [
        { selector: '#small', rect: { left: 0, top: 0, width: 20, height: 20 } },
        { selector: '#large', rect: { left: 0, top: 0, width: 200, height: 200 } },
    ];
    const out = Bridge._normalizeReported(reported, PAGE);
    assertEqual(out.map(h => h.selector), ['#large', '#small'], '应按面积降序');
    assertEqual(out[0].rect.x, 1000, '应换算为画布坐标');
});

test('非数组输入返回空数组，不抛异常', () => {
    for (const bad of [null, undefined, 'x', 42, {}]) {
        assertEqual(Bridge._normalizeReported(bad, PAGE), [], `应返回空: ${JSON.stringify(bad)}`);
    }
});

test('上报项数量超限时被截断', () => {
    const reported = [];
    for (let i = 0; i < 100; i++) {
        reported.push({ selector: `#e${i}`, rect: { left: 0, top: 0, width: 20 + i, height: 20 + i } });
    }
    const out = Bridge._normalizeReported(reported, PAGE);
    assertEqual(out.length, Bridge.MAX_INNER_HOSTS, '应被截断到上限');
});

test('上报项的尺寸阈值独立生效（不依赖下游再校验一次）', () => {
    // 这条用例锁的是 _normalizeReported 里的 MIN_HOST_SIZE 判据本身。
    // 上游（页面脚本）可能因为版本不一致漏掉阈值，下游必须自己再挡一道。
    const reported = [
        { selector: '#ok', rect: { left: 0, top: 0, width: 100, height: 100 } },
        { selector: '#tiny', rect: { left: 0, top: 0, width: Bridge.MIN_HOST_SIZE - 1, height: 100 } },
    ];
    const out = Bridge._normalizeReported(reported, PAGE);
    assertEqual(out.map(h => h.selector), ['#ok'],
        '宽度低于阈值的上报项应被丢弃');
});

// ================================================================ 14b. 重叠元素下的锚点

suite('14b. 重叠元素下的锚点（锚点不得被偷偷换边）');

test('锚点落进对方矩形时，只沿本边滑动，绝不换边', () => {
    // 场景：A 与 B 重叠，A 的右中点锚点正好落在 B 内部。
    // 正确行为：沿 A 的右边滑动到脱离 B 的位置 —— **边不变**。
    // 错误行为（projectToBoundary 那套）：挪到 A 的最近边，
    // 于是用户明明连的是"右边"，线却从"下边"出发了。
    const a = R(0, 0, 200, 200);
    const b = R(100, 100, 200, 200);   // 与 A 右下角重叠
    const anchor = { side: 'right', t: 0.5 };
    const pts = Router.routeFromAnchor(a, b, anchor, null);
    assert(Array.isArray(pts) && pts.length >= 2, '应能算出路径');

    const start = pts[0];
    const raw = Router._anchorPoint(a, anchor);
    // 起点必须仍在 A 的右边（x 不变），只在 y 上滑动
    assertClose(start.x, raw.x, 1e-6,
        `起点 x 必须保持在 A 的右边（x=${raw.x}），实际 ${start.x} —— 换边说明锚点被偷改了`);
});

test('锚点未被遮挡时严格保持原位置（不做任何滑动）', () => {
    const a = R(0, 0, 200, 200);
    const b = R(600, 0, 200, 200);   // 远离 A，不重叠
    const anchor = { side: 'right', t: 0.25 };
    const pts = Router.routeFromAnchor(a, b, anchor, null);
    const expect = Router._anchorPoint(a, anchor);
    assertClose(pts[0].x, expect.x, 1e-6, '未遮挡时起点 x 应精确等于锚点');
    assertClose(pts[0].y, expect.y, 1e-6, '未遮挡时起点 y 应精确等于锚点');
});

// ================================================================ 15. 消息协议常量

suite('15. 消息协议');

test('请求/响应消息类型不同，避免自问自答', () => {
    assert(Bridge.MSG_REQUEST !== Bridge.MSG_RESPONSE, '请求与响应类型必须不同');
});

test('消息类型带命名空间前缀，不与既有协议冲突', () => {
    for (const t of [Bridge.MSG_REQUEST, Bridge.MSG_RESPONSE]) {
        assert(t.startsWith('connector-anchor-'), `消息类型应带前缀: ${t}`);
    }
});

test('既有 postMessage 协议（canvas-save / prototype-escape-preview）未被占用', () => {
    const taken = ['canvas-save', 'prototype-escape-preview'];
    for (const t of taken) {
        assert(Bridge.MSG_REQUEST !== t && Bridge.MSG_RESPONSE !== t,
            `不应占用既有协议 ${t}`);
    }
});

test('topbar.js 内联的协议常量与 anchor-bridge.js 一致（双份常量的安全网）', () => {
    // topbar.js 被所有页面加载，上报逻辑内联在它里面以避免改 40+ 个页面。
    // 代价是常量有第二份 —— 这条用例就是那份安全网。
    const topbar = fs.readFileSync(path.join(ROOT, 'js', 'topbar.js'), 'utf8');

    for (const [name, value] of [
        ['请求类型', Bridge.MSG_REQUEST],
        ['响应类型', Bridge.MSG_RESPONSE],
    ]) {
        assert(topbar.includes(`'${value}'`),
            `topbar.js 里缺少${name} ${value}，两侧协议已分叉`);
    }

    assert(new RegExp(`ANCHOR_MAX\\s*=\\s*${Bridge.MAX_INNER_HOSTS}\\b`).test(topbar),
        `topbar.js 的 ANCHOR_MAX 应为 ${Bridge.MAX_INNER_HOSTS}（与 MAX_INNER_HOSTS 一致）`);
    assert(new RegExp(`ANCHOR_MIN\\s*=\\s*${Bridge.MIN_HOST_SIZE}\\b`).test(topbar),
        `topbar.js 的 ANCHOR_MIN 应为 ${Bridge.MIN_HOST_SIZE}（与 MIN_HOST_SIZE 一致）`);
});

test('topbar.js 只在被嵌入时才安装上报（独立打开不遍历 DOM）', () => {
    const topbar = fs.readFileSync(path.join(ROOT, 'js', 'topbar.js'), 'utf8');
    assert(/window\.parent\s*&&\s*window\.parent\s*!==\s*window/.test(topbar),
        'topbar.js 应判断 window.parent !== window，避免独立浏览时做无谓遍历');
});

test('topbar.js 的上报不破坏既有 postMessage 逻辑', () => {
    const topbar = fs.readFileSync(path.join(ROOT, 'js', 'topbar.js'), 'utf8');
    for (const kept of ['canvas-save', 'prototype-escape-preview']) {
        assert(topbar.includes(kept), `topbar.js 应保留既有协议 ${kept}`);
    }
});

// ================================================================ 收尾

(async () => {
    console.log('\n\x1b[1m智能连接线 · 锚点系统测试\x1b[0m');
    await runAll();

    console.log(`\n${'─'.repeat(52)}`);
    if (failed === 0) {
        console.log(`\x1b[32m✓ 全部通过：${passed} 个用例\x1b[0m`);
    } else {
        console.log(`\x1b[31m✗ 失败 ${failed} 个 / 通过 ${passed} 个\x1b[0m`);
        for (const f of failures) {
            console.log(`  \x1b[31m- [${f.suite}] ${f.name}\x1b[0m`);
        }
    }
    process.exit(failed === 0 ? 0 : 1);
})();
