import re

I18N_PATH = r"C:\Users\mario\Desktop\RafApp\frontend\src\i18n.js"

def final_audit():
    with open(I18N_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract all lines inside en: { translation: { ... } } and is: { translation: { ... } }
    en_part = content[:content.find('is: {')]
    is_part = content[content.find('is: {'):]

    en_dict = dict(re.findall(r'"([^"]+)":\s*"([^"\\]*(?:\\.[^"\\]*)*)"', en_part))
    is_dict = dict(re.findall(r'"([^"]+)":\s*"([^"\\]*(?:\\.[^"\\]*)*)"', is_part))

    print(f"=== FINAL AUDIT STATISTICS ===")
    print(f"Total English Keys: {len(en_dict)}")
    print(f"Total Icelandic Keys: {len(is_dict)}")

    # Check key mismatch
    en_only = set(en_dict.keys()) - set(is_dict.keys())
    is_only = set(is_dict.keys()) - set(en_dict.keys())

    print(f"\nKeys in EN but missing in IS: {len(en_only)}")
    for k in en_only:
        print("  - EN ONLY:", k)

    print(f"\nKeys in IS but missing in EN: {len(is_only)}")
    for k in is_only:
        print("  - IS ONLY:", k)

    # Check for identical key-value in IS (which might indicate untranslated English text in IS)
    untranslated_candidates = []
    ignore_keys = {'isk', 'pdf', 'csv', 'id', 'vin', 's/n', '2fa', 'qr', 'hms', 'rafís', 'ceo', 'vat', 'email', 'phone', 'role', 'created', 'skipped'}
    for k in (set(en_dict.keys()) & set(is_dict.keys())):
        ev = en_dict[k].strip()
        iv = is_dict[k].strip()
        if ev.lower() == iv.lower() and len(ev) > 4 and k.lower() not in ignore_keys and not ev.startswith('http'):
            # Check if it looks like English text
            if re.search(r'\b(the|and|for|with|you|your|file|project|task|user|error|success|select|option)\b', ev, re.IGNORECASE):
                untranslated_candidates.append((k, ev, iv))

    print(f"\nIdentical EN & IS strings that look like untranslated English: {len(untranslated_candidates)}")
    for k, ev, iv in untranslated_candidates:
        print(f"  Key: '{k}' | EN: '{ev}' | IS: '{iv}'")

if __name__ == '__main__':
    final_audit()
