import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function loadShare(token: string): Promise<{ title: string; text: string } | null> {
  try {
    const res = await fetch(`${API}/v1/shares/${encodeURIComponent(token)}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as { title: string; text: string };
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
    return <main className="mx-auto max-w-xl p-8">This result is no longer available.</main>;
  }
  return (
    <main className="mx-auto max-w-xl p-8">
      <p className="text-xs uppercase tracking-widest text-[#C45A42]">AnalyzeIt</p>
      <h1 className="mt-2 font-serif text-3xl">{data.title}</h1>
      <p className="mt-4 whitespace-pre-wrap text-[#3F3830]">{data.text}</p>
      <a href="/research" className="mt-8 inline-block text-sm text-[#C45A42]">
        Try a question
      </a>
    </main>
  );
}
