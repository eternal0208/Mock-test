import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://www.apexmocktest.com';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/admin/'], // Hide private dashboard pages
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
