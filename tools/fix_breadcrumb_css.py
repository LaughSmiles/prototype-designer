"""
清理残留的 .breadcrumb CSS
"""
import os
import re
import glob

PAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'pages')
PAGES_DIR = os.path.normpath(PAGES_DIR)

def clean_breadcrumb_css(content):
    """删除所有 .breadcrumb 相关的 CSS 定义"""
    patterns = [
        r'\.breadcrumb\s*\{[^}]*\}\s*\n',
        r'\.breadcrumb\s+a\s*\{[^}]*\}\s*\n',
        r'\.breadcrumb\s+a:hover\s*\{[^}]*\}\s*\n',
    ]
    changed = False
    for pattern in patterns:
        new_content, count = re.subn(pattern, '', content, flags=re.DOTALL)
        if count > 0:
            content = new_content
            changed = True
    return content, changed

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content, changed = clean_breadcrumb_css(content)
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    return changed

def main():
    html_files = glob.glob(os.path.join(PAGES_DIR, '**', '*.html'), recursive=True)
    fixed = 0
    for filepath in html_files:
        try:
            if process_file(filepath):
                rel = os.path.relpath(filepath, os.path.join(PAGES_DIR, '..'))
                print(f"  OK: {rel}")
                fixed += 1
        except Exception as e:
            print(f"  ERR: {filepath}: {e}")
    print(f"\nCleaned {fixed} files")

if __name__ == '__main__':
    main()
