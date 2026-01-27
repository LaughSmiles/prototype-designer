// 数据持久化模块
// 负责画布数据的保存、导出、导入

const Storage = {
    // localStorage 键名
    STORAGE_KEY: 'photographySchoolCanvas',

    // 初始化
    init() {
        this.setupEventListeners();
        this.loadAuto(); // 自动加载上次保存的数据
        this.startAutoSave(); // 启动自动保存定时器
    },

    // 设置事件监听器
    setupEventListeners() {
        const saveBtn = document.getElementById('saveBtn');
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        const clearBtn = document.getElementById('clearBtn');
        const fileInput = document.getElementById('fileInput');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }

        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => this.clearBrowserCache());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.export());
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => {
                if (fileInput) fileInput.click();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => ElementManager.clearAll());
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.import(file);
                }
                // 重置input，允许重复选择同一文件
                e.target.value = '';
            });
        }
    },

    // 保存到 localStorage
    save() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            view: CanvasView.getView(),
            elements: ElementManager.getAllElements(),
            usageCount: ElementManager.getUsageCounts()
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            PageLibrary.showHint('✅ 保存成功！');
            console.log('画布数据已保存:', data);
        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败：' + error.message);
        }
    },

    // 静默保存（不显示提示，用于自动保存）
    saveSilently() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            view: CanvasView.getView(),
            elements: ElementManager.getAllElements(),
            usageCount: ElementManager.getUsageCounts()
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            console.log('自动保存成功:', new Date().toLocaleTimeString());
        } catch (error) {
            console.error('自动保存失败:', error);
        }
    },

    // 启动自动保存定时器（每1分钟自动保存）
    startAutoSave() {
        setInterval(() => {
            this.saveSilently();
        }, 60000); // 60000毫秒 = 1分钟

        console.log('✅ 自动保存已启动，每1分钟保存一次');
    },

    // 自动加载（页面加载时）
    loadAuto() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                // 直接加载,不询问用户
                this.loadData(data);
                PageLibrary.showHint('✅ 已恢复上次的画布');
                console.log('自动加载完成:', data);
            }
        } catch (error) {
            console.error('自动加载失败:', error);
        }
    },

    // 从 localStorage 加载
    load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (!saved) {
                alert('没有找到保存的数据');
                return;
            }

            const data = JSON.parse(saved);
            this.loadData(data);
            PageLibrary.showHint('✅ 数据已恢复');
        } catch (error) {
            console.error('加载失败:', error);
            alert('加载失败：' + error.message);
        }
    },

    // 加载数据
    loadData(data) {
        if (!data) return;

        // 恢复视图
        if (data.view) {
            CanvasView.setView(data.view.zoom, data.view.pan);
        }

        // 恢复元素
        if (data.elements) {
            ElementManager.setAllElements(data.elements);
        }

        // 恢复使用计数（如果有的话，兼容旧数据）
        if (data.usageCount) {
            ElementManager.setUsageCounts(data.usageCount);
        }

        console.log('数据加载完成:', data);
    },

    // 导出为 JSON 文件
    export() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            view: CanvasView.getView(),
            elements: ElementManager.getAllElements(),
            usageCount: ElementManager.getUsageCounts()
        };

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `canvas-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();

        URL.revokeObjectURL(url);
        PageLibrary.showHint('✅ 已导出JSON文件');
    },

    // 从 JSON 文件导入
    import(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.loadData(data);
                PageLibrary.showHint('✅ 导入成功');
            } catch (error) {
                console.error('导入失败:', error);
                alert('文件格式错误：' + error.message);
            }
        };
        reader.readAsText(file);
    },

    // 获取保存的数据（用于调试）
    getSavedData() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    },

    // 清除保存的数据
    clearSaved() {
        if (confirm('确定要清除所有保存的数据吗？')) {
            localStorage.removeItem(this.STORAGE_KEY);
            PageLibrary.showHint('已清除保存的数据');
        }
    },

    // 清空浏览器缓存
    clearBrowserCache() {
        if (confirm('确定要清空浏览器缓存吗？\n\n此操作将删除 localStorage 中保存的画布数据，且不可恢复！')) {
            try {
                localStorage.removeItem(this.STORAGE_KEY);

                // 检查是否成功删除
                const saved = localStorage.getItem(this.STORAGE_KEY);
                if (saved === null) {
                    PageLibrary.showHint('✅ 浏览器缓存已清空');
                    console.log('浏览器缓存已清空');
                } else {
                    PageLibrary.showHint('❌ 清空失败');
                    console.error('清空缓存失败');
                }
            } catch (error) {
                console.error('清空缓存失败:', error);
                alert('清空缓存失败：' + error.message);
            }
        }
    }
};