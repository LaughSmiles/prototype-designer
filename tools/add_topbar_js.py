"""
add_topbar_js.py - 在所有原型图页面中引入 topbar.js
"""
import os
import re
import glob

PAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'pages')
PAGES_DIR = os.path.normpath(PAGES_DIR)
SKIP = ['login.html', 'redirect.html']

TOPBAR_SCRIPT_TAG = '<script src="../../js/topbar.js"></script>'


def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'topbar.js' in content:
        return None

    # 在 </body> 前插入
    if '</body>' in content:
        content = content.replace('</body>', TOPBAR_SCRIPT_TAG + '\n</body>', 1)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 'added topbar.js'
    return None


def main():
    html_files = glob.glob(os.path.join(PAGES_DIR, '**', '*.html'), recursive=True)
    html_files = [f for f in html_files if os.path.basename(f) not in SKIP]
    print(f"Found {len(html_files)} HTML files")

    fixed = 0
    for filepath in html_files:
        try:
            result = fix_file(filepath)
            if result:
                rel = os.path.relpath(filepath, os.path.join(PAGES_DIR, '..'))
                print(f"  {rel}: {result}")
                fixed += 1
        except Exception as e:
            print(f"  ERR: {filepath}: {e}")

    print(f"\nFixed: {fixed}/{len(html_files)} files")


if __name__ == '__main__':
    main()
