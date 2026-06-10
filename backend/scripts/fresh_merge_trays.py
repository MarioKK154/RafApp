import pandas as pd
import re

ronning_file = r'C:\Users\mario\Desktop\Rafapp stuff\ronning_data.xlsx'
iskraft_file = r'C:\Users\mario\Desktop\Rafapp stuff\iskraft_data.xlsx'
reykjafell_file = r'C:\Users\mario\Desktop\Rafapp stuff\reykjafell_data.xlsx'
target_file = r'C:\Users\mario\Desktop\Rafapp sheet.xlsx'

print("Loading raw catalogs...")
ronning = pd.read_excel(ronning_file) if pd.io.common.file_exists(ronning_file) else pd.DataFrame()
iskraft = pd.read_excel(iskraft_file) if pd.io.common.file_exists(iskraft_file) else pd.DataFrame()
reykjafell = pd.read_excel(reykjafell_file) if pd.io.common.file_exists(reykjafell_file) else pd.DataFrame()

# Standardize columns
url_col = 'Product URL'
name_col = 'Product description'

all_items = []
for df, store in [(ronning, 'Ronning'), (iskraft, 'Iskraft'), (reykjafell, 'Reykjafell')]:
    if df.empty: continue
    for _, row in df.iterrows():
        name = str(row[name_col]).lower()
        url = str(row[url_col])
        if 'netbakk' in name or 'kapalgrind' in name:
            all_items.append({'Name': str(row[name_col]), 'URL': url, 'Store': store})

raw_df = pd.DataFrame(all_items)
print(f"Found {len(raw_df)} potential tray items across all stores.")

# Filter out accessories
forbidden_words = ['vink', 'beygj', 'fest', 'lok', 'grein', 'kross', 'skeyt', 'tengi', 'skrúf', 'bolt', 'oki', 'bogi', 'niður', 'upp', 'vegg', 'loft', 'gólf', 'end', 'stöð', 'plata', 'skinn', 'stykki', 'hald']
def is_accessory(name):
    name_lower = name.lower()
    for word in forbidden_words:
        if word in name_lower:
            return True
    return False

filtered_df = raw_df[~raw_df['Name'].apply(is_accessory)].copy()
print(f"After removing accessories, {len(filtered_df)} straight trays remain.")

# Extract width
def extract_width(name):
    name = str(name).lower()
    match = re.search(r'\b(50|75|100|150|200|300|400|500|600)\s*(mm)?\b', name)
    if match:
        return match.group(1) + 'mm'
    return 'Unknown'

filtered_df['Width'] = filtered_df['Name'].apply(extract_width)

# Extract material
def extract_material(name):
    name = str(name).lower()
    if any(x in name for x in ['heitg', 'hdg', 'heitgalv', 'z4', 'heit']):
        return 'HDG'
    elif any(x in name for x in ['rafg', 'rafgalv', 'zink', 'sz', 'fz', 's6']):
        return 'EG'
    elif any(x in name for x in ['ryðfr', 'ss', 'ryðfrí']):
        return 'SS'
    elif any(x in name for x in ['sýru', 'syru', 'acid']):
        return 'Acid-Proof'
    return 'EG' # Default

filtered_df['Material'] = filtered_df['Name'].apply(extract_material)

# Drop unknowns
filtered_df = filtered_df[filtered_df['Width'] != 'Unknown']

# Group by Width and Material
grouped = filtered_df.groupby(['Width', 'Material'])

merged_data = []
for (width, material), group in grouped:
    iskraft_url = group[group['Store'] == 'Iskraft']['URL'].first_valid_index()
    ronning_url = group[group['Store'] == 'Ronning']['URL'].first_valid_index()
    reykjafell_url = group[group['Store'] == 'Reykjafell']['URL'].first_valid_index()
    
    i_url = group.loc[iskraft_url, 'URL'] if iskraft_url is not None else None
    r_url = group.loc[ronning_url, 'URL'] if ronning_url is not None else None
    rey_url = group.loc[reykjafell_url, 'URL'] if reykjafell_url is not None else None
    
    product_name = f"Cable Tray {width} {material}"
    
    merged_data.append({
        'Main category': 'Cable Trays',
        'Subcategory': 'Wire Mesh & Ladders',
        'Sub-subcategory': 'Cable Tray',
        'Product': product_name,
        'Iskraft': i_url,
        'Ronning': r_url,
        'Reykjafell': rey_url,
        'Image path': None
    })

merged_df = pd.DataFrame(merged_data)
merged_df = merged_df.sort_values(['Product'])

print(f"Generated {len(merged_df)} distinct size/material unified items.")

with pd.ExcelWriter(target_file, engine='openpyxl', mode='a', if_sheet_exists='replace') as writer:
    merged_df.to_excel(writer, sheet_name='Cable Trays', index=False)

print("Saved to Cable Trays sheet!")
