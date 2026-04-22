"""
fix_topbar_v5.py - 补全顶栏缺失元素：租户选择器、尺寸切换、语言切换
同时修正字体大小，使顶栏与 Vue 管理后台完全一致

Vue ToolHeader 右侧完整顺序：
  租户选择器(180px) -> 全屏(18px) -> 搜索(18px) -> 尺寸切换(18px) -> 语言切换(18px) -> 消息铃铛(18px) -> 用户信息
"""
import os
import re
import glob

PAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'pages')
PAGES_DIR = os.path.normpath(PAGES_DIR)
SKIP = ['login.html', 'redirect.html']

# 新增的 CSS 规则
EXTRA_CSS = """
        .tenant-select { width: 180px; height: 32px; border: 1px solid #dcdfe6; border-radius: 4px; padding: 0 30px 0 12px; font-size: 13px; color: #606266; background: #fff; outline: none; cursor: pointer; appearance: auto; }
        .tenant-select:focus { border-color: #409eff; }
        .tenant-wrap { position: relative; display: flex; align-items: center; margin-right: 4px; }
        .tenant-wrap i { position: absolute; right: 10px; font-size: 12px; color: #c0c4cc; pointer-events: none; }"""

# 完整的顶栏右侧 HTML（与 Vue ToolHeader 完全一致）
NEW_TOPBAR_RIGHT_HTML = '''        <div class="topbar-right">
            <div class="tenant-wrap">
                <select class="tenant-select">
                    <option value="" disabled selected>请选择租户</option>
                    <option value="1">芋道源码</option>
                    <option value="2">测试租户</option>
                </select>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="custom-hover" title="全屏"><i class="fas fa-expand" style="font-size: 18px;"></i></div>
            <div class="custom-hover" title="搜索"><i class="fas fa-search" style="font-size: 18px;"></i></div>
            <div class="dropdown custom-hover" title="尺寸">
                <i class="fas fa-text-height" style="font-size: 18px;"></i>
                <div class="dropdown-menu" style="right: 0; left: auto; min-width: 120px;">
                    <a>Default</a>
                    <a>Large</a>
                    <a>Small</a>
                </div>
            </div>
            <div class="dropdown custom-hover" title="语言">
                <i class="fas fa-language" style="font-size: 18px;"></i>
                <div class="dropdown-menu" style="right: 0; left: auto; min-width: 120px;">
                    <a>简体中文</a>
                    <a>English</a>
                </div>
            </div>
            <div class="custom-hover" style="position: relative;" title="消息">
                <i class="fas fa-bell" style="font-size: 18px;"></i>
                <span class="notification-dot"></span>
            </div>
            <div class="dropdown custom-hover">
                <div style="display: flex; align-items: center; cursor: pointer;" onclick="var m=this.nextElementSibling;m.style.display=m.style.display==='block'?'none':'block'">
                    <div class="avatar">芋</div>
                    <span class="username-text">芋道源码</span>
                    <i class="fas fa-chevron-down" style="font-size: 10px; color: #909399;"></i>
                </div>
                <div class="dropdown-menu" style="right: 0; left: auto;">
                    <a><i class="fas fa-tools" style="margin-right: 6px;"></i>个人中心</a>
                    <a><i class="fas fa-book" style="margin-right: 6px;"></i>开发文档</a>
                    <a><i class="fas fa-lock" style="margin-right: 6px;"></i>锁定屏幕</a>
                    <a class="danger"><i class="fas fa-sign-out-alt" style="margin-right: 6px;"></i>退出登录</a>
                </div>
            </div>
        </div>'''


def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # 1. 添加租户选择器和尺寸/语言切换的 CSS
    if '.tenant-select' not in content:
        content = content.replace('</style>', EXTRA_CSS + '\n    </style>', 1)
        changes.append('add tenant/size/locale css')

    # 2. 替换顶栏右侧 HTML
    # 匹配 <div class="topbar-right"> 到对应的 </div>
    old_right = re.search(
        r'(<div class="topbar-right">.*?</div>\s*</div>\s*</div>)',
        content, re.DOTALL
    )
    if old_right:
        # 验证匹配是否包含用户下拉菜单（避免误匹配）
        match_text = old_right.group(1)
        if 'dropdown-menu' in match_text and '退出登录' in match_text:
            content = content[:old_right.start()] + NEW_TOPBAR_RIGHT_HTML + content[old_right.end():]
            changes.append('replace topbar-right html')

    # 3. 清理多余空行
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    return None


def main():
    html_files = glob.glob(os.path.join(PAGES_DIR, '**', '*.html'), recursive=True)
    html_files = [f for f in html_files if os.path.basename(f) not in SKIP]
    print(f"Found {len(html_files)} HTML files")

    fixed = 0
    for filepath in html_files:
        try:
            changes = fix_file(filepath)
            if changes:
                rel = os.path.relpath(filepath, os.path.join(PAGES_DIR, '..'))
                print(f"  {rel}: {', '.join(changes)}")
                fixed += 1
        except Exception as e:
            print(f"  ERR: {filepath}: {e}")

    print(f"\nFixed: {fixed}/{len(html_files)} files")


if __name__ == '__main__':
    main()
