import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LegalLayout } from '../../Components/legal/LegalLayout';
import { JsonLd, breadcrumbs } from '../../Components/seo/JsonLd';
import { GUIDES, guide, readMinutes } from '../../lib/guides.mjs';
import { SITE_NAME, SITE_URL } from '../../lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = guide(slug);
  if (!g) return {};
  return {
    title: `${g.title} — ${SITE_NAME}`,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { title: g.title, description: g.description, url: `${SITE_URL}/guides/${g.slug}`, type: 'article', publishedTime: g.published },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guide(slug);
  if (!g) notFound();
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: g.description,
    datePublished: g.published,
    dateModified: g.published,
    mainEntityOfPage: `${SITE_URL}/guides/${g.slug}`,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
  const others = GUIDES.filter((o) => o.slug !== g.slug);
  return (
    <LegalLayout title={g.title} eyebrow={false} showHeroUpdated={false} quietOperator subtitle={`${readMinutes(g)} min read · ${new Date(g.published).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`}>
      <JsonLd data={article} />
      <JsonLd data={breadcrumbs(SITE_URL, [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }, { name: g.title, path: `/guides/${g.slug}` }])} />
      <article className="max-w-2xl space-y-5 text-[15px] leading-relaxed text-[#3F3830] dark:text-[#E6DCD2] [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-[#322C28] dark:[&_h2]:text-[#F4EDE5] [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {g.blocks.map((b, i) =>
          b.h2 ? (
            <h2 key={i}>{b.h2}</h2>
          ) : b.ul ? (
            <ul key={i}>{b.ul.map((t) => <li key={t}>{t}</li>)}</ul>
          ) : b.ol ? (
            <ol key={i}>{b.ol.map((t) => <li key={t}>{t}</li>)}</ol>
          ) : (
            <p key={i}>{b.p}</p>
          ),
        )}
        <p>
          Read more: <Link href={g.cta.href} className="text-[#C45A42] underline underline-offset-2">{g.cta.label}</Link>, or{' '}
          <Link href="/demo" className="text-[#C45A42] underline underline-offset-2">try the live demo</Link> with no account.
        </p>
      </article>
      <section className="mt-10 max-w-2xl">
        <h2 className="font-serif text-xl text-[#322C28] dark:text-[#F4EDE5]">More guides</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/guides/${o.slug}`} className="text-[#C45A42] underline underline-offset-2">{o.title}</Link>
            </li>
          ))}
        </ul>
      </section>
    </LegalLayout>
  );
}
