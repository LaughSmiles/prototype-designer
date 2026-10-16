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
     * 锚点归属的**外扩带宽度**（画布 px）。
     *
     * = OFFSET + RADIUS，恰好把整个锚点圆点包进宿主的归属范围。
     *
     * ⚠️ 这个常量是问题 1 的修复核心。
     *    实测 bug：锚点画在元素边界**外侧** 6px，而元素命中框只认框内，
     *    于是每个锚点都落在自己宿主的命中区之外：
     *      · 鼠标朝框外锚点移动 → findPageElementAt 返回 null
     *      → setHoverElement(null) → 锚点层被清空，圆点凭空消失
     *      → 用户凭记忆点在原处 → 命中别的元素 → 「选了 A 连到 B」
     *    而且更糟：框外锚点物理上根本无法被 snapToAnchor 选中，
     *    实测点上去 started=false，连画都起不来。
     *
     *    修法就是让归属判定承认这段外扩带（选项 C：视觉不变，只修命中）。
     */
    get BAND() {
        // ⚠️ 不用 this.OFFSET + this.RADIUS 硬算，也不直接引用 AnchorProvider：
        //    本模块可能被单独加载（tools/test-anchor.js 会把它和
        //    connector-router.js 一起塞进同一个 vm 沙箱），直接引用全局标识符
        //    会在缺少依赖时抛 ReferenceError，把整个会话模块拖垮。
        //    与 ConnectorRouter._anchorPoint 同一个教训：宁可本地兜底。
        const off = (typeof AnchorProvider !== 'undefined') ? AnchorProvider.OFFSET : 6;
        const rad = (typeof AnchorProvider !== 'undefined') ? AnchorProvider.RADIUS : 5;
        return off + rad;
    },

    /**
     * 当前要显示锚点的宿主集合。
     * 每项：{ elementId, kind:'element'|'inner', selector?, rect, anchors[] }
     */
    hosts: [],

    /** 内部宿主缓存：key → [{selector, rect}]，rect 为画布坐标 */
    _innerCache: new Map(),

    /** 异步往返期间避免重复请求 */
    _pending: new Set(),

    /**
     * 当前悬停的元素 id（null = 没悬停，此时不显示任何锚点） */
    hoverId: null,

    /**
     * 已渲染的锚点清单：[{ref, point}]。
     *
     * ⚠️ 命中检测以**这份清单**为准，而不是用几何重新推导。
     *    原因：渲染与推导一旦分叉，就会出现"屏幕上画的是 A 锚点、
     *    算出来的是 B 锚点"——用户点哪个都对不上。
     *    既然屏幕上画了什么我们最清楚，就直接拿这份清单做命中。
     */
    _rendered: [],

    /** 记录本轮实际渲染出去的锚点（由 renderAnchors 调用） */
    setRendered(list) {
        this._rendered = Array.isArray(list) ? list : [];
    },

    /** 在已渲染清单里找离给定点最近的锚点 */
    hitRendered(point, tolerance) {
        if (!point || !this._rendered.length) return null;
        const t = Number.isFinite(tolerance) ? tolerance : 10;
        let best = null;
        let bestDist = Infinity;
        for (const a of this._rendered) {
            if (!a || !a.point) continue;
            const d = Math.hypot(a.point.x - point.x, a.point.y - point.y);
            if (d <= t && d < bestDist) {
                bestDist = d;
                best = { ref: a.ref, point: a.point, dist: d };
            }
        }
        return best;
    },

    /**
     * 判断一个画布点归属于哪个宿主矩形（精确 → 外扩带）。
     *
     * 顺序不能反：**先精确包含，再外扩带**。
     * 反过来的话，外扩带会抢走相邻元素框内的正常点击，
     * 让两个靠得很近的页面框互相"吃掉"对方的点击。
     *
     * @param {{x,y}} point 画布坐标
     * @param {Array<object>} rects 候选宿主矩形数组 {x,y,width,height}
     * @returns {?{rect, dist}} dist=0 表示精确命中；外扩带命中时为到最近边的距离
     */
    ownerOf(point, rects) {
        if (!point || !Array.isArray(rects)) return null;

        // 第一层：精确包含
        for (const r of rects) {
            if (!r) continue;
            if (point.x >= r.x && point.x <= r.x + r.width &&
                point.y >= r.y && point.y <= r.y + r.height) {
                return { rect: r, dist: 0 };
            }
        }

        // 第二层：外扩带，取最近的一条边
        const band = this.BAND;
        let best = null;
        for (const r of rects) {
            if (!r) continue;
            const d = this._distToRect(point, r);
            if (d <= band && (!best || d < best.dist)) {
                best = { rect: r, dist: d };
            }
        }
        return best;
    },

    /** 点到矩形的最短距离（在矩形内为 0） */
    _distToRect(p, r) {
        const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.width));
        const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.height));
        return Math.hypot(dx, dy);
    },

    // ------------------------------------------------------------ 端点解析（唯一入口）

    /**
     * 取一个元素用于**端点解析**的矩形（画布坐标）。
     *
     * ⚠️ 这是本轮修复「底部锚点连接异常」的核心。
     *
     *    背景（页面内容溢出导致的两套矩形）：
     *      · **锚点圆点**走 hostsOf → measuredRectOf → **实测** DOM 尺寸。
     *        页面去掉滚轮后改为展示全部内容，内容高 1699px，
     *        而 element.height 仍是声明值 **812**。
     *      · **连线**此前在本模块里直接读 element.width/height → **声明值**。
     *
     *    两套矩形一混，底部锚点必然错位：锚点画在真实底边(y=1699)，
     *    线却奔着声明底边(y=812)去 —— 用户点底部锚点，线停在页面中间。
     *    用户报的现象正是「起点/终点在底部时连接异常」。
     *
     * ⚠️ 为什么**只对页面框**用实测：
     *    只有页面框会内容溢出（iframe 去掉滚轮后撑高）。
     *    文本框、箭头、批注的声明值就是真值，对它们做 getBoundingClientRect()
     *    既会引入亚像素抖动，又要白付一次强制重排，纯属倒贴。
     *
     * ⚠️ measuredRectOf 自带兜底：读不到 DOM / 没有 view 时原样返回声明值，
     *    所以最坏情况就是退回本轮改动前的行为，绝不崩、绝不产生 NaN。
     *
     * @param {object} el 画布元素
     * @param {?object} [opts] { getDomRect, view } 依赖注入（测试用），透传给 measuredRectOf
     * @returns {{x,y,width,height}}
     */
    rectOf(el, opts = {}) {
        if (!el || !el.position) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        // pageId 存在的即页面框（type 字段的历史数据可能缺失，两者都认）
        const isPage = el.type === 'page' || !!el.pageId;
        if (isPage) return this.measuredRectOf(el, opts);
        return {
            x: el.position.x, y: el.position.y,
            width: el.width, height: el.height,
        };
    },

    /**
     * 解析一条连接线两端的「宿主矩形 + 路由锚点描述符」。
     *
     * ⚠️ 这是**唯一**的解析入口。预览、渲染、改连都必须走这里。
     *
     * 背景（反复踩的坑）：同一逻辑写两份必然分叉。本项目已因此出过三次：
     *   1) routeFor 与 renderConnectorInto 各写一份 → 改连后路径变鬼影
     *   2) hitRendered（清单命中）与 hitTest（几何推导）各写一份 → 「选了 A 连到 B」
     *   3) renderPreview 用页面框矩形、落线用内部宿主矩形
     *      → 同一锚点，预览终点 y=54、实际终点 y=521.5，**用户看到的「预览和实际不一样」**
     *   4) 锚点画在**实测**矩形上、连线端点读**声明**矩形
     *      → 页面内容溢出时（声明 812 / 实测 1699），底部锚点与线的终点差了 887px，
     *        用户报「起点终点在底部时连接异常」。现由下方 rectOf() 统一到实测。
     * 收敛成单一入口后，这类分叉在结构上就不可能再发生。
     *
     * @param {string} fromId   起点元素 id
     * @param {string} toId     终点元素 id
     * @param {?object} fromAnchor 起点锚点引用
     * @param {?object} toAnchor   终点锚点引用
     * @param {?object} [opts] { getElement, getInnerRect } 依赖注入（测试用）
     * @returns {?{fromRect,toRect,fromSide,toSide}} 任一端解析不出返回 null
     */
    resolveEndpoints(fromId, toId, fromAnchor, toAnchor, opts = {}) {
        const getElement = opts.getElement ||
            (typeof ElementManager !== 'undefined' ? (id) => ElementManager.getElement(id) : null);
        if (!getElement) return null;

        const fromEl = getElement(fromId);
        const toEl = getElement(toId);
        if (!fromEl || !toEl) return null;

        const rawOf = (el) => this.rectOf(el, opts);

        const sideOf = (a) => (a ? { side: a.side, t: a.t } : null);

        return {
            fromRect: this._hostRectFor(fromAnchor, fromEl, rawOf(fromEl), opts),
            toRect: this._hostRectFor(toAnchor, toEl, rawOf(toEl), opts),
            fromSide: sideOf(fromAnchor),
            toSide: sideOf(toAnchor),
        };
    },

    /**
     * 单个端点的宿主矩形。
     *
     * inner 锚点必须用**子元素自己的矩形**，否则线会从整个页面框的边出发，
     * 而不是从那个按钮出发 —— 这正是"内部元素也能作锚点"的意义所在。
     *
     * 解析不到内部宿主时退回元素级，保证线可见（而不是整条消失）。
     */
    _hostRectFor(anchorRef, el, fallbackRect, opts = {}) {
        if (!anchorRef) return fallbackRect;

        if (anchorRef.kind === 'inner' && anchorRef.selector) {
            const getInnerRect = opts.getInnerRect || ((eid, sel) => {
                const resolved = this.resolve({
                    elementId: anchorRef.elementId || eid,
                    kind: 'inner', selector: sel,
                    side: anchorRef.side, t: anchorRef.t,
                });
                return resolved ? resolved.rect : null;
            });
            const r = getInnerRect(el.id, anchorRef.selector);
            if (r) return r;
        }
        return fallbackRect;
    },

    // ------------------------------------------------------------ 两层锚点模型

    /**
     * 第一层：页面级宿主（页面框自身）。
     *
     * ⚠️ 用户反馈「当前是直接显示整个页面所有元素的锚点」——
     *    实测一次性亮出 128 个，既糊成一片，也让人无从下手。
     *    MasterGo 是分层的：先亮页面自身，鼠标探到哪个内部元素
     *    再额外亮起那一个。**两层叠加，不是替换。**
     */
    pageLevelHosts(hosts) {
        if (!Array.isArray(hosts)) return [];
        return hosts.filter(h => h && h.kind === 'element');
    },

    /**
     * 第二层：鼠标当前所在的内部元素（高亮层）。
     *
     * 只返回**一个**宿主 —— 命中多个嵌套元素时取**面积最小**的（最内层）。
     * 取最内层是必须的：否则大容器永远盖住里面的按钮，
     * 用户想连"立即使用"却只能连到包着它的大盒子。
     *
     * ⚠️ 除了严格包含，还认一段**就近回退带**（第二段逻辑）：
     *    浏览器实测「底部 tab 栏没有锚点」—— 鼠标移到 tab 栏的图标上时，
     *    图标是 `<a>` 且只有约 30×48，达不到 4000 的面积门槛，本就没进宿主表；
     *    而 tab 栏整体（`.by-tabbar`）是 fixed 元素，锚点坐标绑在 iframe 视口上，
     *    自适应撑高后又整体漂移。用户看到的是"这个区域什么都没有"。
     *
     *    没有回退带时，一旦鼠标停在任何宿主之外，第二层立刻空掉，
     *    画面只剩页面框自己的 12 个锚点 —— 用户完全无从判断这个区域可不可连。
     *    回退带让鼠标**贴着**某个元素边缘（哪怕在它外面几个像素）时仍能选中它。
     *
     *    顺序不能反：先严格包含（选最内层），再回退带（选最近的）。
     *
     * @param {{x,y}} point 画布坐标
     * @param {Array} hosts 候选宿主
     * @returns {?object} 命中的内部宿主；只命中页面框或在空白处时返回 null
     */
    hoveredInnerHost(point, hosts) {
        if (!point || !Array.isArray(hosts)) return null;

        // ---- 第一段：严格包含，取面积最小的最内层 ----
        let best = null;
        let bestArea = Infinity;
        for (const h of hosts) {
            // 页面框本身不算第二层 —— 它已经是第一层了
            if (!h || h.kind !== 'inner' || !h.rect) continue;
            const r = h.rect;
            if (point.x < r.x || point.x > r.x + r.width) continue;
            if (point.y < r.y || point.y > r.y + r.height) continue;
            const area = r.width * r.height;
            if (area < bestArea) {
                bestArea = area;
                best = h;
            }
        }
        if (best) return best;

        // ---- 第二段：就近回退带 ----
        // ⚠️ 必须**限定在页面框之内**：页面框之外的鼠标位置根本不是这个页面的，
        //    此时不该给它的内部元素亮锚点（否则光标移出画布也会亮着）。
        const pageFrame = hosts.find(h => h && h.kind === 'element' && h.rect);
        if (!pageFrame) return null;
        const pr = pageFrame.rect;
        const inFrame = point.x >= pr.x && point.x <= pr.x + pr.width &&
                        point.y >= pr.y && point.y <= pr.y + pr.height;
        if (!inFrame) return null;

        // 复用与 ownerOf 同一套外扩带判据（OFFSET + RADIUS），
        // 保证"框外锚点能归属"与"贴近元素能高亮"是同一条边界。
        const band = this.BAND;
        let near = null;
        let nearDist = Infinity;
        for (const h of hosts) {
            if (!h || h.kind !== 'inner' || !h.rect) continue;
            const d = this._distToRect(point, h.rect);
            if (d <= band && d < nearDist) {
                nearDist = d;
                near = h;
            }
        }
        return near;
    },

    // ------------------------------------------------------------ 视口固定系换算

    /**
     * 画布坐标 → 视口（屏幕）坐标。
     *
     * ⚠️ 这是修复「锚点只显示了一部分」的核心。
     *
     *    浏览器实测：锚点层原本挂在 #canvasWrapper 里，而 wrapper 是
     *    `overflow:hidden`、高度仅等于视口可见区（实测 727px）。
     *    用户放大看单个页面框时，页面框底边落到屏幕 y=834 > 771，
     *    **底部 14 个锚点全部被裁掉**（实测 insideWrapper:0 / clipped:14）。
     *
     *    所以把层移到 body + position:fixed。但画布坐标**不是**相对视口原点的，
     *    而是相对 #canvasWrapper 左上角的 —— 这里必须补上 wrapper 的屏幕偏移，
     *    否则锚点整体偏移 wrapper.left/top（实测偏了 191px，锚点全跑到框外）。
     *
     *    公式与 ToolsConnector.toCanvasCoords 严格互逆。
     *
     * @param {{x,y}} point 画布坐标
     * @param {object} view {zoom, pan}
     * @param {object} origin 参照物在视口中的左上角 {left, top}（通常传 wrapper 的 rect）
     */
    toViewport(point, view, origin) {
        if (!point || !view || !origin) return null;
        const zoom = Number.isFinite(view.zoom) && view.zoom ? view.zoom : 1;
        const pan = view.pan || { x: 0, y: 0 };
        return {
            x: origin.left + pan.x + point.x * zoom,
            y: origin.top + pan.y + point.y * zoom,
        };
    },

    /**
     * 取「锚点层的参照原点」。
     *
     * 锚点层挂在 body 下、用 position:fixed 时，原点就是视口 (0,0)；
     * 挂回 wrapper 内则用 wrapper 的左上角。
     *
     * @param {boolean} fixed 层是否 position:fixed
     * @param {?DOMRect} wrapperRect
     */
    layerOrigin(fixed, wrapperRect) {
        if (fixed) return { left: 0, top: 0 };
        return wrapperRect ? { left: wrapperRect.left, top: wrapperRect.top } : { left: 0, top: 0 };
    },

    // ------------------------------------------------------------ 宿主解析

    /**
     * 取页面元素的**实测矩形**（画布坐标）。
     *
     * ⚠️ 为什么要实测而不是直接用 element.width/height：
     *
     *    浏览器实测 bug：页面去掉滚轮后改为展示**全部内容**，
     *    内容高 1699px，DOM 实际长到 1073（屏幕）/ 1730（画布），
     *    但 element.height 仍是声明值 **812**。
     *
     *    于是锚点按 812 算 —— 上下两边的锚点全部错位：
     *      · 上边 3 个 → 框顶上方 4px，落进拖拽条区域，被盖住
     *      · 下边 3 个 → 框顶下方 507px，掉进页面内部，被 IFRAME 盖住
     *      · 左右边 6 个 → 正常
     *    12 个里 6 个看不见，用户看到的正是「只显示了一半」。
     *
     *    实测矩形对"内容溢出"这种形态天然免疫：页面多高，锚点就贴多高的边。
     *
     * 读不到 DOM 时退回声明值（不抛异常，保证线仍可见）。
     *
     * @param {object} pageElement 画布上的 page 元素
     * @param {?object} [opts] { getDomRect, view } 依赖注入（测试用）
     */
    measuredRectOf(pageElement, opts = {}) {
        const declared = {
            x: pageElement.position.x,
            y: pageElement.position.y,
            width: pageElement.width,
            height: pageElement.height,
        };
        if (!Number.isFinite(declared.width) || !Number.isFinite(declared.height)) return declared;

        const getDomRect = opts.getDomRect || ((id) => {
            // 锚点层已在 body 上，页面元素的 DOM 节点由渲染器按 data-element-id 挂载
            const dom = typeof document !== 'undefined'
                ? document.querySelector('.canvas-element[data-element-id="' + id + '"]')
                : null;
            if (!dom || typeof dom.getBoundingClientRect !== 'function') return null;
            const r = dom.getBoundingClientRect();
            return (r && Number.isFinite(r.width) && Number.isFinite(r.height)) ? r : null;
        });

        const view = (typeof CanvasView !== 'undefined' && CanvasView.getView)
            ? CanvasView.getView() : (opts.view || null);
        if (!view || !Number.isFinite(view.zoom) || !view.zoom) return declared;

        const r = getDomRect(pageElement.id);
        // 只在确实拿到更大的尺寸时采用实测值（内容溢出方向）；
        // 拿到更小的值可能是元素被隐藏/折叠，此时用声明值更稳。
        if (!r) return declared;
        const w = r.width / view.zoom;
        const h = r.height / view.zoom;
        if (!Number.isFinite(w) || !Number.isFinite(h)) return declared;
        if (h <= declared.height) return declared;

        return { x: declared.x, y: declared.y, width: w, height: h };
    },

    /**
     * 计算某页面元素当前可用的锚点宿主（含内部元素）。
     *
     * ⚠️ 内部元素一律用 full 密度（不再分 coarse）。
     *    上一版让内部元素只出「每边 1 个」的锚点，是我在锚点数失控时
     *    打的补丁。实测 MasterGo 的规则是**按尺寸过滤**而不是降密度：
     *    够大的元素（评论卡片、输入框）出完整锚点，
     *    小元素（头像、数字、图标）根本不出。
     *    尺寸过滤已经在 AnchorBridge.isUsableHost 里做了，这里不再重复裁剪。
     *
     * @param {object} pageElement 画布上的 page 元素
     * @returns {Array<{elementId,kind,selector?,rect,anchors}>}
     */
    hostsOf(pageElement) {
        if (!pageElement) return [];
        // ⚠️ 用实测矩形而非声明尺寸（页面去滚轮后内容会溢出声明高度）
        const rect = this.measuredRectOf(pageElement);

        const out = [];
        const ownAnchors = AnchorProvider.anchorsOfRect(rect);
        if (ownAnchors.length) {
            out.push({ elementId: pageElement.id, kind: 'element', rect, anchors: ownAnchors });
        }

        for (const inner of this._innerHostsOf(pageElement)) {
            // ⚠️ 内部宿主用 coarse（每边只留中点），**不是** full。
            //    MasterGo 实测：hover 一个页面框时，每张评论卡片只亮出
            //    **1 个**锚点（在卡片底部中点），不是四边各 3 个。
            //    页面框自身保持 full（12 个），因为它大、用户会按高度选点；
            //    页面内的卡片只是"连到它"，从哪条边出无所谓。
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

    /**
     * 取某页面元素的内部宿主（带缓存）。
     *
     * ⚠️ 这里做**实时折算** —— 缓存里存的是"页面框局部坐标"，
     *    消费时才加上当前的 element.position。
     *
     *    为什么不把 position 一起缓存（改法上更省事）：
     *    AnchorBridge.collectInnerHosts 采集时把
     *    `pageElement.position.x + innerRect.left` 烤成了画布绝对坐标。
     *    而 iframe 内的 getBoundingClientRect() 是相对 iframe 视口的，
     *    **页面框在画布上怎么拖都不影响它** —— 两个量相加缓存下来，
     *    就把拖拽前的 position 焊死了。
     *
     *    实测症状：拖拽页面框后，页面框自身的 12 个锚点正确，
     *    内部元素的锚点整体偏移 (-Δx, -Δy)；已连好的、连到内部元素的
     *    连接线端点同样停在原地（_hostRectFor → _hostOf 读的是同一份缓存）。
     *
     *    把加法推迟到消费时，拖拽天然跟随，
     *    不必在 canvas-view-events 的拖拽链路上补任何失效调用。
     *
     * @param {object} pageElement 画布上的 page 元素
     * @returns {Array} 内部宿主（画布坐标）
     */
    _innerHostsOf(pageElement) {
        const key = this._cacheKey(pageElement);
        if (!this._innerCache.has(key)) return [];   // 未就绪时先返回空，异步结果回来后重绘
        const cached = this._innerCache.get(key) || [];
        if (!cached.length) return cached;

        const pos = pageElement.position;
        // position 缺失/非法时原样返回，绝不让 NaN 流进渲染与路由
        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return cached;

        return cached.map(h => ({
            ...h,
            rect: {
                x: h.rect.x + pos.x,
                y: h.rect.y + pos.y,
                width: h.rect.width,
                height: h.rect.height,
            },
        }));
    },

    /**
     * 内部宿主的缓存键。
     *
     * ⚠️ 只含尺寸是**刻意的**，不是漏了 position：
     *    缓存里存的是 iframe 局部坐标，拖拽不影响它，无需因 position 失效；
     *    而尺寸一变（autofit 撑高 iframe）iframe 视口就变了，
     *    内部元素的 gBCR 全部作废 —— 这才是唯一的失效信号。
     */
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
