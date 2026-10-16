/**
 * 智能连接线 · iframe 锚点桥
 *
 * 目标：让**页面（iframe）内部的真实 DOM 元素**也能作为锚点宿主，
 *       与 MasterGo「容器内的子元素也有连接点」一致。
 *
 * 两种取数模式（自动择一）：
 *
 *   direct —— http(s) 下直接读 iframe.contentDocument，同步、精确。
 *   bridge —— file:// 下 Chrome 给每个本地文件分配不透明来源，
 *             contentDocument 被拒（项目里 js/topbar.js 的注释记录过同一坑）。
 *             此时改由**页面自己**上报：topbar.js 收到请求后遍历自身 DOM，
 *             把结果 postMessage 回父页面。
 *
 * ⚠️ 设计约束：本模块的纯几何部分（toCanvasRect / cssPath / 遍历裁剪）
 *    不依赖真实 DOM，可在 vm 沙箱里用假节点树单测。
 *    DOM 相关的入口（requestInnerHosts）才碰 document。
 */

const AnchorBridge = {

    /** 父 → 子：请求上报内部锚点宿主 */
    MSG_REQUEST: 'connector-anchor-request',

    /** 子 → 父：内部锚点宿主上报 */
    MSG_RESPONSE: 'connector-anchor-response',

    /**
     * bridge 模式等待上报的超时。
     *
     * 取 300ms：正常同源 postMessage 往返在 1ms 量级，
     * 超时只用于"页面没有加载 topbar.js"这类异常，不该拖慢 hover。
     * 超时后调用方降级为「只显示元素级锚点」，不报错、不白屏。
     */
    TIMEOUT_MS: 300,

    /**
     * iframe 相对页面元素顶部的偏移。
     *
     * element-renderer.js 里 iframe 有 marginTop:30px（让出拖拽条），
     * 而 clickOverlay 的 top 也是 30px —— 两处必须一致，否则锚点会整体错位。
     */
    IFRAME_TOP_OFFSET: 30,

    /**
     * 内部宿主的数量上限。
     *
     * ⚠️ 防「锚点重叠成团」的第二道闸（第一道是 AnchorProvider 的采样降级）。
     *    实测 MasterGo 递归不限深度，但一次 hover 只亮出十来个锚点 ——
     *    真正让它可用的不是限深度，而是**只保留少数够大的目标**。
     *
     *    浏览器实测：不设限时一个页面框冒出 300 个锚点，完全无法使用；
     *    取 6 后是「页面框 12 个 + 内部 6×最多12 个」，与 MasterGo 观感一致。
     */
    MAX_INNER_HOSTS: 6,

    /** 参与收集的最小元素尺寸（与 AnchorProvider.MIN_HOST_SIZE 对齐） */
    MIN_HOST_SIZE: 12,

    /** 不参与收集的标签（结构性元素，不是用户想连的目标） */
    SKIP_TAGS: ['HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'BR'],

    // ------------------------------------------------------------ 纯几何（可单测）

    /**
     * iframe 内部元素的 rect → 画布坐标 rect。
     *
     * 推导：
     *   1) iframe 的 CSS 宽度 = 页面元素宽度（width:100%），
     *      内部页面就按这个宽度排版 → **1 内部 CSS px = 1 画布 px，无缩放因子**。
     *   2) 内部 getBoundingClientRect() 已经是"相对 iframe 视口"的坐标，
     *      滚动量天然含在里面，不需要再减 scrollTop。
     *   3) iframe 在页面元素内下沉了 IFRAME_TOP_OFFSET（拖拽条高度）。
     *
     * @param {object} innerRect  iframe 内元素的 rect（相对 iframe 视口）
     * @param {object} pageElement 画布上的 page 元素（含 position/width/height）
     * @returns {?object} 画布坐标 rect；入参非法时返回 null
     */
    toCanvasRect(innerRect, pageElement) {
        if (!innerRect || !pageElement || !pageElement.position) return null;
        const vals = [innerRect.left, innerRect.top, innerRect.width, innerRect.height,
                      pageElement.position.x, pageElement.position.y];
        if (!vals.every(Number.isFinite)) return null;

        return {
            x: pageElement.position.x + innerRect.left,
            y: pageElement.position.y + this.IFRAME_TOP_OFFSET + innerRect.top,
            width: innerRect.width,
            height: innerRect.height,
        };
    },

    /**
     * 生成元素的 CSS 选择器路径，用于在渲染时重新找到它。
     *
     * 这是锚点描述符能在**页面重载后依然指向同一元素**的关键。
     * 优先用 id（最稳），否则用 tag + nth-of-type 逐级拼。
     *
     * 只依赖 el.tagName / el.id / el.parentElement / el.classList，
     * 因此可以用假节点树单测。
     */
    cssPath(el) {
        if (!el || !el.tagName) return '';
        const parts = [];
        let cur = el;
        let guard = 0;
        while (cur && cur.tagName && guard++ < 64) {
            const tag = String(cur.tagName).toLowerCase();
            if (tag === 'html') break;

            if (cur.id) {
                parts.unshift(`#${cur.id}`);
                break;   // id 已足够唯一，不必再往上拼
            }

            let part = tag;
            const parent = cur.parentElement;
            if (parent && parent.children) {
                const sameTag = Array.prototype.filter.call(
                    parent.children, c => c && c.tagName === cur.tagName);
                if (sameTag.length > 1) {
                    part += `:nth-of-type(${sameTag.indexOf(cur) + 1})`;
                }
            }
            parts.unshift(part);
            cur = parent;
        }
        return parts.join(' > ');
    },

    /**
     * 从一棵（假或真）节点树里收集可作为锚点宿主的元素。
     *
     * @param {object} root 根节点；需有 children、tagName，以及 getRect() 返回
     *                      {left,top,width,height}（真 DOM 由适配器提供）
     * @param {object} opts { pageElement, maxHosts, minSize, skipTags, pathOf }
     * @returns {Array<{selector, rect, depth, area}>} 画布坐标 rect，按面积降序
     */
    collectInnerHosts(root, opts = {}) {
        const maxHosts = Number.isFinite(opts.maxHosts) ? opts.maxHosts : this.MAX_INNER_HOSTS;
        const minSize = Number.isFinite(opts.minSize) ? opts.minSize : this.MIN_HOST_SIZE;
        const skipTags = opts.skipTags || this.SKIP_TAGS;
        const pathOf = opts.pathOf || (n => this.cssPath(n));
        const getRect = opts.getRect || (n => n.getBoundingClientRect());
        const pageElement = opts.pageElement;

        const found = [];
        const walk = (node, depth) => {
            if (!node || depth > 32) return;
            const kids = node.children || [];
            for (const child of kids) {
                if (!child || !child.tagName) continue;
                if (skipTags.indexOf(String(child.tagName).toUpperCase()) !== -1) continue;

                const raw = getRect(child);
                if (raw && Number.isFinite(raw.width) && Number.isFinite(raw.height)) {
                    // 尺寸不足的宿主不收集（与 AnchorProvider 的阈值一致）
                    if (raw.width >= minSize && raw.height >= minSize) {
                        const rect = pageElement
                            ? this.toCanvasRect(raw, pageElement)
                            : { x: raw.left, y: raw.top, width: raw.width, height: raw.height };
                        if (rect) {
                            found.push({
                                selector: pathOf(child),
                                rect,
                                // depth 从 1 起算：body 的直接子元素是第 1 层。
                                // 便于调试时一眼看出层级，也便于将来按层裁剪。
                                depth: depth + 1,
                                area: rect.width * rect.height,
                            });
                        }
                    }
                }
                walk(child, depth + 1);
            }
        };
        walk(root, 0);

        // 面积大的优先保留 —— 大元素才是用户真正想连的目标
        found.sort((a, b) => b.area - a.area || a.depth - b.depth);
        return found.slice(0, maxHosts);
    },

    // ------------------------------------------------------------ 真实 DOM 入口

    /**
     * 判断某个 iframe 能否直接读 contentDocument。
     *
     * @returns {'direct'|'bridge'} 
     */
    probe(iframeEl) {
        if (!iframeEl) return 'bridge';
        try {
            const doc = iframeEl.contentDocument;
            if (doc && doc.body) return 'direct';
        } catch (e) {
            // 跨源（file:// 下即为此情形）→ 走上报
        }
        return 'bridge';
    },

    /**
     * 请求某页面元素的「内部锚点宿主」。
     *
     * direct 模式同步回调；bridge 模式异步回调（可能超时后回空数组）。
     * 两种模式都**保证回调恰好触发一次**，调用方不必处理重复。
     *
     * @param {object} pageElement 画布上的 page 元素
     * @param {object} iframeEl    该元素内的 iframe
     * @param {function(Array)} done 回调，参数为内部宿主列表（画布坐标）
     */
    requestInnerHosts(pageElement, iframeEl, done) {
        if (typeof done !== 'function') return;
        if (!pageElement || !iframeEl) { done([]); return; }

        const mode = this.probe(iframeEl);

        if (mode === 'direct') {
            let hosts = [];
            try {
                const doc = iframeEl.contentDocument;
                const body = doc && doc.body;
                if (body) {
                    // 真 DOM 没有 children/tagName 的鸭子类型问题，直接适配
                    hosts = this.collectInnerHosts(body, {
                        pageElement,
                        getRect: n => n.getBoundingClientRect(),
                    });
                }
            } catch (e) {
                hosts = [];
            }
            done(hosts);
            return;
        }

        // bridge 模式：向 iframe 内广播请求，等它回话
        let settled = false;
        const finish = (hosts) => {
            if (settled) return;
            settled = true;
            window.removeEventListener('message', onMessage);
            clearTimeout(timer);
            done(Array.isArray(hosts) ? hosts : []);
        };

        const onMessage = (event) => {
            const data = event && event.data;
            if (!data || data.type !== this.MSG_RESPONSE) return;
            if (data.elementId !== pageElement.id) return;
            if (event.source !== iframeEl.contentWindow) return;
            finish(this._normalizeReported(data.hosts, pageElement));
        };

        const timer = setTimeout(() => finish([]), this.TIMEOUT_MS);
        window.addEventListener('message', onMessage);

        try {
            iframeEl.contentWindow.postMessage({
                type: this.MSG_REQUEST,
                elementId: pageElement.id,
            }, '*');
        } catch (e) {
            finish([]);
        }
    },

    /**
     * 归一化上报数据。
     *
     * ⚠️ postMessage 的另一端是页面内的普通脚本，数据不可全信：
     *    这里逐项校验类型与数值，任何一项不合法就丢弃该项，
     *    绝不让 NaN 流进路由算法（否则整条连接线会消失且不报错）。
     */
    _normalizeReported(hosts, pageElement) {
        if (!Array.isArray(hosts)) return [];
        const out = [];
        for (const h of hosts) {
            if (!h || typeof h.selector !== 'string' || !h.selector) continue;
            const r = h.rect;
            if (!r) continue;
            const left = Number(r.left), top = Number(r.top);
            const width = Number(r.width), height = Number(r.height);
            if (![left, top, width, height].every(Number.isFinite)) continue;
            if (width < this.MIN_HOST_SIZE || height < this.MIN_HOST_SIZE) continue;
            const rect = this.toCanvasRect({ left, top, width, height }, pageElement);
            if (!rect) continue;
            out.push({ selector: h.selector, rect, depth: Number(h.depth) || 0,
                       area: rect.width * rect.height });
        }
        out.sort((a, b) => b.area - a.area);
        return out.slice(0, this.MAX_INNER_HOSTS);
    },

    /**
     * 子页面侧：响应父页面的上报请求。
     *
     * 由 js/topbar.js 在所有原型页面里调用（一行接入，不改各页面）。
     * 只在被 iframe 嵌入时才有意义 —— 独立打开时 window.parent === window，
     * 此时直接忽略，避免无意义遍历。
     */
    installChildSide() {
        if (typeof window === 'undefined' || !window.addEventListener) return;
        if (window.parent === window) return;   // 独立打开，不是被嵌入

        window.addEventListener('message', (event) => {
            const data = event && event.data;
            if (!data || data.type !== this.MSG_REQUEST) return;

            let hosts = [];
            try {
                const pageElement = { position: { x: 0, y: 0 }, width: 0, height: 0 };
                // 子页面自己不知道画布坐标，只上报**相对 iframe 视口**的 rect，
                // 由父页面用 toCanvasRect 换算（见 _normalizeReported）。
                const raw = this.collectInnerHosts(document.body, {
                    maxHosts: this.MAX_INNER_HOSTS,
                    getRect: n => n.getBoundingClientRect(),
                });
                hosts = raw.map(h => ({
                    selector: h.selector,
                    depth: h.depth,
                    rect: {
                        left: h.rect.x, top: h.rect.y,
                        width: h.rect.width, height: h.rect.height,
                    },
                }));
            } catch (e) {
                hosts = [];
            }

            try {
                event.source.postMessage({
                    type: this.MSG_RESPONSE,
                    elementId: data.elementId,
                    hosts,
                }, '*');
            } catch (e) { /* 父页面已关闭，忽略 */ }
        });
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnchorBridge;
}
