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
        ['js', 'connectors', 'anchor-session.js'],
    ]) {
        const file = path.join(ROOT, ...rel);
        vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
    }

    return {
        Anchor: vm.runInContext('AnchorProvider', ctx),
        Router: vm.runInContext('ConnectorRouter', ctx),
        Bridge: vm.runInContext('AnchorBridge', ctx),
        Session: vm.runInContext('AnchorSession', ctx),
    };
}

const { Anchor, Router, Bridge, Session: AnchorSession } = loadSources();
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
    // ⚠️ 尺寸变了：旧用例用 100×100 的方块，在新的尺寸过滤下（面积 ≥ 2000）
    //    会被判为"小元素"。递归本身没问题，是测试数据没跟上设计变更。
    const root = tree({
        tag: 'body', children: [{
            tag: 'div', id: 'outer', rect: [0, 0, 300, 300], children: [{
                tag: 'div', id: 'inner', rect: [10, 10, 200, 200], children: [{
                    tag: 'button', id: 'deep', rect: [20, 20, 150, 150],
                }],
            }],
        }],
    });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE });
    const ids = hosts.map(h => h.selector).sort();
    assertEqual(ids, ['#deep', '#inner', '#outer'], '三层都应被收集');
});

test('尺寸不足的元素被跳过（MasterGo：小图标/头像/数字都不出锚点）', () => {
    const root = tree({
        tag: 'body', children: [
            { tag: 'div', id: 'big', rect: [0, 0, 200, 200] },
            { tag: 'i', id: 'icon', rect: [0, 0, 8, 8] },
        ],
    });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE });
    assertEqual(hosts.map(h => h.selector), ['#big'], '8×8 的图标应被跳过');
});

test('不做数量截断：位置各异的够大元素全部保留（MasterGo 实测规则）', () => {
    const children = [];
    // ⚠️ 必须让它们**位置各异**。若 40 个方块位置相同，
    //    去重叠（消除位置重合）会把它们合并成 1 个 ——
    //    那是去重，不是数量截断，两者必须分清。
    for (let i = 0; i < 40; i++) {
        children.push({ tag: 'div', id: `d${i}`, rect: [i * 9, i * 5, 200, 120] });
    }
    const root = tree({ tag: 'body', children });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE });
    assert(hosts.length >= 20,
        `位置各异的大元素应大部分保留，实际只剩 ${hosts.length} 个`);
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

test('收集结果的 rect 是页面框局部坐标（不含 position）', () => {
    // ⚠️ 语义已变更（修复「拖拽页面框后内部锚点整体错位」）：
    //    collectInnerHosts 不再折算成画布绝对坐标，而是只存
    //    **相对页面框左上角**的偏移。position 的加法推迟到
    //    AnchorSession._innerHostsOf 消费时实时进行（见下面「拖拽跟随」用例）。
    //
    //    为什么必须这样：iframe 内的 getBoundingClientRect() 相对 iframe
    //    视口，页面框拖拽**完全不影响**它。把 position 一起烤进缓存，
    //    等于把拖拽前的坐标焊死 —— 拖完整体偏移 (-Δx, -Δy)。
    //
    //    用 200×200（面积 40000）以通过尺寸过滤
    const root = tree({ tag: 'body', children: [{ tag: 'div', id: 'x', rect: [5, 6, 200, 200] }] });
    const hosts = Bridge.collectInnerHosts(root, { pageElement: PAGE });
    assertEqual(hosts.length, 1, '应被收集');
    assertEqual(hosts[0].rect.x, 5, 'x 应是相对页面框的偏移，不含 position.x');
    assertEqual(hosts[0].rect.y, Bridge.IFRAME_TOP_OFFSET + 6, 'y 应含 iframe 下沉量（结构性偏移，恒定）');
    assertEqual(hosts[0].rect.width, 200, '宽度不应被改');
});

test('⚠️ 拖拽页面框后内部锚点跟随（本次修复的回归锁）', () => {
    // 复现步骤：拖出页面 → hover 看锚点（对）→ 拖拽位移 → 再 hover（错位）。
    // 根因：缓存里烤了拖拽前的 position，且缓存键不含 position，
    // 拖拽后命中旧缓存，锚点整体偏移 (-Δx, -Δy)。
    //
    // 这里走完整链路（AnchorSession 消费时折算），而不是只测纯函数 ——
    // 单测 toFrameRect 只能证明"没烤 position"，证明不了"消费时真的加了"。
    const Session = require(path.join(ROOT, 'js', 'connectors', 'anchor-session.js'));

    // ① 采集：iframe 内 (8, 8, 200, 200)
    const root = tree({ tag: 'body', children: [{ tag: 'div', id: 'card', rect: [8, 8, 200, 200] }] });
    const el = { id: 'p1', position: { x: 1000, y: 500 }, width: 375, height: 812 };
    const collected = Bridge.collectInnerHosts(root, { pageElement: el });
    assertEqual(collected.length, 1, '前置条件：应采集到 1 个宿主');

    // ② 入缓存（模拟 primeInnerHosts 拿到结果）
    Session._innerCache.set(Session._cacheKey(el), collected);

    const readAt = (x, y) => {
        const hs = Session._innerHostsOf({ ...el, position: { x, y } });
        return hs[0] && hs[0].rect;
    };

    // ③ 拖拽前
    const before = readAt(1000, 500);
    assertEqual(before.x, 1000 + 8, '拖拽前 x = position.x + 8');
    assertEqual(before.y, 500 + Bridge.IFRAME_TOP_OFFSET + 8, '拖拽前 y 含 iframe 下沉量');

    // ④ 拖拽后：position 变了，**缓存键不变**（只含 id@WxH）→ 命中同一份缓存
    const after = readAt(1300, 700);
    assertEqual(Session._cacheKey({ ...el, position: { x: 1300, y: 700 } }), Session._cacheKey(el),
        '前置条件：缓存键不含 position，拖拽后必然命中同一份缓存（这正是 bug 的成因）');
    assertEqual(after.x, 1300 + 8, '拖拽后 x 必须跟随新的 position.x');
    assertEqual(after.y, 700 + Bridge.IFRAME_TOP_OFFSET + 8, '拖拽后 y 必须跟随新的 position.y');
    assertEqual(after.x - before.x, 300, '位移量应恰好等于拖拽位移量 300');
    assertEqual(after.y - before.y, 200, '位移量应恰好等于拖拽位移量 200');

    // ⑤ 缓存本身不得被污染成绝对坐标（否则下一次读又会错）
    const raw = Session._innerCache.get(Session._cacheKey(el))[0].rect;
    assertEqual(raw.x, 8, '缓存里存的必须是局部坐标，不得含 position');
    assertEqual(raw.y, Bridge.IFRAME_TOP_OFFSET + 8, '缓存里的 y 只含结构性偏移');

    Session._innerCache.clear();
});

test('⚠️ bridge（file://）路径与 direct 路径坐标系一致（否则 http/file:// 表现分叉）', () => {
    // _normalizeReported 与 collectInnerHosts 必须落在**同一坐标系**，
    // 否则同一页面在 http 与 file:// 下会看到错位量不同的锚点。
    const el = { id: 'p1', position: { x: 1000, y: 500 }, width: 375, height: 812 };

    // direct：真 DOM 树
    const direct = Bridge.collectInnerHosts(
        tree({ tag: 'body', children: [{ tag: 'div', id: 'card', rect: [8, 8, 200, 200] }] }),
        { pageElement: el });
    // bridge：子侧上报（topbar.js 里 rect 是 {left,top,width,height}）
    const bridged = Bridge._normalizeReported(
        [{ selector: '#card', rect: { left: 8, top: 8, width: 200, height: 200 } }], el);

    assertEqual(bridged.map(h => h.rect), direct.map(h => h.rect),
        '两条路径必须给出同一坐标系的 rect');
    assertEqual(direct[0].rect.x, 8, 'direct 也应是局部坐标');
});

test('⚠️ position 非法时不得让 NaN 流进渲染/路由（线会整条消失且不报错）', () => {
    const Session = require(path.join(ROOT, 'js', 'connectors', 'anchor-session.js'));
    const el = { id: 'p1', position: { x: 1000, y: 500 }, width: 375, height: 812 };
    const collected = Bridge.collectInnerHosts(
        tree({ tag: 'body', children: [{ tag: 'div', id: 'card', rect: [8, 8, 200, 200] }] }),
        { pageElement: el });
    Session._innerCache.set(Session._cacheKey(el), collected);

    for (const bad of [null, undefined, { x: NaN, y: 0 }, { x: 0, y: NaN }, {}]) {
        const hs = Session._innerHostsOf({ ...el, position: bad });
        assertEqual(hs[0].rect, { x: 8, y: Bridge.IFRAME_TOP_OFFSET + 8, width: 200, height: 200 },
            `position 非法(${JSON.stringify(bad)})时必须原样返回局部坐标，不得产出 NaN`);
    }
    Session._innerCache.clear();
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
        { selector: '#ok', rect: { left: 1, top: 2, width: 200, height: 200 } },
        { selector: '', rect: { left: 1, top: 2, width: 200, height: 200 } },
        { selector: '#nan', rect: { left: NaN, top: 2, width: 200, height: 200 } },
        { selector: '#tiny', rect: { left: 1, top: 2, width: 3, height: 3 } },
        { selector: '#norect' },
        null,
        'garbage',
    ];
    const out = Bridge._normalizeReported(reported, PAGE);
    assertEqual(out.map(h => h.selector), ['#ok'], '只有合法项应存活');
});

test('上报项的尺寸过滤与 direct 模式一致（http 与 file:// 必须看到同一批锚点）', () => {
    const reported = [
        { selector: '#big', rect: { left: 0, top: 0, width: 300, height: 200 } },
        { selector: '#icon', rect: { left: 0, top: 0, width: 16, height: 16 } },
    ];
    const out = Bridge._normalizeReported(reported, PAGE);
    assertEqual(out.map(h => h.selector), ['#big'],
        '小图标在两种协议下都应被过滤，否则用户换协议就看到不同锚点');
});

test('上报项同样不做裁剪（与 direct 模式一致）', () => {
    // PAGE 高 812，元素从 y=400 起、高 1488 → 远超声明高度。
    // 页面已改为展示全部内容，两条路径都**不裁剪**，否则
    // http 与 file:// 下会看到不同的锚点集合。
    //
    // ⚠️ 宽度取 150 是刻意的：150×1488 / (375×812) = 0.73 < HOST_VS_PAGE_RATIO，
    //    保证这条用例只考核"不裁剪"，不牵涉"等大根容器剔除"那条规则
    //    （那是下面 '33.' 组单独锁的）。
    const reported = [{ selector: '#tall', rect: { left: 0, top: 400, width: 150, height: 1488 } }];
    const out = Bridge._normalizeReported(reported, PAGE);
    assertEqual(out.length, 1, '超出声明高度也应保留');
    assertEqual(out[0].rect.height, 1488, '上报项不应被裁剪');
});

test('非法入参返回空数组，不抛异常', () => {
    for (const bad of [null, undefined, 'x', 42, {}]) {
        assertEqual(Bridge._normalizeReported(bad, PAGE), [], `应返回空: ${JSON.stringify(bad)}`);
    }
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

    assert(new RegExp(`ANCHOR_MIN_AREA\\s*=\\s*${Bridge.MIN_HOST_AREA}\\b`).test(topbar),
        `topbar.js 的 ANCHOR_MIN_AREA 应为 ${Bridge.MIN_HOST_AREA}（与 MIN_HOST_AREA 一致）`);
    assert(new RegExp(`ANCHOR_MIN_EDGE\\s*=\\s*${Bridge.MIN_HOST_EDGE}\\b`).test(topbar),
        `topbar.js 的 ANCHOR_MIN_EDGE 应为 ${Bridge.MIN_HOST_EDGE}（与 MIN_HOST_EDGE 一致）`);

    // 两侧阈值不一致 → 同一页面在 http 与 file:// 下会看到不同的锚点集合
    assert(!/ANCHOR_MAX|MAX_INNER_HOSTS/.test(topbar),
        '数量截断已被实测证明是错解，topbar.js 不应再保留 ANCHOR_MAX');
});

test('数量截断常量已彻底移除（MasterGo 是「够大就出」，不是「只出前 N 个」）', () => {
    assertEqual(Bridge.MAX_INNER_HOSTS, undefined,
        'MAX_INNER_HOSTS 应已删除；保留它会随机丢掉用户真正想连的元素');
    const anchorTest = fs.readFileSync(__filename, 'utf8');
    assert(!/MAX_INNER_HOSTS\s*[:=]\s*\d/.test(anchorTest),
        '测试里也不应再出现数量上限的定义');
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

// ================================================================ 16. 内部宿主裁剪到可视区

suite('16. 内部宿主跟随页面完整内容（不裁剪）');

/** 造一个带 getRect 的假节点 */
function node(tagName, rect, children = []) {
    const el = {
        tagName: tagName.toUpperCase(),
        id: '',
        children,
        parentElement: null,
        getBoundingClientRect: () => ({ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }),
    };
    for (const c of children) c.parentElement = el;
    return el;
}

const CLIP_PAGE = { id: 'p', position: { x: 100, y: 200 }, width: 375, height: 812 };

test('页面下半部分也产生锚点（这是「只有一半页面显示锚点」的根因）', () => {
    // ⚠️ 用户实况：页面已去掉滚轮、展示**全部内容**。
    //    实测 element.height=812，但页面实际内容高 1699。
    //    旧实现按 812 裁剪 → 下半页（y>912）永远没有锚点。
    //    页面既然展示全部内容，"不可见区域"这个概念已不存在，裁剪只会误伤。
    const body = node('body', [0, 0, 375, 1699], [
        node('div', [0, 0, 375, 400]),      // 上半部分
        node('div', [0, 1200, 375, 499]),   // 下半部分，远超声明高度 812
    ]);
    const hosts = Bridge.collectInnerHosts(body, { pageElement: CLIP_PAGE });
    assertEqual(hosts.length, 2, '上下两部分都应产生锚点宿主');
});

test('内容超出页面框声明高度时保留完整矩形', () => {
    const body = node('body', [0, 0, 375, 1699], [
        node('div', [0, 400, 375, 1488]),   // 从 y=400 延伸到 1888
    ]);
    const hosts = Bridge.collectInnerHosts(body, { pageElement: CLIP_PAGE });
    // 1488×375 面积远大于页面框 → 被"根容器剔除"规则挡掉（它是页面框的超集）
    // 用一个正常尺寸但纵向超出的元素来验证"不裁剪"这个行为本身
    const body2 = node('body', [0, 0, 375, 1699], [
        node('div', [0, 400, 200, 900]),    // 200×900，位置在页面框中部以下
    ]);
    const hosts2 = Bridge.collectInnerHosts(body2, { pageElement: CLIP_PAGE });
    assertEqual(hosts2.length, 1, '纵向超出页面框的元素应保留');
    assertEqual(hosts2[0].rect.height, 900, '矩形高度不应被裁剪到页面框以内');
});

test('clipToViewport 已移除（保留它反而会误伤完整内容）', () => {
    assertEqual(Bridge.clipToViewport, undefined,
        '裁剪函数应已删除；页面不再滚动，"不可见区域"不存在，裁剪只会切掉下半页');
});

test('取消裁剪不等于取消过滤（小图标仍应被滤掉）', () => {
    const body = node('body', [0, 0, 375, 1699], [
        node('div', [0, 0, 375, 400]),      // 大块 → 保留
        node('i', [0, 500, 16, 16]),        // 小图标 → 滤掉
    ]);
    const hosts = Bridge.collectInnerHosts(body, { pageElement: CLIP_PAGE });
    assertEqual(hosts.length, 1, '小图标仍应被滤掉');
    assertEqual(hosts[0].rect.height, 400, '保留的应是那块大内容');
});

// ================================================================ 17. 尺寸过滤（小元素不出锚点）

suite('17. 尺寸过滤（MasterGo：大块元素出锚点，小元素不出）');

test('无意义的小元素被过滤（数字/图标/细条），MasterGo 实测这些都不出锚点', () => {
    // ⚠️ 本组用例 2026-10-16 调整过一次判据，请先读下面的说明再改。
    //
    // 【历史】最初阈值是 4000，本组原本还包含「圆形头像 32×32 = 1024」。
    // 【调整原因】用户实测把阈值下调到 500 后**认可**该行为 ——
    //   因为第一轮报的 bug 正是「底部 tab 栏的图标选不中」：
    //   `.by-tabbar a` 只有 75×48 = 3600，在 4000 门槛下被整个滤掉，
    //   于是 tab 栏内部一个锚点都没有。头像 32×32 与 tab 图标同属
    //   「小而可点」的尺寸档，放行它是这个取舍的**直接后果**，不是回归。
    //
    // 【现在锁什么】锁「真正无意义的小东西仍被滤掉」这条**意图**，
    // 而不是死绑某一个实测数值。
    const roots = [
        ['点赞数字 20×14（height<MIN_HOST_EDGE）', node('span', [10, 200, 20, 14])],
        ['小图标 16×16（area<MIN_HOST_AREA）', node('i', [10, 300, 16, 16])],
        ['极小方块 20×20（area<MIN_HOST_AREA）', node('i', [10, 400, 20, 20])],
        ['细横条 300×10（height<MIN_HOST_EDGE）', node('div', [10, 500, 300, 10])],
    ];
    for (const [label, el] of roots) {
        const body = node('body', [0, 0, 375, 812], [el]);
        const hosts = Bridge.collectInnerHosts(body, { pageElement: CLIP_PAGE, viewportOffset: 0 });
        assertEqual(hosts.length, 0, `${label} 不应产生锚点宿主（MasterGo 实测无锚点）`);
    }
});

test('⚠️ 小而可点的元素必须出锚点（tab 栏图标，3600 —— 这是 4000 门槛的漏网之鱼）', () => {
    // 这条锁的是**用户实测认可**的行为：tab 栏的每个 <a> 只有 75×48 = 3600，
    // 正是第一轮 bug 的核心。阈值一旦涨回 4000，用户点「我的」图标就会选不中。
    const cases = [
        ['tab 栏图标 75×48', [10, 100, 75, 48]],
        ['小圆形头像 32×32', [200, 200, 32, 32]],
    ];
    for (const [label, rect] of cases) {
        const body = node('body', [0, 0, 375, 812], [node('a', rect)]);
        const hosts = Bridge.collectInnerHosts(body, { pageElement: CLIP_PAGE, viewportOffset: 0 });
        assert(hosts.length >= 1,
            `${label}（面积 ${rect[2] * rect[3]}）应产生锚点宿主 —— 否则回到「tab 栏点不中」的 bug`);
    }
});

test('大块结构元素被保留，MasterGo 实测卡片/输入框都有锚点', () => {
    const cases = [
        ['评论卡片 351×80', [10, 100, 351, 80]],
        ['底部输入框 351×44', [10, 300, 351, 44]],
        ['媒体区 375×200', [0, 0, 375, 200]],
    ];
    for (const [label, rect] of cases) {
        const body = node('body', [0, 0, 375, 812], [node('div', rect)]);
        const hosts = Bridge.collectInnerHosts(body, { pageElement: CLIP_PAGE, viewportOffset: 0 });
        assert(hosts.length >= 1, `${label} 应产生锚点宿主（MasterGo 实测有锚点）`);
    }
});

test('过滤阈值落在实测数据的分界处（用户 2026-10-16 实测认可值）', () => {
    // 【意图】阈值必须夹在「无意义小元素」与「值得连的小元素」之间：
    //   下界 —— 仍须挡住 16×16=256、20×14=280 这类装饰性碎片
    //   上界 —— 必须放行 tab 栏 a 的 75×48=3600，否则回到「tab 栏点不中」
    //
    // ⚠️ 上界原来是 32*32=1024（拿头像当界），但用户实测下调到 500 并**认可**：
    //    32×32 头像与 tab 图标同属「小而可点」档，放行它是该取舍的直接后果。
    //    所以现在用 tab 图标的真实尺寸当上界，判据才与用户实际需求对齐。
    assert(Bridge.MIN_HOST_AREA > 20 * 14,
        `阈值 ${Bridge.MIN_HOST_AREA} 必须大于点赞数字面积 280，否则小数字会冒锚点`);
    assert(Bridge.MIN_HOST_AREA < 75 * 48,
        `阈值 ${Bridge.MIN_HOST_AREA} 必须小于 tab 栏图标面积 3600，` +
        `否则底部 tab 栏内部一个锚点都没有（用户实测的 bug）`);
});

test('边界两侧行为符合预期：阈值以下过滤，以上保留', () => {
    // 刚好在阈值以下
    const small = Math.floor(Math.sqrt(Bridge.MIN_HOST_AREA)) - 1;
    const smallBody = node('body', [0, 0, 375, 812], [node('div', [10, 100, small, small])]);
    assertEqual(Bridge.collectInnerHosts(smallBody, { pageElement: CLIP_PAGE, viewportOffset: 0 }).length, 0,
        `${small}×${small}（面积 ${small * small} < ${Bridge.MIN_HOST_AREA}）应被过滤`);

    // 明确大于阈值
    const bigBody = node('body', [0, 0, 375, 812], [node('div', [10, 100, 200, 200])]);
    assert(Bridge.collectInnerHosts(bigBody, { pageElement: CLIP_PAGE, viewportOffset: 0 }).length >= 1,
        '200×200（面积 40000）必须通过');
});

test('去重只消除「位置重合」，不按数量截断（MasterGo 实测规则）', () => {
    // 位置各异 → 全部保留
    const distinct = [];
    for (let i = 0; i < 40; i++) distinct.push(node('div', [i * 12, i * 7, 120, 90]));
    const bodyDistinct = node('body', [0, 0, 375, 812], distinct);
    const kept = Bridge.collectInnerHosts(bodyDistinct, { pageElement: CLIP_PAGE, viewportOffset: 0 });
    assert(kept.length >= 15,
        `位置差异超过容差(8px)的大元素应大量保留，实际 ${kept.length} 个`);

    // 完全重合 → 合并成 1 个（这是去重，不是截断）
    const same = [];
    for (let i = 0; i < 40; i++) same.push(node('div', [10, 10, 200, 200]));
    const bodySame = node('body', [0, 0, 375, 812], same);
    const merged = Bridge.collectInnerHosts(bodySame, { pageElement: CLIP_PAGE, viewportOffset: 0 });
    assertEqual(merged.length, 1, '完全重合的 40 个应合并为 1 个');
});

// ================================================================ 18. 锚点归属判定

suite('18. 锚点归属判定（外扩带）');

test('框外 6px 的锚点归属于该元素（修复「点不中」）', () => {
    const rect = R(100, 100, 200, 200);
    const OFF = Anchor.OFFSET;
    // 右边中点锚点的画布坐标
    const p = Anchor.resolvePoint(rect, { side: 'right', t: 0.5 });
    const owner = AnchorSession.ownerOf({ x: p.x, y: p.y }, [rect]);
    assert(owner, '框外锚点必须能归属到宿主元素');
    assertEqual(owner.rect, rect, '应归属到正确的那一个');
    assert(owner.dist <= AnchorSession.BAND,
        `归属距离 ${owner.dist} 必须在外扩带 ${AnchorSession.BAND} 内`);
});

test('精确包含优先于外扩带（不抢占正常点击）', () => {
    const a = R(0, 0, 100, 100);
    const b = R(102, 0, 100, 100);   // 与 a 相距 2px，外扩带会重叠
    // 点落在 b 的框内、同时落在 a 的外扩带内
    const owner = AnchorSession.ownerOf({ x: 110, y: 50 }, [a, b]);
    assertEqual(owner.rect, b, '精确命中优先，应归 b');
});

test('外扩带重叠时取最近的一条边', () => {
    const a = R(0, 0, 100, 100);
    const b = R(108, 0, 100, 100);   // a 的右边 100，b 的左边 108，点在 104 正好居中
    const owner = AnchorSession.ownerOf({ x: 104, y: 50 }, [a, b]);
    assert(owner, '应能归属');
    assertEqual(owner.dist, 4, '到两条边都是 4px，应归最近者');
});

test('远离所有元素的点不归属任何元素', () => {
    const owner = AnchorSession.ownerOf({ x: 5000, y: 5000 }, [R(0, 0, 100, 100)]);
    assertEqual(owner, null, '远处空白点不应被归属');
});

test('外扩带宽度 = OFFSET + RADIUS，恰好包住整个锚点圆点', () => {
    assertEqual(AnchorSession.BAND, Anchor.OFFSET + Anchor.RADIUS,
        '外扩带必须刚好覆盖锚点圆点，否则圆点边缘仍点不中');
});

// ================================================================ 19. 已渲染锚点清单

suite('19. 已渲染锚点清单（命中以屏幕所见为准）');

test('记录清单后，命中返回的就是清单里那一个锚点', () => {
    const rect = R(0, 0, 200, 200);
    const rightMid = Anchor.resolvePoint(rect, { side: 'right', t: 0.5 });
    AnchorSession.setRendered([
        { ref: { elementId: 'e1', kind: 'element', side: 'right', t: 0.5 }, point: rightMid },
    ]);
    const hit = AnchorSession.hitRendered({ x: rightMid.x, y: rightMid.y }, 12);
    assert(hit, '应命中');
    assertEqual(hit.ref.elementId, 'e1', '命中的必须是清单里那一个');
    assertEqual(hit.ref.side, 'right', '命中的 side 必须一致');
    assertEqual(hit.ref.t, 0.5, '命中的 t 必须一致 —— 这正是「选了 A 连到 B」的判据');
});

test('清单为空时不命中（交由几何兜底）', () => {
    AnchorSession.setRendered([]);
    assertEqual(AnchorSession.hitRendered({ x: 0, y: 0 }), null, '空清单不应命中');
});

test('命中取最近的一个锚点', () => {
    AnchorSession.setRendered([
        { ref: { elementId: 'far', side: 'right', t: 0.5 }, point: { x: 100, y: 0 } },
        { ref: { elementId: 'near', side: 'right', t: 0.5 }, point: { x: 2, y: 0 } },
    ]);
    const hit = AnchorSession.hitRendered({ x: 0, y: 0 }, 10);
    assertEqual(hit.ref.elementId, 'near', '应取最近的');
});

test('超出吸附半径不命中', () => {
    AnchorSession.setRendered([
        { ref: { elementId: 'a', side: 'right', t: 0.5 }, point: { x: 100, y: 0 } },
    ]);
    assertEqual(AnchorSession.hitRendered({ x: 0, y: 0 }, 10), null, '距离 100 > 半径 10，不应命中');
});

test('清空锚点层后不再命中（残留锚点必须失效）', () => {
    const p = { x: 10, y: 10 };
    AnchorSession.setRendered([
        { ref: { elementId: 'ghost', side: 'right', t: 0.5 }, point: p },
    ]);
    assert(AnchorSession.hitRendered(p, 10), '前置：清单里有锚点时应能命中');
    AnchorSession.setRendered([]);
    assertEqual(AnchorSession.hitRendered(p, 10), null, '清空后不应再能命中');
});

test('clearAnchors 必须同步清空清单（幽灵锚点的静态契约）', () => {
    // ⚠️ clearAnchors 在 element-renderer.js 里，涉及 DOM，没法在沙箱里直接跑。
    //    这里用静态断言锁死契约：它清了 SVG 就**必须**同时清清单。
    //    只清 SVG 不清清单 → 画布空了，用户却还能"点到"早已消失的锚点。
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    const m = src.match(/clearAnchors\(\)\s*\{([\s\S]*?)\n    \}/);
    assert(m, '应能在 element-renderer.js 里找到 clearAnchors');
    assert(/setRendered\(\[\]\)/.test(m[1]),
        'clearAnchors 必须清空锚点清单，否则会出现「画布空白却能点中幽灵锚点」');
});

// ================================================================ 20. 宿主去重叠

suite('20. 宿主去重叠（嵌套容器边重合时只留最内层）');

const DEDUP_PAGE = { id: 'p', position: { x: 0, y: 0 }, width: 800, height: 900 };

test('外层容器与内层元素边几乎重合时，只保留更内层的那个', () => {
    // ⚠️ 页面框故意给得很大（800×900），好让下面这两个容器
    //    不会被"与页面框等大"的剔除规则干掉 —— 这条只验证去重。
    const body = node('body', [0, 0, 600, 600], [
        node('div', [0, 0, 400, 400]),        // 外层
        node('div', [8, 8, 384, 384]),        // 内层，几乎重合
    ]);
    const hosts = Bridge.collectInnerHosts(body, { pageElement: DEDUP_PAGE, viewportOffset: 0 });
    assertEqual(hosts.length, 1, '边几乎重合的嵌套容器只应保留一个宿主，否则锚点糊成一坨');
});

test('边相距较远的嵌套容器各自保留（不能误删）', () => {
    const body = node('body', [0, 0, 600, 600], [
        node('div', [0, 0, 400, 400]),        // 外层
        node('div', [10, 120, 200, 200]),     // 内层，位置差异明显
    ]);
    const hosts = Bridge.collectInnerHosts(body, { pageElement: DEDUP_PAGE, viewportOffset: 0 });
    assertEqual(hosts.length, 2, '差异明显的两个宿主都应保留');
});

test('去重叠只看几何，不看 DOM 关系（并列的两个大容器都保留）', () => {
    const body = node('body', [0, 0, 375, 782], [
        node('div', [0, 0, 180, 782]),
        node('div', [185, 0, 180, 782]),
    ]);
    const hosts = Bridge.collectInnerHosts(body, { pageElement: DEDUP_PAGE, viewportOffset: 0 });
    assertEqual(hosts.length, 2, '并列容器不重合，都应保留');
});

test('去重后锚点总量显著下降（这是「糊成一片」的根因）', () => {
    // 模拟真实页面：多层嵌套，边间距都很小（页面框给大以隔离剔除规则）
    let inner = node('div', [20, 20, 335, 742]);
    for (let i = 0; i < 6; i++) {
        inner = node('div', [4 + i * 2, 4 + i * 2, 367 - i * 4, 758 - i * 4], [inner]);
    }
    const body = node('body', [0, 0, 400, 800], [inner]);

    const before = Bridge.collectInnerHosts(body, { pageElement: DEDUP_PAGE, viewportOffset: 0, dedupe: false });
    const after = Bridge.collectInnerHosts(body, { pageElement: DEDUP_PAGE, viewportOffset: 0 });
    assert(after.length < before.length,
        `去重叠应减少宿主数：去重前 ${before.length} → 去重后 ${after.length}`);
    assert(after.length <= 4,
        `边距很小的 7 层嵌套应收敛到 ≤4 个宿主，实际 ${after.length}`);
});

test('去重保留的是最内层（用户想连的是内容，不是包着它的容器）', () => {
    const outer = node('div', [0, 0, 400, 400]);
    const innerNode = node('div', [4, 4, 392, 392], [outer]);
    const body = node('body', [0, 0, 600, 600], [innerNode]);
    const hosts = Bridge.collectInnerHosts(body, { pageElement: DEDUP_PAGE, viewportOffset: 0 });
    assertEqual(hosts.length, 1, '重合的一组只留一个');
    assertEqual(hosts[0].rect.width, 392, '应保留最内层（更小）的那个');
});

// ================================================================ 21. 剔除"等于页面框"的根容器

suite('21. 剔除与页面框几乎等大的根容器');

const ROOT_PAGE = { id: 'p', position: { x: 0, y: 0 }, width: 375, height: 812 };

test('铺满全屏的根容器不产生锚点（与页面框锚点重复）', () => {
    // 真实数据：body > div 是 375×782，占页面框 96.4%，
    // 它的锚点全部贴在页面框边线上，纯属重复噪音。
    const body = node('body', [0, 0, 375, 812], [
        node('div', [0, 0, 375, 782]),          // 96.4% → 应剔除
        node('div', [0, 100, 375, 260]),       // 32%   → 应保留
    ]);
    const hosts = Bridge.collectInnerHosts(body, { pageElement: ROOT_PAGE, viewportOffset: 0 });
    assertEqual(hosts.length, 1, '只应保留那个中等大小的容器');
    assertEqual(hosts[0].rect.height, 260, '保留的应是 375×260 那个');
});

test('明显小于页面框的容器都保留（不能误删真实内容）', () => {
    const body = node('body', [0, 0, 375, 812], [
        node('div', [0, 0, 375, 400]),        // 49%
        node('div', [0, 420, 375, 300]),       // 37%
        node('div', [10, 100, 351, 200]),      // 23%
    ]);
    const hosts = Bridge.collectInnerHosts(body, { pageElement: ROOT_PAGE, viewportOffset: 0 });
    assertEqual(hosts.length, 3, '三个明显小于页面框的容器都应保留');
});

test('占比阈值落在实测分界处', () => {
    // 剔除条件是 ratio >= HOST_VS_PAGE_RATIO。
    // 根容器占比 0.963 必须 **≥ 阈值**（被剔除），
    // 真实内容占比 0.320 必须 **< 阈值**（被保留）。
    const rootRatio = 375 * 782 / (375 * 812);
    const contentRatio = 375 * 260 / (375 * 812);
    assert(Bridge.HOST_VS_PAGE_RATIO <= rootRatio,
        `阈值 ${Bridge.HOST_VS_PAGE_RATIO} 必须 ≤ 根容器占比 ${rootRatio.toFixed(3)}，否则根容器会漏出锚点`);
    assert(Bridge.HOST_VS_PAGE_RATIO > contentRatio,
        `阈值 ${Bridge.HOST_VS_PAGE_RATIO} 必须 > 真实内容占比 ${contentRatio.toFixed(3)}，否则真实内容会被误删`);
});

// ================================================================ 22. 内部宿主用中点单采样

suite('22. 内部宿主用中点单采样（MasterGo 实测：卡片只亮 1 个锚点）');

test('内部宿主用 coarse 密度：每边 1 个锚点', () => {
    const rect = R(0, 0, 351, 80);   // 典型评论卡片尺寸
    const full = Anchor.anchorsOfRect(rect);
    const coarse = Anchor.anchorsOfRect(rect, { density: 'coarse' });
    assert(coarse.length < full.length, 'coarse 应明显少于 full');
    assertEqual(coarse.length, 4, '每边 1 个，共 4 个');
    for (const a of coarse) assertClose(a.t, 0.5, 1e-9, '只保留中点');
});

test('页面框自身保持 full 密度（用户会按高度选点）', () => {
    const pageRect = R(0, 0, 375, 812);
    assertEqual(Anchor.anchorsOfRect(pageRect).length, 12,
        '页面框应保持 12 个锚点（四边 × 3 采样）');
});

// ================================================================ 23. 视口固定系换算（修「锚点只显示一部分」）

suite('23. 视口固定系换算（锚点层脱离 wrapper 裁剪）');

test('画布坐标 → 视口坐标的换算', () => {
    const v = { zoom: 0.55, pan: { x: -40, y: -60 } };
    const origin = { left: 0, top: 0 };
    const p = AnchorSession.toViewport({ x: 100, y: 200 }, v, origin);
    assertEqual(p, { x: -40 + 100 * 0.55, y: -60 + 200 * 0.55 }, '应按 zoom/pan 换算');
});

test('与 ToolsConnector.toCanvasCoords 严格互逆', () => {
    // 两边必须是同一套公式的互逆，否则锚点画的位置和命中位置会错开
    const v = { zoom: 0.55, pan: { x: -40, y: -60 } };
    const origin = { left: 180, top: 44 };     // 模拟 wrapper 的位置
    const canvasPt = { x: 123.4, y: 567.8 };
    const screen = AnchorSession.toViewport(canvasPt, v, origin);

    // 反算：canvas = (screen - origin - pan) / zoom
    const back = {
        x: (screen.x - origin.left - v.pan.x) / v.zoom,
        y: (screen.y - origin.top - v.pan.y) / v.zoom,
    };
    assertClose(back.x, canvasPt.x, 1e-9, 'x 应可无损反算');
    assertClose(back.y, canvasPt.y, 1e-9, 'y 应可无损反算');
});

test('fixed 层原点在视口 (0,0)，不受 wrapper 位置影响', () => {
    const a = AnchorSession.layerOrigin(true, { left: 180, top: 44, bottom: 771 });
    assertEqual(a, { left: 0, top: 0 }, 'fixed 层应无视 wrapper 位置');

    const b = AnchorSession.layerOrigin(false, { left: 180, top: 44 });
    assertEqual(b, { left: 180, top: 44 }, '非 fixed 层用 wrapper 左上角');
});

test('⚠️ 换算原点必须用 wrapper 位置，不能用视口原点（否则整体偏移）', () => {
    // 这是一条**回归防护**：曾经因为传了 {left:0, top:0} 而没用 wrapper 的
    // 实际 rect，导致所有锚点整体偏移 wrapper.left/top（实测偏 191px），
    // 圆点全跑到页面框外面、叠成一坨。
    //
    // 判据：同一个画布点，用 wrapper 原点算出的屏幕 x 必须等于
    // 浏览器实测的屏幕 x —— 而后者正是 ToolsConnector.toCanvasCoords 的逆运算基准。
    const v = { zoom: 0.5, pan: { x: 100, y: 0 } };
    const canvasX = 1000;
    const wrapperLeft = 180;

    const bad = AnchorSession.toViewport({ x: canvasX, y: 0 }, v, { left: 0, top: 0 });
    const good = AnchorSession.toViewport({ x: canvasX, y: 0 }, v, { left: wrapperLeft, top: 0 });

    assertEqual(good.x - bad.x, wrapperLeft,
        '用 wrapper 原点应比用视口原点正好偏移 wrapper.left');
    assert(bad.x !== good.x, '两者必须不同，否则说明原点没起作用');

    // 与 toCanvasCoords 的逆运算一致：canvas = (screen - wrapperLeft - pan) / zoom
    const back = (good.x - wrapperLeft - v.pan.x) / v.zoom;
    assertClose(back, canvasX, 1e-9, '应能无损反算回画布坐标');
});

test('renderAnchors 必须用 wrapper 的 rect 作为换算原点', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    const m = src.match(/renderAnchors\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 renderAnchors');
    assert(/getElementById\('canvasWrapper'\)/.test(m[1]),
        '必须取 #canvasWrapper 的 rect 作为原点；用视口原点会让锚点整体偏移');
    assert(/getBoundingClientRect\(\)/.test(m[1]),
        '原点必须来自 getBoundingClientRect（随布局实时变化）');
});

test('非法输入返回 null，不产生 NaN', () => {
    const v = { zoom: 0.55, pan: { x: 0, y: 0 } };
    assertEqual(AnchorSession.toViewport(null, v, { left: 0, top: 0 }), null, 'point 缺失应返回 null');
    assertEqual(AnchorSession.toViewport({ x: 1, y: 1 }, null, { left: 0, top: 0 }), null, 'view 缺失应返回 null');
    assertEqual(AnchorSession.toViewport({ x: 1, y: 1 }, v, null), null, 'origin 缺失应返回 null');
});

test('zoom 为 0 时不产生 Infinity（除零保护）', () => {
    const p = AnchorSession.toViewport({ x: 100, y: 100 },
        { zoom: 0, pan: { x: 0, y: 0 } }, { left: 0, top: 0 });
    assert(p && Number.isFinite(p.x) && Number.isFinite(p.y),
        `zoom=0 应退化为 1 而非 Infinity，实测 ${JSON.stringify(p)}`);
});

// ================================================================ 24. 预热（修「逐步显示」）

suite('24. 内部宿主预热（首帧即完整）');

test('预热后首次 hover 即可拿到全部内部宿主（无需等异步）', () => {
    const cache = new Map();
    const key = 'elem_1@375x812';
    // 模拟：预热已经把结果放进缓存
    cache.set(key, [{ selector: 'body > div', rect: { x: 0, y: 0, width: 375, height: 782 } }]);
    assert(cache.has(key), '预热后的缓存应已就绪，首次 hover 不必等待异步');
});

test('预热函数必须幂等（重复调用不重复发请求）', () => {
    // primeInnerHosts 用 _pending + _innerCache 去重，
    // 重复预热不应产生第二次 postMessage。
    const pending = new Set();
    const cache = new Map();
    const key = 'elem_1@375x812';

    const prime = () => {
        if (cache.has(key) || pending.has(key)) return 'skip';
        pending.add(key);
        cache.set(key, []);   // 模拟同步完成
        pending.delete(key);
        return 'sent';
    };
    assertEqual(prime(), 'sent', '首次应发起');
    assertEqual(prime(), 'skip', '已缓存时应跳过');
});

test('缓存键含尺寸：元素改尺寸后应重新预热', () => {
    const cache = new Map();
    const k1 = 'elem_1@375x812';
    const k2 = 'elem_1@375x600';
    assert(k1 !== k2, '不同尺寸应是不同的缓存键，否则改尺寸后锚点不会更新');
});

// ================================================================ 25. 锚点层挂载位置（静态契约）

suite('25. 锚点层挂载位置（不得被 wrapper 裁剪）');

test('锚点层不得挂在 overflow:hidden 的 wrapper 内', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    // 锚点层的创建逻辑可能抽在 _ensureAnchorLayer 里，两处都要查
    assert(!/document\.getElementById\('canvas'\)\.appendChild\(layer\)/.test(src),
        '锚点层不能挂在 #canvas（它在 overflow:hidden 的 #canvasWrapper 内，会被裁掉）');
    assert(/document\.body\.appendChild\(layer\)/.test(src),
        '锚点层应挂在 document.body 下并用 position:fixed，才不会被 wrapper 裁剪');
});

test('锚点层样式必须是 fixed 且不裁剪', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    // ⚠️ 用「从 cssText 到 appendChild」的整段检查，不对拼接字符串做正则 ——
    //    样式值是 'a' + 'b' 两段拼的，逐段正则极易因引号/行尾匹配失败，
    //    而"匹配不上"会让本用例失去意义。
    const m = src.match(/layer\.style\.cssText([\s\S]*?)document\.body\.appendChild\(layer\)/);
    assert(m, '应能找到锚点层的 cssText 到挂载这段');
    assert(/position:\s*fixed/.test(m[1]), '锚点层应 position:fixed（相对视口，不随画布滚动被裁）');
    assert(/pointer-events:\s*none/.test(m[1]), '必须 pointer-events:none，不干扰既有交互');
    assert(/overflow:\s*visible/.test(m[1]), '层自身不能裁剪子元素');
});

test('锚点位置必须用视口固定系换算，不能直接用画布坐标', () => {
    // 层是 fixed 的，参照系是视口；若直接把画布坐标当屏幕坐标写进 cx/cy，
    // 锚点会整体偏移 pan+zoom 倍距离 —— 这是换层后最容易犯的错。
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    const m = src.match(/renderAnchors\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 renderAnchors');
    assert(/toViewport/.test(m[1]), '渲染前必须做画布坐标 → 视口坐标换算');
    assert(/AnchorSession\.setRendered/.test(m[1]), '并把画布坐标写进清单供命中检测使用');
});

test('锚点层挂到 body 后必须由 canvas-editor 之外的清理路径兜住', () => {
    // 挂到 body 意味着不再随 canvas 一起销毁，
    // 因此 clearAnchors 必须仍然能可靠清空它。
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    const m = src.match(/clearAnchors\(\)\s*\{([\s\S]*?)\n    \}/);
    assert(m, '应能找到 clearAnchors');
    assert(/setRendered\(\[\]\)/.test(m[1]), 'clearAnchors 必须清清单');
});

test('内部宿主必须在 iframe load 时预热（修「逐步显示」）', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    const m = src.match(/iframe\.addEventListener\('load'([\s\S]*?)\n        \}\);/);
    assert(m, '应能在 iframe 创建处找到 load 监听');
    assert(/primeInnerHosts/.test(m[1]),
        'iframe 内容就绪时应立即预热内部宿主，而不是等用户 hover');
});

test('hover 路径在缓存就绪时不得触发异步补绘（首帧即完整）', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'tools', 'tools-connector.js'), 'utf8');
    const m = src.match(/_renderAnchorIds\(ids,\s*cursor\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 _renderAnchorIds');
    assert(/_innerCache\.has\(key\)\)\s*continue/.test(m[1]),
        '缓存已就绪时应直接 continue，不再发起异步预热 —— 否则首帧只有 12 个、隔帧补齐');
});

// ================================================================ 26. 两层锚点模型（MasterGo：页面级 + 鼠标所在元素）

suite('26. 两层锚点模型（逐层聚焦，不一次全亮）');

const LAYER_PAGE = {
    id: 'p1',
    position: { x: 0, y: 0 },
    width: 375,
    height: 812,
};

test('hover 页面框：只返回页面级锚点，不含任何内部元素', () => {
    // 用户反馈「当前是直接显示整个页面所有元素的锚点」——
    // 实测一次性亮出 128 个。MasterGo 只亮页面自身的 12 个。
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: R(0, 0, 375, 812), anchors: Anchor.anchorsOfRect(R(0, 0, 375, 812)) },
        { elementId: 'p1', kind: 'inner', selector: '#card1', rect: R(10, 100, 351, 80), anchors: Anchor.anchorsOfRect(R(10, 100, 351, 80), { density: 'coarse' }) },
        { elementId: 'p1', kind: 'inner', selector: '#card2', rect: R(10, 200, 351, 80), anchors: Anchor.anchorsOfRect(R(10, 200, 351, 80), { density: 'coarse' }) },
    ];
    const firstLayer = AnchorSession.pageLevelHosts(hosts);
    assertEqual(firstLayer.length, 1, '第一层只应有页面框自身');
    assertEqual(firstLayer[0].kind, 'element', '第一层必须是元素级宿主');
    assertEqual(firstLayer[0].anchors.length, 12, '页面框应有 12 个锚点');
});

test('鼠标在页面框内但不在任何元素上：第二层为空', () => {
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: R(0, 0, 375, 812), anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#card1', rect: R(10, 100, 351, 80), anchors: [] },
    ];
    // 点在 (5, 500)：在页面框内，但不在 card1 里
    const second = AnchorSession.hoveredInnerHost({ x: 5, y: 500 }, hosts);
    assertEqual(second, null, '空白处不应有高亮层');
});

test('鼠标在某张卡片上：第二层只返回那一个元素', () => {
    const card1 = R(10, 100, 351, 80);
    const card2 = R(10, 200, 351, 80);
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: R(0, 0, 375, 812), anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#card1', rect: card1, anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#card2', rect: card2, anchors: [] },
    ];
    const hit = AnchorSession.hoveredInnerHost({ x: 100, y: 140 }, hosts);
    assert(hit, '应命中某个内部元素');
    assertEqual(hit.selector, '#card1', '应命中鼠标所在的 card1');
});

test('命中多个嵌套元素时取最内层（面积最小）', () => {
    // 外层大容器把内层小卡片包住，两者都包含该点 —— 必须选内层，
    // 否则用户永远连不到具体按钮，只能连到那个大盒子。
    const outer = R(0, 0, 375, 400);
    const innerEl = R(20, 100, 200, 60);
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: R(0, 0, 375, 812), anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#outer', rect: outer, anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#inner', rect: innerEl, anchors: [] },
    ];
    const hit = AnchorSession.hoveredInnerHost({ x: 100, y: 130 }, hosts);
    assertEqual(hit.selector, '#inner', '应取面积最小的最内层');
});

test('三层嵌套时取最内层（不是最外层也不是中间层）', () => {
    // 这条比上一条更严：只比较"最外 vs 最内"时，某些错误实现也能蒙对；
    // 加一层中间元素后，只有"严格取最小面积"才能通过。
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: R(0, 0, 375, 812), anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#lvl1', rect: R(0, 0, 375, 400), anchors: [] },   // 150000
        { elementId: 'p1', kind: 'inner', selector: '#lvl2', rect: R(10, 80, 300, 200), anchors: [] },  // 60000
        { elementId: 'p1', kind: 'inner', selector: '#lvl3', rect: R(30, 110, 180, 100), anchors: [] },  // 18000
    ];
    const hit = AnchorSession.hoveredInnerHost({ x: 100, y: 150 }, hosts);
    assertEqual(hit.selector, '#lvl3', '三层时应取面积最小的第 3 层');
});

test('命中元素级（页面框）不算第二层', () => {
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: R(0, 0, 375, 812), anchors: [] },
    ];
    assertEqual(AnchorSession.hoveredInnerHost({ x: 100, y: 400 }, hosts), null,
        '只命中页面框本身时，第二层应为空');
});

test('第二层合并后 = 第一层 12 + 高亮元素 ≤4', () => {
    const pageRect = R(0, 0, 375, 812);
    const cardRect = R(10, 100, 351, 80);
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: pageRect, anchors: Anchor.anchorsOfRect(pageRect) },
        { elementId: 'p1', kind: 'inner', selector: '#card', rect: cardRect, anchors: Anchor.anchorsOfRect(cardRect, { density: 'coarse' }) },
    ];
    const first = AnchorSession.pageLevelHosts(hosts);
    const second = AnchorSession.hoveredInnerHost({ x: 100, y: 140 }, hosts);
    const total = first.length ? first[0].anchors.length : 0;
    assertEqual(total, 12, '第一层 12 个锚点恒亮');
    assertEqual(second.anchors.length, 4, '第二层该元素 4 个锚点');
    assert(total + second.anchors.length <= 16,
        `默认态最多 ${total + second.anchors.length} 个锚点（对比旧实现一次性 128 个）`);
});

// ================================================================ 27. 端点解析唯一入口（修「预览和实际不一样」）

suite('27. 端点解析唯一入口（预览 === 落线）');

/** 造一个假页面元素 */
function pageEl(id, x, y, w, h) {
    return { id, type: 'page', position: { x, y }, width: w, height: h };
}

const END_A = pageEl('A', 100, 100, 375, 812);
const END_B = pageEl('B', 700, 100, 375, 812);

/** 注入依赖：getElement + getInnerRect */
function deps(innerRects = {}) {
    return {
        getElement: (id) => ({ A: END_A, B: END_B }[id] || null),
        getInnerRect: (eid, sel) => innerRects[eid + '|' + sel] || null,
    };
}

test('元素级锚点：两端矩形就是页面框本身', () => {
    const r = AnchorSession.resolveEndpoints('A', 'B',
        { elementId: 'A', kind: 'element', side: 'right', t: 0.25 },
        { elementId: 'B', kind: 'element', side: 'left', t: 0.75 },
        deps());
    assert(r, '应解析成功');
    assertEqual(r.fromRect, { x: 100, y: 100, width: 375, height: 812 }, '起点用 A 的矩形');
    assertEqual(r.toRect, { x: 700, y: 100, width: 375, height: 812 }, '终点用 B 的矩形');
    assertEqual(r.fromSide, { side: 'right', t: 0.25 }, '起点描述符应透传');
    assertEqual(r.toSide, { side: 'left', t: 0.75 }, '终点描述符应透传');
});

test('⚠️ 内层锚点必须解析成子元素矩形，而不是页面框矩形', () => {
    // 这就是「预览和实际不一样」的根因：
    //   预览用页面框矩形 → top@0.5 落在 y=100 附近
    //   落线用内部元素矩形 → 落在 y=527.5
    const inner = { x: 713, y: 527.5, width: 349, height: 52 };
    const r = AnchorSession.resolveEndpoints('A', 'B',
        { elementId: 'A', kind: 'element', side: 'right', t: 0.25 },
        { elementId: 'B', kind: 'inner', selector: '#hotList > div:nth-of-type(5)', side: 'top', t: 0.5 },
        deps({ 'B|#hotList > div:nth-of-type(5)': inner }));

    assert(r, '应解析成功');
    assertEqual(r.toRect, inner,
        '终点必须用**内部子元素**的矩形；用页面框矩形正是那个 bug');

    // top 边的锚点在矩形顶边再外移 6px：527.5 - 6 = 521.5
    const pt = Anchor.resolvePoint(r.toRect, r.toSide);
    assertClose(pt.y, inner.y - Anchor.OFFSET, 1e-9,
        '终点锚点应落在内部元素顶部外侧，而不是页面框顶部（y≈94）');
    assert(pt.y > 400,
        `终点 y=${pt.y} 必须远离页面框顶部；用错矩形会得到 ~94`);
});

test('⚠️ 预览与落线用同一入口时，端点解析结果必须完全一致', () => {
    // 这条是**行为**断言，不是源码文本检查 —— 源码里只要还调用着
    // resolveEndpoints 就可能已经分叉（把调用结果丢掉、自己另算一套）。
    // 真正的不变量是：两次解析同一组锚点，得到的端点相同。
    const inner = { x: 713, y: 527.5, width: 349, height: 52 };
    const d = deps({ 'B|#x': inner });
    const fromA = { elementId: 'A', kind: 'element', side: 'right', t: 0.25 };
    const toB = { elementId: 'B', kind: 'inner', selector: '#x', side: 'top', t: 0.5 };

    const previewLike = AnchorSession.resolveEndpoints('A', 'B', fromA, toB, d);
    const finalLike = AnchorSession.resolveEndpoints('A', 'B', fromA, toB, d);

    assertEqual(previewLike, finalLike, '预览与落线的解析结果必须逐位相同');
    assertEqual(previewLike.toRect, inner, '两端都必须解析到内部元素矩形');

    // 端点坐标也必须一致
    const p1 = Anchor.resolvePoint(previewLike.toRect, previewLike.toSide);
    const p2 = Anchor.resolvePoint(finalLike.toRect, finalLike.toSide);
    assertClose(p1.x, p2.x, 1e-9, '终点 x 一致');
    assertClose(p1.y, p2.y, 1e-9, '终点 y 一致');
});

test('⚠️ 两层模型：内部宿主不参与第一层（不能又变成一次全亮）', () => {
    const pageRect = R(0, 0, 375, 812);
    const hosts = [];
    for (let i = 0; i < 30; i++) {
        const r = R(10, i * 25, 351, 80);
        hosts.push({
            elementId: 'p1', kind: 'inner', selector: '#c' + i, rect: r,
            anchors: Anchor.anchorsOfRect(r, { density: 'coarse' }),
        });
    }
    hosts.unshift({
        elementId: 'p1', kind: 'element', rect: pageRect,
        anchors: Anchor.anchorsOfRect(pageRect),
    });

    const first = AnchorSession.pageLevelHosts(hosts);
    assertEqual(first.length, 1, '第一层只有页面框自身');
    assertEqual(first[0].anchors.length, 12, '且只有 12 个锚点');

    // 第二层只取一个 → 总数必须远小于「一次全亮」
    const second = AnchorSession.hoveredInnerHost({ x: 100, y: 40 }, hosts);
    assert(second, '应命中某个内部元素');
    const total = first[0].anchors.length + second.anchors.length;
    assertEqual(total, 16, '默认态总共 16 个锚点，而不是 30 宿主全亮的 132 个');
});

test('同一组锚点，多次解析结果完全一致（无隐藏随机性）', () => {
    const inner = { x: 713, y: 527.5, width: 349, height: 52 };
    const a = { elementId: 'A', kind: 'element', side: 'right', t: 0.25 };
    const b = { elementId: 'B', kind: 'inner', selector: '#x', side: 'top', t: 0.5 };
    const d = deps({ 'B|#x': inner });
    const r1 = AnchorSession.resolveEndpoints('A', 'B', a, b, d);
    const r2 = AnchorSession.resolveEndpoints('A', 'B', a, b, d);
    assertEqual(r1, r2, '同一输入必须得到同一输出');
});

test('内部宿主解析不到时退回页面框（线要可见，不能整条消失）', () => {
    const r = AnchorSession.resolveEndpoints('A', 'B',
        null,
        { elementId: 'B', kind: 'inner', selector: '#missing', side: 'top', t: 0.5 },
        deps());   // 没有任何 innerRect
    assert(r, '应仍能解析');
    assertEqual(r.toRect, { x: 700, y: 100, width: 375, height: 812 },
        '解析不到内部宿主应退回页面框，而不是返回 null');
});

test('元素不存在时返回 null（调用方据此跳过渲染）', () => {
    assertEqual(AnchorSession.resolveEndpoints('A', 'MISSING', null, null, deps()), null,
        '终点元素不存在应返回 null');
    assertEqual(AnchorSession.resolveEndpoints('MISSING', 'B', null, null, deps()), null,
        '起点元素不存在应返回 null');
});

test('无锚点时两端都用页面框矩形（旧数据兼容）', () => {
    const r = AnchorSession.resolveEndpoints('A', 'B', null, null, deps());
    assert(r, '旧连接线没有锚点字段，也必须能解析');
    assertEqual(r.fromRect, { x: 100, y: 100, width: 375, height: 812 });
    assertEqual(r.toRect, { x: 700, y: 100, width: 375, height: 812 });
    assertEqual(r.fromSide, null, '无锚点时描述符为 null，路由会退回整元素模式');
});

// ================================================================ 28. 静态契约：只有一处解析逻辑

suite('28. 静态契约（禁止再写第二份解析）');

test('renderPreview 必须真正使用 resolveEndpoints 的结果（而非调用后丢弃另算一套）', () => {
    // ⚠️ 只检查"源码里有没有 resolveEndpoints 这个词"是不够的 ——
    //    把调用结果丢掉、自己另算一套，字样照样在，缺陷照样漏。
    //    真正的契约是：**ep 的字段被用来算路径**。
    const src = fs.readFileSync(path.join(ROOT, 'js', 'tools', 'tools-connector.js'), 'utf8');
    const m = src.match(/renderPreview\(\)\s*\{([\s\S]*?)\n    \},\n/);
    assert(m, '应能找到 renderPreview');
    const body = m[1];

    assert(/resolveEndpoints/.test(body), '必须调用 resolveEndpoints');
    // ⚠️ 两端都必须用 —— 只查"任一出现"会被"只用元素级矩形"的注入蒙混过关，
    //    而那正是预览/落线分叉的真实形态（inner 端被换成页面框矩形）。
    assert(/ep\.fromRect/.test(body), '起点矩形必须来自 ep');
    assert(/ep\.toRect/.test(body), '终点矩形必须来自 ep');
    assert(/ep\.fromSide/.test(body) && /ep\.toSide/.test(body), '两端路由描述符必须来自 ep');
    assert(/routeWithAnchors\(\s*fromRect\s*,\s*toRect\s*,\s*fromSide\s*,\s*toSide/.test(body),
        '预览路由必须用解析出的 fromRect/toRect/fromSide/toSide');
    // 兜底分支只能出现在 ep 为 null 时
    assert(/if \(ep\)/.test(body), '应有 ep 有效分支与失效兜底分支');
});

test('渲染器必须用 resolveEndpoints 的结果算路径', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    const m = src.match(/routeFor\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 routeFor');
    assert(/resolveEndpoints/.test(m[1]), '必须调用 resolveEndpoints');
    assert(/ep\.fromRect|ep\.toRect/.test(m[1]),
        '必须把 ep 的矩形传给 routeFromAnchor —— 调用后丢弃等于没调用');
});

test('renderAnchors 必须真正使用两层结果（而非调用后丢弃）', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    const m = src.match(/renderAnchors\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 renderAnchors');
    const body = m[1];
    assert(/pageLevelHosts/.test(body) && /hoveredInnerHost/.test(body), '必须调用两个分层函数');
    assert(/layers\.push\(inner\)/.test(body),
        '第二层必须真的被 push 进 layers —— 不 push 就等于又变成一次全亮');
    assert(/for \(const host of layers\)/.test(body), '必须遍历 layers（而不是 hosts）');
});

// ================================================================ 29. 实测矩形（修「页面级锚点只显示了一半」）

suite('29. 实测矩形：锚点必须跟随页面实际高度');

const OVERFLOW_EL = pageEl('A', 100, 100, 375, 812);

test('⚠️ 内容溢出声明高度时，锚点矩形要用实际高度', () => {
    // 浏览器实测：页面去滚轮后 DOM 实际高 1699（画布坐标），
    // 但 element.height 仍是 812。差 887px —— 上下两边的锚点全部错位。
    const domRect = { width: 375 * 0.62, height: 1699 * 0.62 };  // zoom=0.62 的屏幕像素
    const r = AnchorSession.measuredRectOf(OVERFLOW_EL, {
        getDomRect: () => domRect,
        view: { zoom: 0.62, pan: { x: 0, y: 0 } },
    });
    assert(r.height > 1698 && r.height < 1700,
        '应采用实测高度 1699（DOM 屏幕高 / zoom），而不是声明值 812；实得 ' + r.height);
    assertEqual(r.x, 100, '左上角仍取声明值（位置由 pan/zoom 决定，与高度无关）');
});

test('实测高度让上下两边锚点落在真实边缘上', () => {
    const domRect = { width: 375 * 0.62, height: 1699 * 0.62 };
    const r = AnchorSession.measuredRectOf(OVERFLOW_EL, {
        getDomRect: () => domRect,
        view: { zoom: 0.62, pan: { x: 0, y: 0 } },
    });
    const anchors = Anchor.anchorsOfRect(r);

    const bottom = anchors.filter(a => a.side === 'bottom');
    assertEqual(bottom.length, 3, '下边应有 3 个锚点');
    const bottomPt = Anchor.resolvePoint(r, bottom[0]);
    assertClose(bottomPt.y, r.y + r.height + Anchor.OFFSET, 1e-9,
        '下边锚点必须贴真实底边（y=100+1699+6），而不是声明底边（y=918）');

    // 用声明高度算会得到 y=918 —— 与真实底边差 887
    const wrong = Anchor.resolvePoint({ x: 100, y: 100, width: 375, height: 812 },
        { side: 'bottom', t: 0.5 });
    assert(bottomPt.y - wrong.y > 800, '确认两者确实差 800+px —— 这就是原 bug 的量级');
});

test('读不到 DOM 时退回声明值（不抛异常，线仍要可见）', () => {
    const r = AnchorSession.measuredRectOf(OVERFLOW_EL, { getDomRect: () => null });
    assertEqual(r, { x: 100, y: 100, width: 375, height: 812 },
        '拿不到 DOM 矩形时应退回声明值');
});

test('实测值比声明值更小时仍用声明值（元素被折叠/隐藏的防护）', () => {
    // 元素被折叠（display:none 之类）时 DOM 高度可能接近 0。
    // 若直接采用，锚点会塌缩到元素内部，视觉上像"锚点消失了"。
    for (const domH of [0, 1, 50, 300, 811, 812]) {
        const domRect = { width: 375 * 0.62, height: domH * 0.62 };
        const r = AnchorSession.measuredRectOf(OVERFLOW_EL, {
            getDomRect: () => domRect,
            view: { zoom: 0.62, pan: { x: 0, y: 0 } },
        });
        assertEqual(r.height, 812,
            '实测 ' + domH + ' ≤ 声明 812 时必须用声明值；否则元素一折叠锚点就塌了');
    }
});

test('实测值确实更大时才采用（正向保护）', () => {
    const domRect = { width: 375 * 0.62, height: 1699 * 0.62 };
    const r = AnchorSession.measuredRectOf(OVERFLOW_EL, {
        getDomRect: () => domRect,
        view: { zoom: 0.62, pan: { x: 0, y: 0 } },
    });
    assert(r.height > 812, '实测更大时必须采用');
});

test('hostsOf 必须使用实测矩形（否则这里一改就白改）', () => {
    // hostsOf 是渲染与命中共用的入口；若它还用声明值，
    // measuredRectOf 再对也没用。这条锁住调用关系。
    const src = fs.readFileSync(path.join(ROOT, 'js', 'connectors', 'anchor-session.js'), 'utf8');
    const m = src.match(/hostsOf\(pageElement\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 hostsOf');
    assert(/measuredRectOf\(/.test(m[1]),
        'hostsOf 必须调用 measuredRectOf；直接用 pageElement.height 会让锚点错位');
});

// ================================================================ 30. 锚点屏幕尺寸恒定（对齐 MasterGo）

suite('30. 锚点屏幕尺寸恒定（修「缩放时太大」）');

test('⚠️ 半径不得除以 zoom（缩小会反向放大圆点）', () => {
    // 浏览器实测：r = RADIUS / zoom 时
    //   zoom=0.25 → 直径 40px；zoom=0.5 → 20px；zoom=1 → 10px
    // 而 MasterGo 缩放到 12% 时实测仍是 10–11px。
    // 根因：锚点层是 position:fixed，不受画布缩放影响，
    //      此时再除以 zoom 等于把圆点**放大**。
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    const m = src.match(/renderAnchors\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 renderAnchors');
    assert(!/RADIUS\s*\/\s*\(?\s*view\s*\.\s*zoom/.test(m[1]),
        'r 不得除以 zoom —— 实测会让 zoom=0.25 时圆点涨到 40px，而 MasterGo 恒为 10px');
    assert(/RADIUS/.test(m[1]), 'r 应直接用 AnchorProvider.RADIUS（屏幕单位）');
});

test('描边宽度同样不应跟随 zoom 放大', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'element-manager', 'element-renderer.js'), 'utf8');
    assert(!/stroke-width['"]\s*,\s*['"]?2/.test(src.replace(/stroke-width['"]\s*,\s*['"]2/, 'stroke-width\', \'1.5')),
        '描边应为 1.5px（MasterGo 细环）；2px 在小圆点上显得过粗');
});

// ================================================================ 31. fixed 元素锚点失效（修「tab 栏没有锚点」）

suite('31. 自适应撑高后重算内部宿主（修「底部 tab 栏没有锚点」）');

/**
 * 造一个带 getRect 的假节点（与 16 组同款）。
 *
 * ⚠️ 每个节点都带 `nth`（同标签兄弟序号）并写进 selector ——
 *    不带的话 body 下两个 div 会得到**同一个** selector
 *    （'body > div'），宿主列表里就无法区分谁是等大根容器、
 *    谁是边重合的嵌套容器，断言会张冠李戴。
 */
function fnode(tagName, rect, children = []) {
    const el = {
        tagName: tagName.toUpperCase(),
        id: '',
        children,
        parentElement: null,
        getBoundingClientRect: () => ({ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }),
    };
    for (const c of children) c.parentElement = el;
    return el;
}

/**
 * 拼出与 AnchorBridge.cssPath 同格式的完整选择器路径。
 *
 * ⚠️ 必须现算 nth-of-type：fnode 里父指针是在**子节点建完之后**才补上的，
 *    构造期读 parentElement 只会拿到 null。
 * ⚠️ 必须带 nth-of-type：body 下两个 div 若都渲染成 'body > div'，
 *    宿主列表里就分不清谁是等大根容器、谁是边重合的嵌套层，断言会张冠李戴。
 */
function fsel(node) {
    const parts = [];
    let cur = node;
    while (cur && cur.tagName && String(cur.tagName).toUpperCase() !== 'BODY') {
        const tag = String(cur.tagName).toLowerCase();
        const parent = cur.parentElement;
        if (parent) {
            const same = parent.children.filter(c => c.tagName === cur.tagName);
            parts.unshift(same.length > 1
                ? `${tag}:nth-of-type(${same.indexOf(cur) + 1})`
                : tag);
        } else {
            parts.unshift(tag);
        }
        cur = parent;
    }
    return 'body' + (parts.length ? ' > ' + parts.join(' > ') : '');
}

// 造一棵带 fixed tabbar 的假页面（CLIP_PAGE = 375×812，pageArea = 304500）：
//
//   body > div:nth-of-type(1)  ┐ 两者边**完全重合** → ③ 应只留一个
//     └ div:nth-of-type(1)    ┘
//         ├ li ×2 (184×80)    位置不同 → 两个都留
//         └ div 60×30
//   body > div:nth-of-type(2)  (375×1600, ratio 1.97) → ② 等大根容器，应被剔除
//   body > nav                  (375×52,  ratio 0.06) → fixed tabbar，应保留
function parityTree() {
    // ⚠️ list 与 wrap 边完全重合（面积也相等）→ 触发"保留先遍历到的"。
    //    另加一个**边几乎重合但面积更小**的 third，去重时会把 list 顶掉 ——
    //    只放前一种的话，"顶掉"那段代码根本不会执行，AE 缺陷照样逃得过去。
    const list = fnode('div', [0, 100, 200, 400], [
        fnode('li', [8, 120, 184, 80]),
        fnode('li', [8, 220, 184, 80]),
        fnode('div', [210, 110, 60, 30]),
    ]);
    const wrap = fnode('div', [0, 100, 200, 400], [list]);
    // 边与 list 几乎重合（差 4px < tol 8）且面积更小 → 应顶掉 list
    const third = fnode('div', [4, 104, 192, 392], [fnode('span', [10, 110, 180, 80])]);
    const big = fnode('div', [0, 0, 375, 1600]);       // ② 的靶子
    const nav = fnode('nav', [0, 1647, 375, 52]);      // fixed tabbar，撑高后的视口底部
    const body = fnode('body', [0, 0, 375, 1699], [wrap, big, nav, third]);
    return {
        body, big, nav, wrap, list, third,
        BIG_SEL: fsel(big),      // 'body > div:nth-of-type(2)'
        DUP_SEL: fsel(list),     // 与 wrap 边重合，应只留一个
        LI_SELS: list.children.filter(c => c.tagName === 'LI').map(fsel),
    };
}

test('实测高度变了就丢掉内部宿主缓存（fixed 锚点唯一的失效信号）', () => {
    // ⚠️ 浏览器实测根因链：
    //   1. 缓存键是 `${id}@${declaredW}x${declaredH}`，只含**声明**尺寸；
    //   2. 自适应只写 div.style.height，声明尺寸永远不变 → 缓存永不失效；
    //   3. iframe 里的 position:fixed 元素（tabbar / pc 顶栏）坐标绑在**视口**上，
    //      首次预热时 iframe 只有一屏 → 缓存里的 tabbar 停在 y=843，
    //      撑高到 1699 后其实已经在 y=1777，偏差 934px。
    //   所以"高度真的变了"必须触发 invalidate。
    const el = pageEl('elem_2', 0, 0, 375, 812);
    const key = AnchorSession._cacheKey(el);
    AnchorSession._innerCache.set(key, [{ selector: '#nav', rect: R(0, 813, 375, 52) }]);
    assert(AnchorSession._innerCache.has(key), '前置条件：缓存已就绪');

    AnchorSession.invalidate('elem_2');
    assert(!AnchorSession._innerCache.has(key),
        `实测高度变化后必须清掉 ${key}，否则 fixed 元素的锚点永远停在旧视口`);
});

test('高度变化 → 重算链是「失效 → 重新预热 → 重绘」，缺一不可', () => {
    // 三步散在三个文件里，任一步漏掉，用户看到的都是"tab 栏没有锚点"：
    //   canvas-editor.js  →  比较 prev.h 再调 scheduleAnchorRefresh
    //   canvas-editor.js  →  invalidate + primeInnerHosts
    //   canvas-editor.js  →  回调里 renderAnchors（仅在悬停时）
    const src = fs.readFileSync(path.join(ROOT, 'js', 'canvas-editor.js'), 'utf8');

    const m = src.match(/scheduleAnchorRefresh[\s\S]*?\n    \},/);
    assert(m, '应能找到 scheduleAnchorRefresh');
    const body = m[0];

    assert(/AnchorSession\.invalidate\(/.test(body),
        '重算前必须 invalidate —— 否则读到的是旧视口缓存的 fixed 坐标');
    assert(/AnchorSession\.primeInnerHosts\(/.test(body),
        '必须重新 primeInnerHosts —— invalidate 只是清空，不取新数据');
    assert(/setTimeout\(/.test(body),
        '必须去抖 —— page-autofit 在内容稳定前会连着报好几次');

    // 触发点：proto-page-height 分支里必须比较 prev 高度
    assert(/prev\.h\s*!==\s*height/.test(src),
        'proto-page-height 分支必须比较前后实测高度；声明尺寸不变时这是唯一的失效信号');
});

test('去抖按 elementId 独立（多个页面同时撑高不会互相取消）', () => {
    // 若用单个全局定时器，A 元素的上报会把 B 元素的刷新也吞掉，
    // 表现为"有些页面的锚点一直不对"。
    const src = fs.readFileSync(path.join(ROOT, 'js', 'canvas-editor.js'), 'utf8');
    assert(/_anchorRefreshTimers\s*\[elementId\]/.test(src),
        '去抖定时器必须按 elementId 存，不能是单一全局定时器');
    assert(/clearTimeout\(prevTimer\)/.test(src),
        '重复上报必须先清掉自己上一次的定时器');
});

suite('31b. canvas-editor.js 真机执行：proto-page-height 必须触发锚点重算');

/**
 * 把 js/canvas-editor.js 塞进沙箱里真跑，驱动它的 message 监听器。
 *
 * ⚠️ 为什么要真跑（而不是 grep 源码）：
 *   把 `const prev = ...` 那一行删掉、把 `this._anchorRefreshTimers[elementId]`
 *   改成 `.__all` —— 后面那些**该有的字符串一个都没少**，
 *   静态用例照样全绿（实测就是这样逃过检查的）。
 *   只有真投一条 proto-page-height 消息，才知道它到底会不会重算。
 *
 * @param {number[]} heightReports 依次上报的实测高度
 * @returns {{calls, editor, flushTimers}} 调用序列与可控定时器
 */
function runCanvasEditor(heightReports, opts = {}) {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'canvas-editor.js'), 'utf8');
    const calls = [];
    const listeners = [];
    const pending = [];

    const div = { dataset: { elementId: 'elem_2' }, style: {} };
    const iframe = { name: 'proto-canvas-elem_2', isConnected: true, closest: () => div };

    // ⚠️ 这三个必须挂到 window 上而不是裸标识符上：
    //    canvas-editor.js 写的是 `window.ProtoAutoFit._cache[elementId]`
    //    和 `if (window.Debug)`，实测挂错地方就静默不生效（第四例老坑）。
    const anchorSession = {
        invalidate(id) { calls.push(['invalidate', id]); },
        primeInnerHosts(el, iframeEl, cb) {
            calls.push(['prime', el && el.id]);
            if (cb) cb();
        },
    };
    const protoAutoFit = {
        _cache: {},
        remember(id, box) { protoAutoFit._cache[id] = box; },
        apply(id, d) { d.style.height = `${protoAutoFit._cache[id].h}px`; },
        clear() {},
    };

    // 可控定时器：把回调攒起来，由测试自己 flush —— 去抖是否生效因此可见
    const fakeSetTimeout = (fn) => { pending.push(fn); return pending.length; };
    const fakeClearTimeout = (t) => { if (pending[t - 1]) pending[t - 1] = null; };

    const el = pageEl('elem_2', 100, 200, 375, 812);
    const documentStub = {
        addEventListener(type, fn) { listeners.push({ type, fn }); },
        getElementById: () => null, querySelector: () => null,
        // message 监听器靠它按 name 找 iframe
        querySelectorAll: (sel) => (sel === 'iframe[name]' ? [iframe] : []),
        documentElement: { dataset: {} }, body: { classList: { add() {}, remove() {} } },
    };
    const windowStub = { addEventListener(type, fn) { listeners.push({ type, fn }); } };
    windowStub.window = windowStub;
    windowStub.document = documentStub;
    windowStub.Debug = { log() {}, warn() {}, error() {} };
    windowStub.ProtoAutoFit = protoAutoFit;

    const sandbox = {
        console, setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout,
        localStorage: { getItem: () => null, setItem() {} },
        Debug: windowStub.Debug,
        AnchorSession: anchorSession,
        ElementManager: { getElement: (id) => (id === 'elem_2' ? el : null), renderAnchors() {} },
        ToolsConnector: { hoverElementId: opts.hovering ? 'elem_2' : null, state: { cursor: { x: 0, y: 0 } } },
        HistoryManager: { saveState() {} }, Storage: { save() {} },
        document: documentStub, window: windowStub,
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
    };
    sandbox.globalThis = sandbox;
    sandbox.AnchorSession = anchorSession;

    const ctx = vm.createContext(sandbox);
    vm.runInContext(src, ctx, { filename: 'canvas-editor.js' });

    // ⚠️ 顶层 `const CanvasEditor` 活在 vm 的**全局词法作用域**里，
    //    既不在 sandbox 上也不在 globalThis 上（同一个老坑，第四例）——
    //    只能在 vm 内部 eval 才能取到。
    const editor = vm.runInContext(
        'typeof CanvasEditor !== "undefined" ? CanvasEditor : null', ctx);
    assert(editor, 'canvas-editor.js 应导出 CanvasEditor');
    assert(typeof editor.scheduleAnchorRefresh === 'function',
        'CanvasEditor 必须提供 scheduleAnchorRefresh');

    // message 监听器注册在 bindGlobalShortcuts() 内部，必须显式调用
    if (typeof editor.bindGlobalShortcuts === 'function') editor.bindGlobalShortcuts();

    const msgListener = listeners.find(l => l.type === 'message');
    assert(msgListener, 'canvas-editor.js 应注册 window message 监听器');

    for (const h of heightReports) {
        // ⚠️ key 必须与 iframe.name 一致：监听器靠它定位 iframe，
        //    对不上会在 `if (!iframe) return` 处静默退出 —— 测不出任何东西。
        msgListener.fn({
            data: { type: 'proto-page-height', key: iframe.name, height: h, width: 375 },
        });
    }
    return {
        calls, editor, iframe,
        pendingCount: () => pending.filter(Boolean).length,
        flushTimers() {
            const q = pending.splice(0, pending.length);
            for (const fn of q) if (fn) fn();
        },
    };
}

test('⚠️ 撑高后必须走「失效 → 重新预热」，真投一条消息就能观测到', () => {
    const r = runCanvasEditor([1699]);       // 1699 ≠ 缓存里的 812
    r.flushTimers();
    const kinds = r.calls.map(c => c[0]);
    assert(kinds.includes('invalidate'),
        '实测高度变化后必须 invalidate 内部宿主缓存（fixed 锚点唯一的失效信号）');
    assert(kinds.includes('prime'),
        'invalidate 只清空不取新数据，必须紧跟一次 primeInnerHosts');
    assertEqual(r.calls.find(c => c[0] === 'prime')[1], 'elem_2', '必须给正确的元素重新预热');
});

test('⚠️ 去抖：连报三次同一个高度只重算一次', () => {
    // page-autofit.js 内容未稳前会连着报好几次（ResizeObserver + rAF）。
    // 不去抖就是三次全量重取 + 三次 invalidate。
    const r = runCanvasEditor([1699, 1699, 1699]);
    r.flushTimers();
    assertEqual(r.calls.filter(c => c[0] === 'invalidate').length, 1,
        `连报三次同一高度只应重算一次，实际 ${r.calls.filter(c => c[0] === 'invalidate').length} 次`);
});

test('⚠️ 去抖按 elementId 分开（A 的上报不能吞掉 B 的重算）', () => {
    // ⚠️ 关键点：读和写**必须用同一个 key**。
    //    只断言"出现过的键集合里有没有 elementId"是抓不到这个缺陷的 ——
    //    把读改成 `[__all]` 而写仍是 `[elementId]`，集合里照样只有 elementId，
    //    而运行时 `clearTimeout` 已经在清另一个槽位的定时器了（实测漏过一次）。
    //    正确判据：clearTimeout 用的那个 key === 赋值用的那个 key。
    const src = fs.readFileSync(path.join(ROOT, 'js', 'canvas-editor.js'), 'utf8');
    const m = src.match(/scheduleAnchorRefresh\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 scheduleAnchorRefresh');
    const body = m[0];

    const readKey = (body.match(/const prevTimer = this\._anchorRefreshTimers\[([^\]]+)\]/) || [])[1];
    const writeKey = (body.match(/this\._anchorRefreshTimers\[([^\]]+)\]\s*=\s*setTimeout/) || [])[1];
    assert(readKey, '应能找到"读上一轮定时器"的那一行');
    assert(writeKey, '应能找到"写入本轮定时器"的那一行');
    assertEqual(readKey, writeKey,
        `clearTimeout 与赋值必须用同一个 key（读=${readKey} 写=${writeKey}）；不一致时旧定时器永远清不掉`);
    assertEqual(readKey, 'elementId',
        `去抖槽位必须按 elementId 存，实际是 "${readKey}"`);
});

test('⚠️ 不同元素的去抖互不干扰（行为层面：连报三次只重算一次）', () => {
    // 去抖生效的**可见**证据：三次上报合并成一个待执行重算。
    const r = runCanvasEditor([1699, 1699, 1699]);
    assertEqual(r.pendingCount(), 1,
        `三次上报应合并成一个待执行重算，实际 ${r.pendingCount()} 个 —— 去抖没生效`);
    r.flushTimers();
    assertEqual(r.calls.filter(c => c[0] === 'invalidate').length, 1,
        '去抖后只应真正重算一次');
});

test('⚠️ 高度没变就不重算（否则每次上报都在全量重取）', () => {
    // 第一次预热就把高度报成 1699，此后所有重复上报都应被静默。
    const r = runCanvasEditor([1699, 1699], {});
    r.flushTimers();
    assertEqual(r.calls.filter(c => c[0] === 'invalidate').length, 1,
        '高度未变时不应重复 invalidate');
});

// ================================================================ 32. direct 与 bridge 两条取数路径的筛选完全一致

suite('32. direct 与 bridge 两条取数路径的筛选完全一致');

// 造一棵带 fixed tabbar 的假页面 —— 见 suite 31 末尾的 parityTree()
test('等大根容器在两条路径下都被剔除（http 58 / file:// 72 的实测差异源）', () => {
    const { body, big, BIG_SEL } = parityTree();
    const direct = Bridge.collectInnerHosts(body, {
        pageElement: CLIP_PAGE, getRect: n => n.getBoundingClientRect(),
    });
    const bigRect = big.getBoundingClientRect();
    const ratio = (bigRect.width * bigRect.height) / (CLIP_PAGE.width * CLIP_PAGE.height);
    assert(ratio > Bridge.HOST_VS_PAGE_RATIO,
        `前置条件：这棵"等大根容器"占比 ${ratio.toFixed(2)} 应远高于阈值 ${Bridge.HOST_VS_PAGE_RATIO}`);

    // ⚠️ 两条路径**分别**独立断言，不能只比输出是否相等 ——
    //    若"等大剔除"被两边同时删掉，输出照样相等，这��用例就抓不到。
    const bridged = runTopbarChildSide(Array.from(body.children));
    assert(!direct.some(h => h.selector === BIG_SEL), 'direct 路径必须剔除等大根容器');
    assert(!bridged.some(h => h.selector === BIG_SEL), '子侧路径必须剔除等大根容器');
    // 反向自检：不传 pageElement 时它必须出现，否则"被剔除"可能只是没进表
    const noRatio = Bridge.collectInnerHosts(body, { getRect: n => n.getBoundingClientRect() });
    assert(noRatio.some(h => h.selector === BIG_SEL), '前置条件：不传 pageElement 时它应出现');
});

test('边重合的嵌套容器在两条路径下都只留一个', () => {
    const { body, wrap, list, third, LI_SELS } = parityTree();
    const direct = Bridge.collectInnerHosts(body, {
        pageElement: CLIP_PAGE, getRect: n => n.getBoundingClientRect(),
    });
    const bridged = runTopbarChildSide(Array.from(body.children));

    // ⚠️ 这一组里有三个边几乎重合的节点：wrap / list（完全重合、面积相等）
    //    和 third（差 4px < tol 8、面积更小）。去重的规则是"边重合的一组只留最小的"，
    //    所以最终**一个都不剩**（third 顶掉了 list，wrap 被 third 顶掉）。
    //
    //    因此这里不能断言"留的是某一个特定节点"—— 那样会让实现换个遍历顺序就假失败。
    //    该锁住的是：边重合的成员**不得同时出现两个**。
    const near = [wrap, list, third].map(fsel);
    for (const [name, hs] of [['direct', direct], ['子侧', bridged]]) {
        const overlap = hs.filter(h => near.includes(h.selector));
        assert(overlap.length <= 1,
            `${name}：边重合的一组最多只能留一个，实际 ${overlap.length} 个：${overlap.map(h => h.selector).join(' / ')}`);
        for (const s of LI_SELS) {
            assertEqual(hs.filter(h => h.selector === s).length, 1,
                `${name}：位置不同的 ${s} 应保留（不受去重叠牵连）`);
        }
    }
    assertEqual(bridged.map(h => h.selector).sort(), direct.map(h => h.selector).sort(),
        '两条路径必须给出同一批宿主');
});

test('⚠️ 并排容器不会被"顶掉"（面积相等不替换 → 与 direct 模式同序）', () => {
    // 两个面积相等、边不重合的容器必须**都**留下。
    // 若把去重叠里的 `h.area < out[idx].area` 写成 `<=`，或让相等也替换，
    // 输出会依赖遍历顺序，子侧与 direct 就会分叉（实测分叉过一次）。
    const a = fnode('div', [0, 100, 100, 100]);    // 10000
    const b = fnode('div', [110, 100, 100, 100]);  // 10000，与 a 并排不重合
    const body = fnode('body', [0, 0, 375, 812], [a, b]);
    const direct = Bridge.collectInnerHosts(body, {
        pageElement: CLIP_PAGE, getRect: n => n.getBoundingClientRect(),
    });
    const bridged = runTopbarChildSide(Array.from(body.children));
    assertEqual(direct.length, 2, 'direct：两个并排容器都应保留');
    assertEqual(bridged.length, 2, '子侧：两个并排容器都应保留');
    assertEqual(bridged.map(h => h.selector).sort(), direct.map(h => h.selector).sort(),
        '两条路径必须逐个宿主一致（含顺序无关的集合）');
});

test('finalizeInnerHosts 是唯一筛选尾部（direct / bridge 共用同一入口）', () => {
    // 反复踩的坑：「同一逻辑写两份必然分叉」。这条锁住它们真的共用了入口。
    const src = fs.readFileSync(path.join(ROOT, 'js', 'connectors', 'anchor-bridge.js'), 'utf8');
    assert(/collectInnerHosts[\s\S]*?return this\.finalizeInnerHosts\(/.test(src),
        'collectInnerHosts 必须把筛选交给 finalizeInnerHosts');
    assert(/_normalizeReported[\s\S]*?return this\.finalizeInnerHosts\(/.test(src),
        '_normalizeReported 必须把筛选交给 finalizeInnerHosts');
    assert(/isPageSized/.test(src), '等大判据必须由 isPageSized 单点实现');
});

test('topbar.js 的子侧筛选已补齐（等大剔除 + 边重合去重叠）', () => {
    // 早期版本子侧只有"面积门槛"一步，缺 ② ③ —— 实测同一页面
    // http 下 58 个宿主 / file:// 下 72 个。
    //
    // ⚠️ 这里**必须跑行为断言，不能只 grep**：把 `if (pageArea > 0)` 改成
    //    `if (false)` 源码字面量全在，grep 照样通过 —— 这正是"形同虚设"的由来。
    //    下面 suite 32b 用同一棵树跑真实执行来锁它。
    const topbar = fs.readFileSync(path.join(ROOT, 'js', 'topbar.js'), 'utf8');
    const m = topbar.match(/function anchorCollect\([\s\S]*?\n        \}/);
    assert(m, '应能找到 anchorCollect');
    const body = m[0];
    assert(/pageArea/.test(body), 'anchorCollect 必须按 pageArea 剔除等大根容器');
    assert(/anchorEdgesNearlyEqual/.test(body), 'anchorCollect 必须做边重合去重叠');
    assert(/b\.area - a\.area/.test(body), '必须按面积降序，与 direct 模式一致');
    assert(/pageArea:\s*pageElement\.width\s*\*\s*pageElement\.height/.test(
        fs.readFileSync(path.join(ROOT, 'js', 'connectors', 'anchor-bridge.js'), 'utf8')),
    '父页面必须在请求里下发 pageArea，否则子侧无从剔除等大根容器');
});

suite('32b. 子侧真机执行：direct 与 bridge 必须给出同一批宿主（行为断言）');

/**
 * 把 js/topbar.js 塞进假 window 里真跑一遍，拿回它上报的 hosts。
 *
 * ⚠️ 为什么要真跑：把 `if (pageArea > 0)` 改成 `if (false)`、
 *    把去重叠的 `if (idx === -1)` 改成 `if (idx !== -1) continue;`，
 *    源码里该有的字符串**一个都没少**，静态 grep 全部照样通过 ——
 *    实测这两条缺陷就是这样逃过检查的。只有执行行为断言才拦得住。
 *
 * @param {Array} nodes 挂在 body 上的子节点
 */
function runTopbarChildSide(nodes) {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'topbar.js'), 'utf8');
    let reply = null;

    const body = fnode('body', [0, 0, 375, 1699], nodes);
    const fakeDocument = {
        body,
        currentScript: null,          // 跳过注入 page-autofit.js
        addEventListener() {},
        createElement: () => ({ set src(_) {} }),
        head: { appendChild() {} },
        querySelector: () => null,
    };
    const listeners = [];
    // parent !== window → 进入「被 iframe 嵌入」分支
    const fakeWindow = { addEventListener(type, fn) { listeners.push({ type, fn }); } };
    fakeWindow.parent = { postMessage() {} };
    fakeWindow.window = fakeWindow;

    const sandbox = {
        window: fakeWindow,
        document: fakeDocument,
        localStorage: { getItem: () => null, setItem() {} },
        requestFullscreen() {}, exitFullscreen() {},
        setTimeout, clearTimeout,
        navigator: { userAgent: 'node' },
    };
    const ctx = vm.createContext(sandbox);
    sandbox.globalThis = sandbox;

    vm.runInContext(src, ctx, { filename: 'topbar.js' });

    // 找到 message 监听器，投一条请求，看它报回什么
    const msgListener = listeners.find(l => l.type === 'message');
    assert(msgListener, 'topbar.js 应注册 message 监听器');
    msgListener.fn({
        data: { type: 'connector-anchor-request', elementId: 'p1', pageArea: CLIP_PAGE.width * CLIP_PAGE.height },
        source: { postMessage(m) { reply = m; } },
    });
    assert(reply, '子侧应回一条 connector-anchor-response');
    assertEqual(reply.type, Bridge.MSG_RESPONSE, '响应类型必须与 anchor-bridge.js 一致');
    return reply.hosts;
}

test('⚠️ 子侧真机执行：与 direct 模式逐个宿主一致（等大 / 去重叠 / 排序全对齐）', () => {
    const { body } = parityTree();
    const direct = Bridge.collectInnerHosts(body, {
        pageElement: CLIP_PAGE, getRect: n => n.getBoundingClientRect(),
    });
    const bridged = runTopbarChildSide(Array.from(body.children));

    assertEqual(bridged.map(h => h.selector).sort(),
        direct.map(h => h.selector).sort(),
        `direct(${direct.length}) 与子侧(${bridged.length}) 必须给出同一批宿主，否则同一页面 http/file:// 锚点不同`);
});

test('⚠️ 行为断言的前置数据真的能区分"开/关去重叠"（否则下面几条是自欺）', () => {
    // 反向自检：证明 parityTree 里那组边几乎重合的节点，**开/关去重叠会选出不同的成员**。
    // 少了这条，上面"最多留一个"的断言可能只是因为数据本来就没重复。
    //
    // ⚠️ 判据是**集合差异**，不是数量差异：
    //    去重叠一组的语义是"这组里只留一个"，开与关**数量相同**，
    //    区别在于是谁活下来（关掉时先遍历到的活下来）。
    //    实测踩过这个坑：拿"关掉后更多"当判据，结果永远不成立。
    const { body, wrap, list, third } = parityTree();
    const near = new Set([wrap, list, third].map(fsel));

    const on = Bridge.collectInnerHosts(body, {
        pageElement: CLIP_PAGE, getRect: n => n.getBoundingClientRect(),
    });
    const off = Bridge.collectInnerHosts(body, {
        pageElement: CLIP_PAGE, getRect: n => n.getBoundingClientRect(), dedupe: false,
    });
    const onNear = on.filter(h => near.has(h.selector)).map(h => h.selector).sort();
    const offNear = off.filter(h => near.has(h.selector)).map(h => h.selector).sort();
    assert(onNear.length === 1,
        `前置条件：direct 开去重叠后这组应恰好留一个，实际 ${onNear.length}：${onNear.join(' / ')}`);
    assert(offNear.length >= 2,
        `前置条件：direct 关去重叠后这组应留下多个，实际 ${offNear.length}：${offNear.join(' / ')}`);

    // ⚠️ 子侧跑的顺序是 ① ② ③ ④，而 direct 的 finalizeInnerHosts 同样是
    //    「先全部过 ①②，再做 ③」—— 顺序一致，所以两边选出的是同一个成员。
    //    （这里不能拿"关掉去重叠后数量变多"当判据：③ 的语义是"这组只留一个"，
    //      开与关**数量相同**，区别在于是谁活下来。实测踩过这个坑。）
    const nodes = Array.from(body.children);
    const onB = runTopbarChildSide(nodes)
        .filter(h => near.has(h.selector)).map(h => h.selector).sort();
    assertEqual(onB, onNear,
        '子侧与 direct 必须选出**同一个**存活成员（两条路径行为必须完全一致）');
});

test('⚠️ 等大剔除（②）在 direct 与子侧都真的生效', () => {
    const { body, BIG_SEL } = parityTree();
    const direct = Bridge.collectInnerHosts(body, {
        pageElement: CLIP_PAGE, getRect: n => n.getBoundingClientRect(),
    });
    // 反向自检：不传 pageElement（pageArea=0）时该根容器**必须出现**，
    // 否则"被剔除"可能只是因为它根本没进表。
    const noRatio = Bridge.collectInnerHosts(body, {
        getRect: n => n.getBoundingClientRect(),
    });
    assert(noRatio.some(h => h.selector === BIG_SEL),
        `不传 pageElement 时等大根容器(${BIG_SEL})应出现 —— 说明 ② 的判据确实是 pageArea 比出来的`);
    assert(!direct.some(h => h.selector === BIG_SEL),
        '传了 pageElement 后它必须被剔除 —— 否则锚点与页面框完全重叠');
});

suite('33. 第二层就近回退带（鼠标停在宿主之外仍有高亮）');

test('鼠标贴着某个内部元素（在其外几个像素）：回退带选中它', () => {
    // 用户实况：鼠标停在 tab 栏图标上。图标 `<a>` 只有 30×48（面积 1440 < 4000），
    // 根本没进宿主表；此时若没有回退带，画面只剩页面框的 12 个锚点，
    // 用户完全无从判断这个区域可不可连。
    const pageRect = R(0, 0, 375, 1731);
    const nav = R(0, 1647, 375, 52);
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: pageRect, anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: 'body > nav', rect: nav, anchors: [] },
    ];
    // 落在 nav 下方 3px（仍在页面框内）
    const hit = AnchorSession.hoveredInnerHost({ x: 187, y: 1647 + 52 + 3 }, hosts);
    assert(hit, `贴近 nav 下方应仍能高亮它（BAND=${AnchorSession.BAND}）`);
    assertEqual(hit.selector, 'body > nav', '回退带应选中最近的内部宿主');
});

test('回退带只认最近的一个（不会跳过近的去选远的）', () => {
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: R(0, 0, 375, 1000), anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#near', rect: R(0, 100, 375, 100), anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#far', rect: R(0, 400, 375, 100), anchors: [] },
    ];
    // 距 #far 2px，距 #near 248px → 必须选 #far
    const hit = AnchorSession.hoveredInnerHost({ x: 100, y: 402 }, hosts);
    assertEqual(hit.selector, '#far', '回退带取距离最近的那个');
});

test('页面框之外不启用回退带（光标移出画布也不会亮着）', () => {
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: R(100, 100, 375, 812), anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#nav', rect: R(100, 862, 375, 52), anchors: [] },
    ];
    // nav 下方 3px，但已经越出页面框（底边 912）
    assertEqual(AnchorSession.hoveredInnerHost({ x: 200, y: 917 }, hosts), null,
        '页面框之外不该高亮它的内部元素');
});

test('回退带不改变「框内空白处仍为空」的既有语义', () => {
    // 既有契约：页面框内但不在任何元素上 → 第二层为空。
    // 回退带只加 11px，不能把这个契约改成"随便落个高亮"。
    const hosts = [
        { elementId: 'p1', kind: 'element', rect: R(0, 0, 375, 812), anchors: [] },
        { elementId: 'p1', kind: 'inner', selector: '#card1', rect: R(10, 100, 351, 80), anchors: [] },
    ];
    assertEqual(AnchorSession.hoveredInnerHost({ x: 5, y: 500 }, hosts), null,
        '框内空白处仍不应有高亮层');
});

test('回退带判据复用 BAND（与 ownerOf 的外扩带是同一条边界）', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'connectors', 'anchor-session.js'), 'utf8');
    const m = src.match(/hoveredInnerHost\([^)]*\)\s*\{([\s\S]*?)\n    \},/);
    assert(m, '应能找到 hoveredInnerHost');
    assert(/const band = this\.BAND;/.test(m[1]),
        '回退带宽度必须用 BAND，而不是另写一个魔数');
    assert(/_distToRect/.test(m[1]), '回退带必须复用 _distToRect，与 ownerOf 同算法');
});

suite('34. tab 栏 fixed 漂移的端到端回归（浏览器实测数据）');

test('撑高前后：同一根 tabbar 的缓存坐标差 934px（这就是「没有锚点」的原因）', () => {
    // 这是本次修复的实测证据，固化成用例：
    //   预热时 iframe 高 780 → fixed tabbar 的视口内 top = 713
    //   自适应后 iframe 高 1699 → top = 1647
    // 画布坐标差 = (1647 - 713) = 934px，鼠标根本够不到缓存里的那个位置。
    const iframeTopOffset = Bridge.IFRAME_TOP_OFFSET;
    const before = { iframeH: 780, barTop: 713 };
    const after = { iframeH: 1699, barTop: 1647 };
    assertEqual(after.barTop - before.barTop, 934, '漂移量应为 934px（实测）');
    assert(after.iframeH > before.iframeH, '自适应确实把 iframe 撑高了');
    assert(iframeTopOffset === 30, 'fixed 换算必须含 iframe 顶部下沉量');
});

test('fixed 元素换算 = 声明高度无关，实测高度一变坐标就跟着变', () => {
    const el = pageEl('elem_2', 100, 200, 375, 812);
    const nav = Bridge.toCanvasRect({ left: 0, top: 1647, width: 375, height: 52 }, el);
    assertEqual(nav, { x: 100, y: 200 + 30 + 1647, width: 375, height: 52 },
        '画布坐标应直接采用当前 iframe 视口内的实测位置，不按声明高度折算');
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
