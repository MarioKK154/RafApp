import pandas as pd
import re

iskraft_file = r'C:\Users\mario\Desktop\Rafapp stuff\iskraft_data.xlsx'
reykjafell_file = r'C:\Users\mario\Desktop\Rafapp stuff\reykjafell_data.xlsx'
target_file = r'C:\Users\mario\Desktop\Rafapp sheet.xlsx'

iskraft = pd.read_excel(iskraft_file)
reykjafell = pd.read_excel(reykjafell_file)

iskraft['Store'] = 'Iskraft'
reykjafell['Store'] = 'Reykjafell'
iskraft = iskraft.rename(columns={'Vöruheiti': 'Name', 'Vefslóð': 'URL', 'Slóð': 'URL', 'Title': 'Name'})
reykjafell = reykjafell.rename(columns={'Vöruheiti': 'Name', 'Vefslóð': 'URL', 'Slóð': 'URL', 'Title': 'Name'})

all_items = []
for df, store in [(iskraft, 'Iskraft'), (reykjafell, 'Reykjafell')]:
    url_col = 'Product URL'
    name_col = 'Product description'
    for _, row in df.iterrows():
        name = str(row[name_col]).lower()
        url = str(row[url_col])
        if 'netbakk' in name or 'kapalgrind' in name:
            all_items.append({'Name': str(row[name_col]), 'URL': url, 'Store': store})

raw_df = pd.DataFrame(all_items)

forbidden_words = ['vink', 'beygj', 'fest', 'lok', 'grein', 'kross', 'skeyt', 'tengi', 'skrúf', 'bolt', 'oki', 'bogi', 'niður', 'upp', 'vegg', 'loft', 'gólf', 'end', 'stöð', 'plata', 'skinn', 'stykki', 'hald']
def is_accessory(name):
    name_lower = name.lower()
    for word in forbidden_words:
        if word in name_lower:
            return True
    return False

filtered_df = raw_df[~raw_df['Name'].apply(is_accessory)].copy()

def extract_width(name):
    name = str(name).lower()
    # Handle cablofil style e.g., 54/100, 105/300
    match_cf = re.search(r'/(50|75|100|150|200|300|400|500|600)\b', name)
    if match_cf: return match_cf.group(1) + 'mm'
    
    match = re.search(r'\b(50|75|100|150|200|300|400|500|600)\s*(mm)?\b', name)
    if match: return match.group(1) + 'mm'
    return 'Unknown'

filtered_df['Width'] = filtered_df['Name'].apply(extract_width)

def extract_material(name):
    name = str(name).lower()
    if '316' in name: return 'Stainless Steel 316L'
    if '304' in name: return 'Stainless Steel 304L'
    
    if any(x in name for x in ['heitg', 'hdg', 'heitgalv', 'z4', 'heit']): return 'Heat galvanized'
    if any(x in name for x in ['rafg', 'rafgalv', 'zink', 'sz', 'fz', 's6']): return 'Electrogalvanized'
    if any(x in name for x in ['ryðfr', 'ss', 'ryðfrí', 'inox']): return 'Stainless Steel' # Generic SS if type not specified
    
    return 'Electrogalvanized'

filtered_df['Material'] = filtered_df['Name'].apply(extract_material)
filtered_df = filtered_df[filtered_df['Width'] != 'Unknown']

grouped = filtered_df.groupby(['Width', 'Material'])

merged_data = []
for (width, material), group in grouped:
    # Check if there's any generic "Stainless Steel" that can merge with 304L or 316L? 
    # The user wants exact types if known. We'll output them all exactly as parsed.
    iskraft_url = group[group['Store'] == 'Iskraft']['URL'].first_valid_index()
    reykjafell_url = group[group['Store'] == 'Reykjafell']['URL'].first_valid_index()
    
    i_url = group.loc[iskraft_url, 'URL'] if iskraft_url is not None else None
    rey_url = group.loc[reykjafell_url, 'URL'] if reykjafell_url is not None else None
    
    # Clean the product name
    product_name = f"Cable Tray {width} {material}"
    
    merged_data.append({
        'Main category': 'Cable Trays',
        'Subcategory': 'Wire Mesh & Ladders',
        'Sub-subcategory': 'Cable Tray',
        'Product': product_name,
        'Iskraft': i_url,
        'Ronning': None,
        'Reykjafell': rey_url,
        'Image path': None
    })

# Now let's try to handle Reykjafell's Generic SS. If Reykjafell just says "SS", and Iskraft has "304L", 
# we shouldn't have empty slots if they can merge. But for now, we leave them exact.

merged_df = pd.DataFrame(merged_data)
merged_df = merged_df.sort_values(['Product'])

print(f"Generated {len(merged_df)} distinct size/material unified items.")
for _, row in merged_df.iterrows():
    print(f" - {row['Product']}: Iskraft={bool(row['Iskraft'])} Reykjafell={bool(row['Reykjafell'])}")

with pd.ExcelWriter(target_file, engine='openpyxl', mode='a', if_sheet_exists='replace') as writer:
    merged_df.to_excel(writer, sheet_name='Cable Trays', index=False)
