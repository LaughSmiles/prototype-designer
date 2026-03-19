// 元素工厂模式实现
// 使用工厂模式统一创建各种元素,降低耦合

/**
 * 元素类型枚举
 */
const ElementType = {
    PAGE: 'page',
    ARROW: 'arrow',
    TEXT: 'text',
    ANNOTATION: 'annotation'
};

/**
 * 元素创建器基类
 */
class ElementCreator {
    constructor(type) {
        this.type = type;
    }

    /**
     * 创建元素数据
     * @param {...any} args - 创建参数
     * @returns {Object} 元素数据
     */
    create(...args) {
        throw new Error('子类必须实现 create 方法');
    }

    /**
     * 验证创建参数
     * @param {...any} args - 创建参数
     * @returns {boolean}
     */
    validate(...args) {
        return true;
    }

    /**
     * 获取默认配置
     * @returns {Object}
     */
    getDefaultConfig() {
        return {};
    }
}

/**
 * 页面元素创建器
 */
class PageElementCreator extends ElementCreator {
    constructor() {
        super(ElementType.PAGE);
    }

    create(pageId, x, y, pageInfo) {
        if (!this.validate(pageId, x, y, pageInfo)) {
            throw new Error('无效的页面元素创建参数');
        }

        return {
            type: this.type,
            pageId: pageId,
            position: { x, y },
            width: pageInfo.originalSize.width,
            height: pageInfo.originalSize.height
        };
    }

    validate(pageId, x, y, pageInfo) {
        return pageInfo && pageInfo.originalSize;
    }

    getDefaultConfig() {
        return {
            width: 320,
            height: 680
        };
    }
}

/**
 * 箭头元素创建器
 */
class ArrowElementCreator extends ElementCreator {
    constructor() {
        super(ElementType.ARROW);
    }

    create(points) {
        if (!this.validate(points)) {
            throw new Error('无效的箭头元素创建参数');
        }

        // 计算边界
        const allX = points.map(p => p.x);
        const allY = points.map(p => p.y);
        const minX = Math.min(...allX);
        const minY = Math.min(...allY);
        const maxX = Math.max(...allX);
        const maxY = Math.max(...allY);

        const padding = 50;

        return {
            type: this.type,
            points: points,
            position: { x: minX - padding, y: minY - padding },
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2
        };
    }

    validate(points) {
        return points && Array.isArray(points) && points.length >= 2;
    }

    getDefaultConfig() {
        return {
            padding: 50,
            strokeColor: '#e74c3c',
            strokeWidth: 3
        };
    }
}

/**
 * 文字元素创建器
 */
class TextElementCreator extends ElementCreator {
    constructor() {
        super(ElementType.TEXT);
    }

    create(text, x, y) {
        if (!this.validate(text, x, y)) {
            throw new Error('无效的文字元素创建参数');
        }

        return {
            type: this.type,
            text: text,
            position: { x, y },
            fontSize: 16,
            color: '#2c3e50',
            width: 150,
            height: 30
        };
    }

    validate(text, x, y) {
        return typeof text === 'string' && typeof x === 'number' && typeof y === 'number';
    }

    getDefaultConfig() {
        return {
            fontSize: 16,
            color: '#2c3e50',
            width: 150,
            height: 30
        };
    }
}

/**
 * 批注标记元素创建器
 */
class AnnotationElementCreator extends ElementCreator {
    constructor() {
        super(ElementType.ANNOTATION);
    }

    create(boxX, boxY) {
        if (!this.validate(boxX, boxY)) {
            throw new Error('无效的批注标记元素创建参数');
        }

        const BOX_WIDTH = 200;
        const BOX_HEIGHT = 120;
        const ANCHOR_OFFSET = 60;
        const ANCHOR_SIZE = 10;
        const PADDING = 10;

        // 锚点位置
        const anchorX = boxX - ANCHOR_OFFSET;
        const anchorY = boxY + BOX_HEIGHT / 2 - 5;

        // 计算容器边界
        const anchorLeft = anchorX;
        const anchorRight = anchorX + ANCHOR_SIZE;
        const anchorTop = anchorY;
        const anchorBottom = anchorY + ANCHOR_SIZE;

        const boxLeft = boxX;
        const boxRight = boxX + BOX_WIDTH;
        const boxTop = boxY;
        const boxBottom = boxY + BOX_HEIGHT;

        const minX = Math.min(anchorLeft, boxLeft);
        const maxX = Math.max(anchorRight, boxRight);
        const minY = Math.min(anchorTop, boxTop);
        const maxY = Math.max(anchorBottom, boxBottom);

        return {
            type: this.type,
            anchorX: anchorX,
            anchorY: anchorY,
            boxX: boxX,
            boxY: boxY,
            boxWidth: BOX_WIDTH,
            boxHeight: BOX_HEIGHT,
            containerOffsetX: minX - PADDING,
            containerOffsetY: minY - PADDING,
            containerWidth: maxX - minX + PADDING * 2,
            containerHeight: maxY - minY + PADDING * 2,
            content: ''
        };
    }

    validate(boxX, boxY) {
        return typeof boxX === 'number' && typeof boxY === 'number';
    }

    getDefaultConfig() {
        return {
            boxWidth: 200,
            boxHeight: 120,
            anchorOffset: 60,
            anchorSize: 10,
            padding: 10
        };
    }
}

/**
 * 元素工厂
 */
const ElementFactory = {
    creators: {},

    /**
     * 注册元素创建器
     * @param {string} type - 元素类型
     * @param {ElementCreator} creator - 元素创建器实例
     */
    register(type, creator) {
        this.creators[type] = creator;
    },

    /**
     * 创建元素
     * @param {string} type - 元素类型
     * @param {...any} args - 创建参数
     * @returns {Object|null} 元素数据
     */
    create(type, ...args) {
        const creator = this.creators[type];
        if (!creator) {
            console.error(`未找到类型为 ${type} 的元素创建器`);
            return null;
        }

        try {
            return creator.create(...args);
        } catch (error) {
            console.error(`创建 ${type} 元素失败:`, error);
            return null;
        }
    },

    /**
     * 初始化所有创建器
     */
    init() {
        this.register(ElementType.PAGE, new PageElementCreator());
        this.register(ElementType.ARROW, new ArrowElementCreator());
        this.register(ElementType.TEXT, new TextElementCreator());
        this.register(ElementType.ANNOTATION, new AnnotationElementCreator());
    },

    /**
     * 检查元素类型是否支持
     * @param {string} type - 元素类型
     * @returns {boolean}
     */
    hasType(type) {
        return type in this.creators;
    },

    /**
     * 获取所有支持的元素类型
     * @returns {string[]}
     */
    getSupportedTypes() {
        return Object.keys(this.creators);
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ElementType,
        ElementCreator,
        PageElementCreator,
        ArrowElementCreator,
        TextElementCreator,
        AnnotationElementCreator,
        ElementFactory
    };
}
