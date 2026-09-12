import type { MetadataRoute } from 'next';
import { SITE_URL } from './lib/site';

const publicPaths: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/products', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/security', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/dpa', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/acceptable-use', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/shipping', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/refund', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return publicPaths.map(({ path, changeFrequency, priority }) => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
