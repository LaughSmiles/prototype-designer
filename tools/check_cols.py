import re
files = ['pages/crm/customer.html', 'pages/crm/clue.html', 'pages/crm/contact.html']
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    thead = re.search(r'<thead>(.*?)</thead>', content, re.DOTALL)
    if thead:
        cols = re.findall(r'<th[^>]*>(.*?)</th>', thead.group(1))
        print(f'{f}: {cols}')
    else:
        print(f'{f}: NO THEAD FOUND')
