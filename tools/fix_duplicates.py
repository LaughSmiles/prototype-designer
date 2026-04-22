import os
import re

"""
修复有重复table的HTML文件，删除旧的（第二次出现的）table内容
"""

files_to_fix = [
    'pages/crm/customer.html',
    'pages/crm/clue.html',
    'pages/crm/contact.html',
]

for filepath in files_to_fix:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 找到main-content结束标签的位置
    main_content_end = content.find('</div>\n    <script src="../../lib/js/tailwindcss.js">')
    if main_content_end == -1:
        main_content_end = content.rfind('</div>\n    <script')

    # 找到第二次出现的</div></div></div>后紧跟着旧内容的位置
    # 策略：找到第二个<table>的开始位置，然后删除从那之前的</div>到</div>\n    <script之间的所有内容

    # 找到所有<table>出现位置
    table_positions = [m.start() for m in re.finditer(r'<table>', content)]

    if len(table_positions) > 1:
        # 第二个table位置
        second_table_pos = table_positions[1]

        # 找第二个table前的</div>标签
        prev_div = content.rfind('</div>', 0, second_table_pos)

        # 从prev_div开始找到script标签前的所有内容并删除
        script_pos = content.find('<script src="../../lib/js/tailwindcss.js">', prev_div)
        if script_pos == -1:
            script_pos = content.find('<script', prev_div)

        if script_pos != -1:
            # 保留到prev_div+6(包含</div>)，然后跳到script
            # 但是要保留缩进的</div>（main-content的关闭标签）
            # 找到prev_div前一行内容
            line_start = content.rfind('\n', 0, prev_div) + 1
            line_content = content[line_start:prev_div].strip()

            # 删除从prev_div到script_pos之间的内容
            # 但需要保留main-content的关闭</div>
            new_content = content[:prev_div] + '\n    </div>\n    ' + content[script_pos:]

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)

            # 验证
            with open(filepath, 'r', encoding='utf-8') as f:
                new_c = f.read()
            count = new_c.count('<table>')
            print(f'{filepath}: Fixed! Now has {count} table(s)')
        else:
            print(f'{filepath}: Could not find script tag')
    else:
        print(f'{filepath}: No duplicate found')
