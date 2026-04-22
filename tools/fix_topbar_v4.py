"""
fix_topbar_v4.py - 修复 v3 遗留的问题：.topbar-left 和 .topbar-right 缺失 CSS 定义
只补回缺失的样式，不修改 HTML
"""
import os
import re
import glob

PAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'pages')
PAGES_DIR = os.path.normpath(PAGES_DIR)
SKIP = ['login.html', 'redirect.html']

# 标准的顶栏 CSS 规则集（与 Vue ToolHeader 一致）
STANDARD_TOPBAR_CSS = """        .topbar { height: 50px; background: #fff; border-bottom: 1px solid #e8e8e8; display: flex; align-items: center; justify-content: space-between; padding: 0; position: fixed; top: 0; left: 210px; right: 0; z-index: 99; }
        .topbar-left { display: flex; align-items: center; height: 100%; }
        .topbar-right { display: flex; align-items: center; height: 100%; }
        .custom-hover { display: flex; height: 100%; padding: 0 10px; cursor: pointer; align-items: center; transition: background 0.2s; }
        .custom-hover:hover { background-color: #f6f6f6; }
        .breadcrumb { display: flex; align-items: center; height: 100%; margin-left: 10px; font-size: 14px; }
        .breadcrumb-sep { margin: 0 6px; color: #c0c4cc; }
        .breadcrumb a { color: inherit; text-decoration: none; }
        .breadcrumb a:hover { color: #409eff; }
        .breadcrumb .last { color: #97a8be; }
        .notification-dot { position: absolute; top: 10px; right: 10px; width: 8px; height: 8px; background: #f56c6c; border-radius: 50%; }
        .avatar { width: 25px; height: 25px; border-radius: 50%; background: #409eff; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 600; }
        .username-text { padding-left: 5px; font-size: 14px; color: inherit; }"""


def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # 需要移除的旧 CSS 类名
    classes_to_remove = [
        '.topbar', '.topbar-left', '.topbar-right', '.custom-hover',
        '.custom-hover:hover', '.breadcrumb', '.breadcrumb-sep',
        '.breadcrumb a', '.breadcrumb a:hover', '.breadcrumb .last',
        '.notification-dot', '.avatar', '.username-text'
    ]

    # 1. 找到 </style> 前的位置，清理所有顶栏相关旧 CSS
    # 删除所有旧的顶栏 CSS 规则（匹配各种缩进）
    for cls in classes_to_remove:
        if cls == '.breadcrumb a':
            pattern = r'\n?\s*\.breadcrumb\s+a\s*\{[^}]*\}'
        elif cls == '.breadcrumb a:hover':
            pattern = r'\n?\s*\.breadcrumb\s+a:hover\s*\{[^}]*\}'
        elif cls == '.breadcrumb .last':
            pattern = r'\n?\s*\.breadcrumb\s+\.last\s*\{[^}]*\}'
        elif cls == '.custom-hover:hover':
            pattern = r'\n?\s*\.custom-hover:hover\s*\{[^}]*\}'
        else:
            escaped = re.escape(cls)
            pattern = r'\n?\s*' + escaped + r'\s*\{[^}]*\}'
        content = re.sub(pattern, '', content)

    # 2. 在 </style> 前插入标准的顶栏 CSS
    if '</style>' in content:
        content = content.replace('</style>', STANDARD_TOPBAR_CSS + '\n    </style>', 1)
        changes.append('replaced topbar css')

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