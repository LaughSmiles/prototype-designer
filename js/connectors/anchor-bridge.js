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
     * 内部宿主的**面积下限**（画布 px²）。
     *
     * ⚠️ 这是替代「数量截断」的正确做法。
     *
     * 浏览器实测 MasterGo 的规则（连接线工具下悬停页面框，逐个核对元素）：
     *   ✓ 有锚点：页面框自身、评论卡片、底部输入框、标题块、媒体区
     *   ✗ 无锚点：圆形头像、"×"关闭按钮、点赞数字、小图标、文字 span
     *
     * 结论是**按尺寸过滤**，不是按数量截断：
     *   · 头像约 32×32 = 1024，数字约 20×14 = 280 → 都被滤掉 ✓
     *   · 输入框约 351×44 = 15444 被保留，但边框很薄 —— 见 MIN_HOST_EDGE
     *   · 卡片约 351×80 = 28080 → 保留 ✓
     *
     * 阈值取 4000：落在「头像 1024」与「输入框 15444」之间的干净分界。
     * 这不是拍脑袋 —— tools/test-anchor.js 里有用例锁住这个区间，
     * 改小会让小图标冒锚点，改大会把用户想连的卡片砍掉。
     *
     * 上一版用 MAX_INNER_HOSTS 截断是错解：它把"大元素"和"小元素"
     * 混在一起随机取前 N 个，用户要的"连到那个按钮"反而连不上。
     */
    MIN_HOST_AREA: 500,

    /**
     * 内部宿主的**最短边下限**（画布 px）。
     *
     * 面积够大但一边极薄的元素（如 351×4 的分隔线）仍不该出锚点：
     * 它那一侧的锚点会挤成一条密不可分的线。
     */
    MIN_HOST_EDGE: 16,

    /** 参与收集的最小元素尺寸（最低物理门槛） */
    MIN_HOST_SIZE: 12,

    /**
     * 内部宿主相对于**页面框**的最小占比。
     *
     * ⚠️ 浏览器实测：只按"绝对面积"过滤会漏掉一整类冗余宿主 ——
     *    页面里那个 `body > div` 是 375×782，几乎等于页面框本身。
     *    它的锚点全部贴在页面框边线上，与页面框自己的 12 个锚点
     *    位置重合、语义重复，纯属噪音，却贡献了 12 个。
     *
     *    用户要连的是页面里的**具体内容**（卡片、输入框、列表项），
     *    不是"那个铺满全屏的根容器"。凡是与页面框尺寸接近的宿主都该跳过。
     *
     * 取 0.9：面积 ≥ 页面框 90% 的宿主视为"页面框自身"，不另出锚点。
     * 375×782 / (375×812) = 0.964 > 0.9 → 被跳过 ✓
     * 而 375×260 = 0.32 → 保留 ✓
     */
    HOST_VS_PAGE_RATIO: 0.9,

    /** 不参与收集的标签（结构性元素，不是用户想连的目标） */
    SKIP_TAGS: ['HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'BR'],

    // ------------------------------------------------------------ 纯几何（可单测）

    // 注：原先这里有 clipToViewport（按页面框声明高度裁剪内部元素矩形），
    // 已**移除**。原因（浏览器实测 + 用户实况）：
    //   页面已去掉滚轮、改为展示**全部内容**。
    //   实测 element.height = 812，而页面实际内容高 1699。
    //   按 812 裁剪 → 下半页（y > 912）的所有内部元素被切掉，
    //   用户看到的现象是「只有一半页面显示锚点」。
    //   页面既然全量展示，"不可见区域"这个前提就不存在了，裁剪只剩误伤。

    /**
     * 两个矩形是否"边几乎重合"（去重叠的判据）。
     *
     * ⚠️ 浏览器实测：不去重时一个页面框冒出 **360 个锚点**，
     *    视觉上「密集糊成一片，单点难以分辨」。
     *    根因不是元素太多，而是**嵌套容器的边几乎重合**：
     *      body > div(0,0,375,782) > div(8,8,359,766) > ...
     *    每一层的四条边都在同一位置附近，于是每层都画一遍锚点，
     *    一个位置叠了 6~7 个圆点。
     *
     *    MasterGo 没有这个问题：它只让**最内层**那个元素出锚点，
     *    外层被内层"顶掉"了。这与用户看到的现象一致 —— 连到卡片，
     *    不需要先连到包着它的 div。
     */
    edgesNearlyEqual(a, b, tol = 8) {
        return Math.abs(a.x - b.x) <= tol &&
               Math.abs(a.y - b.y) <= tol &&
               Math.abs((a.x + a.width) - (b.x + b.width)) <= tol &&
               Math.abs((a.y + a.height) - (b.y + b.height)) <= tol;
    },

    /**
     * 宿主去重叠：边几乎重合的一组里，保留**面积最小**的那个。
     *
     * 保留最内层而不是最外层，是因为用户想连的是具体内容（按钮、卡片），
     * 而不是包着它的大容器；两者的锚点位置又几乎相同，选谁对用户没区别，
     * 但选内层语义更准。
     *
     * @param {Array<{rect}>} hosts
     * @returns {Array} 去重后的宿主
     */
    dedupeHosts(hosts) {
        if (!Array.isArray(hosts) || hosts.length < 2) return hosts || [];
        const out = [];
        for (const h of hosts) {
            // 若已有宿主的边与它几乎重合，且那个更小 → 保留更小的，丢弃当前
            const clash = out.find(o => this.edgesNearlyEqual(o.rect, h.rect));
            if (!clash) {
                out.push(h);
                continue;
            }
            const areaA = clash.rect.width * clash.rect.height;
            const areaB = h.rect.width * h.rect.height;
            if (areaB < areaA) {
                out[out.indexOf(clash)] = h;   // 当前更小，换成当前的
            }
            // 当前更大 → 直接丢弃（面积相同时保留先到的那个）
        }
        return out;
    },

    /** 矩形是否够格当锚点宿主（尺寸过滤，对齐 MasterGo） */
    isUsableHost(rect) {
        if (!rect) return false;
        if (rect.width < this.MIN_HOST_EDGE || rect.height < this.MIN_HOST_EDGE) return false;
        return rect.width * rect.height >= this.MIN_HOST_AREA;
    },

    /**
     * 宿主是否「与页面框几乎等大」。
     *
     * 铺满整页的根容器，它的锚点与页面框自己的 12 个位置重合、语义重复，
     * 纯噪音却贡献 12 个。与页面框尺寸接近的一律不算独立宿主。
     *
     * @param {object} rect  画布坐标矩形
     * @param {number} pageArea 页面框面积（声明宽 × 声明高）
     * @param {number} [ratio] 阈值，默认 HOST_VS_PAGE_RATIO
     */
    isPageSized(rect, pageArea, ratio = this.HOST_VS_PAGE_RATIO) {
        if (!rect || !(pageArea > 0)) return false;
        return (rect.width * rect.height) / pageArea >= ratio;
    },

    /**
     * iframe 内部元素的 rect → 画布坐标 rect。
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
     * iframe 内部元素的 rect → **相对页面框左上角**的 rect（不含 position）。
     *
     * ⚠️ 这是缓存层专用的坐标系，和 toCanvasRect 的区别就是"加不加 position"：
     *
     *    toCanvasRect 采集时就折算成画布绝对坐标（x = position.x + innerRect.left）。
     *    问题在于 pageElement.position 会被拖拽改掉，而 iframe 内的
     *    getBoundingClientRect() 相对 iframe 视口**完全不受拖拽影响**。
     *    两者相加等于把「稳定的量」和「不稳定的量」烤在一起存进缓存 ——
     *    实测症状：拖拽页面框后，页面框自身的 12 个锚点是对的，
     *    内部元素的锚点整体偏移 (-Δx, -Δy)。
     *
     *    这里只保留内层坐标，把 position 的加法**推迟到消费时**
     *    （见 AnchorSession._innerHostsOf）。拖拽于是天然跟随，
     *    不需要在任何失效链路上补代码。
     *
     *    IFRAME_TOP_OFFSET 仍然要加：iframe 有 marginTop:30px 让出拖拽条，
     *    那是**结构性偏移**，与 position 无关，恒定存在。
     *
     * @param {object} innerRect  iframe 内元素的 rect（相对 iframe 视口）
     * @param {object} pageElement 画布上的 page 元素（仅用于校验 position 存在）
     * @returns {?object} 页面框局部坐标 rect；入参非法时返回 null
     */
    toFrameRect(innerRect, pageElement) {
        if (!innerRect || !pageElement || !pageElement.position) return null;
        const vals = [innerRect.left, innerRect.top, innerRect.width, innerRect.height,
                      pageElement.position.x, pageElement.position.y];
        if (!vals.every(Number.isFinite)) return null;

        return {
            x: innerRect.left,
            y: this.IFRAME_TOP_OFFSET + innerRect.top,
            width: innerRect.width,
            height: innerRect.height,
        };
    },

    /** 矩形是否够格当锚点宿主（尺寸过滤，对齐 MasterGo） */

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
     * 把 collectInnerHosts 的**筛选尾部**抽成唯一入口。
     *
     * ⚠️ 为什么要抽出来：`collectInnerHosts` 只处理"父页面能直接读 DOM"的场景，
     *    但筛选规则（尺寸门槛 → 等大根容器剔除 → 边重合去重叠 → 排序）
     *    在 file:// 下走的是完全不同的代码路径（js/topbar.js 内联的 anchorCollect）。
     *    两边各写一份，就出现过实测事故：同一页面在 http 下 58 个宿主、
     *    file:// 下 72 个，多出来的全是"铺满全屏的根容器"和"边重合的嵌套层"。
     *
     *    现在 direct 与 bridge 共用本方法，**规则只有一份**。
     *
     * @param {Array} found      遍历得到的原始宿主（rect 为 iframe 内坐标）
     * @param {number} pageArea  页面框面积；无页面框时传 0 表示不做等大剔除
     * @param {object} [opts]    { dedupe }
     * @returns {Array} 排序去重后的宿主
     */
    finalizeInnerHosts(found, pageArea, opts = {}) {
        if (!Array.isArray(found) || found.length === 0) return [];

        // ① 尺寸过滤（小图标/数字/头像不出锚点）
        const sized = found.filter(h =>
            h && h.rect && this.isUsableHost(h.rect) &&
            // ② 剔除与页面框几乎等大的根容器（锚点与页面框重复）
            !this.isPageSized(h.rect, pageArea));

        // ③ 去重叠：边几乎重合的一组只留最内层（「锚点糊成一片」的直接解药）
        const deduped = opts.dedupe === false ? sized : this.dedupeHosts(sized);

        // ④ 面积大的排前面仅为渲染顺序稳定（不做截断）
        deduped.sort((a, b) => b.area - a.area || a.depth - b.depth);
        return deduped;
    },

    /**
     * 从一棵（假或真）节点树里收集可作为锚点宿主的元素。
     *
     * ⚠️ 不做数量截断。MasterGo 的规则是「够大就出」，
     *    截断会随机丢掉用户真正想连的那个按钮。
     *
     * @param {object} root 根节点；需有 children、tagName 与 getBoundingClientRect
     * @param {object} opts { pageElement, skipTags, pathOf, getRect, dedupe }
     * @returns {Array<{selector, rect, depth, area}>} 画布坐标 rect
     */
    collectInnerHosts(root, opts = {}) {
        const skipTags = opts.skipTags || this.SKIP_TAGS;
        const pathOf = opts.pathOf || (n => this.cssPath(n));
        const getRect = opts.getRect || (n => n.getBoundingClientRect());
        const pageElement = opts.pageElement;

        const found = [];
        // 页面框面积，用于剔除"与页面框几乎等大的根容器"
        const pageArea = pageElement
            ? pageElement.width * pageElement.height : 0;

        const walk = (n, depth) => {
            if (!n || depth > 32) return;
            for (const child of (n.children || [])) {
                if (!child || !child.tagName) continue;
                if (skipTags.indexOf(String(child.tagName).toUpperCase()) !== -1) continue;

                const raw = getRect(child);
                if (raw && Number.isFinite(raw.width) && Number.isFinite(raw.height)) {
                    // 换算到**页面框局部坐标**（不含 position）；**不再裁剪**（页面展示全部内容）
                    // ⚠️ 这里刻意不折算成画布绝对坐标：那会把拖拽前的 position 烤进缓存，
                    //    拖拽后整体错位。position 的加法推迟到 AnchorSession._innerHostsOf。
                    //    尺寸过滤/去重只看宽高与彼此间距，与 position 无关，折算与否数值相同。
                    const frameRect = pageElement
                        ? this.toFrameRect(raw, pageElement)
                        : { x: raw.left, y: raw.top, width: raw.width, height: raw.height };
                    if (frameRect) {
                        found.push({
                            selector: pathOf(child),
                            rect: frameRect,
                            depth: depth + 1,
                            area: frameRect.width * frameRect.height,
                        });
                    }
                }
                walk(child, depth + 1);
            }
        };
        walk(root, 0);

        // 尺寸过滤 / 等大剔除 / 去重叠 / 排序 —— 全部走唯一入口（见上方说明）
        return this.finalizeInnerHosts(found, pageArea, { dedupe: opts.dedupe });
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
                // 下发页面框面积：页面自己不知道画布上框多大，
                // 没有它就无法执行「剔除等大根容器」这一步，两条路径会分叉。
                pageArea: pageElement.width * pageElement.height,
            }, '*');
        } catch (e) {
            finish([]);
        }
    },

    /**
     * 归一化上报数据（file:// 桥模式）。
     *
     * ⚠️ postMessage 的另一端是页面内的普通脚本，数据不可全信：
     *    这里逐项校验类型与数值，任何一项不合法就丢弃该项，
     *    绝不让 NaN 流进路由算法（否则整条连接线会消失且不报错）。
     *
     * 过滤规则与 direct 模式保持一致，否则同���页面在 http 与 file:// 下
     * 会看到不同的锚点集合。
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
            // 与 direct 模式同坐标系：页面框局部坐标（不含 position）
            const rect = this.toFrameRect({ left, top, width, height }, pageElement);
            if (!rect) continue;
            // ⚠️ 不裁剪（与 direct 模式一致，页面展示全部内容）；
            //    尺寸 / 等大 / 去重叠统一交给 finalizeInnerHosts —— 不在这里重写一遍。
            out.push({
                selector: h.selector,
                rect,
                depth: Number(h.depth) || 0,
                area: rect.width * rect.height,
            });
        }
        const pageArea = pageElement ? pageElement.width * pageElement.height : 0;
        // 与 direct 模式走**同一个**筛选尾部，否则同一页面 http/file:// 锚点集合不同
        return this.finalizeInnerHosts(out, pageArea);
    },

    /**
     * 子页面侧：响应父页面的上报请求。
     *
     * ⚠️ 实测本项目**并未**使用本方法 —— 子侧逻辑内联在 js/topbar.js 里
     *    （那个文件被所有原型页面加载，内联等于零页面改动；引外部文件要改 40+ 个 HTML）。
     *    保留本方法是为了让"子侧该怎么实现"有唯一参考实现，且仍可在测试里调用。
     *
     *    两条子侧路径都必须与 collectInnerHosts 用**同一个**筛选尾部
     *    （finalizeInnerHosts），否则同一页面在 http 与 file:// 下
     *    会看到不同的锚点集合。
     *
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
                const raw = this.collectInnerHosts(document.body, {
                    getRect: n => n.getBoundingClientRect(),
                    // 无 pageElement → 不换算坐标、不做等大剔除，由父页面收尾时统一处理
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
