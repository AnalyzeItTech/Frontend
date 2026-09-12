import type { MetadataRoute } from 'next';
import { SITE_URL } from './lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/research',
        '/globe',
        '/connectors',
        '/objects',
        '/profile',
        '/billing',
        '/new-project',
        '/home',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
