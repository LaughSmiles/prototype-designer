#!/usr/bin/env python3
"""
对比原型图HTML页面和Vue页面，生成差异报告
"""
import re
import os
import json
from html.parser import HTMLParser

PROTOTYPE_BASE = r"E:\develop\java_item\yudao\prototype-desiger\pages"
VUE_BASE = r"E:\develop\java_item\yudao\yudao-ui\yudao-ui-admin-vue3\src\views"

# 页面映射关系
PAGE_MAPPINGS = {
    "crm": [
        ("customer.html", "customer/index.vue"),
        ("customer-pool.html", "customer/pool/index.vue"),
        ("clue.html", "clue/index.vue"),
        ("contact.html", "contact/index.vue"),
        ("business.html", "business/index.vue"),
        ("contract.html", "contract/index.vue"),
        ("receivable.html", "receivable/index.vue"),
        ("receivable-plan.html", "receivable/plan/index.vue"),
        ("product.html", "product/index.vue"),
    ],
    "erp": [
        ("home.html", "home/index.vue"),
        ("purchase-order.html", "purchase/order/index.vue"),
        ("purchase-return.html", "purchase/return/index.vue"),
        ("sale-order.html", "sale/order/index.vue"),
        ("sale-return.html", "sale/return/index.vue"),
        ("stock-in.html", "stock/in/index.vue"),
        ("stock-out.html", "stock/out/index.vue"),
        ("stock-move.html", "stock/move/index.vue"),
        ("stock-check.html", "stock/check/index.vue"),
        ("stock-record.html", "stock/record/index.vue"),
        ("product.html", "product/index.vue"),
        ("product-category.html", "product/category/index.vue"),
        ("product-unit.html", "product/unit/index.vue"),
        ("supplier.html", "supplier/index.vue"),
        ("finance-account.html", "finance/account/index.vue"),
        ("finance-payment.html", "finance/payment/index.vue"),
        ("finance-receipt.html", "finance/receipt/index.vue"),
    ],
    "ai": [
        ("chat.html", "chat/conversation/index.vue"),
        ("image.html", "image/index.vue"),
        ("write.html", "write/index.vue"),
        ("music.html", "music/index.vue"),
        ("knowledge.html", "knowledge/index.vue"),
        ("model.html", "model/index.vue"),
        ("api-key.html", "apiKey/index.vue"),
        ("chat-role.html", "chat/role/index.vue"),
        ("chat-manager.html", "chat/manager/index.vue"),
        ("image-manager.html", "image/manager/index.vue"),
        ("music-manager.html", "music/manager/index.vue"),
        ("write-manager.html", "write/manager/index.vue"),
        ("mindmap.html", "mindmap/index.vue"),
        ("mindmap-manager.html", "mindmap/manager/index.vue"),
        ("knowledge-document.html", "knowledge/document/index.vue"),
        ("knowledge-segment.html", "knowledge/segment/index.vue"),
        ("tool.html", "tool/index.vue"),
        ("workflow.html", "workflow/index.vue"),
    ],
    "iot": [
        ("product.html", "product/index.vue"),
        ("device.html", "device/index.vue"),
        ("device-product-category.html", "product/category/index.vue"),
        ("device-group.html", "device/group/index.vue"),
        ("rule-scene.html", "rule/scene/index.vue"),
        ("ota-firmware.html", "ota/firmware/index.vue"),
        ("home.html", "home/index.vue"),
    ],
}

def extract_html_table_columns(html_content):
    """从HTML中提取表格列名"""
    columns = []
    # 找到thead中的th
    match = re.search(r'<thead>(.*?)</thead>', html_content, re.DOTALL)
    if match:
        thead = match.group(1)
        cols = re.findall(r'<th[^>]*>(.*?)</th>', thead, re.DOTALL)
        for col in cols:
            col = re.sub(r'<[^>]+>', '', col).strip()
            if col:
                columns.append(col)
    return columns

def extract_html_search_fields(html_content):
    """从HTML中提取搜索字段"""
    fields = []
    # 找search-item或form-item中的label
    labels = re.findall(r'<label[^>]*>(.*?)</label>', html_content)
    for label in labels:
        label = label.strip()
        if label and label not in ['搜索', '重置', '']:
            fields.append(label)
    return fields

def extract_html_toolbar_buttons(html_content):
    """从HTML中提取工具栏按钮"""
    buttons = []
    # 找toolbar中的按钮
    match = re.search(r'<div class="toolbar">(.*?)</div>', html_content, re.DOTALL)
    if match:
        toolbar = match.group(1)
        btns = re.findall(r'<button[^>]*>(.*?)</button>', toolbar, re.DOTALL)
        for btn in btns:
            btn = re.sub(r'<[^>]+>', '', btn).strip()
            if btn:
                buttons.append(btn)
    # 也找search-btns中的操作按钮（如新增、导出、导入）
    match = re.search(r'<div class="search-btns">(.*?)</div>', html_content, re.DOTALL)
    if match:
        btns_area = match.group(1)
        btns = re.findall(r'<button[^>]*>(.*?)</button>', btns_area, re.DOTALL)
        for btn in btns:
            btn = re.sub(r'<[^>]+>', '', btn).strip()
            if btn and btn not in ['搜索', '重置']:
                buttons.append(btn)
    return buttons

def extract_html_action_buttons(html_content):
    """从HTML中提取操作列按钮"""
    buttons = []
    # 找操作列中的按钮 (最后一个td中的按钮)
    tds = re.findall(r'<td>\s*(<button[^>]*>.*?</button>\s*)+\s*</td>', html_content, re.DOTALL)
    if tds:
        last_td = tds[-1] if tds else ""
        btns = re.findall(r'<button[^>]*>(.*?)</button>', last_td, re.DOTALL)
        for btn in btns:
            btn = re.sub(r'<[^>]+>', '', btn).strip()
            if btn:
                buttons.append(btn)
    return buttons

def extract_vue_table_columns(vue_content):
    """从Vue中提取表格列名"""
    columns = []
    # 找el-table-column label
    cols = re.findall(r'<el-table-column[^>]*label="(.*?)"', vue_content)
    for col in cols:
        if col:
            columns.append(col)
    return columns

def extract_vue_search_fields(vue_content):
    """从Vue中提取搜索字段"""
    fields = []
    # 找el-form-item label
    labels = re.findall(r'<el-form-item[^>]*label="(.*?)"', vue_content)
    for label in labels:
        if label:
            fields.append(label)
    return fields

def extract_vue_toolbar_buttons(vue_content):
    """从Vue中提取工具栏按钮（搜索行中的操作按钮）"""
    buttons = []
    # 找搜索区域中的按钮文字
    form_area_match = re.search(r'<ContentWrap>.*?</ContentWrap>', vue_content, re.DOTALL)
    if form_area_match:
        form_area = form_area_match.group(0)
        # 找所有el-button中的文字
        btns = re.findall(r'<el-button[^>]*>\s*(?:<Icon[^>]*/>\s*)?(.*?)\s*</el-button>', form_area, re.DOTALL)
        for btn in btns:
            btn = re.sub(r'<[^>]+>', '', btn).strip()
            if btn and btn not in ['搜索', '重置']:
                buttons.append(btn)
    return buttons

def extract_vue_action_buttons(vue_content):
    """从Vue中提取操作列按钮"""
    buttons = []
    # 找最后一个el-table-column label="操作"中的按钮
    match = re.search(r'label="操作"[^>]*>.*?<template[^>]*>(.*?)</template>', vue_content, re.DOTALL)
    if match:
        action_area = match.group(1)
        btns = re.findall(r'<el-button[^>]*>\s*(.*?)\s*</el-button>', action_area, re.DOTALL)
        for btn in btns:
            btn = re.sub(r'<[^>]+>', '', btn).strip()
            if btn:
                buttons.append(btn)
    return buttons

def compare_pages():
    results = []

    for module, pages in PAGE_MAPPINGS.items():
        for html_file, vue_file in pages:
            html_path = os.path.join(PROTOTYPE_BASE, module, html_file)
            vue_path = os.path.join(VUE_BASE, module, vue_file)

            if not os.path.exists(html_path):
                continue
            if not os.path.exists(vue_path):
                results.append({
                    "module": module,
                    "page": html_file,
                    "vue_path": vue_file,
                    "status": "VUE_NOT_FOUND",
                    "differences": {}
                })
                continue

            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            with open(vue_path, 'r', encoding='utf-8') as f:
                vue_content = f.read()

            # 提取信息
            html_columns = extract_html_table_columns(html_content)
            vue_columns = extract_vue_table_columns(vue_content)
            html_search = extract_html_search_fields(html_content)
            vue_search = extract_vue_search_fields(vue_content)
            html_toolbar = extract_html_toolbar_buttons(html_content)
            vue_toolbar = extract_vue_toolbar_buttons(vue_content)
            html_actions = extract_html_action_buttons(html_content)
            vue_actions = extract_vue_action_buttons(vue_content)

            # 对比差异
            differences = {}

            # 表格列对比
            if html_columns != vue_columns:
                only_html = [c for c in html_columns if c not in vue_columns]
                only_vue = [c for c in vue_columns if c not in html_columns]
                differences["table_columns"] = {
                    "html": html_columns,
                    "vue": vue_columns,
                    "only_in_html": only_html,
                    "only_in_vue": only_vue
                }

            # 搜索字段对比
            if html_search != vue_search:
                only_html = [c for c in html_search if c not in vue_search]
                only_vue = [c for c in vue_search if c not in html_search]
                differences["search_fields"] = {
                    "html": html_search,
                    "vue": vue_search,
                    "only_in_html": only_html,
                    "only_in_vue": only_vue
                }

            # 操作按钮对比
            if html_actions != vue_actions:
                differences["action_buttons"] = {
                    "html": html_actions,
                    "vue": vue_actions
                }

            has_diff = bool(differences)
            results.append({
                "module": module,
                "page": html_file,
                "vue_path": vue_file,
                "status": "DIFF" if has_diff else "MATCH",
                "differences": differences
            })

    return results

if __name__ == "__main__":
    results = compare_pages()

    # 输出报告到文件
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "compare_report.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    diff_count = sum(1 for r in results if r["status"] == "DIFF")
    match_count = sum(1 for r in results if r["status"] == "MATCH")
    not_found_count = sum(1 for r in results if r["status"] == "VUE_NOT_FOUND")

    print(f"done: match={match_count}, diff={diff_count}, not_found={not_found_count}")
    print(f"Report saved to: {report_path}")
