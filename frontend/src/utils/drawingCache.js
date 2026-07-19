// frontend/src/utils/drawingCache.js

const CACHE_NAME = 'rafapp-drawings-cache';

/**
 * Normalizes drawing URL to a clean string suitable for cache matching
 */
const getCacheKey = (filepath) => {
    if (!filepath) return '';
    // If it's a full URL, use it directly
    if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
        return filepath;
    }
    // Otherwise construct the base path
    return `/drawings/download/filepath?path=${encodeURIComponent(filepath)}`;
};

/**
 * Checks if a drawing is cached in local storage.
 * Returns true if cached, false otherwise.
 */
export const checkIfCached = async (filepath) => {
    if (!('caches' in window) || !filepath) return false;
    try {
        const cache = await caches.open(CACHE_NAME);
        const cacheKey = getCacheKey(filepath);
        const match = await cache.match(cacheKey);
        return !!match;
    } catch (err) {
        console.error('Error checking drawing cache status:', err);
        return false;
    }
};

/**
 * Retrieves a cached drawing as a local Blob URL.
 * Returns null if not cached.
 */
export const getDrawingBlobUrl = async (filepath) => {
    if (!('caches' in window) || !filepath) return null;
    try {
        const cache = await caches.open(CACHE_NAME);
        const cacheKey = getCacheKey(filepath);
        const response = await cache.match(cacheKey);
        if (!response) return null;
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (err) {
        console.error('Error reading drawing from cache:', err);
        return null;
    }
};

/**
 * Fetches a drawing from the server, caches it locally, and returns its local Blob URL.
 */
export const cacheDrawing = async (drawingId, filepath, axiosInstance) => {
    if (!filepath) throw new Error('Filepath is required to cache drawing.');
    
    const cacheKey = getCacheKey(filepath);
    const downloadUrl = `/drawings/download/${drawingId}`;

    // 1. Fetch file as arraybuffer/blob using existing axios session
    const response = await axiosInstance.get(downloadUrl, {
        responseType: 'blob'
    });

    const blob = response.data;
    const contentType = response.headers['content-type'] || 'application/pdf';

    // 2. Put into Cache Storage
    if ('caches' in window) {
        try {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = new Response(blob, {
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': blob.size.toString(),
                    'X-Cached-At': new Date().toISOString()
                }
            });
            await cache.put(cacheKey, cachedResponse);
        } catch (cacheErr) {
            console.error('Failed to write drawing to Cache Storage:', cacheErr);
        }
    }

    return URL.createObjectURL(blob);
};

/**
 * Deletes a drawing from the local cache.
 */
export const purgeDrawingFromCache = async (filepath) => {
    if (!('caches' in window) || !filepath) return;
    try {
        const cache = await caches.open(CACHE_NAME);
        const cacheKey = getCacheKey(filepath);
        await cache.delete(cacheKey);
    } catch (err) {
        console.error('Error purging drawing from cache:', err);
    }
};
