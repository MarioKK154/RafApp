import pandas as pd
import re

source_file = r'C:\Users\mario\Desktop\final_engineered_catalog.xlsx'
target_file = r'C:\Users\mario\Desktop\Rafapp sheet.xlsx'

df = pd.read_excel(source_file)

# We want only cable ladders and mesh trays as requested (kapalgrind, netbakkar, and other tray equivalents)
target_subs = [
    'Kapalstigar',
    'Kapalgrindur Heitgalv',
    'Kapalgrindur Ryðfríar',
    'Netbakkar',
    'Kapal- og skipabakkar',
    'Kapalrennur',
    'Lagnabakkar'
]

trays_df = df[df['Sub-subcategory'].isin(target_subs)].copy()

# Function to extract width (common widths: 50, 75, 100, 150, 200, 300, 400, 500, 600)
def extract_width(name):
    name = str(name).lower()
    # Looking for a number followed by mm or a standard width isolated
    match = re.search(r'\b(50|75|100|150|200|300|400|500|600)\s*(mm)?\b', name)
    if match:
        return match.group(1) + 'mm'
    return 'Unknown size'

# Function to extract material
def extract_material(name):
    name = str(name).lower()
    if any(x in name for x in ['heitg', 'hdg', 'heitgalv']):
        return 'Hot-Dip Galvanized'
    elif any(x in name for x in ['rafg', 'rafgalv', 'zink', 'sz', 'fz']):
        return 'Electrogalvanized'
    elif any(x in name for x in ['ryðfr', 'ss', 'ryðfrí']):
        return 'Stainless Steel'
    elif any(x in name for x in ['sýru', 'syru', 'acid']):
        return 'Acid-Proof'
    elif any(x in name for x in ['hvít', 'white']):
        return 'White Painted'
    return 'Electrogalvanized'  # Default standard

# Function to normalize type
def normalize_type(sub, name):
    sub = str(sub).lower()
    name = str(name).lower()
    if 'net' in sub or 'net' in name or 'vír' in name or 'mesh' in name:
        return 'Wire Mesh Tray'
    elif 'stig' in sub or 'grind' in sub or 'stig' in name or 'grind' in name:
        return 'Cable Ladder'
    else:
        return 'Cable Tray'

trays_df['Width'] = trays_df['Product name/description'].apply(extract_width)
trays_df['Material'] = trays_df['Product name/description'].apply(extract_material)
trays_df['Type'] = trays_df.apply(lambda row: normalize_type(row['Sub-subcategory'], row['Product name/description']), axis=1)

# Now we need to group by Type, Width, and Material
grouped = trays_df.groupby(['Type', 'Width', 'Material'])

merged_data = []

for (tray_type, width, material), group in grouped:
    # Get the best non-null URLs from any row in this group
    iskraft_urls = group['Iskraft URL'].dropna().unique()
    ronning_urls = group['Ronning URL'].dropna().unique()
    reykjafell_urls = group['Reykjafell URL'].dropna().unique()
    
    # We take the first available URL if there are multiple, or None if none
    iskraft = iskraft_urls[0] if len(iskraft_urls) > 0 else None
    ronning = ronning_urls[0] if len(ronning_urls) > 0 else None
    reykjafell = reykjafell_urls[0] if len(reykjafell_urls) > 0 else None
    
    product_name = f"{tray_type} {width} {material}"
    
    # Add to our output list
    merged_data.append({
        'Main category': 'Cable Trays',
        'Subcategory': 'Cable routing methods',
        'Sub-subcategory': tray_type + 's',
        'Product': product_name,
        'Iskraft': iskraft,
        'Ronning': ronning,
        'Reykjafell': reykjafell,
        'Image path': None
    })

merged_df = pd.DataFrame(merged_data)

# Sort sensibly
merged_df = merged_df.sort_values(['Sub-subcategory', 'Product'])

print(f"Generated {len(merged_df)} neatly merged and sized items.")

# Write to Excel
with pd.ExcelWriter(target_file, engine='openpyxl', mode='a', if_sheet_exists='replace') as writer:
    merged_df.to_excel(writer, sheet_name='Cable Trays', index=False)

print("Done writing to Rafapp sheet.xlsx")
