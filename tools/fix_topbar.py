"""
批量修复原型页面缺失的 tailwindcss.js 和 dropdown CSS
参考 user.html 作为标准模板
"""
import os
import re
import glob

PAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'pages')
PAGES_DIR = os.path.normpath(PAGES_DIR)

# 需要补充的 dropdown CSS（从 user.html 提取）
DROPDOWN_CSS = """        .dropdown { position: relative; display: inline-block; }
        .dropdown-menu { display: none; position: absolute; right: 0; top: 100%; background: #fff; border: 1px solid #ebeef5; border-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,.1); z-index: 10; min-width: 100px; padding: 4px 0; }
        .dropdown-menu a { display: block; padding: 6px 16px; font-size: 13px; color: #606266; text-decoration: none; cursor: pointer; }
        .dropdown-menu a:hover { background: #ecf5ff; color: #409eff; }
        .dropdown-menu a.danger:hover { background: #fef0f0; color: #f56c6c; }"""

def get_tailwind_path(filepath):
    """根据文件深度计算 tailwindcss.js 的相对路径"""
    rel = os.path.relpath(filepath, os.path.dirname(PAGES_DIR))
    depth = rel.count(os.sep) - 1  # pages/xxx.html -> 0, pages/xxx/yyy.html -> 1
    return '../' * (depth + 1) + 'lib/js/tailwindcss.js'

def fix_tailwind(content, filepath):
    """添加 tailwindcss.js script"""
    if 'tailwindcss.js' in content:
        return content, False

    tailwind_path = get_tailwind_path(filepath)
    tailwind_script = f'<script src="{tailwind_path}"></script>'

    # 在 all.min.css 的 link 之前插入
    pattern = r'<link rel="stylesheet" href="[^"]*all\.min\.css">'
    match = re.search(pattern, content)
    if match:
        insert_pos = match.start()
        new_content = content[:insert_pos] + tailwind_script + '\n    ' + content[insert_pos:]
        return new_content, True

    return content, False

def fix_dropdown_css(content):
    """添加缺失的 dropdown CSS"""
    if '.dropdown-menu' in content.split('</style>')[0] if '</style>' in content else '':
        return content, False

    # 在 </style> 之前插入 dropdown CSS
    if '</style>' in content:
        new_content = content.replace('</style>', DROPDOWN_CSS + '\n    </style>', 1)
        return new_content, True

    return content, False

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # 1. 添加 tailwindcss.js
    content, added_tw = fix_tailwind(content, filepath)
    if added_tw:
        changes.append('tailwindcss')

    # 2. 添加 dropdown CSS（仅对使用了 dropdown 的页面）
    if 'class="dropdown"' in content or 'dropdown-menu' in content:
        content, added_dd = fix_dropdown_css(content)
        if added_dd:
            changes.append('dropdown-css')

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    return None

def main():
    html_files = glob.glob(os.path.join(PAGES_DIR, '**', '*.html'), recursive=True)
    # 排除 login.html、error 页面等不需要修复的
    skip = ['login.html', 'redirect.html']
    html_files = [f for f in html_files if os.path.basename(f) not in skip]

    print(f"Found {len(html_files)} HTML files")

    tw_count = 0
    dd_count = 0
    for filepath in html_files:
        try:
            changes = process_file(filepath)
            if changes:
                rel = os.path.relpath(filepath, os.path.join(PAGES_DIR, '..'))
                parts = ', '.join(changes)
                print(f"  [{parts}] {rel}")
                if 'tailwindcss' in changes:
                    tw_count += 1
                if 'dropdown-css' in changes:
                    dd_count += 1
        except Exception as e:
            print(f"  ERR: {filepath}: {e}")

    print(f"\nAdded tailwindcss: {tw_count} files")
    print(f"Added dropdown CSS: {dd_count} files")

if __name__ == '__main__':
    main()
