/**
 * 全局调试开关
 *
 * 框架层的初始化进度等诊断日志统一走 Debug.log()，默认静默。
 * 排障时任选一种方式开启：
 *   - 在 URL 上加 ?debug=1
 *   - 控制台执行 localStorage.setItem('prototypeDebug','1') 后刷新
 *   - 控制台执行 Debug.enable()
 *
 * 注意：警告与错误（Debug.warn / Debug.error）默认始终输出，不受开关影响。
 */
window.Debug = (function () {
    'use strict';

    var STORAGE_KEY = 'prototypeDebug';

    function readEnabled() {
        try {
            if (/[?&]debug=1\b/.test(location.search)) return true;
            return localStorage.getItem(STORAGE_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    var enabled = readEnabled();

    return {
        /** 当前是否开启调试输出 */
        isEnabled: function () { return enabled; },

        /** 开启调试输出并持久化 */
        enable: function () {
            enabled = true;
            try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
        },

        /** 关闭调试输出 */
        disable: function () {
            enabled = false;
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        },

        /** 调试日志：默认静默 */
        log: function () {
            if (!enabled) return;
            var args = Array.prototype.slice.call(arguments);
            console.log.apply(console, args);
        },

        /** 警告：始终输出 */
        warn: function () {
            var args = Array.prototype.slice.call(arguments);
            console.warn.apply(console, args);
        },

        /** 错误：始终输出 */
        error: function () {
            var args = Array.prototype.slice.call(arguments);
            console.error.apply(console, args);
        }
    };
})();