import { useState, useCallback, useMemo } from 'react';

/**
 * Shared supplier filter state for /inventory/catalog (shops + shop_match).
 */
export function useInventoryCatalogShopFilter() {
    const [selectedShops, setSelectedShops] = useState(() => new Set());
    const [shopMatchMode, setShopMatchMode] = useState('any');

    const shopsKey = useMemo(() => [...selectedShops].sort().join(','), [selectedShops]);

    const toggleShop = useCallback((id) => {
        setSelectedShops((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const buildCatalogParams = useCallback(
        (extra = {}) => {
            const params = { ...extra };
            if (shopsKey) {
                params.shops = shopsKey;
                params.shop_match = shopMatchMode;
            }
            return params;
        },
        [shopsKey, shopMatchMode],
    );

    return {
        selectedShops,
        toggleShop,
        shopMatchMode,
        setShopMatchMode,
        buildCatalogParams,
    };
}
