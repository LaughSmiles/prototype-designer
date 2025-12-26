// 虚拟滚动条组件
// 用于画布编辑器的自定义滚动条

class VirtualScrollbar {
    constructor(options) {
        this.orientation = options.orientation; // 'vertical' | 'horizontal'
        this.viewportSize = options.viewportSize;
        this.contentSize = options.contentSize;
        this.position = 0; // 当前滚动位置
        this.onScrollCallback = null;

        // DOM元素
        this.container = options.container;
        this.thumb = null;

        // 拖动状态
        this.isDragging = false;
        this.dragStart = 0;
        this.thumbStart = 0;

        // 渲染并绑定事件
        this.render();
        this.bindEvents();
    }

    // 更新内容尺寸和视口尺寸
    updateMetrics(contentSize, viewportSize) {
        this.contentSize = contentSize;
        this.viewportSize = viewportSize;

        // 计算并更新滑块大小
        this.updateThumbSize();
    }

    // 更新滚动位置
    updatePosition(position) {
        this.position = Math.max(0, Math.min(position, this.getMaxScroll()));
        this.updateThumbPosition();
    }

    // 设置滚动回调
    onScroll(callback) {
        this.onScrollCallback = callback;
    }

    // 渲染DOM
    render() {
        // 获取现有的滑块元素(在HTML中已经创建)
        this.thumb = this.container.querySelector('.scrollbar-thumb');

        // 如果没有找到滑块,才创建新的
        if (!this.thumb) {
            this.thumb = document.createElement('div');
            this.thumb.className = 'scrollbar-thumb';
            this.container.appendChild(this.thumb);
        }

        // 初始化滑块大小
        this.updateThumbSize();
    }

    // 绑定事件
    bindEvents() {
        // 滑块鼠标按下
        this.thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            this.isDragging = true;
            this.dragStart = this.orientation === 'vertical' ? e.clientY : e.clientX;

            // 获取当前滑块位置
            const thumbStyle = window.getComputedStyle(this.thumb);
            this.thumbStart = this.orientation === 'vertical'
                ? parseFloat(thumbStyle.top)
                : parseFloat(thumbStyle.left);

            // 设置全局光标
            document.body.style.cursor = 'pointer';
            document.body.style.userSelect = 'none';
        });

        // 全局鼠标移动
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            e.preventDefault();

            const clientPos = this.orientation === 'vertical' ? e.clientY : e.clientX;
            const delta = clientPos - this.dragStart;

            // 计算新的滑块位置
            let newThumbPos = this.thumbStart + delta;

            // 计算可用的轨道空间
            const trackSize = this.orientation === 'vertical'
                ? this.container.clientHeight
                : this.container.clientWidth;

            const thumbSize = this.orientation === 'vertical'
                ? this.thumb.clientHeight
                : this.thumb.clientWidth;

            const maxThumbPos = trackSize - thumbSize;

            // 限制滑块位置
            newThumbPos = Math.max(0, Math.min(newThumbPos, maxThumbPos));

            // 更新内部位置记录
            this.position = newThumbPos * (this.getMaxScroll() / maxThumbPos);

            // 直接设置滑块位置
            if (this.orientation === 'vertical') {
                this.thumb.style.top = `${newThumbPos}px`;
            } else {
                this.thumb.style.left = `${newThumbPos}px`;
            }

            // 触发滚动回调
            if (this.onScrollCallback) {
                this.onScrollCallback(this.position);
            }
        });

        // 全局鼠标释放
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    // 更新滑块大小
    updateThumbSize() {
        if (!this.thumb) return;

        const trackSize = this.viewportSize;
        const maxScroll = this.getMaxScroll();

        // 如果内容小于视口,仍然显示滑块(但满宽/满高)
        if (maxScroll <= 0) {
            this.thumb.style.display = 'block';
            // 滑块填满整个轨道
            if (this.orientation === 'vertical') {
                this.thumb.style.height = '100%';
                this.thumb.style.width = 'auto';
            } else {
                this.thumb.style.width = '100%';
                this.thumb.style.height = '100%'; // 关键:设置高度为100%填满轨道
            }
            return;
        }

        this.thumb.style.display = 'block';

        // 计算滑块大小
        let thumbSize = trackSize * (trackSize / this.contentSize);
        const minThumbSize = 30; // 最小滑块尺寸
        thumbSize = Math.max(thumbSize, minThumbSize);

        // 应用滑块大小
        if (this.orientation === 'vertical') {
            this.thumb.style.height = `${thumbSize}px`;
            // 确保宽度填满轨道
            this.thumb.style.width = 'auto';
        } else {
            this.thumb.style.width = `${thumbSize}px`;
            // 确保高度填满轨道(设置为100%)
            this.thumb.style.height = '100%';
        }
    }

    // 更新滑块位置
    updateThumbPosition() {
        if (!this.thumb) return;

        const maxScroll = this.getMaxScroll();
        if (maxScroll <= 0) {
            if (this.orientation === 'vertical') {
                this.thumb.style.top = '0px';
            } else {
                this.thumb.style.left = '0px';
            }
            return;
        }

        // 计算可用的轨道空间
        const trackSize = this.orientation === 'vertical'
            ? this.container.clientHeight
            : this.container.clientWidth;

        const thumbSize = this.orientation === 'vertical'
            ? this.thumb.clientHeight
            : this.thumb.clientWidth;

        const maxThumbPos = trackSize - thumbSize;

        // 计算滑块位置
        const thumbPos = (this.position / maxScroll) * maxThumbPos;

        // 应用滑块位置
        if (this.orientation === 'vertical') {
            this.thumb.style.top = `${thumbPos}px`;
        } else {
            this.thumb.style.left = `${thumbPos}px`;
        }
    }

    // 获取最大滚动距离
    getMaxScroll() {
        return Math.max(0, this.contentSize - this.viewportSize);
    }
}
