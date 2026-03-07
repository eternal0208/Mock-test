const NodeCache = require('node-cache');

// Standard TTL of 5 minutes (300 seconds) for caching API responses
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Middleware to cache express route responses
 * Usage: app.get('/route', cacheMiddleware(300), (req, res) => { ... })
 * 
 * @param {number} duration - Time to live in seconds
 */
const cacheMiddleware = (duration = 300) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Use the request original URL as the cache key
        const key = `__express__${req.originalUrl || req.url}`;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            console.log(`[CACHE HIT] Returning cached data for: ${req.originalUrl || req.url}`);
            return res.json(cachedResponse);
        } else {
            // Override res.json to store the response in cache before sending
            const originalSend = res.json;
            res.json = (body) => {
                // Restore original res.json to avoid double calling
                res.json = originalSend;

                // Do not cache error responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[CACHE MISS] Caching new data for: ${req.originalUrl || req.url}`);
                    cache.set(key, body, duration);
                }

                return originalSend.call(this, body);
            };
            next();
        }
    };
};

/**
 * Utility to clear specific cache keys manually (e.g., on POST/PUT actions)
 * @param {string} prefix - The beginning of the route URL to invalidate (e.g. '/api/tests/series')
 */
const clearCacheWithPrefix = (prefix) => {
    const keys = cache.keys();
    const keysToDelete = keys.filter(k => k.includes(prefix));
    keysToDelete.forEach(k => cache.del(k));
    console.log(`[CACHE CLEARED] Cleared ${keysToDelete.length} keys matching prefix: ${prefix}`);
};

module.exports = {
    cacheMiddleware,
    clearCacheWithPrefix
};
