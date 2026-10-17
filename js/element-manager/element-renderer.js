// 元素渲染模块
// 负责画布上所有元素的渲染

// ============================ 页面框自适应高度 ============================
//
// 画布上的页面框默认是设备固定尺寸（1440×900 / 375×812），页面内容超出部分只能
// 在 iframe 内部滚动，画布上永远只能看到一屏。页面在画布里加载后会把真实内容高度
// 报回来（见 js/page-autofit.js），由这里盖到外框样式上，实现「像 MasterGo 一样」
// 的完整长框展示。
//
// ⚠️ 只写 div.style.height，绝不写 element.height：
//    自适应是渲染时的表现，不是画布数据。存档 JSON、脏标记、撤销栈都不该被它影响。
//
// ============================ 为什么还要「记住」(本轮新增) ============================
//
// 上面那条「不写 element.height」是对的，但只活在内存里的后果是：**每次都要重新量**。
// 实测（zoom 0.55，硬刷新）三条时间线：
//    · 刷新 elem_7  812 → t≈485ms → 1733
//    · 刷新 elem_8  812 → t≈541ms → 1987
//    · 拖入 app-msg 812 → t≈143ms → 846
// 也就是「先按设备高占位，几百毫秒后才撑开」—— 用户要的是拖入即完整、F5 即完整。
//
// 关键事实：要在**一点都不跳**的前提下显示完整页面，就必须在 iframe 加载**之前**
// 知道内容高度。而高度只能量出来，所以唯一可行的办法是「量过一次就记住」。
//
// 于是：把内容高度当作**页面自身的属性**，按 pageId 记住，存到独立键里
// （Storage.PAGE_BOX_KEY）。仍不碰 element.height —— 存档 JSON / 脏标记 /
// 撤销栈继续完全不受影响。
//
// ⚠️ 某个页面**有史以来第一次**出现时，高度客观上还不知道。这种「未知」的框
//    先 visibility:hidden 藏起来，等第一次测量结果回来直接以完整高度显形；
//    全程没有任何跳变。并有兜底超时，保证它绝不永久不出现。
//
// ⚠️ 已知的、无法根除的残余：若页面内容后来被**改短**，它会先按记忆里的旧高度
//    画出来、随后被真实高度缩小 —— 反向跳一下。内容变长或没变都不会跳。
//    要彻底消除得给页面内容算指纹，代价远大于收益。

const PROTO_FRAME_BAR = 30; // 顶部拖拽条高度，与下方 calc(100% - 30px) 保持一致

// 「高度还不知道」的框先藏起来，最多藏这么久。
// 到期仍没收到高度回报就按设备尺寸显示 —— 宁可退回旧观感，也不能让页面不出现。
// 真实存在的不回报情形：页面标了 `window.PROTO_FIXED_HEIGHT = true`、
// iframe 加载失败、page-autofit.js 没能注入。这些都不会报错，只能靠超时兜底。
const PROTO_MEASURE_TIMEOUT = 1500;

window.ProtoAutoFit = {
    _cache: Object.create(null),      // elementId -> { h, w } 本次会话实测（权威）
    _known: null,                     // pageId -> { h, w } 跨刷新记住的（懒加载）
    _measuring: Object.create(null),  // elementId -> { timer, div } 正在等首次测量
    _persistTimer: null,
    _unloadBound: false,

    /**
     * 落盘用的键名。**单一来源在 Storage**（它是全部 localStorage 键名的持有者）。
     * Storage 尚未就绪时返回 null → 本次只走运行时缓存、不落盘（安全降级）。
     */
    get storeKey() {
        if (typeof Storage !== 'undefined' && Storage.PAGE_BOX_KEY) return Storage.PAGE_BOX_KEY;
        return null;
    },

    /** 「完整高度还不知道」时给框的占位高度（设备高 + 顶栏） */
    placeholderHeight(baseHeight) {
        const base = (typeof baseHeight === 'number' && baseHeight > 0) ? baseHeight : 0;
        return base + PROTO_FRAME_BAR;
    },

    /**
     * 边框厚度（左右 / 上下）。
     *
     * ⚠️ 只能用 offsetWidth-clientWidth 量，**不能**用 getComputedStyle：
     *    游离（还没 appendChild）的节点匹配不到 `:root[data-theme="light"] …`
     *    这类祖先选择器，computed border 会是 0；而 offsetWidth 也是 0。
     *    所以调用方必须在**挂到 DOM 之后**再调一次（见 renderElementWithoutCount）。
     */
    borderOf(div) {
        return {
            w: (div.offsetWidth - div.clientWidth) || 0,
            h: (div.offsetHeight - div.clientHeight) || 0,
        };
    },

    /**
     * 把**占位**尺寸套上去（设备高 + 顶栏 + 边框）。
     * 用于「高度还未知」的框：它虽然被藏着，但盒子尺寸仍要正确，
     * 否则兜底超时把它显出来时会比设备视口矮一截。
     */
    applyPlaceholder(div, baseWidth, baseHeight) {
        if (!div) return;
        const b = this.borderOf(div);
        if (typeof baseWidth === 'number' && baseWidth > 0) {
            div.style.width = `${baseWidth + b.w}px`;
        }
        div.style.height = `${this.placeholderHeight(baseHeight) + b.h}px`;
    },

    _elementOf(elementId) {
        if (typeof ElementManager === 'undefined' || !ElementManager.getElement) return null;
        return ElementManager.getElement(elementId) || null;
    },

    /** 懒加载跨刷新记忆。形状不对的条目直接丢弃 —— 存档可能被手改过 */
    _loadKnown() {
        if (this._known) return this._known;
        this._known = Object.create(null);
        const key = this.storeKey;
        if (!key) return this._known;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return this._known;
            const parsed = JSON.parse(raw);
            for (const pageId in parsed) {
                const b = parsed[pageId];
                if (b && Number.isFinite(b.h) && Number.isFinite(b.w) && b.h > 0 && b.w > 0) {
                    this._known[pageId] = { h: b.h, w: b.w };
                }
            }
        } catch (e) {
            Debug.warn('[autofit] 页面高度记忆损坏，已忽略:', e);
            this._known = Object.create(null);
        }
        return this._known;
    },

    /**
     * 写盘（防抖 400ms）。
     *
     * ⚠️ 只做「下次少跳一下」的优化，所以任何失败都只 warn 不打扰用户 ——
     *    写不进去（配额满 / 无痕模式）也只是退回「每次都量一遍」，功能不受影响。
     * ⚠️ 挂一个 pagehide 兜底：极端情况下用户量完就立刻刷新，定时器还没跑到。
     */
    _schedulePersist() {
        if (!this._unloadBound) {
            this._unloadBound = true;
            window.addEventListener('pagehide', () => {
                if (!this._persistTimer) return;
                clearTimeout(this._persistTimer);
                this._persistTimer = null;
                this._flush();
            });
        }
        if (this._persistTimer) return;
        this._persistTimer = setTimeout(() => {
            this._persistTimer = null;
            this._flush();
        }, 400);
    },

    _flush() {
        const key = this.storeKey;
        if (!key || !this._known) return;
        try {
            localStorage.setItem(key, JSON.stringify(this._known));
        } catch (e) {
            Debug.warn('[autofit] 页面高度记忆写入失败（不影响使用，只是下次还会量一遍）:', e);
        }
    },

    /**
     * 查一个页面框该用多大。
     * 顺序：本次会话实测 → 跨刷新记住的。都没有 → null
     * （调用方据此判断「高度未知」，决定先把它藏起来）。
     */
    recall(elementId) {
        const hit = this._cache[elementId];
        if (hit) return hit;
        const el = this._elementOf(elementId);
        const pageId = el && el.pageId;
        if (!pageId) return null;
        return this._loadKnown()[pageId] || null;
    },

    remember(elementId, box) {
        if (!elementId || !box) return;
        this._cache[elementId] = { h: box.h, w: box.w };
        // 按 pageId 记住：内容是**页面**的属性，不是某个元素实例的
        // —— 同一个页面拖两个框，两个框都该立刻是同一高度。
        const el = this._elementOf(elementId);
        const pageId = el && el.pageId;
        if (pageId) {
            this._loadKnown()[pageId] = { h: box.h, w: box.w };
            this._schedulePersist();
        }
    },

    /**
     * 把已知尺寸套到外框上。
     * 必须是**绝对赋值**：ResizeObserver 会在内容后续增长时反复调用本函数
     * （实测 pc-home 首次测量后内容又长了 2px），累加式写法会把框越撑越大。
     *
     * @returns {boolean} 是否真的套上了（false = 高度未知，调用方可能要藏框）
     */
    apply(elementId, div, baseWidth, baseHeight) {
        const box = this.recall(elementId);
        if (!box || !div) return false;
        if (typeof baseWidth !== 'number' || typeof baseHeight !== 'number') {
            const el = ElementManager.state.elements.find(e => e.id === elementId);
            if (!el) return false;
            baseWidth = el.width;
            baseHeight = el.height;
        }

        // ⬇️ 边框补偿
        // .canvas-element.page-element 是 border + box-sizing:border-box
        // （浅色主题 border:2px），style.height/width 里会被边框吃掉相应像素。
        // 早期版本没补，iframe 就比内容矮 → 冒出纵向滚动条
        // → 视口被压窄 15px → 移动页写死的 html,body{width:375px} 横向溢出
        // → 画布上凭空多出「右 + 下」两条滚动条。
        // 这里动态读取而不是写死，主题/样式变化都能自适应。
        const b = this.borderOf(div);

        // 只许长不许矮：页面框代表设备视口，不该比设备尺寸还矮
        div.style.width = `${Math.max(baseWidth, box.w) + b.w}px`;
        div.style.height = `${Math.max(baseHeight, box.h) + PROTO_FRAME_BAR + b.h}px`;
        return true;
    },

    /**
     * 高度未知时先把框藏起来，等第一次测量结果回来再显形（零跳变）。
     * 已知高度时什么都不做 —— 那是零延迟的正常路径。
     */
    beginMeasureIfUnknown(element, div) {
        if (!element || !div) return;
        if (this.recall(element.id)) return;   // 已知 → 不藏
        const id = element.id;
        if (this._measuring[id]) return;       // 已经在等，别重置计时
        div.classList.add('proto-measuring');
        this._measuring[id] = {
            div,
            timer: setTimeout(() => {
                Debug.warn('[autofit] 页面未回报高度，已按设备尺寸显示:', id);
                this.reveal(id);
            }, PROTO_MEASURE_TIMEOUT),
        };
    },

    /** 让一个正在等待测量的页面框显形（收到高度回报，或兜底超时） */
    reveal(elementId) {
        const rec = this._measuring[elementId];
        if (rec) {
            clearTimeout(rec.timer);
            delete this._measuring[elementId];
        }
        const div = (rec && rec.div) ||
            document.querySelector(`[data-element-id="${elementId}"]`);
        if (div) div.classList.remove('proto-measuring');
    },

    clear(elementId) {
        delete this._cache[elementId];
        const rec = this._measuring[elementId];
        if (rec) {
            clearTimeout(rec.timer);
            delete this._measuring[elementId];
        }
    }
};

const ElementRenderer = {
    // 渲染元素(不更新计数,用于撤销/重做)
    renderElementWithoutCount(element) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const div = document.createElement('div');
        div.className = `canvas-element ${element.type}-element`;
        div.dataset.elementId = element.id;

        if (element.type === 'page') {
            this.renderPageElement(div, element, canvas);
        } else if (element.type === 'arrow') {
            this.renderArrowElement(div, element, canvas);
        } else if (element.type === 'connector') {
            this.renderConnectorElement(div, element, canvas);
        } else if (element.type === 'annotation') {
            ElementAnnotation.renderAnnotationElement(div, element);
            return; // 批注元素有自己的返回处理
        }

        // 连接线元素自带端点手柄，不需要额外的拖拽手柄（但要删除按钮）
        if (element.type !== 'connector') {
            // 添加删除按钮(批注元素已经在renderAnnotationElement中添加了,跳过)
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.style.pointerEvents = 'auto';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ElementManager.deleteElement(element.id);
            });
            div.appendChild(deleteBtn);
        }

        canvas.appendChild(div);

        // ⚠️ 挂到 DOM 之后再套一次尺寸。
        //
        // renderPageElement 里那次 apply 是在**游离状态**下跑的，
        // 而边框补偿用的是 offsetWidth - clientWidth —— 游离节点恒为 0
        // （且匹配不到 `:root[data-theme="light"] …` 这类祖先选择器，
        //  computed border 也同样是 0），于是首帧会比最终尺寸小 4px
        // （浅色主题 border:2px，上下 / 左右各 2）。
        // 实测：刷新后 elem_7 首帧 1729 → 报告回来时被修正为 1733，
        // 又是一次（虽然很小的）跳变。这里在**同一次任务内**补一次，
        // 浏览器还没绘制，所以用户完全看不到。
        //
        // ⚠️ apply 返回 false = 高度未知（该页面第一次出现）。此时要补的是
        //    **占位**尺寸而不是已知尺寸 —— 盒子尺寸同样要含边框。
        if (element.type === 'page' && window.ProtoAutoFit) {
            if (!window.ProtoAutoFit.apply(element.id, div, element.width, element.height)) {
                window.ProtoAutoFit.applyPlaceholder(div, element.width, element.height);
            }
        }

        // 选中状态
        if (ElementManager.state.selectedElements.includes(element.id) ||
            ElementManager.state.selectedElement === element.id) {
            div.classList.add('selected');
        }
    },

    // 渲染元素
    renderElement(element) {
        this.renderElementWithoutCount(element);
        ElementManager.updateStatusBar();
    },

    // 渲染页面元素
    renderPageElement(div, element, canvas) {
        div.style.left = `${element.position.x}px`;
        div.style.top = `${element.position.y}px`;
        div.style.width = `${element.width}px`;
        // 占位高度也要把顶栏算进来。历史上这里漏了 +30，于是「高度还没量到」
        // 的那一瞬 iframe 比设备视口还矮 30px（812 里塞 782 的内容），
        // 初始画面本身就是错的，这让「先固定再展开」更加显眼。
        // ⚠️ 这里的边框补偿量不出来（div 还没 appendChild，见 borderOf 的注释），
        //    renderElementWithoutCount 会在挂到 DOM 后补一次准确的。
        div.style.height = `${window.ProtoAutoFit.placeholderHeight(element.height)}px`;
        // 已知完整高度（跨刷新记住的也算已知）→ 直接用，零延迟零跳变
        window.ProtoAutoFit.apply(element.id, div, element.width, element.height);
        // 高度未知（这个页面有史以来第一次出现）→ 先藏起来，量完直接以完整高度显形
        window.ProtoAutoFit.beginMeasureIfUnknown(element, div);

        // 拖拽手柄
        const dragHandle = document.createElement('div');
        dragHandle.className = 'page-drag-handle canvas-drag-handle';
        const pageName = PageLibrary.getPageName(element.pageId);
        dragHandle.innerHTML = `<i class="fas fa-grip-vertical"></i> ${pageName || '页面'}`;
        div.appendChild(dragHandle);

        // iframe预览
        const iframe = document.createElement('iframe');
        // 自适应高度的识别标记：页面侧靠 window.name 判断自己被画布以「页面元素」方式
        // 加载。全屏预览浮层与 index.html 总览页都不设这个名字，因此完全不受影响。
        // ⚠️ 必须在 src 之前设置，否则首个 about:blank 拿不到这个名字。
        iframe.name = `proto-canvas-${element.id}`;
        const pageInfo = PageLibrary.getPageInfo(element.pageId);
        iframe.src = pageInfo ? pageInfo.filePath : `pages/${element.pageId}.html`;
        iframe.style.width = '100%';
        iframe.style.height = 'calc(100% - 30px)';
        iframe.style.marginTop = '30px';
        iframe.style.border = 'none';
        // 框已精确贴合内容，auto 会在测量出现 1~2px 误差时露出滚动条；
        // hidden 是外层兜底，保证画布里不出现任何滚动条。
        iframe.style.overflow = 'hidden';
        div.appendChild(iframe);

        // ⚠️ 预热内部宿主：iframe 内容一就绪就去取，不等用户 hover。
        //
        // 用户报的第二个问题「锚点是逐步显示的，不是一下子全部显示」：
        //   修复前内部宿主是在 **hover 时**才去取，
        //   而 file:// 走 postMessage 桥要一个来回（约 5ms），
        //   于是首帧只有元素级 12 个，隔一帧才补到 152 个 —— 肉眼可见的"逐步出现"。
        //   MasterGo 是一帧出齐的。
        //
        // 挂在 load 上是因为此时内部 DOM 才有意义（about:blank 阶段没有内容）。
        // primeInnerHosts 自带去重，重复触发不会重复发请求。
        iframe.addEventListener('load', () => {
            if (typeof AnchorSession === 'undefined' || !AnchorSession.primeInnerHosts) return;
            AnchorSession.primeInnerHosts(element, iframe, () => {
                // 若用户此刻正悬停在这个元素上，立刻补齐
                if (typeof ToolsConnector !== 'undefined' &&
                    ToolsConnector.hoverElementId === element.id &&
                    typeof ElementManager !== 'undefined' && ElementManager.renderAnchors) {
                    ElementManager.renderAnchors([element.id]);
                }
            });
        });

        // 透明点击遮罩层：覆盖在 iframe 上方，捕获鼠标事件并正常冒泡
        const clickOverlay = document.createElement('div');
        clickOverlay.className = 'page-click-overlay';
        clickOverlay.style.position = 'absolute';
        clickOverlay.style.left = '0';
        clickOverlay.style.top = '30px';
        clickOverlay.style.width = '100%';
        clickOverlay.style.height = 'calc(100% - 30px)';
        clickOverlay.style.cursor = 'inherit';
        div.appendChild(clickOverlay);

        // 预览按钮（悬停时显示，点击打开全屏预览）
        const previewBtn = document.createElement('div');
        previewBtn.className = 'preview-btn';
        previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        previewBtn.title = '全屏预览此页面';
        previewBtn.style.pointerEvents = 'auto';
        previewBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            const name = PageLibrary.getPageName(element.pageId);
            CanvasViewEvents.openPreview(name, element.id);
        });
        div.appendChild(previewBtn);

        // 右键菜单
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const currentTool = Tools.getCurrentTool();
            if (currentTool === 'arrow' && Tools.arrowState.isDrawing) {
                return;
            }
            const pageInfo = PageLibrary.getPageInfo(element.pageId);
            ElementManager.showContextMenu(e.clientX, e.clientY, element, iframe, pageInfo);
        });

        // 不在这里appendChild，由调用者统一添加
    },

    // 渲染箭头元素
    renderArrowElement(div, element, canvas) {
        const points = element.points;
        if (points.length < 2) return;

        const allX = points.map(p => p.x);
        const allY = points.map(p => p.y);
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);

        element.position = { x: minX, y: minY };
        element.width = maxX - minX;
        element.height = maxY - minY;

        const padding = 10;

        div.style.left = `${minX - padding}px`;
        div.style.top = `${minY - padding}px`;
        div.style.width = `${element.width + padding * 2}px`;
        div.style.height = `${element.height + padding * 2}px`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'arrow-svg');
        svg.setAttribute('viewBox', `${-padding} ${-padding} ${element.width + padding * 2} ${element.height + padding * 2}`);
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        // ⚠️ 必须 visible：SVG 默认 overflow:hidden，而命中带的 stroke 是**骑在路径中心线**
        //    上的（两侧各占一半）。缩放越小命中带越宽（10/zoom），
        //    zoom=0.25 时半宽 20 画布 px 已经超过 padding 10，
        //    超出部分会被 SVG 盒子裁掉 → 边缘手感莫名变差，且**不报任何错**。
        //    连接线的 .connector-svg 同理设了 visible，两条线保持一致。
        svg.style.overflow = 'visible';

        const pathData = ElementManager.generateArrowPath(points, minX, minY);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'arrow-path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e74c3c');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');

        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowHead.setAttribute('class', 'arrow-head');
        arrowHead.setAttribute('d', this.getArrowHeadPath(points[points.length - 2], points[points.length - 1], minX, minY));
        arrowHead.setAttribute('fill', '#e74c3c');

        // ---- 命中区（透明加宽带）----
        //
        // ⚠️ 为什么必须有它：容器的盒子是整条折线的**包围盒**，
        //    在它上面接点击等于「点空白也能选中箭头」——
        //    实测 25×25 网格里 625 点全中，其中 84.5% 离线超过 15px。
        //    现在容器与视觉 path 都是 pointer-events:none，
        //    只有这条透明的加宽 stroke 负责命中，手感带在屏幕上恒定 10px。
        //
        // ⚠️ 它画到**最后一个点**（不是 generateArrowPath 用的箭头根部）：
        //    箭头头部是个 15px 长的三角形，只画到根部的话头部那一截点不中，
        //    用户会觉得"点到箭头尖上没反应"。画到尖端正好把头部也圈进来。
        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('class', 'arrow-hit');
        hit.setAttribute('d', this.arrowHitPathData(points, minX, minY));
        hit.setAttribute('fill', 'none');
        hit.setAttribute('stroke', 'transparent');
        hit.setAttribute('stroke-width', String(this.getHitStrokeWidth()));
        hit.setAttribute('stroke-linecap', 'round');
        hit.setAttribute('stroke-linejoin', 'round');

        // 命中区在下、视觉在上（与 renderConnectorParts 同一顺序）
        svg.appendChild(hit);
        svg.appendChild(path);
        svg.appendChild(arrowHead);
        div.appendChild(svg);

        // 不在这里appendChild，由调用者统一添加
    },

    /**
     * 箭头命中区的路径数据：一条穿过**所有**拐点的折线。
     *
     * ⚠️ 不复用 generateArrowPath：那条刻意停在箭头根部（免得线头从三角形底下
     *    戳出来），用它做命中区会让尖端那一截点不中。命中区只管"盖住哪里"，
     *    盖得越完整越好，视觉与命中在这里本就该是不同的形状。
     */
    arrowHitPathData(points, offsetX, offsetY) {
        if (!Array.isArray(points) || points.length < 2) return '';
        const seg = points.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x - offsetX} ${p.y - offsetY}`);
        return seg.join(' ');
    },

    /**
     * 取「线条类元素」的真实路径点（箭头 / 连接线），别的类型返回 null。
     *
     * ⚠️ 为什么要抽出来：箭头的点是 element.points，连接线的点是
     *    element._routePoints（渲染时算好缓存的），**来源不同**。
     *    框选判定要按路径点而不是包围盒来判（包围盒是一大块空气），
     *    若在调用点各写一份 `type === 'arrow' ? points : _routePoints`，
     *    将来加第三种线元素时必然漏掉一处 —— 本仓库已被
     *    "同一逻辑写两份"坑过三次。这里一次收敛。
     *
     * 返回 null 表示「不是线元素」，调用方应走通用的矩形判定。
     */
    linePointsOf(element) {
        if (!element) return null;
        if (element.type === 'arrow') {
            return Array.isArray(element.points) && element.points.length >= 2 ? element.points : null;
        }
        if (element.type === 'connector') {
            const pts = element._routePoints;
            return Array.isArray(pts) && pts.length >= 2 ? pts : null;
        }
        return null;
    },

    // 生成箭头头部路径
    getArrowHeadPath(fromPoint, toPoint, offsetX, offsetY) {
        const angle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);
        const headLength = 15;
        const headAngle = Math.PI / 6;

        const x1 = toPoint.x - offsetX;
        const y1 = toPoint.y - offsetY;
        const x2 = x1 - headLength * Math.cos(angle - headAngle);
        const y2 = y1 - headLength * Math.sin(angle - headAngle);
        const x3 = x1 - headLength * Math.cos(angle + headAngle);
        const y3 = y1 - headLength * Math.sin(angle + headAngle);

        return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    },

    // ================================================================
    // 连接线命中区（手感带）

    /**
     * 命中区应当是**屏幕上恒定 10px** 宽的透明带，不随画布缩放变粗变细。
     *
     * ⚠️ 为什么不能写死 stroke-width：
     *    #canvas 用 `transform: scale(zoom)` 缩放（canvas-view.js:146），
     *    SVG 元素的 stroke 会跟着这个 transform 一起缩放。
     *    zoom=0.25 时写死的 12 在屏幕上只剩 3px —— 细到几乎点不中；
     *    zoom=4 时又变成 48px，一条线能"点中"半张页面。
     *    所以必须在**画布坐标系**里写 10 / zoom，屏幕上的实际宽度
     *    才是 (10/zoom) * zoom = 10。
     *
     * 与锚点恒定 10px 是同一条原则（见 renderAnchors 里 AnchorProvider.RADIUS
     * 不除 zoom 的注释）。⚠️ 但**不能**用 vector-effect="non-scaling-stroke"
     * 偷懒：那个属性不跟随祖先 transform 的 zoom，只是让它不缩放，
     *    并不能把宽度调成"屏幕上 10px"，也无法按 zoom 动态改值。
     *
     * @returns {number} 画布坐标系下的 stroke-width
     */
    getHitStrokeWidth() {
        let zoom = 1;
        try {
            // ⚠️ 用裸标识符 CanvasView（不要 window.CanvasView）：
            //    classic script 的顶层 const 活在全局**词法**作用域，不挂到 window。
            if (typeof CanvasView !== 'undefined' && CanvasView.getView) {
                const v = CanvasView.getView();
                if (v && typeof v.zoom === 'number' && v.zoom > 0) zoom = v.zoom;
            }
        } catch (e) {
            zoom = 1;
        }
        return 10 / zoom;
    },

    /**
     * 重算**已渲染**的所有连接线 / 箭头命中区宽度。
     *
     * ⚠️ 缩放时必须调用：命中区是在渲染时写死的，
     *    画布 zoom 变了但 DOM 不会自动重算，不重写就会出现
     *    「放大后点不中线 / 缩小后乱点」。
     *    用 requestAnimationFrame 节流，连续滚轮缩放时每帧最多跑一次。
     *
     * ⚠️ 箭头（.arrow-hit）与连接线（.connector-hit）一起处理：
     *    两者都是「屏幕恒定 10px」的同一条原则，分两处写迟早漏一处
     *    —— 漏掉的那一类就会在缩放后手感失真，且**不报任何错**。
     */
    refreshHitStrokeWidths() {
        if (this._hitRefreshPending) return;
        this._hitRefreshPending = true;
        const run = () => {
            this._hitRefreshPending = false;
            const w = this.getHitStrokeWidth();
            const hits = document.querySelectorAll('.connector-hit, .arrow-hit');
            for (let i = 0; i < hits.length; i++) {
                hits[i].setAttribute('stroke-width', String(w));
            }
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else run();
    },

    // ================================================================ 智能连接线

    /**
     * 为一条连接线算出路径点集。
     *
     * ⚠️ 端点解析一律走 `AnchorSession.resolveEndpoints` —— **唯一入口**。
     *    本项目曾因"同一逻辑写两份"出过三次分叉 bug，其中一次就是
     *    「预览用页面框矩形、落线用内部元素矩形」，用户看到预览终点
     *    y=54、实际终点 y=521.5。现在收敛为单处，结构上杜绝复发。
     *
     * 旧数据（没有 fromAnchor/toAnchor 字段）走 route()，
     * 路径与升级前逐像素一致。
     */
    routeFor(element, fromEl, toEl, fromRect, toRect) {
        return this.applyWaypointsTo(
            element, fromEl, toEl, this._routeBase(element, fromEl, toEl, fromRect, toRect));
    },

    /** 自动路由本体（不含手动路径点） */
    _routeBase(element, fromEl, toEl, fromRect, toRect) {
        // ---- 自由端分支：至少一端不在任何页面框上（MasterGo 实测的独立连接线）----
        //
        // ⚠️ 这条分支必须排在最前面，且**不得**碰下面那段绑定逻辑：
        //    两端都绑定时逐像素不变是这个模块的立身之本，
        //    一旦共用同一段代码就再也分不清了。
        if (!fromEl || !toEl) {
            const a = AnchorSession.resolveOne(element.fromId, element.fromAnchor, element.fromFree);
            const b = AnchorSession.resolveOne(element.toId, element.toAnchor, element.toFree);
            // 两端都能定出具体坐标 → 走「中点台阶」路由（对齐 MasterGo）
            if (a && b && a.point && b.point) {
                return ConnectorRouter.routeFreePoints(a.point, b.point);
            }
            // 绑定端没带锚点 → 退回整元素矩形路由，至少保证有线可看
            const ar = a ? a.rect : fromRect;
            const br = b ? b.rect : toRect;
            if (ar && br) return ConnectorRouter.route(ar, br);
            return null;
        }

        const hasAnchor = !!(element.fromAnchor || element.toAnchor);
        if (!hasAnchor) {
            return ConnectorRouter.route(fromRect, toRect);
        }

        const ep = AnchorSession.resolveEndpoints(
            fromEl.id, toEl.id, element.fromAnchor, element.toAnchor);
        if (!ep) {
            // 端点元素已消失 → 退回元素级，至少把线画出来
            return ConnectorRouter.routeFromAnchor(fromRect, toRect,
                element.fromAnchor, element.toAnchor);
        }
        return ConnectorRouter.routeFromAnchor(
            ep.fromRect, ep.toRect, ep.fromSide, ep.toSide);
    },

    /**
     * 应用手动路径点（MasterGo「拖段」的产物）。
     *
     * ⚠️ 为什么不能把 waypoints 存成「每段一个偏移量」：
     *    实测拖一次段，段数会变（3 段 Z 形塌成 2 段 L 形；再拖末段又回到 3 段），
     *    按段索引存的偏移当场就对不上。所以这里存的是**完整路径点**。
     *
     * ⚠️ 页面框移动时的行为（实验实测，对应用户确认的「平移」方案）：
     *    把 waypoints 整体平移两端绑定元素的位移**平均值**，
     *    再把首尾钉回锚点 → 形状跟着框走，不会被拉扁。
     *    实测：框水平左移 135，线的 X 不变、W 减 135、H 一像素不动。
     *
     * 没有 waypoints 的旧数据走 base，行为逐像素不变。
     */
    applyWaypointsTo(element, fromEl, toEl, base) {
        const wp = element.waypoints;
        const ref = element.wpRef;
        if (!Array.isArray(wp) || wp.length < 2) return base;
        if (!Array.isArray(base) || base.length < 2) return base;

        let moved = wp;
        if (ref && fromEl && toEl && fromEl.position && toEl.position) {
            const dfx = fromEl.position.x - ref.from.x;
            const dfy = fromEl.position.y - ref.from.y;
            const dtx = toEl.position.x - ref.to.x;
            const dty = toEl.position.y - ref.to.y;
            const dx = (dfx + dtx) / 2;
            const dy = (dfy + dty) / 2;
            if (dx !== 0 || dy !== 0) {
                moved = ConnectorRouter.translatePoints(wp, dx, dy);
            }
        }

        return ConnectorRouter.applyWaypoints(moved, base, base[0], base[base.length - 1]);
    },

    /**
     * 渲染智能连接线。
     *
     * 路径不存坐标 —— 每次都由 ConnectorRouter 按两端元素**当前**的位置实时算出，
     * 所以这里读的是元素实时 position，元素一动，线就跟着重算。
     */
    /**
     * 取一条连接线两端的「路由矩形」。
     *
     * 绑定端 → 元素自身的矩形；自由端 → 用它存的坐标造一个 0×0 矩形。
     *
     * ⚠️ 必须抽成公共函数：renderConnectorElement（首次绘制）与
     *    renderConnectorInto（改连 / 拖段后就地重绘）过去各造一份，
     *    本仓库已被"同一逻辑写两份"坑过三次。这里一次写死，两处共用。
     */
    endpointRects(element, fromEl, toEl) {
        const rectOf = (el, free) => {
            if (el) {
                return { x: el.position.x, y: el.position.y, width: el.width, height: el.height };
            }
            if (free && Number.isFinite(free.x) && Number.isFinite(free.y)) {
                return { x: free.x, y: free.y, width: 0, height: 0 };
            }
            return null;
        };
        return {
            fromRect: rectOf(fromEl, element.fromFree),
            toRect: rectOf(toEl, element.toFree),
        };
    },

    /**
     * 渲染智能连接线。
     *
     * 绑定端：路径不存坐标 —— 每次由 ConnectorRouter 按两端元素**当前**的位置实时算出。
     * 自由端：路径由 fromFree/toFree + waypoints 决定。
     */
    renderConnectorElement(div, element, canvas) {
        const fromEl = ElementManager.getElement(element.fromId);
        const toEl = ElementManager.getElement(element.toId);

        // 两端都解析不出来（元素被删光且没存自由坐标）→ 静默跳过
        const { fromRect, toRect } = this.endpointRects(element, fromEl, toEl);
        if (!fromRect || !toRect) return;

        // 锚点优先；旧数据没有锚点字段 → 退化为整元素路由（路径与升级前一致）
        const points = this.routeFor(element, fromEl, toEl, fromRect, toRect);
        if (!points || points.length < 2) return;

        // 缓存算出的路径点到元素上（供选中时放端点手柄 / 状态栏显示用）
        element._routePoints = points;

        const allX = points.map(p => p.x);
        const allY = points.map(p => p.y);
        const minX = Math.min(...allX), maxX = Math.max(...allX);
        const minY = Math.min(...allY), maxY = Math.max(...allY);

        // 把算出的包围盒写回元素，保持与 arrow 一致的约定
        element.position = { x: minX, y: minY };
        element.width = maxX - minX;
        element.height = maxY - minY;

        // 不在这里 appendChild，由调用者统一添加
        this.renderConnectorParts(div, element, points, minX, minY);
    },

    /**
     * 画一条连接线的**全部可视内容**：SVG + 端点手柄 + 段胶囊。
     *
     * ⚠️ 为什么必须抽成公共函数：renderConnectorElement（首次绘制）与
     *    renderConnectorInto（改连 / 拖段后的就地重绘）过去各写了一份，
     *    本仓库已被"同一逻辑写两份"坑过三次。只要它们有任何一处漏改，
     *    就会出现「首次画得出、改连后缺手柄」这类只在交互里才暴露的 bug。
     *
     * ⚠️ 容器定位在 minX - CONNECTOR_PADDING，所以**子元素落位必须补回这个 padding**：
     *    `left = 点.x - minX + padding` 才对得上画布坐标。
     *    漏掉它会把端点圆点与段胶囊整体偏移 12px —— 端点圆点只是"看着稍微歪一点"，
     *    而 18×6 的胶囊偏 12px 后整条飞出线的 stroke 范围，
     *    于是 hover 不亮、点不中，且**不报任何错**。
     */
    renderConnectorParts(div, element, points, minX, minY) {
        if (!div || !Array.isArray(points) || points.length < 2) return;

        const padding = this.CONNECTOR_PADDING;   // 给箭头头部留空间

        div.style.left = `${minX - padding}px`;
        div.style.top = `${minY - padding}px`;
        div.style.width = `${element.width + padding * 2}px`;
        div.style.height = `${element.height + padding * 2}px`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'connector-svg');
        svg.setAttribute('viewBox',
            `${minX - padding} ${minY - padding} ${element.width + padding * 2} ${element.height + padding * 2}`);
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.overflow = 'visible';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connector-path');
        const round = ConnectorRouter.DEFAULT_RADIUS;
        path.setAttribute('d', ConnectorRouter.toRoundedPath(points, round));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#999999');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        // 加宽透明命中区，让细线也好点中
        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('class', 'connector-hit');
        hit.setAttribute('d', ConnectorRouter.toRoundedPath(points, round));
        hit.setAttribute('fill', 'none');
        hit.setAttribute('stroke', 'transparent');
        hit.setAttribute('stroke-width', String(this.getHitStrokeWidth()));

        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowHead.setAttribute('class', 'connector-arrow');
        arrowHead.setAttribute('d', this.getArrowHeadPath(points[points.length - 2], points[points.length - 1], 0, 0));
        arrowHead.setAttribute('fill', '#999999');

        // 命中区在下、视觉在上，保证点线时先命中透明区
        svg.appendChild(hit);
        svg.appendChild(path);
        svg.appendChild(arrowHead);
        div.appendChild(svg);

        // 端点手柄（仅选中时显示），坐标已换算到 div 的局部系
        this._appendHandle(div, element, points[0], minX, minY, 'from', '拖动可改连起点');
        this._appendHandle(div, element, points[points.length - 1], minX, minY, 'to', '拖动可改连终点');

        // 段胶囊（MasterGo：每段中点一个，悬停连线即出现）
        this._appendSegmentHandles(div, element, points, minX, minY);
    },

    /** 端点拖拽圆点 */
    _appendHandle(div, element, point, minX, minY, end, title) {
        const h = document.createElement('div');
        h.className = 'connector-handle';
        h.dataset.connectorId = element.id;
        h.dataset.end = end;
        // ⚠️ 补回 padding：容器原点在 minX - padding（见 renderConnectorParts）
        h.style.left = `${point.x - minX + this.CONNECTOR_PADDING}px`;
        h.style.top = `${point.y - minY + this.CONNECTOR_PADDING}px`;
        h.title = title;
        div.appendChild(h);
    },

    /**
     * 段胶囊 —— MasterGo 实测：hover 到连线上，每一段的中点都冒出一个
     * 18.5×6.5 屏幕像素的粗蓝胶囊；按住拖动可以把这一段整段平移。
     * 端点圆点则只在**选中**时出现。
     *
     * ⚠️ 胶囊落在「直线部分」的中点，不是几何中点：
     *    段的两头是圆角（DEFAULT_RADIUS=16），算几何中点会正好压在圆弧上。
     *    实测扣掉两端各 8 屏幕 px（=16 画布 px × 0.5 缩放）后与 MasterGo 逐像素吻合。
     */
    _appendSegmentHandles(div, element, points, minX, minY) {
        const size = this.getSegHandleSize();
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i];
            const b = points[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy);
            // 微段（亚像素残差）不放手柄，否则会堆出一堆点不中的小圆点
            if (len <= 1) continue;

            const vertical = Math.abs(dy) > Math.abs(dx);
            const inset = this.getCornerRadius();   // 画布坐标，无需再除 zoom
            const a1 = vertical ? { x: a.x, y: a.y + inset } : { x: a.x + inset, y: a.y };
            const b1 = vertical ? { x: b.x, y: b.y - inset } : { x: b.x - inset, y: b.y };
            if (Math.hypot(b1.x - a1.x, b1.y - a1.y) <= 1) continue;

            const cx = (a1.x + b1.x) / 2;
            const cy = (a1.y + b1.y) / 2;

            // ⚠️ 朝向必须跟随线段：竖段要用「窄而长」的竖胶囊，横段用「宽而扁」的横胶囊。
            //    MasterGo 实测就是这样（横段 18.5×6.5、竖段 6.5×18.5，屏幕像素），
            //    写成固定朝向时竖线上会躺着一个横把手 —— 不报错，只是明显不对。
            const boxW = vertical ? size.h : size.w;
            const boxH = vertical ? size.w : size.h;

            const h = document.createElement('div');
            h.className = 'connector-seg-handle';
            h.dataset.connectorId = element.id;
            h.dataset.segIndex = String(i);
            h.dataset.vertical = vertical ? '1' : '0';
            // 存下中心坐标，缩放重算尺寸时才能把中心钉回原处（见 refreshSegHandleSizes）
            // ⚠️ 补回 padding：容器原点在 minX - padding（见 renderConnectorParts）
            h.dataset.cx = String(cx - minX + this.CONNECTOR_PADDING);
            h.dataset.cy = String(cy - minY + this.CONNECTOR_PADDING);
            h.style.left = `${cx - minX + this.CONNECTOR_PADDING - boxW / 2}px`;
            h.style.top = `${cy - minY + this.CONNECTOR_PADDING - boxH / 2}px`;
            h.style.width = `${boxW}px`;
            h.style.height = `${boxH}px`;
            h.title = '拖动可调整这一段的位置';
            div.appendChild(h);
        }
    },

    /** 段胶囊的屏幕尺寸（MasterGo 实测 18.5×6.5px，缩放时保持恒定） */
    SEG_HANDLE_SCREEN_W: 18,
    SEG_HANDLE_SCREEN_H: 6,

    /**
     * 连接线容器四周留白（画布坐标）。
     * 容器定位在 minX - padding，手柄/胶囊落位时必须用同一个值补回来，
     * 否则两者差一个 padding，手柄会整体偏移（且不报错）。
     */
    CONNECTOR_PADDING: 12,

    /** 段胶囊尺寸（画布坐标系） */
    getSegHandleSize() {
        return {
            w: this.SEG_HANDLE_SCREEN_W / this.getZoom(),
            h: this.SEG_HANDLE_SCREEN_H / this.getZoom(),
        };
    },

    /** 圆角半径（与 toRoundedPath 用同一个值） */
    getCornerRadius() {
        return ConnectorRouter.DEFAULT_RADIUS;
    },

    /** 当前画布缩放（读不到时按 1 处理） */
    getZoom() {
        try {
            // ⚠️ 用裸标识符 CanvasView（不要 window.CanvasView）：
            //    classic script 的顶层 const 活在全局**词法**作用域，不挂到 window。
            if (typeof CanvasView !== 'undefined' && CanvasView.getView) {
                const v = CanvasView.getView();
                if (v && typeof v.zoom === 'number' && v.zoom > 0) return v.zoom;
            }
        } catch (e) { /* 读不到就按 1 处理 */ }
        return 1;
    },

    /**
     * 缩放后重算段胶囊尺寸。
     *
     * ⚠️ 与 refreshHitStrokeWidths 同理：胶囊的宽高是在渲染时算成画布坐标写死的，
     *    画布 zoom 变了但 DOM 不会自动重算，不重写就会「放大后胶囊糊成一大坨、
     *    缩小时小到看不见」。
     */
    refreshSegHandleSizes() {
        if (this._segRefreshPending) return;
        this._segRefreshPending = true;
        const run = () => {
            this._segRefreshPending = false;
            const size = this.getSegHandleSize();
            const nodes = document.querySelectorAll('.connector-seg-handle');
            for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                // ⚠️ 必须沿用渲染时的朝向（dataset.vertical），否则缩放一次
                //    就会把所有竖段上的竖胶囊打回横的 —— 缩放不该改变外观。
                const vertical = el.dataset.vertical === '1';
                const boxW = vertical ? size.h : size.w;
                const boxH = vertical ? size.w : size.h;
                el.style.width = `${boxW}px`;
                el.style.height = `${boxH}px`;
                // left/top 是按旧尺寸居中算的，换尺寸后要把中心钉回原处
                const cx = parseFloat(el.dataset.cx);
                const cy = parseFloat(el.dataset.cy);
                if (Number.isFinite(cx) && Number.isFinite(cy)) {
                    el.style.left = `${cx - boxW / 2}px`;
                    el.style.top = `${cy - boxH / 2}px`;
                }
            }
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else run();
    },

    // ================================================================ 锚点层

    /**
     * 渲染锚点（MasterGo 的「连接点」）。
     *
     * ⚠️ 为什么锚点层挂在 document.body 而不是 #canvas：
     *    #canvas 在 #canvasWrapper 里，而 wrapper 是 `overflow:hidden`、
     *    高度仅等于视口可见区（实测 727px）。用户放大看单个页面框时，
     *    页面框底边会落到屏幕 y=834 > 771，
     *    **底部 14 个锚点全被裁掉**（实测 insideWrapper:0 / clipped:14）。
     *    数据层是完整对称的（124 个），丢的是渲染而非数据。
     *    改成 body + position:fixed 后，锚点不再受画布滚动区裁剪。
     *
     * @param {?Array<string>|?string} elementIds 要显示的页面元素 id
     * @param {?{x,y}} cursor 鼠标画布坐标；决定第二层高亮哪个内部元素
     */
    renderAnchors(elementIds, cursor) {
        const layer = this._ensureAnchorLayer();
        if (!layer) return;

        layer.innerHTML = '';

        // 归一成数组并去重：绘制期同一元素可能既是源又是目标
        const ids = (Array.isArray(elementIds) ? elementIds : [elementIds]).filter(Boolean);
        const unique = ids.filter((v, i) => ids.indexOf(v) === i);

        // fixed 层以视口为参照系：画布坐标要先换算成屏幕坐标再落点。
        // ⚠️ origin 必须是 #canvasWrapper 的屏幕位置 —— 画布坐标是相对 wrapper 的，
        //    不是相对视口原点。用 (0,0) 会让所有锚点整体偏移 wrapper.left/top。
        const view = (typeof CanvasView !== 'undefined' && CanvasView.getView)
            ? CanvasView.getView() : { zoom: 1, pan: { x: 0, y: 0 } };
        const wrapper = document.getElementById('canvasWrapper');
        const origin = wrapper
            ? wrapper.getBoundingClientRect()
            : { left: 0, top: 0 };
        const rendered = [];

        for (const id of unique) {
            const el = ElementManager.getElement(id);
            if (!el) continue;
            const hosts = AnchorSession.hostsOf(el);
            // ⚠️ 两层模型（修「应该逐步显示却一次全亮」）：
            //    第一层 = 页面框自身（恒亮）
            //    第二层 = 鼠标当前所在的**那一个**内部元素
            //    其余内部元素的锚点**不显示** —— MasterGo 就是这个行为。
            const layers = AnchorSession.pageLevelHosts(hosts).slice();
            const inner = AnchorSession.hoveredInnerHost(cursor, hosts);
            if (inner) layers.push(inner);

            for (const host of layers) {
                for (const a of host.anchors) {
                    const canvasPt = AnchorProvider.resolvePoint(host.rect, a);
                    if (!canvasPt) continue;
                    const p = AnchorSession.toViewport(canvasPt, view, origin);
                    if (!p) continue;

                    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    c.setAttribute('class', 'connector-anchor');
                    c.setAttribute('cx', p.x);
                    c.setAttribute('cy', p.y);
                    // ⚠️ r 直接用屏幕单位，**不除 zoom**。
                    //    锚点层是 position:fixed（不受画布缩放影响），
                    //    再除 zoom 等于反向放大 —— 实测 zoom=0.25 时圆点涨到 40px，
                    //    而 MasterGo 缩放到 12% 仍是 10~11px。
                    //    恒定 10px 同时也解决了「小圆点互相盖住导致只显示一半」。
                    c.setAttribute('r', AnchorProvider.RADIUS);
                    c.setAttribute('fill', '#ffffff');
                    // 内部子元素的锚点用略淡的蓝，与宿主自身锚点区分开
                    c.setAttribute('stroke', host.kind === 'inner' ? '#7cb3f5' : '#409EFF');
                    c.setAttribute('stroke-width', '1.5');
                    layer.appendChild(c);

                    // 清单里存的仍是**画布坐标**，因为命中检测用的是画布坐标
                    rendered.push({
                        ref: {
                            elementId: host.elementId,
                            kind: host.kind,
                            selector: host.selector,
                            side: a.side,
                            t: a.t,
                        },
                        point: canvasPt,
                    });
                }
            }
        }

        AnchorSession.setRendered(rendered);
    },

    /** 创建（或复用）锚点层：挂在 body 上，fixed 定位，不受画布滚动区裁剪 */
    _ensureAnchorLayer() {
        let layer = document.getElementById('connectorAnchorLayer');
        if (layer && layer.parentNode === document.body) return layer;

        layer = layer || document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        layer.id = 'connectorAnchorLayer';
        layer.setAttribute('class', 'connector-anchor-layer');
        layer.style.cssText =
            'position:fixed;left:0;top:0;width:100%;height:100%;' +
            'overflow:visible;pointer-events:none;z-index:120;';
        document.body.appendChild(layer);
        return layer;
    },

    /** 清空锚点层（切换工具 / 离开画布时调用） */
    clearAnchors() {
        const layer = document.getElementById('connectorAnchorLayer');
        if (layer) layer.innerHTML = '';
        // ⚠️ 清单必须同步清空，否则残留锚点还能被命中 ——
        //    用户看到的是空画布，却能"点到"早已消失的锚点。
        AnchorSession.setRendered([]);
    }
};
