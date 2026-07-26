import os
import re

PAGES_DIR = r"C:\Users\mario\Desktop\RafApp\frontend\src\pages"

def audit_all_pages():
    no_padding_pages = []

    for f in sorted(os.listdir(PAGES_DIR)):
        if f.endswith('.jsx'):
            path = os.path.join(PAGES_DIR, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
                # Find all return statements
                returns = re.findall(r'return\s*\(\s*(<[^>]+>)', content)
                has_pad = False
                for r in returns:
                    if any(p in r for p in ['p-', 'px-', 'py-', 'padding', 'p-4', 'p-6', 'p-8']):
                        has_pad = True
                        break
                # Also check full return block
                if 'p-4' in content or 'p-6' in content or 'p-8' in content or 'px-4' in content or 'py-6' in content or 'p-5' in content:
                    has_pad = True

                if not has_pad:
                    no_padding_pages.append(f)

    print(f"Total pages checked: {len(os.listdir(PAGES_DIR))}")
    print(f"Pages missing padding: {len(no_padding_pages)}")
    for page in no_padding_pages:
        print("  - UNPADDED PAGE:", page)

if __name__ == '__main__':
    audit_all_pages()
