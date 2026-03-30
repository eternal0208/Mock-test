const getApiUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    url = url.trim();
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    // Remove trailing slash if present
    return url.replace(/\/$/, '');
};

export const API_BASE_URL = getApiUrl();
console.log("🚀 API Configured at:", API_BASE_URL);
