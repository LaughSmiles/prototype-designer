/**
 * 持久化层自动化测试
 *
 * 用法：
 *   node tools/test-persistence.js
 *   node tools/test-persistence.js --verbose
 *
 * 覆盖的三个修复点（修复前的失败行为写在每个用例的 "原缺陷" 注释里）：
 *   1. 配额溢出 / 存储不可用 → 静默失败
 *   2. "清空浏览器缓存" 只删一个键 + 定时器把数据写回来
 *   3. 保存路径逐个 await fetch → 串行 + 重复 + 无超时 + 误删元素
 *
 * 做法：在 vm 沙箱里加载真实的 js/*.js（不 mock 被测代码本身），
 * 只替换浏览器宿主对象：localStorage（可设配额）、document、fetch、location。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.PERSIST_TEST_ROOT
    ? path.resolve(process.env.PERSIST_TEST_ROOT)
    : path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

// 允许指向"修复前"的代码树，用于验证用例确实能捕获缺陷（见 tools/verify-regression.js）
if (process.env.PERSIST_TEST_ROOT) {
    console.log(`\x1b[33m> 使用替代代码树: ${ROOT}\x1b[0m`);
}

// ---------------------------------------------------------------- 测试框架
//
// 注意：所有用例统一走 test()，由 runAll() 顺序 await 执行。
// 早期版本里 test() 用同步 try/catch 包裹，遇到 async 回调时异常会变成
// unhandled rejection 逃逸，失败用例被无条件记为"通过" —— 整套测试形同虚设。

const queue = [];
let currentSuite = '';
let passed = 0;
let failed = 0;
const failures = [];

function suite(name) {
    currentSuite = name;
}

function test(name, fn) {
    queue.push({ suite: currentSuite, name, fn });
}

// 兼容写法：语义与 test() 相同（同步/异步一律支持）
const testAsync = test;

const CASE_TIMEOUT_MS = Number(process.env.PERSIST_TEST_CASE_TIMEOUT || 5000);

/** 给用例套一层超时看门狗。
 *  必要性：修复前的 probePage 没有超时，fetch 会永久挂起。
 *  没有看门狗的话，这类"卡死"会让整个测试进程停在那里，
 *  而不是被报告成一个失败 —— 回归验证就会永远跑不完。 */
function withTimeout(fn, name) {
    let timer;
    const guard = new Promise((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`用例超时（${CASE_TIMEOUT_MS}ms 未结束），疑似永久挂起: ${name}`)),
            CASE_TIMEOUT_MS);
    });
    return Promise.race([Promise.resolve().then(fn), guard])
        .finally(() => clearTimeout(timer));
}

async function runAll() {
    let lastSuite = null;
    for (const item of queue) {
        // 分组标题在"执行时"打印，而不是注册时 —— 否则三个标题会先一起刷出来
        if (item.suite !== lastSuite) {
            lastSuite = item.suite;
            console.log(`\n\x1b[1m${item.suite || '(未分组)'}\x1b[0m`);
        }
        try {
            await withTimeout(item.fn, item.name);   // 关键：await 住异步用例的失败
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

function assertMatch(actual, regex, message) {
    if (!regex.test(String(actual))) {
        throw new Error(`${message}\n      期望匹配: ${regex}\n      实际: ${actual}`);
    }
}

// ---------------------------------------------------------------- 浏览器宿主桩

/** 可控配额的 localStorage 实现 */
function createLocalStorage({ quotaBytes = 5 * 1024 * 1024 } = {}) {
    const map = new Map();
    const stats = { writes: 0, throws: 0 };

    const usage = () => {
        let total = 0;
        for (const [k, v] of map) total += (k.length + v.length) * 2; // UTF-16 计量
        return total;
    };

    return {
        _map: map,
        _stats: stats,
        _usage: usage,
        get length() { return map.size; },
        key: (i) => [...map.keys()][i] ?? null,
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem(k, v) {
            const prev = map.has(k) ? map.get(k).length : 0;
            const delta = (k.length + v.length) * 2 - prev * 2;
            if (usage() + delta > quotaBytes) {
                stats.throws++;
                throw new DOMException(
                    `Failed to execute 'setItem' on 'Storage': quota exceeded`,
                    'QuotaExceededError'
                );
            }
            map.set(k, String(v));
            stats.writes++;
        },
        removeItem: (k) => map.delete(k),
        clear: () => map.clear(),
    };
}

/** 最小 document 桩：够框架的 setInterval/DOM 查询跑起来即可 */
function createDocument() {
    const noop = () => { };
    const makeEl = (id = '') => ({
        id,
        className: '',
        textContent: '',
        style: {},
        classList: { _s: new Set(), contains(c) { return this._s.has(c); }, add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); } },
        addEventListener: noop,
        removeEventListener: noop,
        appendChild: noop,
        remove: noop,
        click: noop,
        querySelector: () => null,
        querySelectorAll: () => [],
        dataset: {},
        style_: null,
    });
    const els = new Map();
    return {
        getElementById: (id) => {
            if (!els.has(id)) els.set(id, makeEl(id));
            return els.get(id);
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: (tag) => makeEl(tag),
        body: makeEl('body'),
        addEventListener: noop,
        removeEventListener: noop,
        visibilityState: 'visible',
    };
}

/** 可编程的 fetch 桩 */
function createFetchStub() {
    const calls = [];
    let handler = async () => ({ ok: true, status: 200 });

    const fetchFn = async (url, opts) => {
        calls.push({ url, method: (opts && opts.method) || 'GET' });
        if (opts && opts.signal && opts.signal.aborted) {
            throw new DOMException('aborted', 'AbortError');
        }
        return handler(url, opts, calls.length);
    };

    return {
        fetch: fetchFn,
        calls,
        reset: () => { calls.length = 0; },
        /** 每个 URL 返回固定 status */
        setStatus(statusByUrl = {}) {
            handler = async (url) => {
                const status = statusByUrl[url];
                if (status === undefined) return { ok: true, status: 200 };
                return { ok: status >= 200 && status < 300, status };
            };
        },
        /** 全部超时（永不 resolve，等 AbortSignal 触发） */
        setHang() {
            handler = (url, opts) => new Promise((_resolve, reject) => {
                if (!opts || !opts.signal) return; // 永不结束
                opts.signal.addEventListener('abort', () =>
                    reject(new DOMException('The operation was aborted.', 'AbortError')));
            });
        },
        /** 全部网络错误 */
        setNetworkError() {
            handler = async () => { throw new TypeError('Failed to fetch'); };
        },
        /** 每个请求耗时 delay 毫秒（用于验证并发） */
        setLatency(delay) {
            handler = async () => {
                await new Promise(r => setTimeout(r, delay));
                return { ok: true, status: 200 };
            };
        },
    };
}

// ---------------------------------------------------------------- 沙箱构建

function buildSandbox({ quotaBytes, protocol = 'http:', document: docOverride } = {}) {
    const localStorage = createLocalStorage({ quotaBytes });
    const fetchStub = createFetchStub();
    const alerts = [];
    const hints = [];
    const confirms = [];

    const sandbox = {
        console,
        setTimeout, clearTimeout, setInterval, clearInterval,
        Blob, URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => { } },
        DOMException, AbortSignal, JSON, Math, Date, Promise, Error, TypeError,
        localStorage,
        location: { protocol, search: '', href: 'http://localhost:8080/' },
        document: docOverride || createDocument(),
        alert: (msg) => { alerts.push(msg); },
        fetch: fetchStub.fetch,
        addEventListener: () => { },
        removeEventListener: () => { },
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.window.location = sandbox.location;
    sandbox.window.document = sandbox.document;

    const ctx = vm.createContext(sandbox);

    // 宿主对象：模块运行时会引用它们
    vm.runInContext(`
        window.__alerts = [];
        window.__hints = [];
        window.__confirms = [];

        window.ModalManager = {
            init(){},
            showConfirm(msg, title, cb){ window.__confirms.push({msg, title}); cb(); },
        };

        window.CanvasView = {
            state: { zoom: 0.5, pan: { x: 0, y: 0 } },
            getView(){ return { zoom: this.state.zoom, pan: { ...this.state.pan } }; },
            setView(){},
            updateView(){},
            updateZoomDisplay(){},
        };

        window.ElementManager = {
            state: { elements: [], nextId: 1, usageCount: {}, selectedElement: null, selectedElements: [] },
            getAllElements(){ return JSON.parse(JSON.stringify(this.state.elements)); },
            getUsageCounts(){ return { ...this.state.usageCount }; },
            clearAll(){ this.state.elements = []; },
            renderElement(){},
            renderElementWithoutCount(){},
            updateStatusBar(){},
            updateUsageBadge(){},
            getElement(){},
        };

        window.HistoryManager = {
            saveState(){ window.__historySaveState = (window.__historySaveState||0) + 1; },
            undo(){}, redo(){},
        };

        // renderTabs 会用到的拖拽模块
        window.PageDragSort = { bindItemEvents(){}, setupDragEvents(){} };

        window.PROJECT_CONFIG = { projectName: '测试项目', version: '1.0.0' };
    `, ctx);

    // 加载真实被测代码（顺序与 canvas-editor.html 一致）
    // 注意：不要加载 element-manager.js —— 它在顶层用 `const ElementManager` 声明，
    // 会在 vm 的全局词法作用域里遮蔽上面注入的宿主桩，导致被测代码拿到真模块而非桩。
    const FILES = [
        'js/debug.js',
        'js/page-library/page-library-render.js',
        'js/page-library/page-library.js',
        'js/page-manager/page-manager.js',
        'js/history-manager.js',
        'js/storage.js',
    ];
    for (const rel of FILES) {
        const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        vm.runInContext(code, ctx, { filename: rel });
    }

    // 取回被测模块（V8 中同 context 的脚本共享顶层词法作用域）
    const mods = vm.runInContext('({ Storage, PageLibrary, PageManager, Debug })', ctx);

    // 顶层 const 不会挂到 global 上，测试用例要用 sandbox.PageLibrary 等，必须显式回填
    sandbox.Storage = mods.Storage;
    sandbox.PageLibrary = mods.PageLibrary;
    sandbox.PageManager = mods.PageManager;
    sandbox.Debug = mods.Debug;

    // 真实 HistoryManager（替换掉桩），用于验证 markDirty 收敛点
    mods.HistoryManager = vm.runInContext('HistoryManager', ctx);
    sandbox.HistoryManager = mods.HistoryManager;

    // 捕获 UI 反馈。
    // 注意要挂在最末端的 PageLibraryRender 上：如果挂在 PageLibrary.showHint，
    // 就会把"中间层是否透传 duration"这条链路一并 mock 掉 ——
    // 而正是这一层曾经把常驻提示的 duration 吞成 undefined，导致浏览器里提示 2 秒即消失。
    mods.PageLibraryRender = vm.runInContext('PageLibraryRender', ctx);
    sandbox.PageLibraryRender = mods.PageLibraryRender;
    const realShowHint = mods.PageLibraryRender.showHint;   // 供需要真实渲染逻辑的用例使用
    mods.PageLibraryRender.showHint = (msg, duration) => { hints.push({ msg, duration }); };
    mods.Storage.updateSaveIndicator = function () { this._indicatorCalls = (this._indicatorCalls || 0) + 1; };

    // Debug 默认会把预期内的 warn/error 刷到控制台，噪音极大。
    // 收集起来，仅在 --verbose 时回放。
    const debugLog = [];
    const sink = (...args) => { debugLog.push(args); if (VERBOSE) console.log('   [debug]', ...args); };
    mods.Debug.log = sink;
    mods.Debug.warn = sink;
    mods.Debug.error = sink;

    return {
        ctx, sandbox,
        Storage: mods.Storage,
        PageLibrary: mods.PageLibrary,
        PageManager: mods.PageManager,
        localStorage, fetchStub,
        alerts, hints, debugLog,
        realShowHint,
        confirms: sandbox.__confirms,   // ModalManager 桩写在 window.__confirms 上
    };
}

/** 在沙箱里放入 N 个画布元素（用于制造数据量）
 *  同时把该页面注册进页面库，否则 cleanInvalidPageReferences 会认为"页面不在配置中"
 *  而把所有元素剔除，payload 变小、配额根本触发不到。 */
function seedElements(env, count, pageId = 'system-user') {
    const page = pageEntry(pageId, `pages/${pageId}.html`);
    env.PageLibrary.pages = [page];

    env.sandbox.ElementManager.state.elements = Array.from({ length: count }, (_, i) => ({
        id: `elem_${i + 1}`,
        type: 'page',
        pageId,
        position: { x: i * 10, y: i * 5 },
        width: 1440,
        height: 900,
    }));
    env.sandbox.ElementManager.state.usageCount = { [pageId]: count };
    env.PageManager.pages = [{
        id: 'page_1', name: '页面1',
        view: { zoom: 0.5, pan: { x: 0, y: 0 } },
        elements: env.sandbox.ElementManager.state.elements,
        usageCount: { [pageId]: count },
    }];
    env.PageManager.currentPageId = 'page_1';
}

/** 模拟一次用户操作：变更画布 → 走 HistoryManager.saveState → 打脏标记 */
function simulateUserEdit(env) {
    vm.runInContext('HistoryManager.saveState()', env.ctx);
}

// ================================================================ 用例

// -------------------------------------------------- 问题 1：静默失败

suite('问题 1：配额溢出 / 存储不可用 不得静默失败');

test('常驻提示不会被瞬时提示覆盖（否则错误横幅会被 2 秒提示顶掉）', () => {
    // document 必须在建沙箱时就注入：contextify 之后再改 sandbox 属性不会同步到 VM 全局
    const hdoc = createHintDocument();
    const env = buildSandbox({ document: hdoc.document });
    // 换回真实的渲染实现（buildSandbox 默认把它替换成记录器）
    env.sandbox.PageLibraryRender.showHint = env.realShowHint;
    const R = env.sandbox.PageLibraryRender;

    R.showHint('❌ 保存失败：存储空间不足', 0);      // 常驻
    R.showHint('✅ 已添加: 用户管理');               // 瞬时 → 必须被忽略
    R.showHint('❌ 保存失败：存储不可用', 0);         // 常驻 → 替换上一条

    assertEqual(hdoc.mounted.length, 1, '任意时刻只应存在一条提示');
    assert(hdoc.mounted[0].classList.contains('is-sticky'), '应保留常驻样式');
    assertMatch(hdoc.mounted[0].textContent, /存储不可用/, '应显示最新一条常驻提示');
    assert(hdoc.mounted[0].querySelector('.temp-hint-close') !== null, '常驻提示应带关闭按钮');
});

test('提示时长透传：常驻提示经 PageLibrary 中转后仍是常驻', () => {
    const env = buildSandbox();
    // PageLibrary.showHint 是中转层，必须把 duration 继续传下去
    env.PageLibrary.showHint('普通提示');
    env.PageLibrary.showHint('必须被看见的失败', 0);
    const last = env.hints[env.hints.length - 1];
    assertEqual(last.msg, '必须被看见的失败', '消息应原样传递');
    assertEqual(last.duration, 0, 'duration 必须透传到渲染层，否则常驻提示会退化成 2 秒后消失');
});

/** 够 showHint 真实逻辑运行的最小 DOM：元素可挂载、可按 class 查询、可移除 */
function createHintDocument() {
    let mounted = [];
    // 原地删除：如果重新赋值，外部持有的 mounted 引用会失效
    const unregister = (el) => {
        const i = mounted.indexOf(el);
        if (i !== -1) mounted.splice(i, 1);
    };

    const mk = (className = '', isRoot = false) => {
        const el = {
            _classes: new Set(className.split(/\s+/).filter(Boolean)),
            _children: [],
            textContent: '',
            classList: {
                add(c) { el._classes.add(c); },
                contains(c) { return el._classes.has(c); },
                remove(c) { el._classes.delete(c); },
            },
            appendChild(c) {
                el._children.push(c);
                // 只有挂到 document.body 上的才算"页面里可见"，
                // 子节点（如关闭按钮）只是 hint 的一部分，不能算成另一条提示
                if (isRoot) mounted.push(c);
                return c;
            },
            remove() { unregister(el); },
            addEventListener() { },
            setAttribute() { },
            querySelector(sel) {
                return el._children.find(c => sel.startsWith('.') && c._classes.has(sel.slice(1))) || null;
            },
        };
        // 真实 DOM 里赋值 className 会同步 class 列表，假 DOM 也必须如此
        Object.defineProperty(el, 'className', {
            get() { return [...el._classes].join(' '); },
            set(v) { el._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
        });
        return el;
    };

    const body = mk('body', true);
    return {
        mounted,
        document: {
            body,
            createElement: (tag) => mk(tag),
            querySelector: (sel) => mounted.find(m => m._classes.has(sel.replace('.', ''))) || null,
            querySelectorAll: () => [],
        },
    };
}

test('存储键名随 projectName 派生', () => {
    const env = buildSandbox();
    assertEqual(env.Storage.STORAGE_KEY, '测试项目Canvas', '画布键名');
    assertEqual(env.Storage.UI_STATE_KEY, '测试项目_uiState', 'UI 状态键名');
});

test('正常保存：清除脏标记并记录时间戳', async () => {
    const env = buildSandbox();
    seedElements(env, 3);
    simulateUserEdit(env);
    assert(env.Storage.isDirty(), '编辑后应标记为未保存');

    const result = await env.Storage.saveSilently();
    assert(result.ok, '保存应成功: ' + JSON.stringify(result.error));
    assert(!env.Storage.isDirty(), '保存成功后应清除脏标记');
    assert(env.Storage.lastSaveAt > 0, '应记录 lastSaveAt');
    assertEqual(env.Storage.lastSaveError, null, '失败信息应被清空');
    assert(env.localStorage.getItem('测试项目Canvas') !== null, '数据应落盘');
});

test('自动保存配额溢出：必须有可见提示（修复前仅 Debug.error）', async () => {
    const env = buildSandbox({ quotaBytes: 20 * 1024 });   // 20KB 配额
    seedElements(env, 400);                                // 远超配额
    simulateUserEdit(env);

    const result = await env.Storage.saveSilently();
    assert(!result.ok, '应写入失败');
    assertEqual(result.reason, 'quota', '失败原因应为 quota');

    const sticky = env.hints.filter(h => h.duration === 0);
    assert(sticky.length > 0, '配额溢出必须产生常驻提示（duration=0），否则 2 秒后消失等于没提示');
    assertMatch(sticky[0].msg, /保存失败/, '提示内容应说明保存失败');
    assertMatch(sticky[0].msg, /存储空间不足/, '提示内容应指出是空间不足');
    assertEqual(env.alerts.length, 0, '自动保存路径不应弹 alert（由常驻提示承担）');
});

test('自动保存配额溢出：置 lastSaveError + 脏标记保留（数据确实没落盘）', async () => {
    const env = buildSandbox({ quotaBytes: 20 * 1024 });
    seedElements(env, 400);
    simulateUserEdit(env);
    const dirtyBefore = env.Storage.dirtySince;

    await env.Storage.saveSilently();

    assert(env.Storage.lastSaveError, '应记录 lastSaveError 供顶栏指示器使用');
    assertEqual(env.Storage.lastSaveError.reason, 'quota', '错误原因');
    assertEqual(env.Storage.dirtySince, dirtyBefore, '保存失败后脏标记必须保留（表示仍未落盘）');
    assert(env.localStorage.getItem('测试项目Canvas') === null, '数据确实未落盘');
});

test('自动保存配额失败：限频复述，不刷屏', async () => {
    const env = buildSandbox({ quotaBytes: 20 * 1024 });
    seedElements(env, 400);
    simulateUserEdit(env);

    await env.Storage.saveSilently();
    const afterFirst = env.hints.filter(h => h.duration === 0).length;
    await env.Storage.saveSilently();   // 5 分钟内的第二次失败
    const afterSecond = env.hints.filter(h => h.duration === 0).length;
    assertEqual(afterSecond, afterFirst, '5 分钟内重复失败不应重复弹常驻提示');

    env.Storage._lastQuotaHintAt = 0;    // 模拟超过 5 分钟
    await env.Storage.saveSilently();
    assert(env.hints.filter(h => h.duration === 0).length > afterSecond, '超过限频窗口应再次提示');
});

test('手动保存失败：常驻提示 + alert 双保险', async () => {
    const env = buildSandbox({ quotaBytes: 20 * 1024 });
    seedElements(env, 400);
    simulateUserEdit(env);

    const result = await env.Storage.save();
    assert(!result.ok, '应写入失败');
    assert(env.hints.some(h => h.duration === 0 && /保存失败/.test(h.msg)), '应有常驻失败提示');
    assert(env.alerts.length === 1, '用户主动保存却失败，必须弹窗兜底');
    assertMatch(env.alerts[0], /Ctrl\+E/, 'alert 应指引用户导出 JSON 备份');
});

test('存储不可用（SecurityError）：识别为 unavailable 而非 quota', async () => {
    const env = buildSandbox();
    seedElements(env, 2);
    simulateUserEdit(env);
    env.localStorage.setItem = () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
    };

    const result = await env.Storage.saveSilently();
    assert(!result.ok, '应写入失败');
    assertEqual(result.reason, 'unavailable', '应识别为存储不可用');
    assertMatch(env.hints.filter(h => h.duration === 0)[0].msg, /无痕模式|存储被禁用/,
        '提示应引导用户改用导出');
});

test('序列化失败（循环引用）：识别为 serialize', async () => {
    const env = buildSandbox();
    seedElements(env, 2);
    simulateUserEdit(env);
    const cycle = {}; cycle.self = cycle;
    env.PageManager.pages.push(cycle);

    const result = await env.Storage.saveSilently();
    assert(!result.ok, '应写入失败');
    assertEqual(result.reason, 'serialize', '应识别为序列化错误');
});

test('占用接近上限：保存成功也给出预警', async () => {
    const env = buildSandbox();
    // 浏览器配额是 5MB，不实际写满，用一个填充键把 origin 占用顶到 80% 以上
    // （桩按 UTF-16 计 2 字节/字符，故 2.1M 字符 ≈ 4.2MB）
    env.localStorage.setItem('__filler__', 'x'.repeat(2.1 * 1024 * 1024));
    seedElements(env, 10);
    simulateUserEdit(env);

    const result = await env.Storage.saveSilently();
    assert(result.ok, '填充键后画布自身仍应保存成功');

    const advice = env.Storage._quotaAdvice();
    assertMatch(advice, /接近上限/, '占用超过 80% 时应预警');
    assertMatch(advice, /Ctrl\+E/, '预警应指引导出备份');

    // 反向：占用很低时不应有噪音
    const env2 = buildSandbox();
    seedElements(env2, 10);
    await env2.Storage.saveSilently();
    assertEqual(env2.Storage._quotaAdvice(), '', '占用低时不应产生预警噪音');
});

test('退出兜底：saveSync 不依赖 fetch，纯同步落盘', () => {
    const env = buildSandbox();
    seedElements(env, 5);
    simulateUserEdit(env);
    env.fetchStub.calls.length = 0;

    const result = env.Storage.saveSync();   // 不 await，验证是同步的
    assert(!result.skipped, '前置条件：应处于"未保存"状态而非跳过');
    assert(result.ok, '同步兜底保存应成功');
    assertEqual(env.fetchStub.calls.length, 0, '卸载路径不得发起任何网络请求（await 不会完成）');
    assert(env.localStorage.getItem('测试项目Canvas') !== null, '兜底保存应已落盘');
    assert(!env.Storage.isDirty(), '兜底保存后应清除脏标记');
});

test('退出兜底：无改动时直接跳过', () => {
    const env = buildSandbox();
    seedElements(env, 5);
    const result = env.Storage.saveSync();
    assert(result.skipped === true, '没有改动时不应产生写入');
});

test('退出兜底：init 时绑定 pagehide / beforeunload / visibilitychange', () => {
    const env = buildSandbox();
    env.Storage.init();
    assert(env.Storage._unloadGuardBound === true, 'init 时应绑定兜底保存');
});

test('自动保存定时器：可启动、可停止，且句柄被持有', () => {
    const env = buildSandbox();
    env.Storage.init();
    assert(env.Storage._autoSaveTimer !== null, 'init 后应有定时器');
    assert(env.Storage.stopAutoSave() === true, '应能停止定时器');
    assertEqual(env.Storage._autoSaveTimer, null, '停止后句柄应被清空');
    assert(env.Storage.stopAutoSave() === false, '重复停止应安全返回 false');
});

test('数据损坏：原始内容被备份，不会被自动保存覆盖销毁', () => {
    const env = buildSandbox();
    const corrupt = '{"version":"2.0","pages":[ THIS IS BROKEN }';
    env.localStorage.setItem('测试项目Canvas', corrupt);
    env.sandbox.HistoryManager.saveState = () => {};   // 避免真实 saveState 触发 markDirty

    env.Storage.loadAuto();

    const backupKeys = [...env.localStorage._map.keys()].filter(k => k.includes('.corrupt.'));
    assertEqual(backupKeys.length, 1, '应产生一个损坏数据备份键');
    assertEqual(env.localStorage.getItem(backupKeys[0]), corrupt, '备份内容必须与原始内容一致');
    assertEqual(env.localStorage.getItem('测试项目Canvas'), corrupt, '主键暂不被清空，给用户恢复窗口');
    assert(env.hints.some(h => h.duration === 0 && /无法解析/.test(h.msg)), '应常驻提示数据损坏');
});

test('加载成功后不算作"未保存"', () => {
    const env = buildSandbox();
    seedElements(env, 3);
    const payload = {
        version: '2.0', timestamp: new Date().toISOString(),
        pages: env.PageManager.pages, currentPageId: 'page_1', globalNextElementId: 4,
    };
    env.localStorage.setItem('测试项目Canvas', JSON.stringify(payload));

    env.Storage.loadAuto();
    assert(!env.Storage.isDirty(), '刚恢复的画布不应显示为未保存');
});

// -------------------------------------------------- 问题 2：清空缓存

suite('问题 2："清空浏览器缓存" 应清掉全部项目数据且不被定时器写回');

test('getManagedKeys 覆盖全部项目写入的键', () => {
    const env = buildSandbox();
    const keys = env.Storage.getManagedKeys();
    ['测试项目Canvas', '测试项目_uiState', 'canvasEditor_theme', 'sidebarMenuExpanded',
        'topbar_fullscreen', 'prototypeFullscreenState', 'prototype_open_tabs',
        'photographySchoolCanvas', 'photographySchool_uiState'].forEach(k => {
        assert(keys.includes(k), `应包含键 ${k}`);
    });
    assert(!keys.includes('prototypeDebug'), '开发者调试开关不属于项目数据，不应清除');
    assertEqual(keys.length, new Set(keys).size, '不应有重复键');
});

test('清空：一次删掉全部键（含遗留键），而非只删画布主键', () => {
    const env = buildSandbox();
    seedElements(env, 4);
    simulateUserEdit(env);

    const seed = {
        '测试项目Canvas': '{"pages":[]}',
        '测试项目_uiState': '{"leftCollapsed":true}',
        'canvasEditor_theme': 'light',
        'sidebarMenuExpanded': '{"system":true}',
        'topbar_fullscreen': '1',
        'prototypeFullscreenState': '{"src":"x"}',
        'prototype_open_tabs': '[{"name":"a"}]',
        'photographySchoolCanvas': '{}',
        'photographySchool_uiState': '{}',
        'prototypeDebug': '1',
    };
    Object.entries(seed).forEach(([k, v]) => env.localStorage.setItem(k, v));
    assertEqual(env.localStorage.length, 10, '前置条件：10 个键');

    env.Storage.clearBrowserCache();

    const left = [...env.localStorage._map.keys()];
    assertEqual(left, ['prototypeDebug'], '只应保留开发者调试开关');
    env.Storage._lastQuotaHintAt = 0;
});

test('清空：内存态被重置为"一个空白页"，原画布不会复活', () => {
    const env = buildSandbox();
    seedElements(env, 10);
    simulateUserEdit(env);
    env.localStorage.setItem('测试项目Canvas', JSON.stringify({ pages: env.PageManager.pages }));

    env.Storage.clearBrowserCache();

    assertEqual(env.PageManager.pages.length, 1, '应重置为恰好一个空白页（而不是零页面）');
    assertEqual(env.PageManager.pages[0].elements, [], '空白页不得残留原来的 10 个元素');
    assertEqual(env.PageManager.currentPageId, env.PageManager.pages[0].id, '当前页必须指向这个空白页');
    assertEqual(env.sandbox.ElementManager.state.elements, [], '元素列表应被清空');
    assert(!env.Storage.isDirty(), '清空后不应还挂着脏标记');
    assertEqual(env.Storage.lastSaveAt, null, 'lastSaveAt 应被清空');

    // 关键回归：清空后继续编辑再保存，必须存进那个空白页，而不是存成零页面
    env.sandbox.ElementManager.state.elements.push(
        { id: 'new_1', type: 'page', pageId: 'x', position: { x: 0, y: 0 }, width: 10, height: 10 });
    const payload = JSON.parse(JSON.stringify(env.Storage._buildPayloadSync()));
    assertEqual(payload.pages.length, 1, '保存结果必须仍有 1 个页面，不能是空数组');
    assertEqual(payload.pages[0].elements.length, 1, '清空后新画的内容必须能存下来');
});

test('清空：自动保存定时器被停止（否则 60 秒内数据原样复活）', () => {
    const env = buildSandbox();
    env.Storage.init();                 // 真实启动自动保存
    seedElements(env, 6);
    simulateUserEdit(env);
    env.localStorage.setItem('测试项目Canvas', JSON.stringify({ pages: env.PageManager.pages }));
    assert(env.Storage._autoSaveTimer !== null, '前置条件：定时器在运行');

    env.Storage.clearBrowserCache();

    assertEqual(env.Storage._autoSaveTimer, null, '定时器句柄必须被清空');
    // 模拟"60 秒后那一轮"：定时器已不存在，人工触发一次确认原画布不会复活
    env.Storage._writeCanvas(env.Storage._buildPayloadSync());
    const rewritten = JSON.parse(env.localStorage.getItem('测试项目Canvas'));
    const totalElements = rewritten.pages.reduce((n, p) => n + p.elements.length, 0);
    assertEqual(totalElements, 0, '即便再次写入，也只能是空画布，原画布的 6 个元素不得复活');
});

test('清空：提示文案列出被删的键数，且与实际一致', () => {
    const env = buildSandbox();
    ['测试项目Canvas', '测试项目_uiState', 'canvasEditor_theme', 'sidebarMenuExpanded'].forEach(
        k => env.localStorage.setItem(k, '{}'));

    env.Storage.clearBrowserCache();

    const sticky = env.hints.filter(h => h.duration === 0);
    assertEqual(sticky.length, 1, '应有且仅有一条常驻提示');
    assertMatch(sticky[0].msg, /已清空 4 项/, '提示数量应与实际删除数一致');
});

test('清空：没有可清理内容时如实提示，不谎报成功', () => {
    const env = buildSandbox();
    env.Storage.clearBrowserCache();
    const last = env.hints[env.hints.length - 1];
    assertMatch(last.msg, /没有可清理/, '应提示无可清理内容');
    assert(!last.duration, '非错误提示用普通时长即可（不常驻）');
});

test('清空：确认弹窗文案说明会删界面状态并建议先导出', () => {
    const env = buildSandbox();
    env.Storage.clearBrowserCache();
    assertEqual(env.confirms.length, 1, '应弹出确认框');
    assertMatch(env.confirms[0].msg, /界面状态/, '文案应说明界面状态也会被删');
    assertMatch(env.confirms[0].msg, /Ctrl\+E/, '文案应建议先导出备份');
});

test('遗留键迁移：新键已存在时不覆盖旧键数据', () => {
    const env = buildSandbox();
    env.localStorage.setItem('测试项目Canvas', '{"pages":[],"marker":"new"}');
    env.localStorage.setItem('photographySchoolCanvas', '{"pages":[],"marker":"legacy"}');

    env.Storage.migrateLegacyKeys();

    const data = JSON.parse(env.localStorage.getItem('测试项目Canvas'));
    assertEqual(data.marker, 'new', '新键已有数据时不应被旧键覆盖');
    assertEqual(env.localStorage.getItem('photographySchoolCanvas'), null, '旧键应被清理');
});

// -------------------------------------------------- 问题 3：保存路径的串行 I/O

suite('问题 3：保存时页面探测应去重 / 并发 / 超时 / 不误删');

function setupProbes(env, pages) {
    env.sandbox.PageLibrary.pages = pages;
}

/** 页面库条目 */
function pageEntry(id, filePath, isValid = true) {
    return { id, name: id, filePath, isValid, originalSize: { width: 1440, height: 900 } };
}

test('探测去重：同一文件放 30 次只发 1 个 HEAD', async () => {
    const env = buildSandbox();
    env.fetchStub.setStatus({ 'pages/a.html': 200 });
    setupProbes(env, [pageEntry('a', 'pages/a.html')]);

    // 画布上放 30 个同一个页面
    seedElements(env, 30, 'a');
    env.fetchStub.reset();

    await env.PageManager.cleanInvalidPageReferences(env.sandbox.ElementManager.state.elements);

    assertEqual(env.fetchStub.calls.length, 1, `同一 filePath 应只探测 1 次，实际 ${env.fetchStub.calls.length} 次`);
});

test('探测并发：总耗时 ≈ 单次耗时，而非 N 倍', async () => {
    const env = buildSandbox();
    const paths = Array.from({ length: 10 }, (_, i) => `pages/p${i}.html`);
    setupProbes(env, paths.map((p, i) => pageEntry(`p${i}`, p)));
    env.fetchStub.setLatency(60);   // 每次往返 60ms

    const start = Date.now();
    await env.PageLibrary.probePages(paths);
    const elapsed = Date.now() - start;

    // 串行需 ≥600ms，并发应接近 60ms（放宽到 350ms 以容忍 CI 抖动）
    assert(elapsed < 350, `并发后总耗时 ${elapsed}ms，串行需 ≥600ms`);
});

test('探测去重 + 并发在保存路径上同时成立', async () => {
    const env = buildSandbox();
    const paths = ['pages/x.html', 'pages/y.html'];
    // 每个页面在画布上放 15 次 = 30 个元素
    seedElements(env, 15, 'x');
    // seedElements 会重置页面库，这里把 y 补回去（模拟两个页面都被使用）
    env.PageLibrary.pages = [
        pageEntry('x', 'pages/x.html'),
        pageEntry('y', 'pages/y.html'),
    ];
    env.sandbox.ElementManager.state.elements.push(
        ...Array.from({ length: 15 }, (_, i) => ({
            id: `elem_y_${i}`, type: 'page', pageId: 'y',
            position: { x: 0, y: 0 }, width: 1440, height: 900,
        })));
    env.fetchStub.reset();
    env.fetchStub.setLatency(40);

    const start = Date.now();
    await env.PageManager.cleanInvalidPageReferences(env.sandbox.ElementManager.state.elements);
    const elapsed = Date.now() - start;

    assertEqual(env.fetchStub.calls.length, 2, '去重后只需 2 个请求（修复前为 30 个串行请求）');
    assert(elapsed < 200, `30 元素应在 ${elapsed}ms 内完成（串行需 ≥1200ms）`);
});

test('三态：仅确认 404 才删除元素', async () => {
    const env = buildSandbox();
    setupProbes(env, [
        pageEntry('good', 'pages/good.html'),
        pageEntry('gone', 'pages/gone.html'),
    ]);
    env.fetchStub.setStatus({ 'pages/gone.html': 404 });
    const elements = [
        { id: 'e1', type: 'page', pageId: 'good', position: { x: 0, y: 0 }, width: 1, height: 1 },
        { id: 'e2', type: 'page', pageId: 'gone', position: { x: 0, y: 0 }, width: 1, height: 1 },
        { id: 'e3', type: 'arrow', points: [] },
    ];

    const kept = await env.PageManager.cleanInvalidPageReferences(elements);

    assertEqual(kept.map(e => e.id), ['e1', 'e3'], '仅删除确认 404 的元素，非页面元素保持不变');
});

test('三态：网络错误判为 unknown，元素一律保留（不因抖动丢画布）', async () => {
    const env = buildSandbox();
    setupProbes(env, [pageEntry('a', 'pages/a.html')]);
    env.fetchStub.setNetworkError();   // 服务不可达
    seedElements(env, 5, 'a');

    const kept = await env.PageManager.cleanInvalidPageReferences(env.sandbox.ElementManager.state.elements);

    assertEqual(kept.length, 5, '探测失败不等于文件不存在，必须保留全部元素');
    assertEqual(env.PageManager.lastProbeUndecidable.length, 1, '应记录 1 个无法判定的页面');
});

test('三态：服务端 503 判为 unknown 而非 missing', async () => {
    const env = buildSandbox();
    setupProbes(env, [pageEntry('a', 'pages/a.html')]);
    env.fetchStub.setStatus({ 'pages/a.html': 503 });
    seedElements(env, 3, 'a');

    const kept = await env.PageManager.cleanInvalidPageReferences(env.sandbox.ElementManager.state.elements);
    assertEqual(kept.length, 3, '5xx 无法证明文件不存在，应保留');
});

test('超时：挂起的请求在超时后判为 unknown，不无限等待', async () => {
    const env = buildSandbox();
    env.fetchStub.setHang();
    const start = Date.now();
    const status = await env.PageLibrary.probePage('pages/hang.html', { timeout: 80 });
    const elapsed = Date.now() - start;

    assertEqual(status, 'unknown', '超时后应判为 unknown');
    assert(elapsed < 1000, `应在超时窗口内返回，实际 ${elapsed}ms（无超时则会永久挂起）`);
});

test('超时会中断挂起的 fetch（AbortSignal 生效）', async () => {
    const env = buildSandbox();
    env.fetchStub.setHang();
    env.fetchStub.reset();
    await env.PageLibrary.probePage('pages/hang.html', { timeout: 60 });
    assertEqual(env.fetchStub.calls.length, 1, '应只发起 1 次请求');
});

test('启动期已判定无效的页面：保存时不再重复探测', async () => {
    const env = buildSandbox();
    setupProbes(env, [pageEntry('bad', 'pages/bad.html', /* isValid */ false)]);
    const elements = [
        { id: 'e1', type: 'page', pageId: 'bad', position: { x: 0, y: 0 }, width: 1, height: 1 },
    ];
    env.fetchStub.reset();

    const kept = await env.PageManager.cleanInvalidPageReferences(elements);

    assertEqual(kept.length, 0, '启动期已确认无效的元素应被剔除');
    assertEqual(env.fetchStub.calls.length, 0, '已确认无效的页面无需再发 HEAD');
});

test('file:// 协议：短路不发起任何请求', async () => {
    const env = buildSandbox({ protocol: 'file:' });
    setupProbes(env, [pageEntry('a', 'pages/a.html')]);
    seedElements(env, 10, 'a');
    env.fetchStub.reset();

    const kept = await env.PageManager.cleanInvalidPageReferences(env.sandbox.ElementManager.state.elements);

    assertEqual(env.fetchStub.calls.length, 0, 'file:// 下不得发起网络请求');
    assertEqual(kept.length, 10, 'file:// 下全部元素保留');
});

test('并发探测下仍保留非页面元素', async () => {
    const env = buildSandbox();
    setupProbes(env, [pageEntry('a', 'pages/a.html')]);
    const elements = [
        { id: 'e1', type: 'page', pageId: 'a', position: { x: 0, y: 0 }, width: 1, height: 1 },
        { id: 'e2', type: 'arrow', points: [{ x: 0, y: 0 }] },
        { id: 'e3', type: 'annotation', content: '批注', anchorX: 1, anchorY: 2 },
    ];
    const kept = await env.PageManager.cleanInvalidPageReferences(elements);
    assertEqual(kept.map(e => e.id), ['e1', 'e2', 'e3'], '所有元素原样保留');
});

// ---------------------------------------------------------------- 汇总

(async () => {
    await runAll();

    console.log('\n' + '─'.repeat(64));
    if (failed === 0) {
        console.log(`\x1b[32m全部通过：${passed}/${passed + failed}\x1b[0m`);
        process.exit(0);
    }

    console.log(`\x1b[31m失败 ${failed}/${passed + failed}\x1b[0m`);
    failures.forEach(f => {
        console.log(`  · [${f.suite}] ${f.name}`);
    });
    process.exit(1);
})();
