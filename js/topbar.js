/**
 * topbar.js - 顶栏交互功能 + 画布预览键盘桥
 * 1. 全屏切换（状态缓存到 localStorage，刷新后保持）
 * 2. 全屏状态下拦截 Ctrl+S，阻止浏览器默认保存
 * 3. Escape 通知父页面退出预览（file:// 协议下父页面注入失效时的降级通道）
 * 4. 注入 page-autofit.js（画布内页面框自适应内容全高）
 */
(function () {
    'use strict';

    var FULLSCREEN_KEY = 'topbar_fullscreen';

    // ========== 注入 page-autofit.js ==========
    //
    // 本文件是唯一被所有原型页面加载（桌面端 + 移动端）的公共脚本，
    // 把「画布内自适应高度」挂在这里，pages/ 下的页面就一行都不用改。
    //
    // 为什么用动态注入而不是 <script> 标签：加标签就要改 28 个页面；
    // 为什么不能用父页面注入：file:// 下父页面连 <script> 都塞不进 iframe（同 Escape 桥）。
    // currentScript.src 在 file:// 下是完整 file URL，取同目录文件名即可解析出兄弟文件。
    (function injectPageAutofit() {
        var cur = document.currentScript;
        if (!cur || !cur.src) return;
        var script = document.createElement('script');
        script.src = cur.src.replace(/[^/]*$/, 'page-autofit.js');
        document.head.appendChild(script);
    })();

    // ========== 全屏功能 ==========

    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    }

    function requestFS() {
        var el = document.documentElement;
        if (el.requestFullscreen) return el.requestFullscreen();
        if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
        if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
        if (el.msRequestFullscreen) return el.msRequestFullscreen();
    }

    function exitFS() {
        if (document.exitFullscreen) return document.exitFullscreen();
        if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
        if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
        if (document.msExitFullscreen) return document.msExitFullscreen();
    }

    function toggleFullscreen() {
        if (isFullscreen()) {
            exitFS();
        } else {
            requestFS();
        }
    }

    function updateIcon() {
        var icon = document.querySelector('[title="全屏"] i');
        if (!icon) return;
        if (isFullscreen()) {
            icon.classList.remove('fa-expand');
            icon.classList.add('fa-compress');
        } else {
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
        }
    }

    function onFullscreenChange() {
        var fs = isFullscreen();
        try { localStorage.setItem(FULLSCREEN_KEY, fs ? '1' : '0'); } catch (e) { /* ignore */ }
        updateIcon();
    }

    // 监听全屏变化事件
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    // 给全屏按钮绑定点击事件
    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.querySelector('[title="全屏"]');
        if (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                toggleFullscreen();
            });
            btn.style.cursor = 'pointer';
        }

        // 恢复全屏状态
        try {
            if (localStorage.getItem(FULLSCREEN_KEY) === '1') {
                requestFS();
            }
        } catch (e) { /* ignore */ }

        updateIcon();
    });

    // 暴露给 onclick（备用）
    window.toggleFullscreen = toggleFullscreen;

    // ========== 全屏状态下拦截 Ctrl+S，通知父页面（画布编辑器）保存 ==========

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            if (isFullscreen()) {
                e.preventDefault();
                e.stopPropagation();
                // 通知父页面（画布编辑器）执行保存
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'canvas-save' }, '*');
                }
            }
        }
    }, true);

    // ========== Escape：通知父页面退出预览（原位预览 / 全屏浮层） ==========
    //
    // 与上面的 Ctrl+S 桥同理：画布编辑器在 file:// 协议下读不到
    // iframe.contentDocument（Chrome 给每个文件分配不透明来源，跨文档访问被拒），
    // 父页面注入的监听会静默失效。焦点一旦进入页面内部，Esc 就不再冒泡到父页面，
    // 只能由页面自己 postMessage 回去。
    //
    // 说明：
    // - http 协议下父页面注入与本桥会同时触发，closePreview() 有幂等保护，安全。
    // - window.parent !== window 保证在 index.html 总览页中独立浏览时不误触发。
    // - 本文件被所有原型页面加载（桌面端 + 移动端），因此移动端页面也能退出预览。

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'prototype-escape-preview' }, '*');
        }
    }, true);

    // ========== 禁止 Ctrl + 鼠标滚轮 / Ctrl+± 键盘缩放页面 ==========

    document.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) &&
            (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
            e.preventDefault();
        }
    });

    // ========== 禁止移动端双指缩放和双击缩放 ==========

    // 禁止双指缩放
    document.addEventListener('touchmove', function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // 禁止双击缩放
    var lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
        var now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // ========== 连接线锚点：向画布编辑器上报内部可连接元素 ==========
    //
    // 背景：画布编辑器要让**页面内部的真实 DOM 元素**也能作为连接线锚点
    // （对齐 MasterGo「容器内的子元素也有连接点」）。
    //
    // http(s) 下编辑器可以直接读 iframe.contentDocument；但 file:// 下
    // Chrome 给每个本地文件分配不透明来源，跨文档访问被拒 —— 与上面
    // Esc/Ctrl+S 桥是同一个坑。所以由页面自己把可连接元素报回去。
    //
    // ⚠️ 为什么内联在这里而不是引 js/connectors/anchor-bridge.js：
    //    本文件已被**所有**原型页面加载（DESKTOP_REQUIRED + MOBILE_REQUIRED
    //    都含它），内联等于零页面改动；引外部文件则要改 40+ 个 HTML。
    //    代价是消息类型与选择器算法在两侧各存一份 —— 已由
    //    tools/test-anchor.js 的「协议常量一致性」用例锁死，改一边就变红。
    //
    // 独立打开页面时 window.parent === window，直接跳过，不做无谓遍历。

    if (window.parent && window.parent !== window) {
        var ANCHOR_REQ = 'connector-anchor-request';
        var ANCHOR_RES = 'connector-anchor-response';
        var ANCHOR_MAX = 6;
        var ANCHOR_MIN = 12;
        var ANCHOR_SKIP = { HTML: 1, HEAD: 1, BODY: 1, SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, TITLE: 1, BR: 1 };

        // 生成稳定的 CSS 选择器路径（与 anchor-bridge.js 的 cssPath 同算法）
        function anchorCssPath(el) {
            if (!el || !el.tagName) return '';
            var parts = [];
            var cur = el;
            var guard = 0;
            while (cur && cur.tagName && guard++ < 64) {
                var tag = String(cur.tagName).toLowerCase();
                if (tag === 'html') break;
                if (cur.id) {
                    parts.unshift('#' + cur.id);
                    break;
                }
                var part = tag;
                var parent = cur.parentElement;
                if (parent && parent.children) {
                    var same = [];
                    for (var i = 0; i < parent.children.length; i++) {
                        var c = parent.children[i];
                        if (c && c.tagName === cur.tagName) same.push(c);
                    }
                    if (same.length > 1) {
                        part += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
                    }
                }
                parts.unshift(part);
                cur = parent;
            }
            return parts.join(' > ');
        }

        // 收集可作为锚点宿主的元素（面积大的优先，超过上限截断）
        function anchorCollect() {
            var found = [];
            function walk(node, depth) {
                if (!node || depth > 32) return;
                var kids = node.children || [];
                for (var i = 0; i < kids.length; i++) {
                    var child = kids[i];
                    if (!child || !child.tagName) continue;
                    if (ANCHOR_SKIP[String(child.tagName).toUpperCase()]) continue;
                    var r = child.getBoundingClientRect();
                    if (r && r.width >= ANCHOR_MIN && r.height >= ANCHOR_MIN) {
                        found.push({
                            selector: anchorCssPath(child),
                            depth: depth + 1,
                            area: r.width * r.height,
                            rect: { left: r.left, top: r.top, width: r.width, height: r.height }
                        });
                    }
                    walk(child, depth + 1);
                }
            }
            walk(document.body, 0);
            found.sort(function (a, b) { return b.area - a.area || a.depth - b.depth; });
            return found.slice(0, ANCHOR_MAX);
        }

        window.addEventListener('message', function (event) {
            var data = event && event.data;
            if (!data || data.type !== ANCHOR_REQ) return;

            var hosts = [];
            try {
                hosts = anchorCollect().map(function (h) {
                    return { selector: h.selector, depth: h.depth, rect: h.rect };
                });
            } catch (err) {
                hosts = [];
            }

            try {
                event.source.postMessage({
                    type: ANCHOR_RES,
                    elementId: data.elementId,
                    hosts: hosts
                }, '*');
            } catch (err) {
                // 父页面已关闭，忽略
            }
        });
    }
})();
