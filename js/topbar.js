/**
 * topbar.js - 顶栏交互功能
 * 1. 全屏切换（状态缓存到 localStorage，刷新后保持）
 * 2. 全屏状态下拦截 Ctrl+S，阻止浏览器默认保存
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

    // ========== 全屏状态下拦截 Ctrl+S ==========

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            // 只在全屏状态下拦截
            if (isFullscreen()) {
                e.preventDefault();
                // 不 stopPropagation，让画布编辑器也能收到 Ctrl+S 触发保存
            }
        }
    }, true); // 使用捕获阶段，确保优先于其他处理器
})();
