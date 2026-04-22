#!/usr/bin/env python3
"""
根据对比报告自动更新HTML原型图文件，使其与Vue页面一致
"""
import re
import os
import json

PROTOTYPE_BASE = r"E:\develop\java_item\yudao\prototype-desiger\pages"
VUE_BASE = r"E:\develop\java_item\yudao\yudao-ui\yudao-ui-admin-vue3\src\views"
REPORT_PATH = r"E:\develop\java_item\yudao\prototype-desiger\tools\compare_report.json"

def load_report():
    with open(REPORT_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_vue_table_columns_full(vue_content):
    """从Vue中提取完整的表格列信息"""
    columns = []
    # 匹配所有el-table-column
    pattern = r'<el-table-column[^>]*label="([^"]*)"[^>]*/?>'
    matches = re.findall(pattern, vue_content)
    return matches

def extract_vue_search_fields_full(vue_content):
    """从Vue中提取完整的搜索字段"""
    fields = []
    pattern = r'<el-form-item[^>]*label="([^"]*)"'
    matches = re.findall(pattern, vue_content)
    return matches

def extract_vue_action_buttons_full(vue_content):
    """从Vue中提取完整的操作列按钮"""
    buttons = []
    # 找操作列中的按钮
    match = re.search(r'label="操作"[^>]*>.*?<template[^>]*>(.*?)</template>', vue_content, re.DOTALL)
    if match:
        action_area = match.group(1)
        btns = re.findall(r'<el-button[^>]*>\s*(.*?)\s*</el-button>', action_area, re.DOTALL)
        for btn in btns:
            btn = re.sub(r'<[^>]+>', '', btn).strip()
            if btn:
                buttons.append(btn)
    return buttons

def extract_vue_toolbar_full(vue_content):
    """从Vue中提取工具栏按钮"""
    buttons = []
    form_area_match = re.search(r'<ContentWrap>.*?</ContentWrap>', vue_content, re.DOTALL)
    if form_area_match:
        form_area = form_area_match.group(0)
        btns = re.findall(r'<el-button[^>]*>\s*(?:<Icon[^>]*/>\s*)?(.*?)\s*</el-button>', form_area, re.DOTALL)
        for btn in btns:
            btn = re.sub(r'<[^>]+>', '', btn).strip()
            if btn and btn not in ['搜索', '重置']:
                buttons.append(btn)
    return buttons

def has_vue_tabs(vue_content):
    """检查Vue文件是否有tabs"""
    return 'el-tab-pane' in vue_content

def extract_vue_tabs(vue_content):
    """提取Vue中的tabs"""
    tabs = re.findall(r'<el-tab-pane label="([^"]*)"', vue_content)
    return tabs

def generate_tab_html(tabs):
    """生成tab HTML"""
    if not tabs:
        return ""
    html = '            <!-- Tab切换 -->\n'
    html += '            <div style="display: flex; border-bottom: 2px solid #e4e7ed; margin-bottom: 12px;">\n'
    for i, tab in enumerate(tabs):
        if i == 0:
            html += f'                <div style="padding: 8px 20px; color: #409eff; border-bottom: 2px solid #409eff; margin-bottom: -2px; font-size: 14px; cursor: pointer;">{tab}</div>\n'
        else:
            html += f'                <div style="padding: 8px 20px; color: #606266; font-size: 14px; cursor: pointer;">{tab}</div>\n'
    html += '            </div>\n'
    return html

def generate_search_html(search_fields, toolbar_buttons):
    """生成搜索区域HTML"""
    html = '        <!-- 搜索区域 -->\n'
    html += '        <div class="search-card">\n'
    html += '            <div class="search-row">\n'

    for field in search_fields:
        html += f'                <div class="search-item">\n'
        html += f'                    <label>{field}</label>\n'
        html += f'                    <input type="text" class="form-input" placeholder="请输入{field}">\n'
        html += f'                </div>\n'

    html += '                <div class="search-btns">\n'
    html += '                    <button class="btn btn-primary"><i class="fas fa-search"></i> 搜索</button>\n'
    html += '                    <button class="btn"><i class="fas fa-redo"></i> 重置</button>\n'

    for btn in toolbar_buttons:
        if btn == '新增':
            html += '                    <button class="btn btn-primary"><i class="fas fa-plus"></i> 新增</button>\n'
        elif btn == '导入':
            html += '                    <button class="btn" style="background: #e6a23c; border-color: #e6a23c; color: #fff;"><i class="fas fa-upload"></i> 导入</button>\n'
        elif btn == '导出':
            html += '                    <button class="btn" style="background: #67c23a; border-color: #67c23a; color: #fff;"><i class="fas fa-download"></i> 导出</button>\n'
        else:
            html += f'                    <button class="btn">{btn}</button>\n'

    html += '                </div>\n'
    html += '            </div>\n'
    html += '        </div>\n'
    return html

def generate_table_html(columns, action_buttons, tabs=None):
    """生成表格HTML"""
    html = '        <!-- 表格区域 -->\n'
    html += '        <div class="table-card">\n'

    if tabs:
        html += generate_tab_html(tabs)

    html += '            <table>\n'
    html += '                <thead>\n'
    html += '                    <tr>\n'
    for col in columns:
        html += f'                        <th>{col}</th>\n'
    html += '                    </tr>\n'
    html += '                </thead>\n'
    html += '                <tbody>\n'

    # 生成3行示例数据
    for row_idx in range(3):
        html += '                    <tr>\n'
        for col in columns:
            if col == '操作':
                html += '                        <td>\n'
                for btn in action_buttons:
                    if btn in ['删除']:
                        html += f'                            <button class="btn-text danger">{btn}</button>\n'
                    else:
                        html += f'                            <button class="btn-text">{btn}</button>\n'
                html += '                        </td>\n'
            elif '名称' in col or '编号' in col and col != '合同编号':
                html += f'                        <td><a href="#" style="color: #409eff; text-decoration: none;">示例{col}{row_idx+1}</a></td>\n'
            elif '时间' in col or '日期' in col:
                html += f'                        <td>2026-0{row_idx+1}-15 10:00:00</td>\n'
            elif '金额' in col or '价格' in col or '元' in col:
                html += f'                        <td>¥{(row_idx+1)*10000:,}</td>\n'
            elif '状态' in col:
                status_classes = ['status-success', 'status-warning', 'status-info']
                status_texts = ['已通过', '进行中', '待审核']
                html += f'                        <td><span class="status-tag {status_classes[row_idx % 3]}">{status_texts[row_idx % 3]}</span></td>\n'
            elif col == '负责人' or col == '创建人' or '人' in col:
                names = ['张三', '李四', '王五']
                html += f'                        <td>{names[row_idx % 3]}</td>\n'
            elif '部门' in col:
                depts = ['销售一部', '销售二部', '销售三部']
                html += f'                        <td>{depts[row_idx % 3]}</td>\n'
            else:
                html += f'                        <td>示例数据</td>\n'
        html += '                    </tr>\n'

    html += '                </tbody>\n'
    html += '            </table>\n'
    html += '            <div class="pagination">\n'
    html += '                <span>共 100 条</span>\n'
    html += '                <div class="page-btns">\n'
    html += '                    <button class="page-btn">&lt;</button>\n'
    html += '                    <button class="page-btn active">1</button>\n'
    html += '                    <button class="page-btn">2</button>\n'
    html += '                    <button class="page-btn">3</button>\n'
    html += '                    <button class="page-btn">&gt;</button>\n'
    html += '                </div>\n'
    html += '            </div>\n'
    html += '        </div>\n'
    return html

def update_html_file(html_path, vue_content):
    """更新HTML文件使其与Vue一致"""
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # 提取Vue信息
    vue_columns = extract_vue_table_columns_full(vue_content)
    vue_search = extract_vue_search_fields_full(vue_content)
    vue_actions = extract_vue_action_buttons_full(vue_content)
    vue_toolbar = extract_vue_toolbar_full(vue_content)
    vue_tabs = extract_vue_tabs(vue_content) if has_vue_tabs(vue_content) else None

    if not vue_columns and not vue_search:
        return False  # 无法提取有效信息

    # 生成新的搜索区域和表格区域
    new_search = generate_search_html(vue_search, vue_toolbar)
    new_table = generate_table_html(vue_columns, vue_actions, vue_tabs)

    # 替换搜索区域
    search_pattern = r'<!-- 搜索区域 -->.*?</div>\s*</div>\s*</div>'
    match = re.search(search_pattern, html_content, re.DOTALL)
    if match:
        html_content = html_content[:match.start()] + new_search + html_content[match.end():]

    # 替换表格区域
    table_pattern = r'<!-- 表格区域 -->.*?</div>\s*</div>\s*<!--/table-card-->'
    match = re.search(table_pattern, html_content, re.DOTALL)
    if not match:
        # 尝试另一种模式
        table_pattern = r'<!-- 表格区域 -->.*?</div>\s*</div>\s*</div>'
        # 从最后一个 </div></div></div> 结束
        start_match = re.search(r'<!-- 表格区域 -->', html_content)
        if start_match:
            # 找到包含 pagination 的结束位置
            end_pattern = r'</div>\s*</div>\s*</div>'
            end_match = re.findall(end_pattern, html_content[start_match.start():])
            if end_match:
                # 找到分页后的第三个 </div>
                remaining = html_content[start_match.start():]
                count = 0
                pos = 0
                while count < 3:
                    idx = remaining.find('</div>', pos)
                    if idx == -1:
                        break
                    count += 1
                    pos = idx + 6
                if count == 3:
                    html_content = html_content[:start_match.start()] + new_table + remaining[pos:]

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    return True

def main():
    report = load_report()
    updated = 0
    skipped = 0

    for item in report:
        if item["status"] != "DIFF":
            continue

        module = item["module"]
        page = item["page"]
        vue_file = item["vue_path"]

        html_path = os.path.join(PROTOTYPE_BASE, module, page)
        vue_path = os.path.join(VUE_BASE, module, vue_file)

        if not os.path.exists(html_path) or not os.path.exists(vue_path):
            skipped += 1
            continue

        try:
            with open(vue_path, 'r', encoding='utf-8') as f:
                vue_content = f.read()

            result = update_html_file(html_path, vue_content)
            if result:
                updated += 1
                print(f"[UPDATED] {module}/{page}")
            else:
                skipped += 1
                print(f"[SKIP] {module}/{page} - 无法提取Vue信息")
        except Exception as e:
            skipped += 1
            print(f"[ERROR] {module}/{page} - {str(e)}")

    print(f"\n完成: 更新={updated}, 跳过={skipped}")

if __name__ == "__main__":
    main()
