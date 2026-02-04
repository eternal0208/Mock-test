import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mock-test-website-7a18d.web.app';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/admin/'], // Hide private dashboard pages
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
