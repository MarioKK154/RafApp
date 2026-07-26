import os
import re

PAGES_DIR = r"C:\Users\mario\Desktop\RafApp\frontend\src\pages"

def check_paddings():
    unpadded = []
    padded = []

    for f in os.listdir(PAGES_DIR):
        if f.endswith('.jsx'):
            path = os.path.join(PAGES_DIR, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
                # Check top-level return JSX container
                m = re.search(r'return\s*\(\s*<div[^>]*className=["\']([^"\']+)["\']', content)
                if m:
                    cls = m.group(1)
                    if any(p in cls for p in ['p-', 'px-', 'py-', 'padding']):
                        padded.append((f, cls))
                    else:
                        unpadded.append((f, cls))
                else:
                    # check second div or section
                    m2 = re.search(r'return\s*\(\s*<([a-zA-Z0-9]+)[^>]*className=["\']([^"\']+)["\']', content)
                    if m2:
                        cls2 = m2.group(2)
                        if any(p in cls2 for p in ['p-', 'px-', 'py-', 'padding']):
                            padded.append((f, cls2))
                        else:
                            unpadded.append((f, cls2))

    print(f"Padded pages count: {len(padded)}")
    print(f"Potentially UNPADDED pages count: {len(unpadded)}\n")
    for f, cls in unpadded:
        print(f"  File: {f} | className: '{cls}'")

if __name__ == '__main__':
    check_paddings()
