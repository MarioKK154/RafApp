import os
import re

FRONTEND_PAGES_DIR = r"C:\Users\mario\Desktop\RafApp\frontend\src"

# Exclude shop inventory files as requested ("except shop inventory")
EXCLUDE_FILES = {'ShopCatalogPage.jsx', 'ShopListPage.jsx', 'ShopCreatePage.jsx', 'ShopEditPage.jsx'}

def find_hardcoded():
    jsx_text_pattern = re.compile(r'>\s*([A-Z][a-zA-Z0-9\s,\.\?\!\-\:\;\/]{3,50})\s*<')
    matches_by_file = {}

    for root, dirs, files in os.walk(FRONTEND_PAGES_DIR):
        for f in files:
            if f.endswith('.jsx') and f not in EXCLUDE_FILES:
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                    lines = file.readlines()
                    file_matches = []
                    for line_no, line in enumerate(lines, 1):
                        # skip comments and imports
                        if line.strip().startswith('//') or line.strip().startswith('/*') or 'import ' in line or 'console.' in line:
                            continue
                        m = jsx_text_pattern.findall(line)
                        for text_str in m:
                            clean = text_str.strip()
                            # filter out obvious code/variables/SVG paths
                            if not re.search(r'[\{\}\$]|className|onClick|style|const|let|var|return', clean):
                                if clean not in ['RafApp', 'ISK', 'PDF', 'CSV', 'ID', 'VIN', 'S/N', '2FA', 'QR', 'HMS', 'RAFÍS', 'CEO', 'VAT']:
                                    file_matches.append((line_no, clean))
                    if file_matches:
                        matches_by_file[f] = file_matches

    print(f"Scanned JSX files. Found hardcoded candidates in {len(matches_by_file)} files:\n")
    for fname, match_list in matches_by_file.items():
        print(f"=== {fname} ({len(match_list)} matches) ===")
        for lno, text_str in match_list[:5]:
            print(f"  L{lno}: {text_str}")
        if len(match_list) > 5:
            print(f"  ... and {len(match_list) - 5} more.")

if __name__ == '__main__':
    find_hardcoded()
