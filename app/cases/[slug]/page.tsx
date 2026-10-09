import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DocPage } from '../../Components/docs/DocPage';
import { JsonLd, breadcrumbs } from '../../Components/seo/JsonLd';
import { DemoClient } from '../../demo/DemoClient';
import { LIVE_CASES, liveCase } from '../../lib/liveCases.mjs';
import { SITE_URL } from '../../lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return LIVE_CASES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = liveCase(slug);
  if (!c) return {};
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: `/cases/${c.slug}` },
    openGraph: { title: c.title, description: c.description, url: `${SITE_URL}/cases/${c.slug}`, type: 'article' },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = liveCase(slug);
  if (!c) notFound();
  return (
    <DocPage title={c.h1} subtitle={c.subtitle}>
      <JsonLd data={breadcrumbs(SITE_URL, [{ name: 'Home', path: '/' }, { name: 'Worked examples', path: '/cases' }, { name: c.label, path: `/cases/${c.slug}` }])} />
      <h2>Ask it yourself</h2>
      <p>This runs live when the page opens, so the figure below is current, not a screenshot.</p>
      <DemoClient preset={c.question} />
      {c.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((t) => (
            <p key={t} className="mt-3">{t}</p>
          ))}
        </section>
      ))}
      <h2>How it works</h2>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>The question is recognised as a {c.kind === 'currency' ? 'currency conversion' : c.kind === 'weather' ? 'weather lookup' : 'unit conversion'}.</li>
        <li>A tool computes or fetches the result. No language model writes the number.</li>
        <li>You see the result, its source, and the label From tools · 0 tokens.</li>
      </ol>
      <p>
        More on the difference between tool answers and model answers: <Link href="/docs/how-answers-work">How answers work</Link>.
      </p>
      <h2>Related</h2>
      <ul>
        {c.related.map((r) => (
          <li key={r.slug}>
            <Link href={`/cases/${r.slug}`}>{r.label}</Link>
          </li>
        ))}
        <li>
          <Link href="/cases">All worked examples</Link>
        </li>
      </ul>
    </DocPage>
  );
}
