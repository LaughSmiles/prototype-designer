/**
 * page-autofit.js - 画布内页面框自适应内容全高
 *
 * ============================ 为什么要单独一个文件 ============================
 *
 * 1) 为什么必须运行在页面侧
 *     画布用 iframe 加载原型页。在 file:// 协议下，Chrome 给每个文件分配不透明来源，
 *     父页面读不到 iframe.contentDocument，注入 <script> 同样被拒 —— 这与 topbar.js
 *     里 Escape 桥面对的是同一堵墙（见该文件 104~120 行的注释）。
 *     唯一可用的通路是 postMessage，而发送端只能在页面内部。
 *     本文件由 topbar.js 注入加载（见该文件顶部），因此 pages/ 下的页面一行都不用改。
 *
 * 2) 为什么页面要先「解锁」
 *     现有原型页几乎都是视口锁定布局：
 *         桌面页  .ad-wrap{display:flex;height:100vh;overflow:hidden}
 *                 .ad-main{flex:1;min-width:0;overflow-y:auto}
 *         移动页  html,body{height:100%;overflow:hidden}
 *                 .by-scroll{flex:1;min-height:0;overflow-y:auto}
 *         PC  页  .pc-xxx{max-height:calc(100vh - var(--pc-header-h) - 48px);overflow-y:auto}
 *     滚动发生在内部容器里，documentElement.scrollHeight 恒等于视口高。
 *     不解除锁定，就永远量不到真实内容高度 —— 这是本文件存在的主要理由。
 *
 * ============================ 作用域 ============================
 * 仅当 iframe.name 以 'proto-canvas-' 开头时启用。
 * 该名字只由画布的页面元素 renderer 设置，全屏预览浮层与 index.html 总览页都没有，
 * 因此「单独打开页面 / 全屏预览 / 总览页」三种场景行为完全不变。
 *
 * 页面可通过在自身脚本里写 `window.PROTO_FIXED_HEIGHT = true` 显式退出自适应
 * （给「必须永远 1 屏」的页面留的逃逸开关，如移动端长列表）。
 */
(function () {
    'use strict';

    var NAME_PREFIX = 'proto-canvas-';
    var SCROLL_GAP = 2;      // scrollHeight 超出 clientHeight 多少才认定为滚动容器
    var VIEWPORT_SLACK = 2;  // 计算高度与视口高的允许误差
    var MAXHEIGHT_SLACK = 80; // max-height 判定放宽量，用于命中 calc(100vh - X)
    var MIN_HEIGHT = 120;    // 兜底，防止解锁失误把框压扁
    var MIN_WIDTH = 200;     // 同上，宽度下限
    var MSG_TYPE = 'proto-page-height';

    function log() {
        if (typeof Debug !== 'undefined' && Debug && Debug.log) {
            Debug.log.apply(Debug, arguments);
        }
    }

    // ========== 激活判定 ==========

    function isCanvasFrame() {
        return window.parent !== window &&
            typeof window.name === 'string' &&
            window.name.indexOf(NAME_PREFIX) === 0;
    }

    function optedOut() {
        return window.PROTO_FIXED_HEIGHT === true;
    }

    // ========== 第一步：探测可滚动容器 ==========

    function isScrollable(el) {
        var cs = window.getComputedStyle(el);
        if (!/(auto|scroll)/.test(cs.overflowY)) return false;
        return el.scrollHeight > el.clientHeight + SCROLL_GAP;
    }

    function collectScrollers() {
        var found = [];
        var all = document.body ? document.body.querySelectorAll('*') : [];
        for (var i = 0; i < all.length; i++) {
            if (isScrollable(all[i])) found.push(all[i]);
        }
        return found;
    }

    // ========== 第二步：解除锁定 ==========
    //
    // ⚠️ 这里绝对不能碰 flex / flex-grow / flex-basis：
    //    .ad-main{flex:1} 处在 .ad-wrap{display:flex}（row）里，控的是**宽度**，
    //    删掉会把左右分栏布局打烂。高度的问题只需要解开祖先链就够了 ——
    //    .ad-wrap 一旦变成 height:auto，.ad-main 作为 stretch 子项会自动贴合内容高度。

    function relax(el) {
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        // ⚠️ 这里刻意不动 min-height：
        //    min-height 只挡「变矮」，不挡「长高」，所以对本次目标毫无作用；
        //    而抹掉它会毁掉 .pc-auth{min-height:100vh} 这类「必须撑满屏」的页面
        //    （实测 pc-login 会从 1000 被压到 949，底部还会露出一条白边）。
        el.dataset.protoRelaxed = '1';
    }

    function relaxAncestors(scrollers) {
        var vh = window.innerHeight;
        for (var i = 0; i < scrollers.length; i++) {
            var node = scrollers[i].parentElement;
            while (node && node !== document.documentElement) {
                var rectH = node.getBoundingClientRect().height;
                // 祖先高度被钉到视口（100vh / 100% 链）→ 解开
                if (rectH >= vh - VIEWPORT_SLACK) relax(node);
                // max-height 形如 calc(100vh - X)，同样会把内容裁掉
                var maxH = parseFloat(window.getComputedStyle(node).maxHeight);
                if (!isNaN(maxH) && maxH >= vh - MAXHEIGHT_SLACK) {
                    node.style.setProperty('max-height', 'none', 'important');
                }
                node = node.parentElement;
            }
        }
    }

    function unlock() {
        var scrollers = collectScrollers();

        relaxAncestors(scrollers);

        // 滚动容器自身：解除纵向滚动，交回给文档流
        for (var i = 0; i < scrollers.length; i++) {
            scrollers[i].style.setProperty('overflow-y', 'visible', 'important');
            relax(scrollers[i]);
        }

        // 根节点
        var roots = [document.documentElement, document.body];
        for (var r = 0; r < roots.length; r++) {
            if (!roots[r]) continue;
            roots[r].style.setProperty('height', 'auto', 'important');
            roots[r].style.setProperty('overflow', 'visible', 'important');
        }

        log('[autofit] unlocked, scrollers =', scrollers.length, 'viewport =', window.innerHeight);
    }

    // ========== 第三步：测量真实内容宽高 ==========
    //
    // 只用 offsetHeight/scrollHeight/offsetWidth/scrollWidth，
    // **不要**用 getBoundingClientRect 的 bottom / right：
    // position:fixed 的元素（移动端底栏）rect.bottom 恒等于 innerHeight，
    // 混进来会和 iframe 高度形成正反馈，把框越撑越大。
    //
    // ⚠️ 宽度必须以 clientWidth 兜底：
    //    页面若存在纵向滚动条，视口会被压窄 15px，此时 scrollWidth 会比真实内容宽度
    //    少 15px。直接上报会把框报窄 15px。clientWidth 是「当前视口宽」，
    //    拿它当下限，这条 15px 污染就从根上消失了。

    function measureBox() {
        var h = 0, w = 0;
        var de = document.documentElement;
        var nodes = [de, document.body];
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (!el) continue;
            h = Math.max(h, el.scrollHeight, el.offsetHeight);
            w = Math.max(w, el.scrollWidth, el.offsetWidth, el.clientWidth);
        }

        // ⚠️ 滚动条占位补偿（本轮第二个修复，治自锁死循环）
        //
        // scrollHeight 不计滚动条占位，所以一旦页面已经处在「有滚动条」的状态，
        // 它上报的高度和没滚动条时**完全一样**，页面察觉不到自己其实装不下：
        //   竖条出现 → 视口被压窄 15px → 移动页写死的 body{width:375px} 横向溢出
        //   → 横条出现 → 横条吃掉 15px 视口高度 → 内容比可视高度还差 15px
        //   → 页面仍上报同一个 scrollHeight → 框不再长 → 死循环
        // 实测 app-player / app-upload 会稳定卡在这个状态里，左右两条滚动条都在。
        //
        // innerHeight - clientHeight 正是「被滚动条吃掉的视口高度」，
        // 补上这一项即可一次性跳出循环；跳出后 deficit 归零，尺寸随之回落并稳定。
        var lostH = Math.max(0, window.innerHeight - (de ? de.clientHeight : window.innerHeight));

        return {
            h: Math.max(Math.round(h + lostH), MIN_HEIGHT),
            w: Math.max(Math.round(w), MIN_WIDTH)
        };
    }

    // ========== 第四步：持续上报 ==========

    var rafId = 0;
    var lastHeight = 0;
    var lastWidth = 0;
    var observer = null;

    function report() {
        if (rafId) return;
        rafId = window.requestAnimationFrame(function () {
            rafId = 0;
            var box = measureBox();
            if (box.h === lastHeight && box.w === lastWidth) return;
            lastHeight = box.h;
            lastWidth = box.w;
            try {
                window.parent.postMessage({
                    type: MSG_TYPE,
                    key: window.name,
                    height: box.h,
                    width: box.w
                }, '*');
            } catch (err) {
                // 父窗口已关闭，忽略
            }
        });
    }

    function observe() {
        if (observer) return;
        if (typeof ResizeObserver === 'undefined') {
            // 老浏览器降级：只在 load 后测一次
            window.addEventListener('load', report);
            return;
        }
        observer = new ResizeObserver(report);
        observer.observe(document.documentElement);
        if (document.body) {
            observer.observe(document.body);
            var kids = document.body.children;
            for (var i = 0; i < kids.length; i++) observer.observe(kids[i]);
        }
    }

    function boot() {
        if (optedOut()) {
            log('[autofit] skipped: page set PROTO_FIXED_HEIGHT');
            return;
        }
        unlock();
        observe();
        report();
    }

    // ========== 启动 ==========

    if (!isCanvasFrame()) return;   // 单独打开 / 全屏预览 / 总览页：不介入

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
        // 图片 / 字体落位后可能还会再触发一次尺寸变化，load 时补一轮
        window.addEventListener('load', boot);
    } else {
        boot();
    }
})();
