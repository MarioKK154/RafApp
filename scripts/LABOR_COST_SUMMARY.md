# Labor Cost & Category Summary – ar.is Exports

## Overview

You have **two Excel exports** that together describe an **Icelandic electrical labor/materials catalog** (likely from the official price list / verktakarýnin):

| File | Rows | Purpose |
|------|------|--------|
| **Export 1** (`_export_1772304267679.xlsx`) | 2,665 | **Pricing list**: main category → sub-category → line item, with **conditions** and **unit cost** (Eining) |
| **Export 2** (`_export_1772304296699.xlsx`) | 1,492 | **Catalog / codes**: same hierarchy with **numeric codes** and a flag for **material vs labor** (Efni) |

---

## Export 1 – Columns (Labor Cost)

| Icelandic      | Meaning         | Notes |
|----------------|-----------------|--------|
| **Aðalflokkur** | Main category   | e.g. ALMENNT, LÁGSPENNUKERFI, LÝSINGARKERFI, SÉR- OG STJÓRNKERFI, LAGNALEIÐIR |
| **Flokkur**     | Sub-category    | e.g. Aðstöðusköpun, Tímagjöld fyrir aukavinnu |
| **Liður**       | Line item       | Specific labor or item description |
| **Aðstæður**    | Conditions      | e.g. "heildarverð" (lump sum), or size/spec like "<-110 KW, 50-70q" |
| **Tók gildi**   | Effective date  | When the rate took effect (dd.mm.yyyy) |
| **Eining**      | **Unit / cost** | **This is the labor cost**: 0 = lump sum (heildarverð), or decimal = unit price (e.g. 15.55, 23, 0.8, 1.84) |

- Rows with **Aðstæður = "heildarverð"** are typically **lump sum** (Eining = 0).
- Rows with specific conditions (e.g. motor size, cable cross-section) have **unit prices** in **Eining** (likely per unit: hour, m², piece, etc. depending on the category).

---

## Export 2 – Columns (Catalog & Codes)

| Icelandic           | Meaning              | Notes |
|---------------------|----------------------|--------|
| **Aðalflokkur**     | Main category code   | 00, 02, 04 … |
| **Lýsing aðalflokks** | Main category name | ALMENNT, LÁGSPENNUKERFI, … |
| **Flokkur**         | Sub-category code   | 10, 20, 30 … |
| **Lýsing flokks**   | Sub-category name   | Samskipti, Aðstöðusköpun, … |
| **Númer**           | Item code           | 01, 02, 701, … |
| **Lýsing**          | Item description    | Same as “Liður” in Export 1 |
| **Efni**            | Material?            | **True** = material, **False** = labor |
| **Virkar aðstæður** | Active conditions   | Number of active condition sets (e.g. 1, 3) |

Use Export 2 to see **hierarchy + codes** and to **separate labor (Efni=False) from materials (Efni=True)**. Use Export 1 for **actual prices** (Eining) and **conditions**.

---

## Main Categories (Aðalflokkur)

1. **ALMENNT** – General (site setup, overtime rates, equipment, programming, etc.)
2. **LAGNALEIÐIR** – Cable routes / conduits (bends, trays, ducts, glands, etc.)
3. **LÁGSPENNUKERFI** – Low-voltage systems (breakers, cables, meters, panels, etc.)
4. **LÝSINGARKERFI** – Lighting systems (luminaires, LED, emergency lighting, etc.)
5. **SÉR- OG STJÓRNKERFI** – Special & control systems (fire, access, HVAC, data, etc.)

---

## Labor Cost Logic (Export 1)

- **Eining = 0** with **heildarverð** → lump sum item (price agreed separately).
- **Eining > 0** → unit price for that item under the given **Aðstæður** (e.g. per hour, per m, per piece). The unit (hours, m, etc.) is implied by the category/item type in the official list.

For **overtime / labor rates** (e.g. Tímagjöld fyrir aukavinnu), items like Iðnaðarmaður, Verkamaður, Verkstjóri are typically **hourly rates**; in Export 1 they appear with conditions and Eining values where applicable.

---

## Suggested Use

- **RafApp labor catalog**: Map **Aðalflokkur / Flokkur / Liður** (and codes from Export 2) to your internal labor catalog; use **Eining** from Export 1 as default unit price where applicable.
- **Categories**: Use the main/sub structure for filters and reporting (e.g. “Low-voltage”, “Lighting”, “General”).
- **Materials vs labor**: Use Export 2 **Efni** to tag items as material vs labor in your system.
