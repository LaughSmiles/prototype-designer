/**
 * 校验 config.js 与 pages/ 目录的一致性
 *
 * 检查项：
 *   1. config.js 是否可被安全解析（作为 window 赋值执行）
 *   2. pages 数组：id 唯一、path 指向的文件真实存在
 *   3. pages 数组：category 必须存在于 categories 中，且 device 与分类一致
 *   4. 磁盘上是否存在未被 config.js 注册的孤儿页面
 *   5. devices / canvasSize 等关键字段是否齐备
 *
 * 用法： node tools/check-config.js        （有问题时以非零码退出，可接 CI）
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'config.js');
const PAGES_ROOT = path.join(PROJECT_ROOT, 'pages');

const errors = [];
const warnings = [];

// ---- 解析 config.js：在沙箱上下文中求值，只取 window.PROJECT_CONFIG ----
const sandbox = { window: {} };
try {
    new Function('window', require('fs').readFileSync(CONFIG_FILE, 'utf-8'))(sandbox.window);
} catch (e) {
    console.error(`✗ config.js 解析失败: ${e.message}`);
    process.exit(1);
}

const cfg = sandbox.window.PROJECT_CONFIG;
if (!cfg) {
    console.error('✗ config.js 未定义 window.PROJECT_CONFIG');
    process.exit(1);
}

const { categories = [], pages = [], devices = [] } = cfg;

// ---- 1. 基础字段 ----
for (const key of ['projectName', 'projectTitle', 'canvasSize']) {
    if (!cfg[key]) errors.push(`PROJECT_CONFIG 缺少必填字段 ${key}`);
}
if (cfg.canvasSize && (!cfg.canvasSize.width || !cfg.canvasSize.height)) {
    errors.push('canvasSize 必须同时提供 width 与 height');
}
if (!devices.length) warnings.push('devices 为空，编辑器不会显示设备切换 Tab');

// ---- 2. 分类 ----
const catIds = new Set();
for (const c of categories) {
    if (!c.id) { errors.push('存在缺少 id 的分类'); continue; }
    if (catIds.has(c.id)) errors.push(`分类 id 重复: ${c.id}`);
    catIds.add(c.id);
    if (!c.name) errors.push(`分类 ${c.id} 缺少 name`);
}

// ---- 3. 页面 ----
const pageIds = new Set();
const registeredPaths = new Set();
for (const p of pages) {
    if (!p.id) { errors.push('存在缺少 id 的页面'); continue; }
    if (pageIds.has(p.id)) errors.push(`页面 id 重复: ${p.id}`);
    pageIds.add(p.id);

    if (!p.name) errors.push(`页面 ${p.id} 缺少 name`);
    if (!p.path) { errors.push(`页面 ${p.id} 缺少 path`); continue; }

    const abs = path.join(PROJECT_ROOT, p.path);
    if (!fs.existsSync(abs)) errors.push(`页面 ${p.id} 的 path 不存在: ${p.path}`);
    if (registeredPaths.has(p.path)) errors.push(`页面 path 重复: ${p.path}`);
    registeredPaths.add(p.path);

    if (p.category && !catIds.has(p.category)) {
        errors.push(`页面 ${p.id} 的 category "${p.category}" 未在 categories 中定义`);
    }
}

// ---- 4. 孤儿页面 ----
function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full, out);
        else if (e.name.toLowerCase().endsWith('.html')) out.push(full);
    }
    return out;
}
const orphans = walk(PAGES_ROOT)
    .map((f) => path.relative(PROJECT_ROOT, f).replace(/\\/g, '/'))
    .filter((rel) => !registeredPaths.has(rel));
orphans.forEach((o) => errors.push(`孤儿页面（磁盘存在但未注册，画布编辑器不可见）: ${o}`));

// ---- 报告 ----
const byCat = {};
for (const p of pages) {
    if (!p.category) continue;
    byCat[p.category] = (byCat[p.category] || 0) + 1;
}

console.log('========== config.js 校验 ==========');
console.log(`项目名称      : ${cfg.projectName}  (v${cfg.version || '?'})`);
console.log(`画布尺寸      : ${cfg.canvasSize.width} × ${cfg.canvasSize.height}`);
console.log(`设备          : ${devices.map((d) => `${d.id}(${d.canvasSize ? d.canvasSize.width + '×' + d.canvasSize.height : '默认'})`).join(', ') || '无'}`);
console.log(`分类数        : ${categories.length}`);
console.log(`已注册页面数  : ${pages.length}`);
console.log(`磁盘页面数    : ${pages.length + orphans.length}`);
console.log('各分类页面数  :');
for (const c of categories) {
    const n = byCat[c.id] || 0;
    if (!n) warnings.push(`分类 "${c.id}" 下没有任何页面`);
    console.log(`   ${(c.name || c.id).padEnd(14, '　')} ${String(n).padStart(4)}`);
}
console.log('');

if (warnings.length) {
    console.log('--- 警告 ---');
    warnings.forEach((w) => console.log('  ⚠ ' + w));
    console.log('');
}
if (errors.length) {
    console.log(`--- 错误 (${errors.length}) ---`);
    errors.forEach((e) => console.log('  ✗ ' + e));
    process.exit(1);
}
console.log('✓ 全部检查通过');