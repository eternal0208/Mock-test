const getApiUrl = () => {
    // If NEXT_PUBLIC_API_URL is set in .env or dashboard, use it
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');

    // CHECK: Are we running locally?
    const isLocal = typeof window !== 'undefined' && 
                   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocal) return 'http://localhost:5001';

    // FALLBACK: If in production and no URL set, try targeting a sibling 'api' subdomain or the main domain
    const prodUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host.replace('www.', 'api.')}` : '';
    return prodUrl;
};

export const API_BASE_URL = getApiUrl();
console.log("🚀 API Configured at:", API_BASE_URL);
