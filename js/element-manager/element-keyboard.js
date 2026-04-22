// 元素键盘事件和菜单模块
// 负责键盘快捷键和右键菜单功能

const ElementKeyboard = {
    // 设置键盘事件
    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Delete 键：删除选中元素
            if (e.key === 'Delete') {
                if (ElementManager.state.selectedElements.length > 0) {
                    const idsToDelete = [...ElementManager.state.selectedElements];
                    idsToDelete.forEach(id => ElementManager.deleteElement(id));
                    PageLibrary.showHint(`已删除 ${idsToDelete.length} 个元素`);
                } else if (ElementManager.state.selectedElement) {
                    ElementManager.deleteElement(ElementManager.state.selectedElement);
                }
            }

            // Esc 键：取消选择
            if (e.key === 'Escape') {
                ElementManager.deselectElement();
                Tools.setTool('select');
            }

            // 空格键：重置视图
            if ((e.code === 'Space' || e.key === ' ') &&
                !e.target.closest('.annotation-content-wrapper')) {
                e.preventDefault();
                CanvasView.zoomReset50();
            }

            // 工具切换快捷键
            if (!e.target.closest('.annotation-content-wrapper')) {
                if (e.key === '1' && !e.ctrlKey) {
                    Tools.setTool('select');
                } else if (e.key === '2' && !e.ctrlKey) {
                    Tools.setTool('arrow');
                } else if (e.key === '3' && !e.ctrlKey) {
                    Tools.setTool('annotation');
                }
            }
        });
    },

    // 显示右键菜单
    showContextMenu(x, y, element, iframe, pageInfo) {
        // 移除已存在的菜单
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        // 获取文件路径
        let filePath = '';
        if (pageInfo && pageInfo.filePath) {
            filePath = PageLibrary.getAbsolutePath(pageInfo.filePath);
        }

        // 复制文件路径菜单项
        const copyItem = document.createElement('div');
        copyItem.className = 'context-menu-item';
        copyItem.innerHTML = '<i class="fas fa-copy"></i><span>复制文件路径</span>';
        copyItem.addEventListener('click', () => {
            this.copyToClipboard(filePath);
            menu.remove();
        });
        menu.appendChild(copyItem);

        // 保存长截图菜单项
        if (pageInfo) {
            const screenshotItem = document.createElement('div');
            screenshotItem.className = 'context-menu-item';
            screenshotItem.innerHTML = '<i class="fas fa-camera"></i><span>保存长截图</span>';
            screenshotItem.addEventListener('click', () => {
                if (!iframe) {
                    this.capturePageLibraryScreenshot(pageInfo);
                } else {
                    this.captureIframeScreenshot(iframe, pageInfo);
                }
                menu.remove();
            });
            menu.appendChild(screenshotItem);
        }

        // 全屏显示菜单项
        if (iframe) {
            const fullscreenItem = document.createElement('div');
            fullscreenItem.className = 'context-menu-item';
            fullscreenItem.innerHTML = '<i class="fas fa-expand"></i><span>全屏显示</span>';
            fullscreenItem.addEventListener('click', () => {
                this.toggleFullscreen(iframe, element);
                menu.remove();
            });
            menu.appendChild(fullscreenItem);
        }

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 0);
    },

    // 复制到剪贴板
    copyToClipboard(text) {
        if (!text) {
            PageLibrary.showHint('⚠️ 无效的路径');
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    PageLibrary.showHint(`✅ 已复制: ${text}`);
                })
                .catch(err => {
                    this.fallbackCopy(text);
                });
        } else {
            this.fallbackCopy(text);
        }
    },

    // 降级复制方案
    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            PageLibrary.showHint(successful ? `✅ 已复制: ${text}` : '❌ 复制失败');
        } catch (err) {
            PageLibrary.showHint('❌ 复制失败');
        }

        document.body.removeChild(textarea);
    },

    // 捕获 iframe 长截图
    async captureIframeScreenshot(iframe, pageInfo) {
        if (!iframe || !pageInfo) {
            PageLibrary.showHint('⚠️ 无法获取页面信息');
            return;
        }

        try {
            PageLibrary.showHint('📸 正在生成截图,请稍候...');

            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc) {
                throw new Error('无法访问 iframe 内部文档');
            }

            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas 库未加载');
            }

            const pageName = pageInfo.name || pageInfo.id || 'screenshot';

            const canvas = await html2canvas(iframeDoc.body, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: iframeDoc.body.scrollWidth,
                height: iframeDoc.body.scrollHeight,
                windowWidth: iframeDoc.body.scrollWidth,
                windowHeight: iframeDoc.body.scrollHeight
            });

            canvas.toBlob((blob) => {
                if (!blob) {
                    PageLibrary.showHint('❌ 生成图片失败');
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${pageName}_${Date.now()}.png`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);
                PageLibrary.showHint(`✅ 截图已保存: ${pageName}.png`);
            }, 'image/png', 1.0);

        } catch (error) {
            console.error('截图失败:', error);
            PageLibrary.showHint(`❌ 截图失败: ${error.message}`);
        }
    },

    // localStorage 键名
    FULLSCREEN_STORAGE_KEY: 'prototypeFullscreenState',

    // 全屏显示页面
    toggleFullscreen(iframe, element) {
        if (!iframe) return;

        const elementDiv = iframe.closest('.canvas-element');
        if (!elementDiv) return;

        // 检查是否已经全屏
        const existingOverlay = document.querySelector('.page-fullscreen-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
            this.clearFullscreenState();
            return;
        }

        // 保存全屏状态到 localStorage
        const iframeSrc = iframe.src;
        const pageName = PageLibrary.getPageName(element.pageId);
        this.saveFullscreenState(iframeSrc, pageName);

        // 创建全屏遮罩
        this.createFullscreenOverlay(iframeSrc, pageName);
    },

    // 创建全屏遮罩层
    createFullscreenOverlay(iframeSrc, pageName) {
        const overlay = document.createElement('div');
        overlay.className = 'page-fullscreen-overlay';

        // 顶部工具栏
        const toolbar = document.createElement('div');
        toolbar.className = 'page-fullscreen-toolbar';
        toolbar.innerHTML = `
            <span><i class="fas fa-expand"></i> ${pageName || '页面预览'}</span>
            <button class="page-fullscreen-close" title="关闭全屏 (Esc)"><i class="fas fa-compress"></i> 退出全屏</button>
        `;

        // iframe容器
        const iframeContainer = document.createElement('div');
        iframeContainer.className = 'page-fullscreen-content';

        // 创建新iframe加载页面
        const fullscreenIframe = document.createElement('iframe');
        fullscreenIframe.src = iframeSrc;
        fullscreenIframe.style.width = '100%';
        fullscreenIframe.style.height = '100%';
        fullscreenIframe.style.border = 'none';

        iframeContainer.appendChild(fullscreenIframe);
        overlay.appendChild(toolbar);
        overlay.appendChild(iframeContainer);
        document.body.appendChild(overlay);

        // 关闭按钮
        toolbar.querySelector('.page-fullscreen-close').addEventListener('click', () => {
            overlay.remove();
            this.clearFullscreenState();
        });

        // Esc 关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                this.clearFullscreenState();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // 全屏状态下拦截 Ctrl+S，触发画布编辑器的保存
        const saveHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                e.stopPropagation();
                Storage.save();
            }
        };
        // 在遮罩层上拦截（焦点在工具栏等位置时生效）
        overlay.addEventListener('keydown', saveHandler, true);
        // 在父 document 上也拦截（全屏遮罩激活时，焦点可能仍在父页面）
        document.addEventListener('keydown', saveHandler, true);

        // iframe 加载完成后，向 iframe 内部注入 Ctrl+S 拦截
        fullscreenIframe.addEventListener('load', () => {
            try {
                const iframeDoc = fullscreenIframe.contentDocument || fullscreenIframe.contentWindow.document;
                iframeDoc.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        e.stopPropagation();
                        Storage.save();
                    }
                }, true);
            } catch (err) {
                // 跨域 iframe 无法访问，忽略
                console.warn('无法为跨域 iframe 注入快捷键:', err);
            }
        });

        // 遮罩关闭时清理 saveHandler
        const originalRemove = overlay.remove.bind(overlay);
        overlay.remove = function () {
            document.removeEventListener('keydown', saveHandler, true);
            originalRemove();
        };
    },

    // 保存全屏状态到 localStorage
    saveFullscreenState(iframeSrc, pageName) {
        try {
            const state = {
                iframeSrc: iframeSrc,
                pageName: pageName,
                timestamp: Date.now()
            };
            localStorage.setItem(this.FULLSCREEN_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('保存全屏状态失败:', e);
        }
    },

    // 清除全屏状态
    clearFullscreenState() {
        try {
            localStorage.removeItem(this.FULLSCREEN_STORAGE_KEY);
        } catch (e) {
            console.warn('清除全屏状态失败:', e);
        }
    },

    // 恢复全屏状态（页面加载时调用）
    restoreFullscreenState() {
        try {
            const saved = localStorage.getItem(this.FULLSCREEN_STORAGE_KEY);
            if (!saved) return;

            const state = JSON.parse(saved);
            if (state && state.iframeSrc) {
                this.createFullscreenOverlay(state.iframeSrc, state.pageName);
                console.log('✅ 已恢复全屏状态:', state.pageName);
            }
        } catch (e) {
            console.warn('恢复全屏状态失败:', e);
            this.clearFullscreenState();
        }
    },

    // 从页面库捕获截图
    async capturePageLibraryScreenshot(pageInfo) {
        if (!pageInfo) {
            PageLibrary.showHint('⚠️ 无法获取页面信息');
            return;
        }

        try {
            PageLibrary.showHint('📸 正在加载页面并生成截图,请稍候...');

            const tempIframe = document.createElement('iframe');
            tempIframe.style.position = 'fixed';
            tempIframe.style.left = '-9999px';
            tempIframe.style.top = '0';
            tempIframe.style.width = '320px';
            tempIframe.style.height = '680px';
            tempIframe.style.border = 'none';

            document.body.appendChild(tempIframe);

            await new Promise((resolve, reject) => {
                tempIframe.onload = resolve;
                tempIframe.onerror = reject;
                tempIframe.src = pageInfo.filePath;
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            await this.captureIframeScreenshot(tempIframe, pageInfo);

            document.body.removeChild(tempIframe);

        } catch (error) {
            console.error('截图失败:', error);
            PageLibrary.showHint(`❌ 截图失败: ${error.message}`);
        }
    }
};
