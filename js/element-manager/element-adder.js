// 元素添加模块
// 负责添加各种类型的元素到画布

const ElementAdder = {
    // 添加页面元素
    // saveState: 是否保存状态用于撤销(默认为true,批量操作时设为false)
    addPageElement(pageId, x, y, saveState = true) {
        const pageInfo = PageLibrary.getPageInfo(pageId);
        if (!pageInfo) return;

        const element = {
            id: PageManager.generateElementId(),
            type: 'page',
            pageId: pageId,
            position: { x, y },
            width: pageInfo.originalSize.width,
            height: pageInfo.originalSize.height
        };

        ElementManager.state.elements.push(element);
        ElementManager.renderElement(element);

        ElementManager.incrementUsageCount(pageId);
        ElementManager.updateStatusBar();

        if (saveState) {
            HistoryManager.saveState();
        }
    },

    // 添加箭头元素
    addArrowElement(points) {
        const element = {
            id: PageManager.generateElementId(),
            type: 'arrow',
            points: points,
            position: { x: 0, y: 0 },
            width: 0,
            height: 0
        };

        ElementManager.state.elements.push(element);
        ElementManager.renderElement(element);
        ElementManager.updateStatusBar();

        HistoryManager.saveState();
    },

    // 添加智能连接线
    //
    // 两种形态，MasterGo 实测都支持（用户在文件上逐条验过）：
    //
    //   ① 绑定连接线：两端都有页面框。只存 fromId/toId + 锚点描述符 ——
    //      路径与端点坐标都由 ConnectorRouter 按两端元素当前位置实时计算，
    //      **不存任何像素坐标**（这是 MasterGo 连接线的核心语义）
    //   ② 自由连接线：至少一端不在任何页面框上。那个端没有元素可绑，
    //      只能存坐标 —— fromFree/toFree 就是干这个的。
    //
    // 两端各自独立判定，所以 绑-绑 / 绑-自由 / 自由-绑 / 自由-自由 四种都有。
    //
    // 锚点描述符形如 {elementId, kind:'element'|'inner', selector?, side, t}：
    //   - side/t 是归一化位置，元素缩放后锚点自动跟着变，无需迁移数据
    //   - inner 锚点额外记 selector，用于在 iframe 里重新定位那个子元素
    addConnectorElement(fromId, toId, fromAnchor = null, toAnchor = null, fromFree = null, toFree = null) {
        // 每一端要么有元素、要么有自由坐标，否则这条线无从画起
        const okFrom = fromId || (fromFree && Number.isFinite(fromFree.x) && Number.isFinite(fromFree.y));
        const okTo = toId || (toFree && Number.isFinite(toFree.x) && Number.isFinite(toFree.y));
        if (!okFrom || !okTo) return null;
        // 自环（两端同一个元素）没有意义，直接拒绝
        if (fromId && toId && fromId === toId) return null;

        const element = {
            id: PageManager.generateElementId(),
            type: 'connector',
            fromId: fromId || null,
            toId: toId || null,
            // 旧行为兼容：没给锚点时保持为 null，渲染时退化为整元素路由
            fromAnchor: fromAnchor || null,
            toAnchor: toAnchor || null,
            // 自由端坐标（绑定端恒为 null）
            fromFree: fromFree ? { x: fromFree.x, y: fromFree.y } : null,
            toFree: toFree ? { x: toFree.x, y: toFree.y } : null,
            position: { x: 0, y: 0 },
            width: 0,
            height: 0
        };

        ElementManager.state.elements.push(element);
        ElementManager.renderElement(element);
        ElementManager.updateStatusBar();

        HistoryManager.saveState();

        return element.id;
    },

    // 添加批注标记元素
    addAnnotationElement(boxX, boxY) {
        const BOX_WIDTH = 200;
        const BOX_HEIGHT = 120;
        const ANCHOR_OFFSET = 60;
        const ANCHOR_SIZE = 10;
        const PADDING = 10;

        const anchorX = boxX - ANCHOR_OFFSET;
        const anchorY = boxY + BOX_HEIGHT / 2 - 5;

        const element = {
            id: PageManager.generateElementId(),
            type: 'annotation',
            anchorX: anchorX,
            anchorY: anchorY,
            boxX: boxX,
            boxY: boxY,
            boxWidth: BOX_WIDTH,
            boxHeight: BOX_HEIGHT,
            containerOffsetX: Math.min(anchorX, boxX) - PADDING,
            containerOffsetY: Math.min(anchorY, boxY) - PADDING,
            containerWidth: Math.max(anchorX + ANCHOR_SIZE, boxX + BOX_WIDTH) - Math.min(anchorX, boxX) + PADDING * 2,
            containerHeight: Math.max(anchorY + ANCHOR_SIZE, boxY + BOX_HEIGHT) - Math.min(anchorY, boxY) + PADDING * 2,
            content: ''
        };

        ElementManager.state.elements.push(element);
        ElementManager.renderElement(element);
        ElementManager.updateStatusBar();

        HistoryManager.saveState();

        return element.id;
    }
};
