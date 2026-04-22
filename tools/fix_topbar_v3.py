"""
fix_topbar_v3.py - 让原型图顶栏与 Vue 管理后台一模一样

修复 v2 的 bug：
1. CSS 规则合并到同一行（缺少换行）
2. HTML 正则匹配多余 </div>

策略：
- CSS: 用逐行处理代替字符串拼接，确保每个规则独立一行
- HTML: 精确匹配 <div class="topbar"> 到 </div>（3 层嵌套）
"""
import os
import re
import glob

PAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'pages')
PAGES_DIR = os.path.normpath(PAGES_DIR)

SKIP = ['login.html', 'redirect.html']


def fix_css(content):
    """替换顶栏相关 CSS，逐行处理避免合并问题"""
    changed = False

    # 1. 替换 .topbar (padding: 0 16px -> padding: 0)
    old_topbar_pattern = r'\.topbar\s*\{[^}]*padding:\s*0\s+16px[^}]*\}'
    new_topbar = '        .topbar { height: 50px; background: #fff; border-bottom: 1px solid #e8e8e8; display: flex; align-items: center; justify-content: space-between; padding: 0; position: fixed; top: 0; left: 210px; right: 0; z-index: 99; }'
    if re.search(old_topbar_pattern, content):
        content = re.sub(old_topbar_pattern, new_topbar, content, count=1)
        changed = True

    # 2. 删除 .topbar-left 行（含换行符）
    topbar_left_pattern = r'\n\s*\.topbar-left\s*\{[^}]*\}'
    if re.search(topbar_left_pattern, content):
        content = re.sub(topbar_left_pattern, '', content, count=1)
        changed = True

    # 3. 删除 .topbar-right 行（含换行符）
    topbar_right_pattern = r'\n\s*\.topbar-right\s*\{[^}]*\}'
    if re.search(topbar_right_pattern, content):
        content = re.sub(topbar_right_pattern, '', content, count=1)
        changed = True

    # 4. 替换 .avatar (30px -> 25px, font-size 12px -> 11px)
    old_avatar_pattern = r'\.avatar\s*\{[^}]*width:\s*30px[^}]*\}'
    new_avatar = '        .avatar { width: 25px; height: 25px; border-radius: 50%; background: #409eff; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 600; }'
    if re.search(old_avatar_pattern, content):
        content = re.sub(old_avatar_pattern, new_avatar, content, count=1)
        changed = True

    # 5. 在 .topbar 行之后插入新的 CSS 规则（如果还没有 custom-hover）
    if '.custom-hover' not in content:
        extra_css = """
        .custom-hover { display: flex; height: 100%; padding: 0 10px; cursor: pointer; align-items: center; transition: background 0.2s; }
        .custom-hover:hover { background-color: #f6f6f6; }
        .breadcrumb { display: flex; align-items: center; height: 100%; margin-left: 10px; font-size: 14px; }
        .breadcrumb-sep { margin: 0 6px; color: #c0c4cc; }
        .breadcrumb a { color: inherit; text-decoration: none; }
        .breadcrumb a:hover { color: #409eff; }
        .breadcrumb .last { color: #97a8be; }
        .notification-dot { position: absolute; top: 10px; right: 10px; width: 8px; height: 8px; background: #f56c6c; border-radius: 50%; }
        .username-text { padding-left: 5px; font-size: 14px; color: inherit; }"""

        # 在 .topbar 行后面插入
        content = content.replace(new_topbar, new_topbar + extra_css, 1)
        changed = True

    return content, changed


def extract_breadcrumb_text(content):
    """从现有 topbar HTML 中提取面包屑文字"""
    # 匹配：<span style="font-size: 13px; color: #606266;">系统管理 / 用户管理</span>
    m = re.search(
        r'<span[^>]*style="font-size:\s*13px;\s*color:\s*#606266[^"]*"[^>]*>([^<]+)</span>',
        content
    )
    if m:
        return m.group(1).strip()
    return None


def make_breadcrumb_html(text):
    """将 '系统管理 / 用户管理' 转为 Vue 风格的面包屑 HTML"""
    if not text:
        return '<span class="last">首页</span>'

    parts = [p.strip() for p in text.split('/') if p.strip()]
    if not parts:
        return '<span class="last">首页</span>'

    items = []
    for i, part in enumerate(parts):
        if i < len(parts) - 1:
            items.append(f'<a>{part}</a><span class="breadcrumb-sep">/</span>')
        else:
            items.append(f'<span class="last">{part}</span>')

    return ''.join(items)


def fix_topbar_html(content):
    """替换整个 topbar HTML 块"""
    # 提取当前面包屑文字
    bc_text = extract_breadcrumb_text(content)
    bc_html = make_breadcrumb_html(bc_text)

    new_topbar = f'''    <div class="topbar">
        <div class="topbar-left">
            <div class="custom-hover" title="折叠菜单"><i class="fas fa-outdent" style="font-size: 18px;"></i></div>
            <div class="breadcrumb">{bc_html}</div>
        </div>
        <div class="topbar-right">
            <div class="custom-hover" title="全屏"><i class="fas fa-expand" style="font-size: 18px;"></i></div>
            <div class="custom-hover" title="搜索"><i class="fas fa-search" style="font-size: 18px;"></i></div>
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
                    <a><i class="fas fa-book" style="margin-right: 6px;"></i>文档</a>
                    <a><i class="fas fa-lock" style="margin-right: 6px;"></i>锁定屏幕</a>
                    <a class="danger"><i class="fas fa-sign-out-alt" style="margin-right: 6px;"></i>退出登录</a>
                </div>
            </div>
        </div>
    </div>'''

    # 精确匹配：从 <div class="topbar"> 到对应的 </div>
    # 原始结构是 3 层嵌套：topbar > topbar-left, topbar-right > 内容
    pattern = r'    <div class="topbar">.*?    </div>\n    </div>'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        content = content[:match.start()] + new_topbar + content[match.end():]
        return content, True

    return content, False


def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # 1. 修复 CSS
    content, css_changed = fix_css(content)
    if css_changed:
        changes.append('css')

    # 2. 修复 topbar HTML
    content, html_changed = fix_topbar_html(content)
    if html_changed:
        changes.append('html')

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    return None


def main():
    html_files = glob.glob(os.path.join(PAGES_DIR, '**', '*.html'), recursive=True)
    html_files = [f for f in html_files if os.path.basename(f) not in SKIP]

    print(f"Found {len(html_files)} HTML files")

    css_count = 0
    html_count = 0
    err_count = 0
    for filepath in html_files:
        try:
            changes = process_file(filepath)
            if changes:
                rel = os.path.relpath(filepath, os.path.join(PAGES_DIR, '..'))
                parts = ', '.join(changes)
                print(f"  [{parts}] {rel}")
                if 'css' in changes:
                    css_count += 1
                if 'html' in changes:
                    html_count += 1
        except Exception as e:
            print(f"  ERR: {filepath}: {e}")
            err_count += 1

    print(f"\nFixed CSS: {css_count} files")
    print(f"Fixed HTML: {html_count} files")
    print(f"Errors: {err_count} files")


if __name__ == '__main__':
    main()
