"""
批量删除原型页面内容区多余面包屑
Vue 管理后台只在顶栏有面包屑，内容区没有
"""
import os
import re
import glob

PAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'pages')
PAGES_DIR = os.path.normpath(PAGES_DIR)

def remove_breadcrumb(content):
    """删除 main-content 内的面包屑 div"""
    # 模式1: 带注释的面包屑块
    # <!-- 面包屑 -->
    # <div class="breadcrumb">
    #     <a ...>...</a>
    #     <span>/</span>
    #     <a ...>...</a>
    # </div>
    pattern1 = re.compile(
        r'\n*\s*<!--\s*面包屑\s*-->\s*\n\s*<div\s+class="breadcrumb">.*?</div>\s*\n',
        re.DOTALL
    )

    # 模式2: 不带注释的面包屑块
    pattern2 = re.compile(
        r'\n\s*<div\s+class="breadcrumb">.*?</div>\s*\n',
        re.DOTALL
    )

    new_content = content

    # 先尝试带注释的模式
    m = pattern1.search(new_content)
    if m:
        new_content = new_content[:m.start()] + '\n' + new_content[m.end():]
        return new_content, True

    # 再尝试不带注释的模式
    m = pattern2.search(new_content)
    if m:
        new_content = new_content[:m.start()] + '\n' + new_content[m.end():]
        return new_content, True

    return content, False

def remove_breadcrumb_css(content):
    """删除 .breadcrumb 相关的 CSS 定义"""
    # 删除 .breadcrumb {...} 块
    pattern = re.compile(
        r'\.breadcrumb\s*\{[^}]*\}\s*\n',
        re.DOTALL
    )
    new_content, count = pattern.subn('', content)
    # 删除 .breadcrumb a {...} 块
    pattern2 = re.compile(
        r'\.breadcrumb\s+a\s*\{[^}]*\}\s*\n',
        re.DOTALL
    )
    new_content, count2 = pattern2.subn('', new_content)
    return new_content, count > 0 or count2 > 0

def process_file(filepath):
    """处理单个文件"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. 删除内容区面包屑 HTML
    content, removed_html = remove_breadcrumb(content)

    # 2. 删除 .breadcrumb CSS
    content, removed_css = remove_breadcrumb_css(content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    html_files = glob.glob(os.path.join(PAGES_DIR, '**', '*.html'), recursive=True)
    print(f"找到 {len(html_files)} 个 HTML 文件")

    fixed_count = 0
    for filepath in html_files:
        try:
            if process_file(filepath):
                rel_path = os.path.relpath(filepath, os.path.join(PAGES_DIR, '..'))
                print(f"  OK: {rel_path}")
                fixed_count += 1
        except Exception as e:
            print(f"  ERR: {filepath}: {e}")

    print(f"\n共修复 {fixed_count} 个文件")

if __name__ == '__main__':
    main()
