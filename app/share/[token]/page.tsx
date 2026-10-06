import type { Metadata } from 'next';
import { ChartCard } from '../../Components/research/ChartCard';
import { FindingCards } from '../../Components/research/FindingCards';
import { parseExtras } from '../../lib/chatExtras.mjs';
import { parseFindings, withoutFindingList } from '../../lib/findings.mjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Shared {
  title: string;
  text: string;
  charts?: unknown[];
  findings?: unknown;
  sources?: Array<{ title: string; url: string }>;
  created_at?: string | null;
}

async function loadShare(token: string): Promise<Shared | null> {
  try {
    const res = await fetch(`${API}/v1/shares/${encodeURIComponent(token)}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as Shared;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await loadShare(token);
  const title = data?.title || 'AnalyzeIt result';
  const description = (data?.text || 'A shared AnalyzeIt result').slice(0, 180);
  return {
    title,
    description,
    robots: { index: false, follow: false }, // a shared link is private to whoever has it
    openGraph: {
      title,
      description,
      images: [`/share/${token}/opengraph-image`],
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadShare(token);
  if (!data) {
    return <main className="mx-auto max-w-xl p-8">This result is no longer available. The owner may have turned the link off, or it has expired.</main>;
  }
  const { charts } = parseExtras({ charts: data.charts });
  const findings = parseFindings(data.findings);
  const sources = (data.sources || []).filter((s) => /^https?:\/\//i.test(s.url));
  const date = data.created_at ? new Date(data.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '';
  return (
    <main className="mx-auto max-w-2xl p-8">
      <p className="text-xs uppercase tracking-widest text-[#C45A42]">AnalyzeIt report{date ? ` · ${date}` : ''}</p>
      <h1 className="mt-2 font-serif text-3xl">{data.title}</h1>
      <p className="mt-4 whitespace-pre-wrap text-[#3F3830] dark:text-[#E4DBD1]">{findings ? withoutFindingList(data.text) : data.text}</p>
      {findings ? <FindingCards data={findings} /> : null}
      {charts.length ? (
        <div className="mt-6 space-y-4">
          {charts.map((c, i) => (
            <ChartCard key={i} chart={c} />
          ))}
        </div>
      ) : null}
      {sources.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold">Sources</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} rel="noopener noreferrer nofollow" target="_blank" className="text-[#C45A42] underline">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <p className="mt-10 text-xs text-[#6B6157]">Written by an AI from the owner&apos;s data and public sources. Check important figures before relying on them.</p>
      <a href="/research" className="mt-4 inline-block text-sm text-[#C45A42]">
        Try a question
      </a>
    </main>
  );
}
