/**
 * prototype-components.js - 原型页面通用交互组件
 * 1. 假标签栏（多页面标签）
 * 2. 通用弹框（新增/编辑/删除确认/详情等）
 */
(function () {
    'use strict';

    // 页面标题 → 本页标识。
    // 仅用于按标题索引写法（PROTO_FORM 的形态②）与实体名兜底推断；
    // 形态①的表单定义根本不需要它。
    // 后缀优先按 PROJECT_CONFIG.projectName 精确截断（config.js 通常不在独立页里加载，
    // 此时退化为「截掉结尾的 ' - 任意段'」）。不再写死项目名：
    // 一旦改名，写死的截断就会失配，表单静默降级为猜测 <th>，且不报任何错。
    function getPageTitleKey() {
        const title = document.title.trim();
        const name = (window.PROJECT_CONFIG || {}).projectName;
        if (name) {
            const suffix = ' - ' + name;
            if (title.endsWith(suffix)) return title.slice(0, -suffix.length).trim();
        }
        // 兜底：截掉最后一个 ' - xxx' 段（页面名本身不含 ' - '）。
        // ⚠️ projectName 不匹配时也必须走这里 —— 原先此处直接返回整串，
        //    于是「标题后缀还是旧项目名」的页面能查到字段、却会被守卫插件判成键失配，
        //    而插件给出的修法（把键改成完整标题）会把本来能跑的页面改坏。
        const idx = title.lastIndexOf(' - ');
        return (idx > 0) ? title.slice(0, idx).trim() : title;
    }

    /**
     * HTML 文本/属性转义。
     *
     * 弹窗里的一切动态内容都来自表格单元格的真实文本与 PROTO_FORM 配置，
     * 一律经此函数后再拼进 innerHTML。不转义时后果有二，都已实测：
     *   ① 值里含英文双引号 → 属性被截断，回填静默丢字（"规格 15" 显示器 → "规格 15"）
     *   ② 值里含尖括号 → 生成带事件处理器的活元素，且 onerror/onfocus 确实会执行
     */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 判断某个单元格是不是「操作列」。
     *
     * 早先的两种做法都会误伤真实数据：
     *   · 按文本过滤（text.includes('修改'|'删除'|'详情'|'更多')）→ 备注写「请修改收货地址」就被丢
     *   · 按表头过滤（header.includes('操作')）→ 「操作人」这种正常业务列被当成操作列丢弃
     * 现在只认两种：表头恰好是「操作」，或单元格内含按钮且按钮文案像操作动词。
     * 纯数据单元格（即使文案含"修改"）永远不会被跳过。
     */
    function isActionCell(header, cell) {
        if (header && header.trim() === '操作') return true;
        if (!cell.querySelector('button')) return false;
        return /修改|编辑|删除|详情|查看|更多|启用|停用/.test(cell.textContent);
    }

    /**
     * 读取页面自带的表单定义。
     *
     * 页面在加载 prototype-components.js 之前写这两种形态之一都能生效：
     *   ① 直接就是本页的表单（推荐，键可由 <title> 推导，不必重复写）
     *      window.PROTO_FORM = { entityName: "用户", fields: [...] };
     *   ② 按标题索引（一页一个表单时不必用；批量生成时更省事）
     *      window.PROTO_FORM = { "用户管理": { entityName, fields } };
     *
     * 两种都接受，是为了少一类「键写错 → 静默降级成猜测字段」的情况。
     */
    function getProtoForm() {
        const pf = window.PROTO_FORM;
        if (!pf || typeof pf !== 'object') return null;
        if (Array.isArray(pf.fields)) return pf;          // 形态 ①
        const hit = pf[getPageTitleKey()];                // 形态 ②
        return (hit && typeof hit === 'object') ? hit : null;
    }

    // ========== 标签栏 ==========
    const TabBar = {
        storageKey: 'prototype_open_tabs',
        init() {
            this.render();
        },
        getTabs() {
            // 从页面标题推断当前页面
            const title = getPageTitleKey();
            const currentPath = window.location.pathname;

            // 默认标签列表
            const tabs = [
                { name: '首页', path: this.getHomePage(), active: title === '首页' }
            ];

            // 如果不是首页，添加当前页面
            if (title !== '首页') {
                tabs.push({ name: title, path: currentPath, active: true });
                tabs[0].active = false;
            }

            // 添加一些假的常用标签
            const fakeTabs = [
                { name: '用户管理', path: 'system/user.html' },
                { name: '角色管理', path: 'system/role.html' },
                { name: '菜单管理', path: 'system/menu.html' }
            ];

            // 只添加不是当前页面的假标签
            fakeTabs.forEach(ft => {
                if (ft.name !== title) {
                    tabs.push({ name: ft.name, path: ft.path, active: false });
                }
            });

            return tabs;
        },
        getHomePage() {
            const currentPath = window.location.pathname;
            const pagesIndex = currentPath.indexOf('/pages/');
            if (pagesIndex !== -1) {
                const depth = currentPath.substring(pagesIndex + 7).split('/').length - 1;
                return '../'.repeat(depth) + 'home.html';
            }
            return 'pages/home.html';
        },
        resolvePath(path) {
            if (path.startsWith('http') || path.startsWith('/')) return path;
            const currentPath = window.location.pathname;
            const pagesIndex = currentPath.indexOf('/pages/');
            if (pagesIndex === -1) return path;
            const depth = currentPath.substring(pagesIndex + 7).split('/').length - 1;
            const prefix = '../'.repeat(depth);
            if (path.startsWith('../')) return path;
            return prefix + path;
        },
        render() {
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) return;

            // 检查是否已有标签栏
            if (mainContent.querySelector('.proto-tabs-bar')) return;

            const tabs = this.getTabs();
            const bar = document.createElement('div');
            bar.className = 'proto-tabs-bar';

            tabs.forEach(tab => {
                const item = document.createElement('div');
                item.className = 'proto-tab-item' + (tab.active ? ' active' : '');
                item.innerHTML = `<span>${tab.name}</span>` +
                    (!tab.active || tab.name !== '首页' ? '<span class="proto-tab-close"><i class="fas fa-times"></i></span>' : '');

                if (!tab.active) {
                    item.addEventListener('click', () => {
                        window.location.href = this.resolvePath(tab.path);
                    });
                }

                // 关闭按钮
                const closeBtn = item.querySelector('.proto-tab-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        item.remove();
                    });
                }

                bar.appendChild(item);
            });

            mainContent.insertBefore(bar, mainContent.firstChild);
        }
    };

    // ========== 通用弹框 ==========
    const Dialog = {
        overlay: null,

        // 显示弹框
        show(options) {
            const { title = '弹框', width = '520px', content = '', onConfirm, confirmText = '确 定', cancelText = '取 消', hideCancel = false } = options;

            this.remove();

            // 遮罩层
            this.overlay = document.createElement('div');
            this.overlay.className = 'proto-dialog-overlay';
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.remove();
            });

            // 弹框
            const dialog = document.createElement('div');
            dialog.className = 'proto-dialog';
            dialog.style.width = width;

            // 头部
            dialog.innerHTML = `
                <div class="proto-dialog-header">
                    <span class="proto-dialog-title">${title}</span>
                    <button class="proto-dialog-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="proto-dialog-body">${content}</div>
                <div class="proto-dialog-footer">
                    ${!hideCancel ? '<button class="proto-btn proto-btn-default proto-dialog-cancel">' + cancelText + '</button>' : ''}
                    <button class="proto-btn proto-btn-primary proto-dialog-confirm">${confirmText}</button>
                </div>
            `;

            this.overlay.appendChild(dialog);
            document.body.appendChild(this.overlay);

            // 绑定事件
            dialog.querySelector('.proto-dialog-close').addEventListener('click', () => this.remove());
            dialog.querySelector('.proto-dialog-cancel')?.addEventListener('click', () => this.remove());
            dialog.querySelector('.proto-dialog-confirm').addEventListener('click', () => {
                if (onConfirm) onConfirm();
                this.remove();
            });

            // ESC 关闭
            this._escHandler = (e) => { if (e.key === 'Escape') this.remove(); };
            document.addEventListener('keydown', this._escHandler);
        },

        // 删除弹框
        remove() {
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
            }
            if (this._escHandler) {
                document.removeEventListener('keydown', this._escHandler);
                this._escHandler = null;
            }
        },

        // 确认框
        confirm(message, onConfirm) {
            this.show({
                title: '提示',
                width: '420px',
                content: `<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;">
                    <i class="fas fa-exclamation-circle" style="color:#e6a23c;font-size:20px;margin-top:2px;"></i>
                    <div style="font-size:14px;color:#606266;line-height:1.6;">${message}</div>
                </div>`,
                confirmText: '确 定',
                cancelText: '取 消',
                onConfirm
            });
        },

        // 成功提示
        success(message) {
            this.show({
                title: '成功',
                width: '360px',
                content: `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;">
                    <i class="fas fa-check-circle" style="color:#67c23a;font-size:20px;"></i>
                    <div style="font-size:14px;color:#606266;">${message}</div>
                </div>`,
                confirmText: '确 定',
                hideCancel: true
            });
        },

        // 新增/编辑表单弹框
        form(options) {
            const { title = '新增', fields = [], data = null } = options;
            const safeFields = Array.isArray(fields) ? fields : [];
            let formHtml = '<div class="proto-form">';

            safeFields.forEach((field, fi) => {
                // 字段项来自页面配置，容错：null / 非对象直接跳过。
                // 此前不做判空，fields 里混进一个 null 就会在读 .required 时抛
                // 未捕获 TypeError —— 弹窗根本打不开，控制台只留一条红字。
                if (!field || typeof field !== 'object') return;

                const label = esc(field.label);
                const required = field.required ? '<span style="color:#f56c6c;">*</span>' : '';

                // 回填取值：先判「有没有这个键」再取值。
                // 两种老写法都会出错：
                //   · 真值判断 data[label] ? … : ''  → 数字 0、布尔 false 被吞成空
                //   · 直接 data[label]              → 键名命中原型链时把函数源码灌进输入框
                const has = !!data && Object.prototype.hasOwnProperty.call(data, field.label);
                const raw = has ? data[field.label] : '';
                const fieldValue = raw == null ? '' : String(raw);

                if (field.type === 'select') {
                    const optionsHtml = (field.options || []).map(o =>
                        `<option value="${esc(o)}"${fieldValue === String(o) ? ' selected' : ''}>${esc(o)}</option>`
                    ).join('');
                    formHtml += `
                        <div class="proto-form-item">
                            <label>${required}${label}</label>
                            <select class="proto-form-select"><option value="">请选择</option>${optionsHtml}</select>
                        </div>`;
                } else if (field.type === 'textarea') {
                    formHtml += `
                        <div class="proto-form-item">
                            <label>${required}${label}</label>
                            <textarea class="proto-form-textarea" rows="3" placeholder="请输入${label}">${esc(fieldValue)}</textarea>
                        </div>`;
                } else if (field.type === 'date') {
                    formHtml += `
                        <div class="proto-form-item">
                            <label>${required}${label}</label>
                            <input type="date" class="proto-form-input" value="${esc(fieldValue)}" placeholder="请选择${label}">
                        </div>`;
                } else if (field.type === 'number') {
                    formHtml += `
                        <div class="proto-form-item">
                            <label>${required}${label}</label>
                            <input type="number" class="proto-form-input" value="${esc(fieldValue)}" placeholder="请输入${label}">
                        </div>`;
                } else if (field.type === 'radio' || field.type === 'checkbox') {
                    // radio / checkbox：此前一律落进最后的 else，被渲染成普通文本框
                    // （旧词表里 81 个 radio 字段、涉及 59 个实体全部中招）。
                    // 只有带 options 才画选项组；配置漏写 options 时给出可用的退化形态。
                    const isRadio = field.type === 'radio';
                    const opts = Array.isArray(field.options) ? field.options : [];

                    let controlHtml;
                    if (opts.length) {
                        // 用字段序号而不是 label 当分组名：label 是自由文本，可能含引号或空格
                        const groupName = `proto-field-${fi}`;
                        // 回填：radio 比单个字符串；checkbox 接受数组或单个字符串
                        const raw = has ? data[field.label] : '';
                        const picked = (Array.isArray(raw) ? raw : [raw]).map(v => String(v));
                        controlHtml = '<div class="proto-form-checks">' + opts.map(o =>
                            `<label class="proto-form-check">` +
                            `<input type="${isRadio ? 'radio' : 'checkbox'}" name="${groupName}" value="${esc(o)}"` +
                            `${picked.includes(String(o)) ? ' checked' : ''}> ${esc(o)}` +
                            `</label>`
                        ).join('') + '</div>';
                    } else if (isRadio) {
                        // 没有选项的 radio 无从选择，退化为文本框
                        controlHtml = `<input type="text" class="proto-form-input" value="${esc(fieldValue)}" placeholder="请输入${label}">`;
                    } else {
                        // 只有一个勾选框时不重复字段名 —— 外层 label 已经写了一遍
                        controlHtml = `<input type="checkbox" class="proto-form-check" ${fieldValue ? 'checked' : ''}>`;
                    }

                    formHtml += `
                        <div class="proto-form-item">
                            <label>${required}${label}</label>
                            ${controlHtml}
                        </div>`;
                } else {
                    // 其余（含未写 type 的字段）一律文本框
                    formHtml += `
                        <div class="proto-form-item">
                            <label>${required}${label}</label>
                            <input type="text" class="proto-form-input" value="${esc(fieldValue)}" placeholder="请输入${label}">
                        </div>`;
                }
            });
            formHtml += '</div>';

            this.show({
                title,
                width: options.width || '520px',
                content: formHtml,
                confirmText: '确 定',
                cancelText: '取 消',
                onConfirm: options.onConfirm
            });
        }
    };

    // ========== 按钮交互增强 ==========
    const ButtonEnhancer = {
        init() {
            this.enhanceButtons();
        },

        enhanceButtons() {
            // 新增按钮
            document.querySelectorAll('.btn-primary').forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('新增') || text.includes('新建') || text.includes('添加')) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.handleAdd(btn);
                    });
                }
            });

            // 删除按钮
            document.querySelectorAll('.btn-danger, .btn-text.danger').forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('删除')) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        Dialog.confirm('确定要删除选中的数据吗？', () => {
                            Dialog.success('删除成功');
                        });
                    });
                }
            });

            // 导出按钮
            document.querySelectorAll('.btn-success').forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('导出')) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        Dialog.success('导出成功');
                    });
                }
            });

            // 导入按钮
            document.querySelectorAll('.btn-warning').forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('导入')) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.handleImport(btn);
                    });
                }
            });

            // 修改/编辑按钮
            document.querySelectorAll('.btn-text').forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('修改') || text.includes('编辑')) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.handleEdit(btn);
                    });
                }
            });

            // 详情按钮
            document.querySelectorAll('.btn-text').forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('详情') || text.includes('查看')) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.handleDetail(btn);
                    });
                }
            });

            // 重置按钮
            document.querySelectorAll('.btn').forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('重置')) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        btn.closest('.search-card, .search-row')?.querySelectorAll('input, select').forEach(input => {
                            if (input.type === 'text' || input.type === 'date') input.value = '';
                            else if (input.tagName === 'SELECT') input.selectedIndex = 0;
                        });
                    });
                }
            });

            // 搜索按钮 - 简单模拟
            document.querySelectorAll('.btn-primary').forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('搜索')) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        // 视觉反馈
                        const icon = btn.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-spinner fa-spin';
                            setTimeout(() => { icon.className = 'fas fa-search'; }, 800);
                        }
                    });
                }
            });

            // 状态开关
            document.querySelectorAll('.status-switch input').forEach(sw => {
                sw.addEventListener('change', () => {
                    const state = sw.checked ? '开启' : '关闭';
                    const entityName = this.getEntityName();
                    Dialog.confirm(`确定要${state}${esc(entityName)}吗？`, () => {
                        Dialog.success(`已${state}`);
                    });
                });
            });

            // "更多"下拉菜单按钮
            document.querySelectorAll('.dropdown > .btn-text, .dropdown > button').forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('更多')) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const menu = btn.nextElementSibling || btn.parentElement.querySelector('.dropdown-menu');
                        if (menu) {
                            // 关闭其他菜单
                            document.querySelectorAll('.dropdown-menu').forEach(m => {
                                if (m !== menu) m.style.display = 'none';
                            });
                            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                        }
                    });
                }
            });

            // 点击页面其他地方关闭所有下拉菜单
            document.addEventListener('click', () => {
                document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
            });

            // 处理下拉菜单中的操作项
            document.querySelectorAll('.dropdown-menu a, .dropdown-menu .dropdown-item').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const text = link.textContent.trim();
                    const row = link.closest('tr');

                    if (text.includes('删除')) {
                        Dialog.confirm('确定要删除吗？', () => Dialog.success('删除成功'));
                    } else if (text.includes('重置密码')) {
                        Dialog.form({
                            title: '重置密码',
                            fields: [{ label: '新密码', required: true, type: 'input' }],
                            onConfirm: () => Dialog.success('密码重置成功')
                        });
                    } else if (text.includes('分配角色')) {
                        Dialog.form({
                            title: '分配角色',
                            fields: [{ label: '角色', type: 'select', options: ['超级管理员', '普通角色', '租户管理员'] }],
                            onConfirm: () => Dialog.success('分配成功')
                        });
                    } else {
                        Dialog.success(`${esc(text)}操作成功`);
                    }

                    // 关闭菜单
                    link.closest('.dropdown-menu').style.display = 'none';
                });
            });
        },

        // 处理导入按钮
        handleImport(btn) {
            Dialog.show({
                title: '导入',
                width: '480px',
                content: `
                    <div class="proto-upload">
                        <div class="proto-upload-area">
                            <i class="fas fa-cloud-upload-alt" style="font-size:40px;color:#c0c4cc;"></i>
                            <p>将文件拖到此处，或 <em>点击上传</em></p>
                            <input type="file" style="display:none" accept=".xlsx,.xls">
                        </div>
                        <div style="margin-top:12px;font-size:13px;color:#606266;">
                            <a href="#" style="color:#409eff;">下载模板</a>
                        </div>
                    </div>`,
                confirmText: '确 定',
                onConfirm: () => {
                    Dialog.success('导入成功');
                }
            });
        },

        // 根据页面标题生成表单字段
        getPageFields(table) {
            // 1. 页面自带的表单定义 —— 最高优先级
            //    表格是这一页的、表单也是这一页的，同源写就才不会张冠李戴
            //    （预置词表里的字段名经常和本页表头对不上，回填会静默变空）
            const protoForm = getProtoForm();
            if (protoForm && Array.isArray(protoForm.fields)) {
                if (!protoForm.fields.length) {
                    // 显式空数组：按「本表单不要字段」处理，同时留痕，
                    // 否则它与「压根没写 PROTO_FORM」完全无法区分，静默降级无从排查。
                    Debug.warn('PROTO_FORM.fields 是空数组，按「本表单无字段」处理');
                    return [];
                }
                return protoForm.fields;
            }

            // 2. 从当前表的 <th> 表头自动推断（必须限定在本表，否则多表页面字段会串味）
            const autoFields = this.inferFieldsFromHeaders(table);
            if (autoFields.length > 0) return autoFields;

            // 3. 兜底通用字段
            const defaultFields = [
                { label: '名称', required: true },
                { label: '编码' },
                { label: '排序', required: true },
                { label: '状态', type: 'select', options: ['开启', '关闭'] },
                { label: '备注', type: 'textarea' }
            ];

            return defaultFields;
        },

        // 从当前表的 <th> 表头自动推断字段
        inferFieldsFromHeaders(table) {
            const headers = this.getTableHeaders(table);
            if (!headers || headers.length === 0) return [];

            const fields = [];
            const seenLabels = new Set();

            for (const header of headers) {
                if (!header || header === '操作') continue;
                // 编号 / ID / 创建人 / 更新时间 这类系统列不进表单
                if (header.includes('编号') || header.includes('ID') ||
                    header.includes('创建人') || header.includes('更新时间')) {
                    continue;
                }
                // ⚠️ 「创建时间 / 更新日期」这类由系统生成的列也跳过，
                //    但不能把含「时间/日期」的所有列一律跳过 —— 那会让下面第 620 行
                //    的 date 推断成为永不可达的死代码（实测「下单日期」整列从表单消失）。
                if ((header.includes('时间') || header.includes('日期')) &&
                    (header.includes('创建') || header.includes('更新'))) {
                    continue;
                }

                // 避免重复字段
                if (seenLabels.has(header)) continue;
                seenLabels.add(header);

                let type = 'input';
                if (header.includes('状态')) {
                    type = 'select';
                } else if (header.includes('备注') || header.includes('描述') || header.includes('内容')) {
                    type = 'textarea';
                } else if (header.includes('时间') || header.includes('日期')) {
                    type = 'date';
                }

                const field = { label: header, type };

                // 名称、编码类字段通常必填
                if (header.includes('名称') || header.includes('编码')) {
                    field.required = true;
                }

                // 状态字段添加选项
                if (header.includes('状态')) {
                    field.options = ['开启', '关闭'];
                }

                fields.push(field);
            }

            // 如果推断不出字段，返回空数组（使用兜底）
            return fields;
        },

        /**
         * 从 DOM 提取表头（仅用于「按 <th> 猜字段」这条兜底路径）。
         *
         * @param {Element} [table] 限定在某张表内取表头。
         *   ⚠️ 必须传：此前扫的是整个 document，同页有两张表时，
         *      A 表与 B 表点「修改」弹出的表单字段会一模一样（实测 12 个字段横跨 5 张表）。
         *
         * 这份列表【不能】用于把单元格对齐到字段：它会滤掉空表头（checkbox 列）
         * 与「操作」列，与单元格的位置差着 1~2 列。凡是按位置对齐的场景请用 getAlignedHeaders()。
         */
        getTableHeaders(table) {
            const root = table || document;
            const ths = root.querySelectorAll('table thead th, thead th');
            const headers = [];
            ths.forEach(th => {
                if (th.querySelector('input[type=checkbox]')) return;
                const text = th.textContent.trim();
                if (text && text !== '操作') {
                    headers.push(text);
                }
            });

            return headers;
        },

        /** 找出某个按钮所在区域里的主表格（新增按钮通常在工具栏，不在行内） */
        getNearestTable(el) {
            if (!el) return document.querySelector('table');
            return el.closest('table') ||
                   (el.closest('.main-content') || document).querySelector('table') ||
                   document.querySelector('table');
        },

        // 获取实体名称（用于提示文案）
        getEntityName() {
            // 1. 页面自带
            const protoForm = getProtoForm();
            if (protoForm && protoForm.entityName) return protoForm.entityName;

            // 2. 从标题推断（去掉"管理"后缀）
            const title = getPageTitleKey();
            return title.replace(/管理$/, '') || title || '该项';
        },

        handleAdd(btn) {
            const fields = this.getPageFields(this.getNearestTable(btn));
            Dialog.form({
                title: '新增',
                fields,
                onConfirm: () => {
                    Dialog.success('新增成功');
                }
            });
        },

        handleEdit(btn) {
            const row = btn.closest('tr');
            const table = row ? row.closest('table') : this.getNearestTable(btn);

            if (!row) {
                Dialog.form({
                    title: '编辑',
                    fields: this.getPageFields(table),
                    onConfirm: () => Dialog.success('修改成功')
                });
                return;
            }

            const fields = this.getPageFields(table);
            const rowData = this.extractRowData(row);

            Dialog.form({
                title: '编辑',
                fields,
                data: rowData,
                onConfirm: () => {
                    Dialog.success('修改成功');
                }
            });
        },

        // 取与某个表格行的列位置严格对齐的表头数组。
        //
        // 不能用 getTableHeaders()：那份会滤掉空表头（checkbox 列）与「操作」列，
        // 而单元格是按位置索引的。两份基准不同就会整体错开一列——
        // 详情与编辑回填曾把「用户编号」显示成「用户名称」。
        // 凡是需要「第 N 格 ↔ 第 N 个字段」的场景，都必须用这一份。
        //
        // 必须正确处理三种表格形态（都实测过会错位）：
        //   ① 多层表头 + colspan/rowspan —— 分组标题不承载字段，
        //      取「最下层」占据该列的那个 th；被 rowspan 占住的位置要留空让后面的 th 补位
        //   ② 表头单元格带 checkbox —— 记空串（它不对应任何字段）
        //   ③ tbody 首格是 <th scope="row"> —— 数据侧也要按同样方式取格子
        getAlignedHeaders(row) {
            const table = row && row.closest ? row.closest('table') : null;
            if (!table) return [];

            const headRows = Array.from(table.querySelectorAll('thead tr'));
            if (!headRows.length) return [];

            // 先把表头铺成 grid[r][c]，横向按 colspan 展开、纵向按 rowspan 占位
            const grid = [];
            headRows.forEach((tr, r) => {
                grid[r] = grid[r] || [];
                let c = 0;
                for (const th of Array.from(tr.querySelectorAll('th'))) {
                    while (grid[r][c] !== undefined) c++;      // 让开被上一行 rowspan 占住的格
                    const text = th.querySelector('input[type=checkbox]') ? '' : th.textContent.trim();
                    const cs = Math.max(1, parseInt(th.getAttribute('colspan'), 10) || 1);
                    const rs = Math.max(1, parseInt(th.getAttribute('rowspan'), 10) || 1);
                    for (let i = 0; i < cs; i++) {
                        for (let j = 0; j < rs; j++) {
                            grid[r + j] = grid[r + j] || [];
                            // rowspan/colspan 的上、左部分保持空，只在最下一层写文字
                            grid[r + j][c + i] = (j === rs - 1) ? text : undefined;
                        }
                    }
                    c += cs;
                }
            });

            // 每列取「最下层」的非空表头 —— 分组标题因此不会泄漏成字段名
            const width = grid.reduce((m, r) => Math.max(m, r.length), 0);
            const out = [];
            for (let c = 0; c < width; c++) {
                let v = '';
                for (let r = grid.length - 1; r >= 0; r--) {
                    if (grid[r] && grid[r][c] !== undefined) { v = grid[r][c]; break; }
                }
                out.push(v);
            }
            return out;
        },

        // 取与表头等长的单元格数组（含 tbody 里的 th，colspan 也展开）
        getAlignedCells(row) {
            const out = [];
            for (const cell of Array.from(row.querySelectorAll('td, th'))) {
                const cs = Math.max(1, parseInt(cell.getAttribute('colspan'), 10) || 1);
                out.push(cell);
                for (let i = 1; i < cs; i++) out.push(null);   // 被合并掉的列没有独立取值
            }
            return out;
        },

        // 从表格行提取数据（编辑回填的数据源）
        extractRowData(row) {
            const headers = this.getAlignedHeaders(row);
            const cells = this.getAlignedCells(row);
            const data = {};

            cells.forEach((cell, index) => {
                if (index >= headers.length) return;
                const header = headers[index];
                // 空表头 = checkbox 列
                if (!header) return;
                // 操作列：只认表头恰为「操作」，或格内确实是按钮 —— 见 isActionCell()
                if (isActionCell(header, cell)) return;
                if (!cell) return;

                const text = cell.textContent.trim();
                if (!text) return;

                data[header] = text;
            });

            return data;
        },

        handleDetail(btn) {
            const row = btn.closest('tr');
            if (!row) return;
            const headers = this.getAlignedHeaders(row);
            const cells = this.getAlignedCells(row);

            let detailHtml = '<div class="proto-detail-grid">';
            cells.forEach((cell, index) => {
                if (index >= headers.length) return;
                const headerText = headers[index];
                // 空表头 = checkbox 列
                if (!headerText) return;
                if (!cell) return;
                // 操作列：与 extractRowData 同一套判定，避免两处口径不一致
                if (isActionCell(headerText, cell)) return;
                if (cell.querySelector('input[type=checkbox]')) return;

                const value = cell.textContent.trim();
                if (!value) return;

                // ⚠️ 必须转义：此处曾把单元格原文直接拼进 innerHTML，
                // 实测一个 <img src=x onerror=…> 的文本会变成带事件处理器的真元素并执行。
                detailHtml += `
                    <div class="proto-detail-item">
                        <span class="proto-detail-label">${esc(headerText)}</span>
                        <span class="proto-detail-value">${esc(value)}</span>
                    </div>`;
            });
            detailHtml += '</div>';

            Dialog.show({
                title: '详情',
                width: '600px',
                content: detailHtml,
                hideCancel: true,
                confirmText: '关 闭'
            });
        }
    };

    // ========== 注入样式 ==========
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 标签栏 */
            .proto-tabs-bar {
                display: flex;
                align-items: center;
                background: #fff;
                border-radius: 4px;
                padding: 4px 8px;
                margin-bottom: 12px;
                gap: 4px;
                overflow-x: auto;
                flex-shrink: 0;
            }
            .proto-tab-item {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 6px 14px;
                border-radius: 3px;
                font-size: 12px;
                cursor: pointer;
                color: #606266;
                white-space: nowrap;
                transition: all 0.15s;
                border: 1px solid #dcdfe6;
                background: #fff;
            }
            .proto-tab-item:hover { background: #f5f5f5; color: #409eff; border-color: #c6e2ff; }
            .proto-tab-item.active { background: #409eff; color: #fff; border-color: #409eff; }
            .proto-tab-item.active:hover { background: #66b1ff; }
            .proto-tab-close {
                font-size: 10px;
                opacity: 0;
                margin-left: 4px;
                transition: opacity 0.15s;
                cursor: pointer;
            }
            .proto-tab-item:hover .proto-tab-close { opacity: 0.7; }
            .proto-tab-close:hover { opacity: 1 !important; }

            /* 弹框 */
            .proto-dialog-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.45);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: proto-fade-in 0.2s ease;
            }
            @keyframes proto-fade-in { from { opacity: 0; } to { opacity: 1; } }
            .proto-dialog {
                background: #fff;
                border-radius: 6px;
                box-shadow: 0 4px 24px rgba(0,0,0,0.15);
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                animation: proto-slide-down 0.2s ease;
            }
            @keyframes proto-slide-down { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .proto-dialog-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 20px;
                border-bottom: 1px solid #ebeef5;
            }
            .proto-dialog-title { font-size: 16px; font-weight: 600; color: #303133; }
            .proto-dialog-close {
                background: none;
                border: none;
                font-size: 16px;
                color: #909399;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
            }
            .proto-dialog-close:hover { background: #f5f5f5; color: #606266; }
            .proto-dialog-body { padding: 20px; overflow-y: auto; flex: 1; }
            .proto-dialog-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 12px 20px;
                border-top: 1px solid #ebeef5;
            }

            /* 按钮 */
            .proto-btn {
                padding: 8px 20px;
                border-radius: 4px;
                font-size: 13px;
                cursor: pointer;
                border: 1px solid #dcdfe6;
                transition: all 0.15s;
            }
            .proto-btn-primary { background: #409eff; border-color: #409eff; color: #fff; }
            .proto-btn-primary:hover { background: #66b1ff; border-color: #66b1ff; }
            .proto-btn-default { background: #fff; color: #606266; }
            .proto-btn-default:hover { border-color: #409eff; color: #409eff; }

            /* 表单 */
            .proto-form { display: flex; flex-direction: column; gap: 16px; }
            .proto-form-item { display: flex; align-items: flex-start; gap: 10px; }
            /* 必须用 > 而非后代选择器：选项组里的 label 也要被 .proto-form-check 接管，
               若用「.proto-form-item label」会连带命中它们，被强行拉成 80px 右对齐。 */
            .proto-form-item > label {
                width: 80px;
                text-align: right;
                font-size: 13px;
                color: #606266;
                padding-top: 8px;
                flex-shrink: 0;
            }
            .proto-form-checks { flex: 1; display: flex; flex-wrap: wrap; gap: 8px 18px; padding-top: 7px; }
            .proto-form-check {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                color: #606266;
                cursor: pointer;
                width: auto;
                text-align: left;
                padding-top: 0;
            }
            .proto-form-check input { margin: 0; cursor: pointer; accent-color: #409eff; }
            .proto-form-input, .proto-form-select, .proto-form-textarea {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #dcdfe6;
                border-radius: 4px;
                font-size: 13px;
                outline: none;
                transition: border-color 0.2s;
            }
            .proto-form-input:focus, .proto-form-select:focus, .proto-form-textarea:focus { border-color: #409eff; }
            .proto-form-textarea { resize: vertical; font-family: inherit; }

            /* 详情 */
            .proto-detail { display: flex; flex-direction: column; gap: 8px; }
            .proto-detail-item { padding: 8px 12px; background: #fafafa; border-radius: 4px; font-size: 13px; color: #606266; }
            .proto-detail-label { color: #303133; }

            /* 详情网格布局（字段名: 值） */
            .proto-detail-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px 16px;
            }
            .proto-detail-grid .proto-detail-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .proto-detail-value {
                color: #303133;
                font-weight: 500;
            }

            /* 导入弹窗 */
            .proto-upload {
                padding: 16px;
            }
            .proto-upload-area {
                border: 2px dashed #d9d9d9;
                border-radius: 6px;
                padding: 32px 16px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            .proto-upload-area:hover {
                border-color: #409eff;
                background: #f0f9ff;
            }
            .proto-upload-area i {
                margin-bottom: 12px;
            }
            .proto-upload-area p {
                margin: 0;
                font-size: 13px;
                color: #606266;
            }
            .proto-upload-area em {
                color: #409eff;
                font-style: normal;
            }
        `;
        document.head.appendChild(style);
    }

    // ========== Alt键iframe交互：接收父窗口消息 ==========
    const IframeMessageHandler = {
        init() {
            window.addEventListener('message', (event) => {
                const data = event.data;
                if (!data || typeof data !== 'object') return;

                // 处理滚动消息（来自画布编辑器的 Alt+滚轮）
                if (data.type === 'prototype-alt-scroll') {
                    const scrollTarget = document.scrollingElement || document.documentElement || document.body;
                    if (scrollTarget) {
                        scrollTarget.scrollTop += (data.deltaY || 0);
                        scrollTarget.scrollLeft += (data.deltaX || 0);
                    }
                }

                // 处理鼠标事件消息（来自画布编辑器的 Alt+点击/hover）
                if (data.type === 'prototype-alt-mouse') {
                    const x = data.x || 0;
                    const y = data.y || 0;
                    const target = document.elementFromPoint(x, y);
                    if (target) {
                        const eventInit = {
                            bubbles: true,
                            cancelable: true,
                            clientX: x,
                            clientY: y,
                            button: data.button || 0,
                            altKey: data.altKey || false,
                            ctrlKey: data.ctrlKey || false,
                            shiftKey: data.shiftKey || false
                        };
                        target.dispatchEvent(new MouseEvent(data.eventType || 'click', eventInit));
                    }
                }
            });

            // 预览模式下，Escape键通知父页面退出全屏预览
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    try {
                        window.parent.postMessage({ type: 'prototype-escape-preview' }, '*');
                    } catch (err) { /* ignore */ }
                }
            });
        }
    };

    // ========== 初始化 ==========
    document.addEventListener('DOMContentLoaded', function () {
        injectStyles();
        TabBar.init();
        ButtonEnhancer.init();
        IframeMessageHandler.init();
    });

    // 暴露给全局
    window.PrototypeDialog = Dialog;
    window.PrototypeTabBar = TabBar;
})();
