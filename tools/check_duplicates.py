import os

pages = [
    'crm/customer.html', 'crm/clue.html', 'crm/contact.html',
    'crm/business.html', 'crm/contract.html', 'crm/receivable.html',
    'crm/receivable-plan.html', 'crm/product.html', 'crm/customer-pool.html',
    'erp/purchase-order.html', 'erp/purchase-return.html',
    'erp/sale-order.html', 'erp/sale-return.html',
    'erp/stock-in.html', 'erp/stock-out.html', 'erp/stock-move.html',
    'erp/stock-check.html', 'erp/stock-record.html',
    'erp/product-category.html', 'erp/product-unit.html',
    'erp/finance-account.html', 'erp/finance-payment.html', 'erp/finance-receipt.html',
    'ai/image-manager.html', 'ai/music-manager.html', 'ai/write-manager.html',
    'ai/mindmap-manager.html', 'ai/knowledge-document.html', 'ai/knowledge-segment.html',
    'ai/workflow.html',
    'iot/device-product-category.html', 'iot/device-group.html',
    'iot/rule-scene.html', 'iot/ota-firmware.html',
]

for p in pages:
    path = os.path.join('pages', p)
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    count = content.count('<table>')
    status = 'DUPLICATE' if count > 1 else 'OK'
    print(f'{p}: {count} tables ({status})')
