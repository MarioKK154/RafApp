import os
import re

FRONTEND_DIR = r"C:\Users\mario\Desktop\RafApp\frontend\src"

def scan_files():
    weird_words = ['trachea', 'borgholes', 'borgät', 'claws', 'home nerves', 'rope ladders', 'telemetry', 'node']
    found = []
    for root, dirs, files in os.walk(FRONTEND_DIR):
        for f in files:
            if f.endswith(('.js', '.jsx')):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                    content = file.read()
                    for w in weird_words:
                        if re.search(r'\b' + w + r'\b', content, re.IGNORECASE):
                            found.append((f, w))
    print("Found potential awkward jargon in frontend:", len(found))
    for f, w in found:
        print(f"File: {f} | Word: {w}")

if __name__ == '__main__':
    scan_files()
