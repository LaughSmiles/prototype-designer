// 工具系统核心模块
// 负责工具切换和事件分发

const Tools = {
    // 当前工具
    currentTool: 'select',

    // 箭头工具状态
    arrowState: {
        points: [],  // 存储所有拐点
        isDrawing: false
    },

    // 批注标记工具状态
    annotationState: {
    },

    // 智能连接线工具状态
    connectorState: {
        isDrawing: false,
        fromId: null,
        hoverId: null,
    },

    // 初始化
    init() {
        this.setupToolButtons();
        this.setupCanvasEvents();
    },

    // 设置工具按钮
    setupToolButtons() {
        const buttons = document.querySelectorAll('.tool-icon-btn');
        buttons.forEach(btn => {
            const tool = btn.dataset.tool;
            if (tool) {
                btn.addEventListener('click', () => {
                    this.setTool(tool);
                });
            }
        });
    },

    // 设置当前工具
    setTool(tool) {
        // 如果正在绘制箭头时切换工具,需要先清理状态并恢复iframe
        if (this.arrowState.isDrawing) {
            ToolsArrow.removeArrowPreview();
            this.arrowState.points = [];
            this.arrowState.isDrawing = false;
        }

        // 如果正在绘制连接线时切换工具,清理预览
        if (this.connectorState.isDrawing && typeof ToolsConnector !== 'undefined') {
            ToolsConnector.cancelDrawing();
        }

        // 拖段途中切工具：收尾并落一次历史，否则这次拖动会变成"按了没动"
        if (typeof ToolsConnector !== 'undefined' && ToolsConnector.isSegmentDragging()) {
            ToolsConnector.endSegmentDrag();
        }

        // 切换工具时收起锚点层：锚点只在连接线工具下显示（对齐 MasterGo）
        if (typeof ToolsConnector !== 'undefined') {
            ToolsConnector.setHoverElement(null);
        }
        if (typeof ElementManager !== 'undefined' && ElementManager.clearAnchors) {
            ElementManager.clearAnchors();
        }

        // 更新状态
        this.currentTool = tool;

        // 重置工具状态
        this.arrowState = { points: [], isDrawing: false };
        this.annotationState = { };
        this.connectorState = { isDrawing: false, fromId: null, hoverId: null };

        // 更新UI
        const buttons = document.querySelectorAll('.tool-icon-btn');
        buttons.forEach(btn => {
            const btnTool = btn.dataset.tool;
            if (btnTool && btnTool === tool) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 更新光标
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (canvasWrapper) {
            if (tool === 'select') {
                canvasWrapper.style.cursor = 'default';  // 空白区域显示箭头
            } else if (tool === 'arrow') {
                canvasWrapper.style.cursor = 'crosshair';
            } else if (tool === 'annotation') {
                canvasWrapper.style.cursor = 'text';  // 批注标记工具
            } else if (tool === 'connector') {
                canvasWrapper.style.cursor = 'crosshair';  // 连接线工具
            }
        }

        // 显示提示
        const toolNames = {
            'select': '选择工具',
            'arrow': '箭头工具',
            'annotation': '批注标记',
            'connector': '连接线工具 (从一个页面框拖到另一个)'
        };
        PageLibrary.showHint(`切换到: ${toolNames[tool] || tool}`);
    },

    // 设置画布事件
    setupCanvasEvents() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasWrapper) return;

        // ===== 智能连接线工具：mousedown/mousemove/mouseup 三段式 =====
        // 必须挂在 wrapper 上且用捕获阶段，iframe 内部的指针事件也要能拿到
        canvasWrapper.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;

            // 端点拖拽优先级最高，且在**任何工具下**都可用 ——
            // MasterGo 的行为是「选中连线后拖两端圆点即可改连」，
            // 不需要切回连接线工具，所以这里不判断 currentTool。
            const hit = ToolsConnector.hitTestEndpoint(e);
            if (hit) {
                ToolsConnector.beginEndpointDrag(hit.connectorId, hit.end);
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // 段拖拽（MasterGo：hover 连线 → 每段中点冒出胶囊，按住整段平移）
            // 优先级在端点之下 —— 两者在不同的段上，不会互相遮挡，
            // 但端点圆点是"改连谁"的主操作，排在前面更符合直觉。
            const segHit = ToolsConnector.hitTestSegmentHandle(e);
            if (segHit && ToolsConnector.beginSegmentDrag(segHit.connectorId, segHit.segIndex, e)) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (this.currentTool !== 'connector') return;
            ToolsConnector.handleMouseDown(e);
        }, true);

        // 端点/段拖拽的移动与释放走 document 级监听（指针可能在 iframe 上，
        // 停在 wrapper 上会丢事件），在 setupCanvasEvents 末尾统一注册

        // ===== 点击事件（用于箭头和批注标记工具）=====
        // 关键修复：在canvas-wrapper上监听,而不是canvas
        // 这样可以避免iframe拦截事件,确保工具在iframe上方也能正常工作
        canvasWrapper.addEventListener('click', (e) => {
            // 连接线工具用 mousedown/mouseup，不走 click 分发
            if (this.currentTool === 'connector') return;

            // 只在选择工具模式下才防止点击元素时触发
            // 工具模式(箭头/批注标记)需要在元素上方也能正常工作
            if (this.currentTool === 'select' && e.target.closest('.canvas-element')) {
                return;
            }

            if (this.currentTool === 'arrow') {
                ToolsArrow.handleClick(e);
            } else if (this.currentTool === 'annotation') {
                ToolsAnnotation.handleClick(e);
            }
        });

        // 鼠标移动（用于箭头预览 / 连接线实时预览 / 锚点显示）
        // 也在canvas-wrapper上监听,确保箭头预览在iframe上方正常工作
        canvasWrapper.addEventListener('mousemove', (e) => {
            if (this.currentTool === 'arrow' && this.arrowState.isDrawing) {
                ToolsArrow.updateArrowPreview(e);
            } else if (this.currentTool === 'connector' || ToolsConnector.dragState.active) {
                ToolsConnector.handleMouseMove(e);
            }

            // 锚点显示：仅在连接线工具下。
            // 对齐 MasterGo —— 锚点是「按需出现」的，其它工具下画布保持干净。
            //
            // ⚠️ 这里**不能**用 !isDrawing / !dragState.active 把绘制期排除掉：
            //    那是问题 1 的根因（实测 tools.js 原先带这两个门禁）——
            //    鼠标一按下开始拖线，锚点层就不再更新，
            //    于是"目标页面也需要有锚点"永远做不到。
            //    绘制期改为显示 **源元素 + 当前悬停目标** 两个元素的锚点。
            if (this.currentTool === 'connector') {
                ToolsConnector.refreshAnchors(e);
            }
        });

        // 鼠标离开画布 → 收起锚点
        canvasWrapper.addEventListener('mouseleave', () => {
            ToolsConnector.setHoverElement(null);
        });

        // 鼠标释放（连接线落点建线 / 端点改连）
        canvasWrapper.addEventListener('mouseup', (e) => {
            if (this.currentTool === 'connector' || ToolsConnector.dragState.active) {
                ToolsConnector.handleMouseUp(e);
            }
        });

        // ⚠️ 端点/段拖拽期间指针可能移出 wrapper（甚至落到 iframe 上），
        // 只在 wrapper 上监听 mouseup 会丢事件，所以拖拽期间改挂 document。
        document.addEventListener('mousemove', (e) => {
            if (ToolsConnector.dragState.active) ToolsConnector.handleMouseMove(e);
            else if (ToolsConnector.isSegmentDragging()) ToolsConnector.handleSegmentMouseMove(e);
        });
        document.addEventListener('mouseup', (e) => {
            if (ToolsConnector.dragState.active) ToolsConnector.handleMouseUp(e);
            else if (ToolsConnector.isSegmentDragging()) ToolsConnector.endSegmentDrag();
        });

        // 右键事件（用于完成箭头绘制）
        // 也在canvas-wrapper上监听,确保右键完成在iframe上方正常工作
        canvasWrapper.addEventListener('contextmenu', (e) => {
            if (this.currentTool === 'arrow' && this.arrowState.isDrawing) {
                e.preventDefault();  // 阻止默认右键菜单
                ToolsArrow.handleRightClick(e);
            }
        });
    },

    // 获取当前工具
    getCurrentTool() {
        return this.currentTool;
    }
};
