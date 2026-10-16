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
    // 只存 fromId/toId —— 路径由 ConnectorRouter 按两端元素当前位置实时计算，
    // 不存坐标（这是 MasterGo 连接线的核心语义，见 js/connectors/connector-router.js）
    addConnectorElement(fromId, toId) {
        const fromEl = ElementManager.state.elements.find(el => el.id === fromId);
        const toEl = ElementManager.state.elements.find(el => el.id === toId);
        if (!fromEl || !toEl) return;

        const element = {
            id: PageManager.generateElementId(),
            type: 'connector',
            fromId: fromId,
            toId: toId,
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
