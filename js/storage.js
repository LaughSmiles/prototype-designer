// 数据持久化模块
// 负责画布数据的保存、导出、导入

const Storage = {
    // localStorage 键名
    // 键名随项目名派生，使框架可整体复制到新项目而不丢数据。
    // （历史上此处硬编码为上一个项目的名 'photographySchool*'，换项目后会孤立所有已保存数据）
    get STORAGE_KEY() {
        return `${this.projectName}Canvas`;
    },

    get UI_STATE_KEY() {
        return `${this.projectName}_uiState`;
    },

    /**
     * 读取项目名。config.js 必须先于本模块加载（canvas-editor.html 已保证这一点），
     * 仍保留兜底以防配置缺失。
     */
    get projectName() {
        if (!this._projectName) {
            const cfg = window.PROJECT_CONFIG || {};
            this._projectName = cfg.projectName || 'untitledProject';
        }
        return this._projectName;
    },

    // 旧版本硬编码的键名，检测到则自动迁移，避免升级后数据丢失
    LEGACY_KEYS: [
        { data: 'photographySchoolCanvas', ui: 'photographySchool_uiState' },
    ],

    // 初始化
    init() {
        this.migrateLegacyKeys();
        this.setupEventListeners();
        this.loadAuto(); // 自动加载上次保存的数据
        this.loadUIState(); // 恢复UI状态（侧边栏折叠等）
        this.startAutoSave(); // 启动自动保存定时器
    },

    /**
     * 把历史遗留键名下的数据迁移到当前项目键名。
     * 仅在新键尚不存在时执行，且迁移成功后清除旧键，避免重复占用与歧义。
     */
    migrateLegacyKeys() {
        for (const legacy of this.LEGACY_KEYS) {
            if (legacy.data === this.STORAGE_KEY) continue;

            const legacyRaw = localStorage.getItem(legacy.data);
            if (!legacyRaw) continue;

            if (!localStorage.getItem(this.STORAGE_KEY)) {
                localStorage.setItem(this.STORAGE_KEY, legacyRaw);
                Debug.warn(`[Storage] 已将画布数据从旧键 "${legacy.data}" 迁移到 "${this.STORAGE_KEY}"`);
            }

            if (legacy.ui && localStorage.getItem(legacy.ui) && !localStorage.getItem(this.UI_STATE_KEY)) {
                localStorage.setItem(this.UI_STATE_KEY, localStorage.getItem(legacy.ui));
            }

            localStorage.removeItem(legacy.data);
            if (legacy.ui) localStorage.removeItem(legacy.ui);
        }
    },

    // 设置事件监听器
    setupEventListeners() {
        const saveBtn = document.getElementById('saveBtn');
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        const clearBtn = document.getElementById('clearBtn');
        const helpBtn = document.getElementById('helpBtn');
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

        if (helpBtn) {
            helpBtn.addEventListener('click', () => CanvasEditor.showHelp());
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
    async save() {
        // 获取所有页面数据
        const pagesData = await PageManager.getAllPagesData();

        const data = {
            version: '2.0', // 升级版本号
            timestamp: new Date().toISOString(),
            ...pagesData
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            this.saveUIState(); // 同时保存UI状态
            PageLibrary.showHint('✅ 保存成功！');
            Debug.log('画布数据已保存:', data);
        } catch (error) {
            Debug.error('保存失败:', error);
            alert('保存失败：' + error.message);
        }
    },

    // 静默保存（不显示提示，用于自动保存）
    async saveSilently() {
        // 获取所有页面数据
        const pagesData = await PageManager.getAllPagesData();

        const data = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            ...pagesData
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            this.saveUIState(); // 同时保存UI状态
            Debug.log('自动保存成功:', new Date().toLocaleTimeString());
        } catch (error) {
            Debug.error('自动保存失败:', error);
        }
    },

    // 保存UI状态（侧边栏折叠等）
    saveUIState() {
        try {
            const sidebarLeft = document.getElementById('sidebarLeft');
            const sidebarRight = document.getElementById('sidebarRight');
            const uiState = {
                leftCollapsed: sidebarLeft ? sidebarLeft.classList.contains('collapsed') : false,
                rightCollapsed: sidebarRight ? sidebarRight.classList.contains('collapsed') : false
            };
            localStorage.setItem(this.UI_STATE_KEY, JSON.stringify(uiState));
        } catch (error) {
            Debug.error('保存UI状态失败:', error);
        }
    },

    // 恢复UI状态
    loadUIState() {
        try {
            const saved = localStorage.getItem(this.UI_STATE_KEY);
            if (!saved) return;

            const uiState = JSON.parse(saved);
            const sidebarLeft = document.getElementById('sidebarLeft');
            const sidebarRight = document.getElementById('sidebarRight');

            if (sidebarLeft && uiState.leftCollapsed) {
                sidebarLeft.classList.add('collapsed');
            }
            if (sidebarRight && uiState.rightCollapsed) {
                sidebarRight.classList.add('collapsed');
            }

            // 直接设置展开按钮的显示状态
            // 因为此时 MutationObserver 可能还未初始化，需要手动同步
            const expanderLeft = document.getElementById('expanderLeft');
            const expanderRight = document.getElementById('expanderRight');
            if (expanderLeft) {
                expanderLeft.style.display = uiState.leftCollapsed ? 'flex' : 'none';
            }
            if (expanderRight) {
                expanderRight.style.display = uiState.rightCollapsed ? 'flex' : 'none';
            }

            Debug.log('UI状态已恢复');
        } catch (error) {
            Debug.error('恢复UI状态失败:', error);
        }
    },

    // 启动自动保存定时器（每1分钟自动保存）
    startAutoSave() {
        setInterval(() => {
            this.saveSilently();
        }, 60000); // 60000毫秒 = 1分钟

        Debug.log('✅ 自动保存已启动，每1分钟保存一次');
    },

    // 自动加载（页面加载时）
    loadAuto() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                // 直接加载,不询问用户
                this.loadData(data);

                // 检测到缓存加载后,补充当前状态到历史栈
                if (ElementManager.state.elements.length > 0) {
                    HistoryManager.saveState();
                    Debug.log('💾 检测到缓存加载,已补充当前状态到历史栈');
                }

                PageLibrary.showHint('✅ 已恢复上次的画布');
                Debug.log('自动加载完成:', data);
            }
        } catch (error) {
            Debug.error('自动加载失败:', error);
        }
    },

    // 加载数据
    loadData(data) {
        if (!data) return;

        // 检测数据版本并迁移
        if (data.version === '1.0' || (!data.pages && data.elements)) {
            // 旧数据格式: 单页面,需要迁移
            Debug.log('检测到旧数据格式,正在迁移...');

            const migratedData = {
                pages: [{
                    id: 'page_1',
                    name: '页面1',
                    view: data.view || { zoom: 0.5, pan: { x: 0, y: 0 } },
                    elements: data.elements || [],
                    usageCount: data.usageCount || {}
                }],
                currentPageId: 'page_1'
            };

            PageManager.setPagesData(migratedData);
            Debug.log('旧数据已迁移到新格式');
        } else if (data.version === '2.0' && data.pages) {
            // 新数据格式: 多页面
            PageManager.setPagesData(data);
        } else {
            // 空数据,创建默认页面
            PageManager.init();
        }

        Debug.log('数据加载完成:', data);
    },

    // 导出为 JSON 文件
    async export() {
        // 获取所有页面数据
        const pagesData = await PageManager.getAllPagesData();

        const data = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            ...pagesData
        };

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        // 使用北京时间（东8区）作为文件名
        const beijingTime = new Date().toLocaleString('sv-SE', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(' ', 'T').replace(/:/g, '-');
        a.download = `canvas-${beijingTime}.json`;
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
                Debug.error('导入失败:', error);
                alert('文件格式错误：' + error.message);
            }
        };
        reader.readAsText(file);
    },

    // 清空浏览器缓存
    clearBrowserCache() {
        ModalManager.showConfirm(
            '确定要清空浏览器缓存吗?\n\n此操作将删除 localStorage 中保存的画布数据,且不可恢复!',
            '清空浏览器缓存',
            () => {
                try {
                    localStorage.removeItem(this.STORAGE_KEY);

                    // 检查是否成功删除
                    const saved = localStorage.getItem(this.STORAGE_KEY);
                    if (saved === null) {
                        PageLibrary.showHint('✅ 浏览器缓存已清空');
                        Debug.log('浏览器缓存已清空');
                    } else {
                        PageLibrary.showHint('❌ 清空失败');
                        Debug.error('清空缓存失败');
                    }
                } catch (error) {
                    Debug.error('清空缓存失败:', error);
                    alert('清空缓存失败：' + error.message);
                }
            }
        );
    }
};