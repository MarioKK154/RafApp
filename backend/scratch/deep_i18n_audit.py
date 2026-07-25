import json
import re

I18N_PATH = r"C:\Users\mario\Desktop\RafApp\frontend\src\i18n.js"

def audit_i18n():
    with open(I18N_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract JSON objects or dicts from resources
    en_match = re.search(r'en:\s*\{\s*translation:\s*\{([^}]+(?:\}[^}]+)*)\}\s*\},', content, re.DOTALL)
    is_match = re.search(r'is:\s*\{\s*translation:\s*\{([^}]+(?:\}[^}]+)*)\}\s*\}', content, re.DOTALL)

    # Let's parse keys using regex
    en_keys = dict(re.findall(r'"([^"]+)":\s*"([^"\\]*(?:\\.[^"\\]*)*)"', content[:content.find('is: {')]))
    is_keys = dict(re.findall(r'"([^"]+)":\s*"([^"\\]*(?:\\.[^"\\]*)*)"', content[content.find('is: {'):]))

    print(f"Loaded {len(en_keys)} EN keys and {len(is_keys)} IS keys.")

    # Check for missing keys in IS
    missing_in_is = [k for k in en_keys if k not in is_keys]
    print(f"Keys in EN but missing in IS: {len(missing_in_is)}")
    for k in missing_in_is[:10]:
        print("  -", k)

    # Check for potential untranslated English text in IS section
    suspicious_is = []
    english_words = ['the', 'and', 'with', 'for', 'from', 'select', 'cancel', 'update', 'delete', 'create', 'search', 'loading', 'failed', 'success', 'required', 'optional']
    for k, val in is_keys.items():
        words = val.lower().split()
        if any(w in words for w in ['the', 'and', 'with', 'for', 'failed', 'required']) and not any(w in words for w in ['og', 'með', 'fyrir', 'af']):
            suspicious_is.append((k, val))

    print(f"\nPotential untranslated / awkward IS strings ({len(suspicious_is)}):")
    for k, val in suspicious_is[:20]:
        print(f"  [{k}]: {val}")

if __name__ == '__main__':
    audit_i18n()
