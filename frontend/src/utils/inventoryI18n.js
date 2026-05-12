/**
 * Inventory primary text is often Icelandic (supplier imports). English fields are optional.
 * @param {object | null | undefined} item
 * @param {string} [lang] i18n language, e.g. 'en', 'en-US', 'is'
 */
export function inventoryDisplayName(item, lang) {
    if (!item) return '';
    const l = (lang || 'is').toLowerCase();
    if (l.startsWith('en') && item.name_en && String(item.name_en).trim()) {
        return String(item.name_en).trim();
    }
    return item.name || '';
}

export function inventoryDisplayDescription(item, lang) {
    if (!item) return '';
    const l = (lang || 'is').toLowerCase();
    if (l.startsWith('en') && item.description_en && String(item.description_en).trim()) {
        return String(item.description_en).trim();
    }
    return item.description || '';
}

/** Category + subcategory line for cards (respects *_en when UI language is English). */
export function inventoryCategoryLine(item, lang) {
    if (!item) return '—';
    const l = (lang || 'is').toLowerCase();
    const useEn = l.startsWith('en');
    const cat = useEn && item.category_en?.trim() ? String(item.category_en).trim() : (item.category || '').trim();
    const subFull =
        useEn && item.subcategory_en?.trim() ? String(item.subcategory_en).trim() : (item.subcategory || '').trim();
    if (!cat && !subFull) return '—';
    return [cat, subFull].filter(Boolean).join(' · ');
}
