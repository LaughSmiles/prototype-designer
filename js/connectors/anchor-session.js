/**
 * 智能连接线 · 锚点会话
 *
 * 负责「一次 hover 里要显示哪些锚点」，以及把锚点解析成画布坐标。
 *
 * 与 AnchorBridge 的分工：
 *   AnchorBridge  —— 只管 iframe 内部的宿主枚举（跨文档那部分）
 *   本模块        —— 管画布元素的锚点 + 把内部宿主并进来 + 缓存
 *
 * 缓存策略：
 *   内部宿主要跨 iframe 往返（bridge 模式是异步的），不能每帧都问。
 *   以「页面元素 id + 尺寸」为键缓存，元素尺寸变了才失效。
 *   位置变化不影响缓存（坐标每次实时算），所以拖动元素不会打缓存。
 */

const AnchorSession = {

    /**
     * 当前要显示锚点的宿主集合。
     * 每项：{ elementId, kind:'element'|'inner', selector?, rect, anchors[] }
     */
    hosts: [],

    /** 内部宿主缓存：key → [{selector, rect}]，rect 为画布坐标 */
    _innerCache: new Map(),

    /** 当前悬停的元素 id（null = 没悬停，此时不显示任何锚点） */
    hoverId: null,

    /** 异步往返期间避免重复请求 */
    _pending: new Set(),

    // ------------------------------------------------------------ 宿主解析

    /**
     * 计算某页面元素当前可用的锚点宿主（含内部元素）。
     *
     * @param {object} pageElement 画布上的 page 元素
     * @param {?HTMLIFrameElement} iframeEl 该元素内的 iframe（可空）
     * @returns {Array<{elementId,kind,selector?,rect,anchors}>}
     */
    hostsOf(pageElement) {
        if (!pageElement) return [];
        const rect = {
            x: pageElement.position.x,
            y: pageElement.position.y,
            width: pageElement.width,
            height: pageElement.height,
        };

        const out = [];
        const ownAnchors = AnchorProvider.anchorsOfRect(rect);
        if (ownAnchors.length) {
            out.push({ elementId: pageElement.id, kind: 'element', rect, anchors: ownAnchors });
        }

        for (const inner of this._innerHostsOf(pageElement)) {
            // 内部目标用 coarse 密度（每边 1 个）：它们是"连到它"，
            // 不像页面框那样需要按高度精确选点。详见 AnchorProvider.anchorsOfRect。
            const anchors = AnchorProvider.anchorsOfRect(inner.rect, { density: 'coarse' });
            if (!anchors.length) continue;
            out.push({
                elementId: pageElement.id,
                kind: 'inner',
                selector: inner.selector,
                rect: inner.rect,
                anchors,
            });
        }
        return out;
    },

    /** 取某页面元素的内部宿主（带缓存） */
    _innerHostsOf(pageElement) {
        const key = this._cacheKey(pageElement);
        if (this._innerCache.has(key)) return this._innerCache.get(key) || [];
        return [];   // 未就绪时先返回空，异步结果回来后由调用方重绘
    },

    _cacheKey(pageElement) {
        return `${pageElement.id}@${pageElement.width}x${pageElement.height}`;
    },

    /**
     * 异步预热某页面元素的内部宿主。
     *
     * @param {object} pageElement
     * @param {?HTMLIFrameElement} iframeEl
     * @param {function} onReady 拿到结果后的回调（用于重绘锚点）
     */
    primeInnerHosts(pageElement, iframeEl, onReady) {
        // ⚠️ 不能用 window.AnchorBridge 判断：顶层 const 在**词法作用域**里，
        //    不挂在 window 上（CLAUDE.md 记录过同一个坑，Storage 也踩过）。
        //    用 typeof 才是可靠的判据。
        if (!pageElement || !iframeEl || typeof AnchorBridge === 'undefined') return;
        const key = this._cacheKey(pageElement);
        if (this._innerCache.has(key) || this._pending.has(key)) return;

        this._pending.add(key);
        AnchorBridge.requestInnerHosts(pageElement, iframeEl, (hosts) => {
            this._pending.delete(key);
            // 只缓存当前仍然有效的尺寸，避免旧尺寸覆盖新尺寸
            if (this._cacheKey(pageElement) === key) {
                this._innerCache.set(key, hosts || []);
            }
            if (typeof onReady === 'function') onReady();
        });
    },

    /** 元素尺寸变化或删除时清掉它的缓存 */
    invalidate(elementId) {
        for (const key of Array.from(this._innerCache.keys())) {
            if (key.startsWith(`${elementId}@`)) this._innerCache.delete(key);
        }
    },

    clearCache() {
        this._innerCache.clear();
        this._pending.clear();
    },

    // ------------------------------------------------------------ 锚点解析

    /**
     * 把一个「锚点引用」解析成画布坐标。
     *
     * 锚点引用结构（这就是连接线要存进元素里的东西）：
     *   { elementId, kind:'element'|'inner', selector?, side, t }
     *
     * @returns {?{point, normal, rect}} 解析失败返回 null
     */
    resolve(ref) {
        if (!ref) return null;
        const host = this._hostOf(ref);
        if (!host) return null;
        const point = AnchorProvider.resolvePoint(host.rect, { side: ref.side, t: ref.t });
        if (!point) return null;
        return {
            point,
            normal: AnchorProvider.normalOf(ref.side),
            rect: host.rect,
        };
    },

    /** 按引用找到宿主（优先用缓存，缓存没有就现算元素级） */
    _hostOf(ref) {
        const el = ElementManager.getElement(ref.elementId);
        if (!el) return null;

        if (ref.kind !== 'inner') {
            const rect = {
                x: el.position.x, y: el.position.y,
                width: el.width, height: el.height,
            };
            return { elementId: el.id, kind: 'element', rect };
        }

        // 内部宿主：在缓存里按 selector 找
        const hosts = this._innerHostsOf(el);
        const hit = hosts.find(h => h.selector === ref.selector);
        if (hit) return { elementId: el.id, kind: 'inner', selector: ref.selector, rect: hit.rect };
        return null;
    },

    /**
     * 命中检测：给定画布坐标，找出最近的锚点（在吸附半径内）。
     *
     * @param {number} x @param {number} y
     * @param {Array} hosts 候选宿主（来自 hostsOf）
     * @param {number} tolerance 吸附半径（画布坐标）
     * @returns {?{ref, point}} ref 可直接存进连接线
     */
    hitTest(x, y, hosts, tolerance = 10) {
        let best = null;
        let bestDist = Infinity;

        for (const host of hosts) {
            for (const a of host.anchors) {
                const p = AnchorProvider.resolvePoint(host.rect, a);
                if (!p) continue;
                const d = Math.hypot(p.x - x, p.y - y);
                if (d <= tolerance && d < bestDist) {
                    bestDist = d;
                    best = {
                        ref: {
                            elementId: host.elementId,
                            kind: host.kind,
                            selector: host.selector,
                            side: a.side,
                            t: a.t,
                        },
                        point: p,
                    };
                }
            }
        }
        return best;
    },

    /**
     * 为一条连接线补齐缺失的锚点（旧数据兼容）。
     *
     * 旧连接线只存 fromId/toId，没有锚点字段。这里不写回数据，
     * 只在**渲染时**按两元素相对位置挑一组合理的边：
     *   水平分离为主 → 左出右进；垂直分离为主 → 上出下进。
     * 这样旧画布的线看起来与升级前一致，不会突然变形。
     *
     * @returns {{fromAnchor, toAnchor}} 补出来的锚点引用（含 elementId）
     */
    defaultAnchorsFor(fromEl, toEl) {
        if (!fromEl || !toEl) return { fromAnchor: null, toAnchor: null };
        const a = { x: fromEl.position.x, y: fromEl.position.y, width: fromEl.width, height: fromEl.height };
        const b = { x: toEl.position.x, y: toEl.position.y, width: toEl.width, height: toEl.height };

        const dx = (b.x + b.width / 2) - (a.x + a.width / 2);
        const dy = (b.y + b.height / 2) - (a.y + a.height / 2);

        let fromSide, toSide;
        if (Math.abs(dx) >= Math.abs(dy)) {
            fromSide = dx >= 0 ? 'right' : 'left';
            toSide = dx >= 0 ? 'left' : 'right';
        } else {
            fromSide = dy >= 0 ? 'bottom' : 'top';
            toSide = dy >= 0 ? 'top' : 'bottom';
        }

        return {
            fromAnchor: { elementId: fromEl.id, kind: 'element', side: fromSide, t: 0.5 },
            toAnchor: { elementId: toEl.id, kind: 'element', side: toSide, t: 0.5 },
        };
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnchorSession;
}
