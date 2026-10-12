/**
 * topbar.js - 顶栏交互功能 + 画布预览键盘桥
 * 1. 全屏切换（状态缓存到 localStorage，刷新后保持）
 * 2. 全屏状态下拦截 Ctrl+S，阻止浏览器默认保存
 * 3. Escape 通知父页面退出预览（file:// 协议下父页面注入失效时的降级通道）
 */
(function () {
    'use strict';

    var FULLSCREEN_KEY = 'topbar_fullscreen';

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
})();
