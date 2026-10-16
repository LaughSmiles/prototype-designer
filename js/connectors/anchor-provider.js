/**
 * 智能连接线 · 锚点提供器（纯几何，可单测）
 *
 * 对应 MasterGo 的「连接点」：
 *   - 每个图层在四条边上都有多个锚点，hover 时才显示
 *   - 容器内的子元素也各自贡献锚点（递归）
 *   - 连接线记住的是「哪个锚点」，而不是死坐标 —— 所以拖动图层时线会自动跟随
 *
 * 本模块只做两件事，都不碰 DOM：
 *   1) 枚举锚点描述符：{ side, t }
 *   2) 把描述符解析成画布坐标 + 出边法线
 *
 * 描述符里存的是**归一化位置** t（0..1），不是像素：
 *   元素尺寸一变，锚点自动跟着变，不需要迁移任何已存数据。
 *
 * 坐标约定：画布坐标系，左上原点，y 向下。矩形 { x, y, width, height }。
 * 法线方向：left→(-1,0) right→(1,0) top→(0,-1) bottom→(0,1)。
 */

const AnchorProvider = {

    /** 锚点视觉半径（绘制用，不参与几何） */
    RADIUS: 5,

    /**
     * 锚点相对边界的**外移距离**。
     * 实测 MasterGo 把锚点画在边界外侧约 6px，而不是压在边框上 ——
     * 压在边框上会和元素自身的描边糊在一起，看不清。
     */
    OFFSET: 6,

    /**
     * 生成锚点的最小宿主尺寸。
     *
     * ⚠️ 这是防止「锚点重叠成团」的关键，**不是靠限制递归深度**。
     *    实测 MasterGo 递归是不限深度的：嵌套深的容器锚点会密集成一团。
     *    真正让它保持可用的，是它跳过尺寸过小的元素。
     *    小于该尺寸的元素不产生锚点（它的锚点位置已被父级锚点覆盖）。
     */
    MIN_HOST_SIZE: 12,

    /**
     * 每条边上的锚点位置（归一化 t）。
     *
     * 取 0.25 / 0.5 / 0.75 三个点，避开两端角点：
     * 角点同时属于两条边，会让人分不清拖的是哪条边，MasterGo 也不在角上放锚点。
     */
    SIDE_SAMPLES: [0.25, 0.5, 0.75],

    /**
     * 相邻锚点的最小间距（画布 px）。
     *
     * ⚠️ 这是让锚点「能点中」的物理约束，不是审美偏好。
     *    锚点直径约 10px，间距小于这个数就会互相压住，用户根本选不准。
     *
     * 实测发现：给**每个**内部元素都按 3 采样/边生成，一个页面框会冒出
     * 300 个锚点（25 宿主 × 12），完全不可用 —— 而 MasterGo 实测
     * 一次 hover 只有约 13~20 个。差别就在这里：
     * 小元素放不下 3 个锚点，必须自动降级为「只留中点」。
     *
     * 判据：边长 L 上取 0.25/0.75 时，它们到中点的距离是 L/4；
     * 要求 L/4 ≥ 本值，即 L ≥ 4×本值 = 64px 时才用 3 采样，
     * 否则降级为单中点。这样 375×812 的页面框仍是 12 个锚点，
     * 而 44px 高的导航条只留每边 1 个。
     */
    MIN_ANCHOR_SPACING: 16,

    /** 四条边，固定顺序（保证枚举结果确定、可测） */
    SIDES: ['left', 'right', 'top', 'bottom'],

    // ------------------------------------------------------------ 基础几何

    /** 某条边的外法线方向 */
    normalOf(side) {
        switch (side) {
            case 'left':   return { x: -1, y: 0 };
            case 'right':  return { x: 1, y: 0 };
            case 'top':    return { x: 0, y: -1 };
            case 'bottom': return { x: 0, y: 1 };
            default:       return { x: 0, y: 0 };
        }
    },

    /** 描述符 → 矩形边界上的点（未外移） */
    pointInRect(rect, side, t) {
        if (!this._isValidRect(rect)) return null;
        const k = this._clamp01(t);
        switch (side) {
            case 'left':   return { x: rect.x, y: rect.y + rect.height * k };
            case 'right':  return { x: rect.x + rect.width, y: rect.y + rect.height * k };
            case 'top':    return { x: rect.x + rect.width * k, y: rect.y };
            case 'bottom': return { x: rect.x + rect.width * k, y: rect.y + rect.height };
            default:       return null;
        }
    },

    /** 把点沿法线外移，得到锚点圆心 */
    offsetPoint(point, side, distance = this.OFFSET) {
        if (!point) return null;
        const n = this.normalOf(side);
        return { x: point.x + n.x * distance, y: point.y + n.y * distance };
    },

    /** 描述符 → 画布坐标的锚点圆心（已外移） */
    resolvePoint(rect, anchor) {
        if (!anchor) return null;
        const base = this.pointInRect(rect, anchor.side, anchor.t);
        if (!base) return null;
        return this.offsetPoint(base, anchor.side, anchor.offset);
    },

    // ------------------------------------------------------------ 锚点枚举

    /**
     * 枚举一个矩形（元素级宿主）的锚点描述符。
     *
     * @param {object} rect
     * @param {object} [opts] { density: 'full' | 'coarse' }
     *   full   —— 每边按 _samplesFor 决定（大矩形 3 个，小矩形 1 个）
     *   coarse —— 每边只留中点
     *
     * ⚠️ 两种密度的存在是**浏览器实测逼出来的**：
     *    最初给所有宿主都用 full，hover 一个页面框冒出 300 个锚点，
     *    收敛到 84 个后仍明显多于 MasterGo 实测的 13~20 个。
     *    根因是「容器」和「容器里的目标」角色不同：
     *      · 页面框是主连接目标，用户会在不同高度连线 → 需要多个锚点
     *      · 页面内的卡片/按钮只是"连到它"，具体从哪条边出无所谓 → 一个边一个就够
     *    所以内部元素统一用 coarse。
     */
    anchorsOfRect(rect, opts = {}) {
        if (!this._isValidRect(rect)) return [];
        const coarse = opts.density === 'coarse';

        const out = [];
        for (const side of this.SIDES) {
            // ⚠️ 阈值必须**逐边**判断，不能用「宽高都得够」一刀切：
            //    窄高矩形（如 5×200 的分隔条）的竖直边完全放得下锚点，
            //    按整体判断会把它一起砍掉，白白丢掉可连的边。
            //    竖直边按高度取样，水平边按宽度取样。
            const along = (side === 'left' || side === 'right') ? rect.height : rect.width;
            if (along < this.MIN_HOST_SIZE) continue;
            for (const t of (coarse ? [0.5] : this._samplesFor(along))) {
                out.push({ side, t });
            }
        }
        return out;
    },

    /**
     * 按边长决定该边用几个采样点。
     *
     * 边太短就放不下 3 个锚点（会互相压住点不中），此时降级为单中点。
     * 这正是让「一个页面框 hover 出 300 个锚点」收敛到 MasterGo 那种
     * 十来个锚点的关键。
     */
    _samplesFor(along) {
        // 用 3 采样时，0.25/0.75 到中点的距离是 along/4
        const spacing = along / 4;
        if (spacing >= this.MIN_ANCHOR_SPACING) return this.SIDE_SAMPLES;
        return [0.5];
    },

    /**
     * 生成锚点的稳定标识，用于命中检测与去重。
     * 只包含 side 与量化后的 t —— 不含量素坐标，所以元素移动后 key 不变。
     */
    anchorKey(anchor) {
        if (!anchor) return '';
        return `${anchor.side}@${Number(anchor.t).toFixed(4)}`;
    },

    /** 解析外部传入的锚点描述符，非法则返回 null（旧数据兼容的入口） */
    normalizeAnchor(anchor) {
        if (!anchor || typeof anchor !== 'object') return null;
        if (this.SIDES.indexOf(anchor.side) === -1) return null;
        const t = Number(anchor.t);
        if (!Number.isFinite(t)) return null;
        return { side: anchor.side, t: this._clamp01(t) };
    },

    // ------------------------------------------------------------ 内部工具

    _clamp01(v) {
        const n = Number(v);
        if (!Number.isFinite(n)) return 0.5;
        return n < 0 ? 0 : (n > 1 ? 1 : n);
    },

    _isValidRect(r) {
        return !!r && Number.isFinite(r.x) && Number.isFinite(r.y) &&
               Number.isFinite(r.width) && Number.isFinite(r.height) &&
               r.width >= 0 && r.height >= 0;
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnchorProvider;
}
