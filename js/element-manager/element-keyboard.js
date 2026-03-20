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
