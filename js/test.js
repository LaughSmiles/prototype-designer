// 测试脚本 - 验证画布编辑器功能
// 在浏览器控制台运行此脚本来测试各个模块

function runTests() {
    console.log('🧪 开始测试画布编辑器功能...\n');

    const tests = [
        {
            name: '模块加载测试',
            test: () => {
                const modules = ['PageLibrary', 'CanvasView', 'ElementManager', 'Tools', 'Storage'];
                const missing = modules.filter(m => typeof window[m] === 'undefined');
                if (missing.length === 0) {
                    return { pass: true, message: '所有模块已正确加载' };
                }
                return { pass: false, message: `缺少模块: ${missing.join(', ')}` };
            }
        },
        {
            name: '页面库数据测试',
            test: () => {
                if (PageLibrary.pages && PageLibrary.pages.length === 32) {
                    return { pass: true, message: `找到 ${PageLibrary.pages.length} 个页面` };
                }
                return { pass: false, message: '页面数据异常' };
            }
        },
        {
            name: 'DOM元素测试',
            test: () => {
                const required = ['canvas', 'pageLibrary', 'canvasWrapper'];
                const missing = required.filter(id => !document.getElementById(id));
                if (missing.length === 0) {
                    return { pass: true, message: '所有必需DOM元素存在' };
                }
                return { pass: false, message: `缺少元素: ${missing.join(', ')}` };
            }
        },
        {
            name: '视图状态测试',
            test: () => {
                const view = CanvasView.getView();
                if (view && typeof view.zoom === 'number' && view.pan) {
                    return { pass: true, message: `当前缩放: ${view.zoom}, 位置: (${view.pan.x}, ${view.pan.y})` };
                }
                return { pass: false, message: '视图状态异常' };
            }
        },
        {
            name: '工具切换测试',
            test: () => {
                const original = Tools.getCurrentTool();
                Tools.setTool('arrow');
                const arrow = Tools.getCurrentTool();
                Tools.setTool('select');
                const select = Tools.getCurrentTool();
                return {
                    pass: arrow === 'arrow' && select === 'select',
                    message: `工具切换正常 (当前: ${original})`
                };
            }
        },
        {
            name: '元素管理测试',
            test: () => {
                const elements = ElementManager.getAllElements();
                if (Array.isArray(elements)) {
                    return { pass: true, message: `当前元素数量: ${elements.length}` };
                }
                return { pass: false, message: '元素数据异常' };
            }
        },
        {
            name: '数据持久化测试',
            test: () => {
                try {
                    const data = Storage.getSavedData();
                    if (data) {
                        return { pass: true, message: `找到已保存数据，时间: ${data.timestamp}` };
                    }
                    return { pass: true, message: '暂无保存数据（正常）' };
                } catch (e) {
                    return { pass: false, message: '持久化测试失败' };
                }
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach(test => {
        try {
            const result = test.test();
            if (result.pass) {
                console.log(`✅ ${test.name}: ${result.message}`);
                passed++;
            } else {
                console.log(`❌ ${test.name}: ${result.message}`);
                failed++;
            }
        } catch (e) {
            console.log(`❌ ${test.name}: 异常 - ${e.message}`);
            failed++;
        }
    });

    console.log(`\n📊 测试结果: ${passed}/${tests.length} 通过`);
    if (failed === 0) {
        console.log('🎉 所有测试通过！画布编辑器运行正常。');
    } else {
        console.log('⚠️ 有测试失败，请检查控制台错误信息。');
    }
}

// 如果在浏览器环境且模块已加载，自动运行测试
if (typeof window !== 'undefined' && typeof PageLibrary !== 'undefined') {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runTests);
    } else {
        runTests();
    }
}