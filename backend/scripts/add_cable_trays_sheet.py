import pandas as pd
from openpyxl import load_workbook
import os

source_file = r'C:\Users\mario\Desktop\final_engineered_catalog.xlsx'
target_file = r'C:\Users\mario\Desktop\Rafapp sheet.xlsx'

# Read the full engineered catalog
df = pd.read_excel(source_file)

# Filter for Lagnaleiðir (Cable trays/routing)
trays_df = df[(df['Master Category'] == 'Lagnaefni') & (df['Subcategory'].str.contains('Lagnalei', na=False))].copy()

# Translation mapping for Sub-subcategories
translation_map = {
    'Kapalstigar': 'Cable ladders',
    'Kapal- og skipabakkar': 'Cable trays',
    'Kapalrennur': 'Trunking (Cable trays)',
    'Tenglarennur': 'Socket trunking',
    'Netbakkar': 'Wire mesh trays',
    'Tenglastokkar ál': 'Aluminum socket trunks',
    'Kapalgrindur Ryðfríar': 'Stainless cable ladders',
    'Gólfdósakerfi': 'Floor box systems',
    'Kapalgrindur Heitgalv': 'Hot-dip galv cable ladders',
    'Lagnabakkar': 'Installation trays',
    'Tenglasúlur': 'Socket pillars',
    'Gormarennur': 'Spiral conduits/trays'
}

# Apply the mapping, defaulting to the original name if not found
trays_df['Sub-subcategory_EN'] = trays_df['Sub-subcategory'].map(lambda x: translation_map.get(str(x).strip(), str(x)))

# Map to the new schema
new_data = pd.DataFrame()
new_data['Main category'] = ['Cable Trays'] * len(trays_df)
new_data['Subcategory'] = ['Cable routing methods'] * len(trays_df)
new_data['Sub-subcategory'] = trays_df['Sub-subcategory_EN']
new_data['Product'] = trays_df['Product name/description']
new_data['Iskraft'] = trays_df['Iskraft URL']
new_data['Ronning'] = trays_df['Ronning URL']
new_data['Reykjafell'] = trays_df['Reykjafell URL']
new_data['Image path'] = [None] * len(trays_df)

# Sort by sub-subcategory for better organization
new_data = new_data.sort_values('Sub-subcategory')

print(f"Adding {len(new_data)} cable tray items to {target_file} in sheet 'Cable Trays'...")

with pd.ExcelWriter(target_file, engine='openpyxl', mode='a', if_sheet_exists='replace') as writer:
    new_data.to_excel(writer, sheet_name='Cable Trays', index=False)

print("Done!")
