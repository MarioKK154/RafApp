import re

I18N_PATH = r"C:\Users\mario\Desktop\RafApp\frontend\src\i18n.js"

with open(I18N_PATH, 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_en = False
in_is = False
en_pairs = []
is_pairs = []

for line_no, line in enumerate(lines, 1):
    if 'en: {' in line:
        in_en = True
        in_is = False
        continue
    elif 'is: {' in line:
        in_en = False
        in_is = True
        continue

    m = re.search(r'"([^"]+)":\s*"([^"\\]*(?:\\.[^"\\]*)*)"', line)
    if m:
        key, val = m.group(1), m.group(2)
        if in_en:
            en_pairs.append((line_no, key, val))
        elif in_is:
            is_pairs.append((line_no, key, val))

print(f"EN Pairs: {len(en_pairs)} | IS Pairs: {len(is_pairs)}")

# Scan EN values for Icelandic characters (ð, þ, æ, ö, á, é, í, ó, ú, ý)
is_chars = re.compile(r'[ðþæöðÞÆÖáéíóúýÁÉÍÓÚÝ]')
icelandic_in_en = []
for lno, k, v in en_pairs:
    if is_chars.search(v) and not k.startswith("kennitala") and "ISK" not in v and "IS" not in k and "ÍS" not in v:
        icelandic_in_en.append((lno, k, v))

print(f"\nFound {len(icelandic_in_en)} English entries containing Icelandic special characters:")
for lno, k, v in icelandic_in_en:
    print(f"  Line {lno} | Key: '{k}' | Value: '{v}'")

# Scan IS values for English-only phrases (e.g. "Select Company", "Cancel", "Save", "Submit", "Pending", "Approved", "Failed", "Success", "View Details", "Delete")
eng_only_in_is = []
eng_keywords = ['Select ', 'Cancel', 'Save', 'Submit', 'Pending', 'Approved', 'Failed', 'Success', 'View Details', 'Delete', 'Search', 'Filter', 'Create', 'Update', 'Remove', 'Edit']
for lno, k, v in is_pairs:
    for kw in eng_keywords:
        if kw in v and not any(is_w in v for is_w in ['Veldu', 'Hætta', 'Vista', 'Senda', 'Samþykkt', 'Mistókst', 'Eyða', 'Leita', 'Breyta']):
            eng_only_in_is.append((lno, k, v, kw))
            break

print(f"\nFound {len(eng_only_in_is)} Icelandic entries containing un-translated English keywords:")
for lno, k, v, kw in eng_only_in_is:
    print(f"  Line {lno} | Key: '{k}' | Value: '{v}' (Keyword: {kw})")
