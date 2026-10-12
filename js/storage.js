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

    // ===== 保存状态（供顶栏指示器与退出兜底使用）=====
    dirtySince: null,       // 自上次成功落盘后是否还有未保存的改动（null = 已同步）
    lastSaveAt: null,       // 最后一次成功保存的时间戳
    lastSaveError: null,    // 最后一次保存失败的结构化结果（成功即清空）
    _autoSaveTimer: null,   // 自动保存定时器句柄（必须持有，否则无法停止）
    _quotaWarned: false,    // 配额告警是否已提示过（避免每 60 秒刷屏）
    _lastQuotaHintAt: 0,
    _unloadGuardBound: false,

    QUOTA_WARN_RATIO: 0.8,  // 占用超过 80% 即提前预警
    QUOTA_LIMIT_BYTES: 5 * 1024 * 1024,  // 各浏览器对 localStorage 的常见上限

    // 初始化
    init() {
        this.migrateLegacyKeys();
        this.setupEventListeners();
        this.loadAuto(); // 自动加载上次保存的数据
        this.loadUIState(); // 恢复UI状态（侧边栏折叠等）
        this.setupUnloadGuard(); // 关闭/切后台前的兜底保存
        this.startAutoSave(); // 启动自动保存定时器
        this.updateSaveIndicator();
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

    // ===== 脏标记 =====
    // 所有画布变更最终都会走 HistoryManager.saveState()，在这里集中打脏标记，
    // 避免把 markDirty 散落到十几个交互文件里漏标。
    markDirty() {
        this.dirtySince = this.dirtySince || Date.now();
        this.updateSaveIndicator();
    },

    clearDirty() {
        this.dirtySince = null;
        this.updateSaveIndicator();
    },

    isDirty() {
        return this.dirtySince !== null;
    },

    // 组装待落盘的数据（不含探测，异步）
    async _buildPayload() {
        const pagesData = await PageManager.getAllPagesData();
        return {
            version: '2.0',
            timestamp: new Date().toISOString(),
            ...pagesData
        };
    },

    // 组装待落盘的数据（纯内存、零 await）
    // 卸载场景下 fetch 一定等不到结果，必须有一条完全同步的保存路径。
    _buildPayloadSync() {
        const currentPage = PageManager.getCurrentPage();
        if (currentPage) {
            currentPage.view = CanvasView.getView();
            currentPage.elements = ElementManager.getAllElements();
            currentPage.usageCount = ElementManager.getUsageCounts();
        }
        return {
            version: '2.0',
            timestamp: new Date().toISOString(),
            pages: PageManager.pages,
            currentPageId: PageManager.currentPageId,
            globalNextElementId: PageManager.globalNextElementId
        };
    },

    /**
     * 唯一的落盘实现。手动保存与自动保存共用，因此不存在"自动保存失败但用户看不见"的分支。
     * 不做任何 UI 操作，返回结构化结果由调用方决定如何呈现。
     */
    _writeCanvas(payload) {
        let json;
        try {
            json = JSON.stringify(payload);
        } catch (error) {
            // 循环引用等结构性问题，JSON.stringify 直接抛
            Debug.error('[Storage] 序列化失败:', error);
            return { ok: false, reason: 'serialize', error, bytes: 0 };
        }

        // localStorage 按 UTF-16 计 2 字节/字符
        const bytes = json.length * 2;

        try {
            localStorage.setItem(this.STORAGE_KEY, json);
        } catch (error) {
            const isQuota = this._isQuotaError(error);
            return { ok: false, reason: isQuota ? 'quota' : 'unavailable', error, bytes };
        }

        try {
            this.saveUIState(); // 界面状态与画布数据一起落盘
        } catch (error) {
            // UI 状态失败不影响画布数据本身
            Debug.warn('[Storage] UI 状态保存失败:', error);
        }

        this.lastSaveAt = Date.now();
        this.lastSaveError = null;
        this.dirtySince = null;
        this._quotaWarned = false;
        this.updateSaveIndicator();
        return { ok: true, bytes };
    },

    _isQuotaError(error) {
        if (!error) return false;
        return error.name === 'QuotaExceededError'
            || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
            || error.code === 22
            || error.code === 1014;
    },

    // 估算本 origin 的 localStorage 占用（字节）
    _estimateUsage() {
        let total = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key === null) continue;
                total += (key.length + (localStorage.getItem(key) || '').length) * 2;
            }
        } catch (error) {
            return null; // 存储不可访问
        }
        return total;
    },

    // 成功保存后的配额预警（接近上限时提醒导出备份）
    _quotaAdvice() {
        const usage = this._estimateUsage();
        if (usage === null) return '';
        if (usage / this.QUOTA_LIMIT_BYTES < this.QUOTA_WARN_RATIO) return '';
        return ` ⚠️ 本地存储已用 ${(usage / 1048576).toFixed(2)}MB / 约 5MB，接近上限，请定期 Ctrl+E 导出备份。`;
    },

    /**
     * 保存失败的统一出口。
     * silent=true 表示来自自动保存——过去这条路径只有 Debug.error，
     * 导致配额溢出后用户零感知、定时保存"永久停止"却毫无提示。
     */
    _reportSaveFailure(result, { silent }) {
        this.lastSaveError = result;
        this.updateSaveIndicator();

        if (result.reason === 'serialize') {
            Debug.error('[Storage] 画布数据无法序列化:', result.error);
            PageLibrary.showHint('❌ 保存失败：画布数据无法序列化（可能存在循环引用）。请按 Ctrl+E 导出 JSON 排查。', 0);
            return;
        }

        if (result.reason === 'quota') {
            const usage = this._estimateUsage();
            const usedMB = usage === null ? '未知' : (usage / 1048576).toFixed(2);
            Debug.error('[Storage] 本地存储配额已满:', result.error);
            // 自动保存路径限频：首次立即常驻提示，之后每 5 分钟复述一次，既不刷屏也不失联
            const now = Date.now();
            if (silent && this._quotaWarned && now - this._lastQuotaHintAt < 5 * 60 * 1000) return;
            this._quotaWarned = true;
            this._lastQuotaHintAt = now;
            PageLibrary.showHint(
                `❌ 保存失败：本地存储空间不足（已用 ${usedMB}MB / 约 5MB），本次改动未保存。`
                + '请按 Ctrl+E 导出 JSON 备份后清理浏览器存储。',
                0
            );
            return;
        }

        // 存储不可用：无痕模式 / 隐私策略 / file:// 下被禁用
        Debug.error('[Storage] 本地存储不可用:', result.error);
        PageLibrary.showHint(
            '❌ 保存失败：浏览器拒绝了本地存储写入（无痕模式或存储被禁用）。本次改动未保存，请改用 Ctrl+E 导出 JSON。',
            0
        );
    },

    // 保存到 localStorage
    async save() {
        const payload = await this._buildPayload();
        const result = this._writeCanvas(payload);

        if (result.ok) {
            PageLibrary.showHint('✅ 保存成功！' + this._quotaAdvice());
            Debug.log('画布数据已保存:', payload);
        } else {
            this._reportSaveFailure(result, { silent: false });
            // 用户主动点了保存却没存上，弹窗兜底，不能只靠一条 toast
            alert('保存失败：' + (result.error?.message || '未知错误')
                + '\n\n本次改动尚未写入本地存储，请立即按 Ctrl+E 导出 JSON 备份。');
        }
        return result;
    },

    // 静默保存（不弹窗，用于自动保存；失败仍必须有可见反馈）
    async saveSilently() {
        const payload = await this._buildPayload();
        const result = this._writeCanvas(payload);

        if (result.ok) {
            Debug.log('自动保存成功:', new Date().toLocaleTimeString());
        } else {
            this._reportSaveFailure(result, { silent: true });
        }
        return result;
    },

    // 同步兜底保存：卸载/切后台时使用。
    // 不做任何 await（fetch 在卸载时不可能返回），失败只能记日志，靠脏标记在下次进来时提示。
    saveSync() {
        if (!this.isDirty()) return { ok: true, skipped: true };
        const result = this._writeCanvas(this._buildPayloadSync());
        if (!result.ok) {
            Debug.error('[Storage] 兜底保存失败:', result.error);
        } else {
            Debug.log('[Storage] 兜底保存成功');
        }
        return result;
    },

    // 关闭标签页 / 切到后台时的兜底保存
    setupUnloadGuard() {
        if (this._unloadGuardBound) return;
        this._unloadGuardBound = true;

        const flush = () => {
            if (!this.isDirty()) return;
            Debug.log('[Storage] 触发兜底保存（关闭/切后台）');
            this.saveSync();
        };

        window.addEventListener('pagehide', flush);
        window.addEventListener('beforeunload', flush);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flush();
        });
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
        this.stopAutoSave(); // 防止重复注册
        this._autoSaveTimer = setInterval(() => {
            this.saveSilently();
            this.updateSaveIndicator(); // 刷新"未保存 N 分钟"计数
        }, 60000); // 60000毫秒 = 1分钟

        Debug.log('✅ 自动保存已启动，每1分钟保存一次');
    },

    // 停止自动保存（清空缓存前必须调用，否则内存中的画布会被下一轮定时器原样写回）
    stopAutoSave() {
        if (!this._autoSaveTimer) return false;
        clearInterval(this._autoSaveTimer);
        this._autoSaveTimer = null;
        Debug.log('⏹ 自动保存已停止');
        return true;
    },

    // 刷新顶栏的保存状态指示器
    updateSaveIndicator() {
        const el = document.getElementById('saveStateIndicator');
        if (!el) return;

        let text = '';
        let cls = '';

        if (this.lastSaveError) {
            text = this.lastSaveError.reason === 'quota' ? '保存失败:存储空间不足'
                : (this.lastSaveError.reason === 'serialize' ? '保存失败:数据异常' : '保存失败:存储不可用');
            cls = 'error';
        } else if (this.isDirty()) {
            const sec = Math.round((Date.now() - this.dirtySince) / 1000);
            text = sec >= 60 ? `未保存 ${Math.floor(sec / 60)} 分钟` : '未保存';
            cls = 'dirty';
        } else if (this.lastSaveAt) {
            text = `已保存 ${new Date(this.lastSaveAt).toLocaleTimeString('zh-CN', { hour12: false })}`;
            cls = 'ok';
        }

        el.textContent = text;
        el.className = 'save-state' + (cls ? ` save-state-${cls}` : '');
    },

    // 数据损坏时保留现场
    // 修复前这里只 Debug.error：解析失败 → 画布显示为空 → 用户以为本来就空 →
    // 60 秒后自动保存把空画布覆盖写回 → 原始数据被彻底销毁。
    _quarantineCorrupt(raw, error) {
        try {
            const backupKey = `${this.STORAGE_KEY}.corrupt.${Date.now()}`;
            localStorage.setItem(backupKey, raw);
            Debug.error(`[Storage] 画布数据解析失败，原始内容已备份到 "${backupKey}"`, error);
            PageLibrary.showHint(
                `❌ 上次保存的画布数据无法解析，已将原始内容备份到 localStorage 键 "${backupKey}"。`
                + '本次以空画布启动，请勿直接覆盖，优先从 JSON 备份恢复。',
                0
            );
        } catch (e) {
            Debug.error('[Storage] 数据损坏且备份失败:', error, e);
            PageLibrary.showHint('❌ 上次保存的画布数据无法解析，且备份失败。请检查浏览器存储权限。', 0);
        }
    },

    // 自动加载（页面加载时）
    loadAuto() {
        let saved;
        try {
            saved = localStorage.getItem(this.STORAGE_KEY);
        } catch (error) {
            Debug.error('读取本地存储失败:', error);
            PageLibrary.showHint('❌ 无法读取本地存储（浏览器可能禁用了存储）。请使用 Ctrl+E 导出 JSON 保存工作。', 0);
            return;
        }
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            // 直接加载,不询问用户
            this.loadData(data);

            // 检测到缓存加载后,补充当前状态到历史栈
            if (ElementManager.state.elements.length > 0) {
                HistoryManager.saveState();
                // 只是恢复到"已保存"的状态，不应被算作新的未保存改动
                this.clearDirty();
                Debug.log('💾 检测到缓存加载,已补充当前状态到历史栈');
            }

            PageLibrary.showHint('✅ 已恢复上次的画布');
            Debug.log('自动加载完成:', data);
        } catch (error) {
            // 关键：备份原始内容，并交给 PageManager.init() 建一个空白页启动，
            // 不能让损坏数据被当成"空画布"再被自动保存覆盖
            Debug.error('自动加载失败:', error);
            this._quarantineCorrupt(saved, error);
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

    // 本框架会写入的全部 localStorage 键
    // 画布数据/界面状态随 projectName 派生；其余是框架级全局键，
    // 既然按钮叫"清空浏览器缓存"，这些由本项目产生的本地状态也必须一并清除，
    // 否则清完还会残留半套状态（侧边栏折叠、主题、菜单展开……）。
    // 注意：prototypeDebug 不在列表内 —— 那是开发者开关，不是项目数据。
    getManagedKeys() {
        return [
            this.STORAGE_KEY,
            this.UI_STATE_KEY,
            'canvasEditor_theme',
            'sidebarMenuExpanded',
            'topbar_fullscreen',
            'prototypeFullscreenState',
            'prototype_open_tabs',
            // 历史遗留键名也要顺手清掉，否则 migrateLegacyKeys 会在下次启动把它们搬回来
            ...this.LEGACY_KEYS.flatMap(l => [l.data, l.ui].filter(Boolean)),
        ];
    },

    // 清空浏览器缓存
    clearBrowserCache() {
        ModalManager.showConfirm(
            '确定要清空浏览器缓存吗?\n\n'
            + '将删除本项目的全部本地数据：\n'
            + '· 画布数据（页面布局、箭头、批注）\n'
            + '· 界面状态（侧边栏折叠、主题、菜单展开、全屏状态）\n\n'
            + '此操作不可恢复！建议先按 Ctrl+E 导出 JSON 备份。',
            '清空浏览器缓存',
            () => {
                // 1) 必须先停掉自动保存。
                //    否则定时器会在下一轮用内存里的 PageManager.pages 把画布原样写回，
                //    用户看到的现象就是"明明清空了，刷新一下画布又回来了"。
                this.stopAutoSave();

                const existed = [];
                try {
                    [...new Set(this.getManagedKeys())].forEach(key => {
                        if (localStorage.getItem(key) !== null) {
                            existed.push(key);
                            localStorage.removeItem(key);
                        }
                    });
                } catch (error) {
                    Debug.error('[Storage] 清空缓存失败:', error);
                    PageLibrary.showHint('❌ 清空失败：浏览器拒绝了本地存储访问。', 0);
                    return;
                }

                if (existed.length === 0) {
                    PageLibrary.showHint('ℹ️ 没有可清理的本地数据。');
                    return;
                }

                // 2) 清空内存态，保证下一次保存不会把画布写回去
                PageManager.resetToEmpty();
                this.clearDirty();
                this.lastSaveAt = null;
                this.lastSaveError = null;

                Debug.log('[Storage] 已清空以下键:', existed);
                PageLibrary.showHint(
                    `✅ 已清空 ${existed.length} 项本地数据（画布数据 + 全部界面状态）。刷新页面后完全生效。`,
                    0
                );
            }
        );
    }
};