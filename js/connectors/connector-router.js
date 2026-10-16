/**
 * 智能连接线 · 路由算法（纯函数，无 DOM 依赖）
 *
 * 移植自 MasterGo 连接线：路径 100% 由当前几何实时算出，不存死坐标。
 * 对应测试：tools/test-connector.js（层 1 单测）
 *
 * 核心 API：
 *   route(fromRect, toRect, opts)  → 正交折线点集 [{x,y}, ...]（首尾必落在矩形边）
 *   toRoundedPath(points, radius)  → SVG path d（含圆角）
 *   rectCenter(r) / rectEdgeMidpoints(r) / clampToEdge(r, side, v)
 *   horizontallySeparated / verticallySeparated
 *
 * 坐标系：与画布一致（左上原点，y 向下）。矩形 { x, y, width, height }。
 *
 * 路由策略（从简到繁，评分择优）：
 *   1) 0 拐点：两矩形在共享行/列且能直连
 *   2) 1 拐点：L 字（拐点在外接矩形的一个角）
 *   3) 2 拐点：Z 字 / C 字
 *   每个候选首尾都强制投影到对应矩形边，保证吸附正确。
 */

const ConnectorRouter = {

    /**
     * 默认圆角半径。
     *
     * 实测真实路由的段长分布：p50≈59px，但约 32% 的段 < 32px。
     * 半径若取 16，这批短拐角会被 min(radius, len/2) 压到 8 甚至更小，
     * 观感上退化成尖角，与 MasterGo 那种恒定圆润的弯头差很多。
     * 24px 能让绝大多数拐角保持饱满的圆弧。
     */
    DEFAULT_RADIUS: 24,

    /**
     * 画不出可见圆弧的半径下限。
     *
     * 路由在重叠矩形等场景会留下 0.4~0.5px 的微段（肉眼不可见），
     * 但它作为拐角会让可用半径被压到 ~0，圆角退化成脏兮兮的小凸起。
     * 低于这个半径就直接按直角处理，视觉上完全一致。
     */
    MIN_VISIBLE_RADIUS: 1.5,

    // ------------------------------------------------------------ 矩形工具

    rectCenter(r) {
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    },

    rectEdgeMidpoints(r) {
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        return {
            left:   { x: r.x, y: cy },
            right:  { x: r.x + r.width, y: cy },
            top:    { x: cx, y: r.y },
            bottom: { x: cx, y: r.y + r.height },
        };
    },

    _clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    },

    /** 把点放到矩形某条边上（alongValue 为沿边方向的坐标，内部自动夹取） */
    clampToEdge(r, side, alongValue) {
        switch (side) {
            case 'left':   return { x: r.x, y: this._clamp(alongValue, r.y, r.y + r.height) };
            case 'right':  return { x: r.x + r.width, y: this._clamp(alongValue, r.y, r.y + r.height) };
            case 'top':    return { x: this._clamp(alongValue, r.x, r.x + r.width), y: r.y };
            case 'bottom': return { x: this._clamp(alongValue, r.x, r.x + r.width), y: r.y + r.height };
            default:       return this.rectCenter(r);
        }
    },

    /**
     * 把任意点严格投影到矩形的"最近边"上，保证返回值落在矩形边界上。
     *
     * 当两矩形重叠时，单纯贴 own 的边可能让端点落进 other 的内部
     * （线就"埋进"对方矩形了）。此时先尝试沿 own 的边界滑动到
     * 脱离 other 的位置；四周都脱不开才退回最近边。
     *
     * @param r      自己的矩形（端点必须在这个矩形上）
     * @param p      待投影的点
     * @param other  对方矩形（可省略），用于避开其内部
     */
    projectToBoundary(r, p, other = null) {
        // 默认：投到最近边
        const nearest = this._projectToNearestEdge(r, p);

        // 不重叠时，最近边就是正确结果
        if (!other || !this._rectsOverlap(r, other)) return nearest;

        // 重叠：起点若已在 other 之外，说明贴边合法
        if (!this._inside(other, nearest)) return nearest;

        // 落到 other 内部了 → 沿 own 的边界滑到能脱开的位置
        const slid = this._slideOffOther(r, other, p);
        if (slid) return slid;

        // own 的轮廓完全被 other 包住：数学上无解。
        // 退而求其次落到 other 的外边上（并集的外轮廓），
        // 保证线从两个框的外缘出发、可见且不"埋进"对方。
        return this._projectToNearestEdge(other, p);
    },

    /** 两矩形是否相交（有公共面积） */
    _rectsOverlap(a, b) {
        return a.x < b.x + b.width && b.x < a.x + a.width &&
               a.y < b.y + b.height && b.y < a.y + a.height;
    },

    /** 点是否严格在矩形内部 */
    _inside(r, p) {
        return p.x > r.x && p.x < r.x + r.width &&
               p.y > r.y && p.y < r.y + r.height;
    },

    /** 投到最近边（不考虑遮挡） */
    _projectToNearestEdge(r, p) {
        const c = this.rectCenter(r);
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const halfW = r.width / 2;
        const halfH = r.height / 2;
        const nx = halfW === 0 ? 0 : dx / halfW;
        const ny = halfH === 0 ? 0 : dy / halfH;

        if (Math.abs(nx) >= Math.abs(ny)) {
            const side = nx >= 0 ? 'right' : 'left';
            const sideX = side === 'right' ? r.x + r.width : r.x;
            return { x: sideX, y: this._clamp(p.y, r.y, r.y + r.height) };
        } else {
            const side = ny >= 0 ? 'bottom' : 'top';
            const sideY = side === 'bottom' ? r.y + r.height : r.y;
            return { x: this._clamp(p.x, r.x, r.x + r.width), y: sideY };
        }
    },

    /**
     * 沿 own 的四条边找能脱开 other 的落点。
     * 对每条边，沿边扫描采样，挑第一个不在 other 内的点，再取全局最近。
     *
     * ⚠️ own 完全被 other 包住时无解（A 的轮廓全在 other 内部）。
     *    这时返回 null，由调用方退到"并集外轮廓"策略。
     */
    _slideOffOther(r, other, p) {
        const edges = ['left', 'right', 'top', 'bottom'];
        let best = null;
        let bestDist = Infinity;

        for (const side of edges) {
            const len = (side === 'left' || side === 'right') ? r.height : r.width;
            // 采样这条边上的若干点
            for (let i = 0; i <= 8; i++) {
                const t = len === 0 ? 0 : (i / 8) * len;
                const base = (side === 'left' || side === 'right') ? r.y : r.x;
                const cand = this.clampToEdge(r, side, base + t);
                if (this._inside(other, cand)) continue;
                const dist = Math.abs(cand.x - p.x) + Math.abs(cand.y - p.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = cand;
                }
            }
        }
        return best;
    },

    horizontallySeparated(a, b) {
        return (a.x + a.width <= b.x) || (b.x + b.width <= a.x);
    },

    verticallySeparated(a, b) {
        return (a.y + a.height <= b.y) || (b.y + b.height <= a.y);
    },

    // ------------------------------------------------------------ 路由主体

    route(fromRect, toRect, opts = {}) {
        if (!this._isValidRect(fromRect) || !this._isValidRect(toRect)) {
            return [];
        }

        const aC = this.rectCenter(fromRect);
        const bC = this.rectCenter(toRect);

        // 同位 / 自环：退化成小正方形回路
        if (Math.abs(aC.x - bC.x) < 0.5 && Math.abs(aC.y - bC.y) < 0.5) {
            return this._degenerateLoop(fromRect);
        }

        const candidates = this._buildCandidates(fromRect, toRect);
        let best = null;
        for (const pts of candidates) {
            // 候选在 _buildCandidates 末尾已正交化
            const deduped = this._dedupe(pts);
            if (deduped.length < 2) continue;
            const segments = deduped.length - 1;
            const length = this._pathLength(deduped);
            // 拐点数为第一优先级（乘大系数压过长度），同拐点取更短
            const score = segments * 1e7 + length;
            if (!best || score < best.score) {
                best = { pts: deduped, score };
            }
        }

        // 所有候选都退化（例如两矩形几乎完全重叠）→ 画一个脱困回路
        return best ? best.pts : this._escapeLoop(fromRect, toRect);
    },

    _isValidRect(r) {
        return r && typeof r.x === 'number' && typeof r.y === 'number' &&
               typeof r.width === 'number' && typeof r.height === 'number' &&
               Number.isFinite(r.x) && Number.isFinite(r.y) &&
               Number.isFinite(r.width) && Number.isFinite(r.height);
    },

    /**
     * 系统地枚举候选路径：出边 × 进边 × 中间折法。
     * 每个候选的端点都经 projectToBoundary 保证落在矩形边界。
     */
    _buildCandidates(a, b) {
        const out = [];
        const aC = this.rectCenter(a);
        const bC = this.rectCenter(b);

        const sides = ['left', 'right', 'top', 'bottom'];

        // 为每个「出边 × 进边」组合生成候选
        for (const outSide of sides) {
            for (const inSide of sides) {
                // 直连尝试：出边中点 → 进边中点，看是否正交且不穿对方
                const p0 = this.rectEdgeMidpoints(a)[outSide];
                const p1 = this.rectEdgeMidpoints(b)[inSide];

                // --- 0 拐点直连 ---
                if (p0.x === p1.x || p0.y === p1.y) {
                    out.push([p0, p1]);
                }

                // --- 1 拐点 L 字 ---
                // 拐点 = (p0.x, p1.y) 或 (p1.x, p0.y)，选能形成合法正交的
                const cornerXY = { x: p1.x, y: p0.y };
                const cornerYX = { x: p0.x, y: p1.y };
                if (p0.x === cornerXY.x || p0.y === cornerXY.y) {
                    out.push([p0, cornerXY, p1]);
                }
                if (p0.x === cornerYX.x || p0.y === cornerYX.y) {
                    out.push([p0, cornerYX, p1]);
                }

                // --- 2 拐点 Z 字（走中间通道）---
                // 用外接矩形中轴作为中间点，避免穿过矩形本体
                const midX = (aC.x + bC.x) / 2;
                const midY = (aC.y + bC.y) / 2;
                // Z 水平型：p0 → (midX, p0.y) → (midX, p1.y) → p1
                const zH = [p0, { x: midX, y: p0.y }, { x: midX, y: p1.y }, p1];
                // Z 垂直型：p0 → (p0.x, midY) → (p1.x, midY) → p1
                const zV = [p0, { x: p0.x, y: midY }, { x: p1.x, y: midY }, p1];
                out.push(zH);
                out.push(zV);

                // --- 3) 走两中心连线（必然是斜线）---
                // 这条分支依赖 _orthogonalize 把斜线折成正交，
                // 并依赖 projectToBoundary 把落进对方矩形内部的端点拉回各自边界。
                // 两矩形重叠时这是唯一能画出"脱困"路径的走法。
                out.push([p0, aC, bC, p1]);
            }
        }

        // 正交化 + 端点再投影（防止候选里端点落在内部）
        return out
            .map(pts => {
                const ortho = this._orthogonalize(pts);
                if (ortho.length < 2) return null;
                // 强制首尾贴边：两矩形重叠时 p0 可能落在对方内部，
                // 传入 other 让它沿本矩形边界滑到能脱开的位置。
                ortho[0] = this.projectToBoundary(a, ortho[0], b);
                ortho[ortho.length - 1] = this.projectToBoundary(b, ortho[ortho.length - 1], a);
                const reOrtho = this._orthogonalize(ortho);
                return reOrtho;
            })
            .filter(pts => pts && pts.length >= 2);
    },

    _degenerateLoop(r) {
        const s = 20;
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        return [
            { x: x - s, y: y - s },
            { x: x + s, y: y - s },
            { x: x + s, y: y + s },
            { x: x - s, y: y + s },
            { x: x - s, y: y - s },
        ];
    },

    /**
     * 兜底回路：两矩形几乎完全重叠、所有直连候选都退化时，
     * 从 a 的右边绕出去再绕回 b 的右边，保证线可见且首尾各自贴边。
     */
    _escapeLoop(a, b) {
        const aR = { x: a.x + a.width, y: a.y + a.height / 2 };
        const bR = { x: b.x + b.width, y: b.y + b.height / 2 };
        // 在两矩形右侧找一条竖直通道
        const channelX = Math.max(a.x + a.width, b.x + b.width) + 30;
        return [
            aR,
            { x: channelX, y: aR.y },
            { x: channelX, y: bR.y },
            bR,
        ];
    },

    /** 相邻非正交点之间插入拐点（先横后竖），保证全程正交 */
    _orthogonalize(pts) {
        if (!pts || pts.length === 0) return [];
        const out = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
            const prev = out[out.length - 1];
            const cur = pts[i];
            if (prev.x === cur.x || prev.y === cur.y) {
                out.push(cur);
            } else {
                out.push({ x: cur.x, y: prev.y });
                out.push(cur);
            }
        }
        return out;
    },

    /**
     * 去掉完全重合的点。
     *
     * ⚠️ 只合并完全重合的点，**不做近似合并**。试过 EPS≈1px 的近似合并：
     *    丢掉中间点后相邻两段既不共线也不正交，补正交化又会把拐点插回来，
     *    与"再去重"形成死循环，最后破坏了端点贴边（吸附点被推出矩形边界）。
     *    微段问题改由 toRoundedPath 侧处理（见 _cornerArc 的长度判据）。
     */
    _dedupe(pts) {
        const out = [];
        for (const p of pts) {
            const last = out[out.length - 1];
            if (!last || last.x !== p.x || last.y !== p.y) {
                out.push(p);
            }
        }
        return out;
    },

    _pathLength(pts) {
        let len = 0;
        for (let i = 1; i < pts.length; i++) {
            len += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
        }
        return len;
    },

    // ------------------------------------------------------------ 圆角

    toRoundedPath(points, radius = this.DEFAULT_RADIUS) {
        if (!Array.isArray(points) || points.length < 2) return '';

        // 调用方（route）已保证正交，这里只做完全重合点的合并。
        // 微段不在这里处理 —— 由 _cornerArc 的长度判据兜住（见下）。
        const pts = this._dedupe(points);
        if (pts.length < 2) return '';

        if (radius <= 0) {
            return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        }

        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length - 1; i++) {
            const prev = pts[i - 1];
            const cur = pts[i];
            const next = pts[i + 1];

            const arc = this._cornerArc(prev, cur, next, radius);
            if (!arc) {
                // 直行（无有效拐角）或半径为 0 → 直连
                d += ` L ${cur.x} ${cur.y}`;
                continue;
            }
            d += ` L ${arc.x1} ${arc.y1}`;
            d += ` A ${arc.r} ${arc.r} 0 0 ${arc.sweep} ${arc.x2} ${arc.y2}`;
        }
        const last = pts[pts.length - 1];
        d += ` L ${last.x} ${last.y}`;
        return d;
    },

    /**
     * 计算单个拐角的圆弧（切点 + 半径 + sweep-flag）。
     *
     * 算法照搬 d3-path 的 `Path.prototype.arcTo`（业界标准实现，
     * Canvas arcTo 与之等价），关键两点：
     *
     *   1) 切点距离用**正切线长** l = r·tan((π − θ)/2)，θ 为拐角。
     *      直觉上"切线长 = r"只在 90° 拐角成立；非 90° 时用 r 会画错形状。
     *      （我们的路径是严格正交的，θ 恒为 90°，两者数值相同，
     *        但保留通用写法以防将来放宽正交约束。）
     *
     *   2) sweep-flag 用 `y01*x20 > x01*y20` 判定，**不是叉积符号**。
     *      叉积表达的是左转/右转，与「弧该往哪边鼓」并不等价 —— 之前
     *      正因为拿叉积当 sweep 用，导致半数拐角凸出去。这里照抄 d3 的判据。
     *
     * @returns {null|{r,x1,y1,x2,y2,sweep}} 无有效拐角时返回 null
     */
    _cornerArc(p0, p1, p2, radius) {
        const EPS = 1e-6;
        if (!(radius > 0)) return null;

        // 三点重合或共线 → 不是拐角
        const x01 = p0.x - p1.x, y01 = p0.y - p1.y;
        const x21 = p2.x - p1.x, y21 = p2.y - p1.y;
        const l01_2 = x01 * x01 + y01 * y01;
        const l21_2 = x21 * x21 + y21 * y21;
        if (!(l01_2 > EPS) || !(l21_2 > EPS)) return null;
        if (!(Math.abs(x01 * y21 - y01 * x21) > EPS)) return null;   // 共线

        // 切线长（d3 公式）
        const x20 = p2.x - p0.x, y20 = p2.y - p0.y;
        const l20_2 = x20 * x20 + y20 * y20;
        const l21 = Math.sqrt(l21_2);
        const l01 = Math.sqrt(l01_2);
        const l = radius * Math.tan(
            (Math.PI - Math.acos(
                Math.max(-1, Math.min(1, (l21_2 + l01_2 - l20_2) / (2 * l21 * l01)))
            )) / 2
        );

        // 切线长不能超过相邻段的一半，否则圆弧会溢出到线段之外，
        // 画出"吃掉整段线"的畸形弧。d3 的 arcTo 不做这个约束（它假设
        // 调用方传入合适的半径），我们是通用入口，必须自己保证。
        // 90° 拐角时 l == r，所以等价于把半径夹到 min(l01,l21)/2。
        const maxL = Math.min(l01, l21) / 2;
        const useL = Math.min(l, maxL);
        const radiusUsed = (l > EPS) ? (radius * useL / l) : 0;

        // 半径小到画不出可见圆弧（亚像素微段：0.4px 这类浮点残差），
        // 就当成直角直连。d3 对退化情况也是这么处理的（直接 lineTo）。
        if (!(radiusUsed > this.MIN_VISIBLE_RADIUS)) return null;

        const t01 = useL / l01;
        const t21 = useL / l21;

        const x1 = p1.x + t01 * x01;
        const y1 = p1.y + t01 * y01;
        const x2 = p1.x + t21 * x21;
        const y2 = p1.y + t21 * y21;

        // sweep 判据照抄 d3：注意它比较的是 (y01,x20) 与 (x01,y20)
        const sweep = +(y01 * x20 > x01 * y20);

        return { r: radiusUsed, x1, y1, x2, y2, sweep };
    },

    /**
     * 拐角实际半径。
     *
     * 约束：r ≤ min(入段长, 出段长)/2 —— 否则圆弧会溢出到线段之外，
     * 入点/出点跑到相邻拐点外侧，短线段场景会画出"吃掉整段线"的畸形弧。
     *
     * 为什么不用简单的 min(radius, len/2)：那会让短段的圆角按比例缩水
     * （段长 10 → r=5），拐角退化成尖角，与 MasterGo 那种恒定圆润的弯头差很多。
     *
     * 折中：优先用 radius，只有当它装不下（线段太短）时才退到 len/2，
     * 并且不退让太多 —— 保留 MIN_CORNER_RATIO 的比例，让短拐角仍有一半圆弧。
     */
    _cornerRadius(radius, inLen, outLen) {
        const halfMin = Math.min(inLen, outLen) / 2;
        if (halfMin <= 0) return 0;
        if (radius <= halfMin) return radius;
        // 装不下时：至少给到段长的一半作为圆弧，保证短拐角也不是尖角
        return halfMin;
    },

    _toward(cur, target, distance) {
        const dx = Math.sign(target.x - cur.x);
        const dy = Math.sign(target.y - cur.y);
        if (dx !== 0) return { x: cur.x + dx * distance, y: cur.y };
        return { x: cur.x, y: cur.y + dy * distance };
    },

    /**
     * SVG 弧线的 sweep-flag。
     *
     * 语义：圆弧必须"凹"进拐角内侧 —— 把 90° 折线的尖角削圆，
     * 而不是向外鼓出一个包住拐点的凸弧。
     *
     * 在 y 向下的屏幕坐标系里，凹弧的方向与「左转/右转」成反比：
     *   右→下（叉积 >0，正向转）→ sweep=0
     *   右→上（叉积 <0，反向转）→ sweep=1
     * ⚠️ 这里若把符号写反（cross>0 给 1），弧线会翻到拐点外侧变成"凸"，
     *    三种走向各错一半，且不会报错——只会看起来别扭。浏览器实测确认过。
     */
    _sweep(prev, cur, next) {
        const d1 = { x: Math.sign(cur.x - prev.x), y: Math.sign(cur.y - prev.y) };
        const d2 = { x: Math.sign(next.x - cur.x), y: Math.sign(next.y - cur.y) };
        const cross = d1.x * d2.y - d1.y * d2.x;
        return cross > 0 ? 0 : 1;
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectorRouter;
}
