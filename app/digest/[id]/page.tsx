'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { ChatMarkdown } from '../../Components/chat/ChatMarkdown';
import { FindingCards } from '../../Components/research/FindingCards';
import { getDigest, type DigestDoc } from '../../lib/digestApi';
import { parseFindings, withoutFindingList } from '../../lib/findings.mjs';

export default function DigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<DigestDoc | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    getDigest(id)
      .then((d) => live && setDoc(d))
      .catch(() => live && setError('This digest could not be opened. It may belong to another account, or be older than the last twelve.'));
    return () => {
      live = false;
    };
  }, [id]);

  const findings = doc ? parseFindings(doc.findings) : null;
  const date = doc?.created_at ? new Date(doc.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' }) : '';
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[var(--text-primary)]">
      <nav className="mb-8 text-sm">
        <Link href="/connectors" className="text-[var(--text-muted)] hover:text-[var(--finding-accent)]">
          ← Connectors
        </Link>
      </nav>
      {error ? <p role="alert">{error}</p> : null}
      {doc ? (
        <article className="space-y-5">
          <header>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Weekly digest{date ? ` · ${date}` : ''}</p>
            <h1 className="mt-1 font-serif text-3xl">{doc.project_name || 'Your project'}</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{doc.question}</p>
          </header>
          <div className="text-[15px] leading-relaxed">
            <ChatMarkdown text={withoutFindingList(doc.text)} />
          </div>
          {findings ? <FindingCards data={findings} /> : null}
        </article>
      ) : !error ? (
        <p className="text-sm text-[var(--text-muted)]">Opening…</p>
      ) : null}
    </main>
  );
}
