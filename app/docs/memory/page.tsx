import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '../../Components/docs/DocPage';
import { PLAN_NAMES } from '../../lib/planCatalog.mjs';
import { CONTEXT_RETENTION_TOKENS, RETENTION_HOT_TOKENS, formatContextRetention } from '../../lib/contextWall.mjs';

export const metadata: Metadata = {
  title: 'What AnalyzeIt memory stores and how it is used — AnalyzeIt docs',
  description: 'What “memory” means in AnalyzeIt: what is stored, how it is searched, how citations work, and how to see, rename and delete what is kept.',
  alternates: { canonical: '/docs/memory' },
};

export default function Page() {
  const f = (n: number) => formatContextRetention(n);
  return (
    <DocPage title="Memory" subtitle="What AnalyzeIt keeps from your files and notes, how it finds it again, and how you stay in control.">
      <h2>What is stored</h2>
      <p>
        Files you upload, data you import and notes from your analyses can be kept as <strong>sources</strong>. For each source AnalyzeIt
        keeps the original text, split into passages, plus a short summary of each group of passages.
      </p>

      <h2>How much you can keep</h2>
      <p>
        The total is measured in tokens (roughly four characters each): {PLAN_NAMES.free} {f(CONTEXT_RETENTION_TOKENS.free)},{' '}
        {PLAN_NAMES.premium} {f(CONTEXT_RETENTION_TOKENS.premium)}, {PLAN_NAMES.premium_plus} {f(CONTEXT_RETENTION_TOKENS.premium_plus)}.
        Your usage meter is on the <Link href="/memory">Memory page</Link>.
      </p>
      <p>
        Not every stored token is instantly searchable by meaning. {PLAN_NAMES.free} keeps the whole library hot
        ({f(RETENTION_HOT_TOKENS.free)}). {PLAN_NAMES.premium} hot-searches about {f(RETENTION_HOT_TOKENS.premium)} of its{' '}
        {f(CONTEXT_RETENTION_TOKENS.premium)}; {PLAN_NAMES.premium_plus} about {f(RETENTION_HOT_TOKENS.premium_plus)} of its{' '}
        {f(CONTEXT_RETENTION_TOKENS.premium_plus)}. The rest stays reachable through summaries and exact words.
      </p>

      <h2>How it is found again</h2>
      <p>
        When you ask a question, the assistant searches your sources in three ways: by <em>meaning</em> (a question phrased differently
        from the text can still match), by <em>exact words</em> (a name, an id or an error code), and through the <em>summaries</em>. It then
        opens the original passage and quotes it, rather than answering from a summary.
      </p>
      <p>
        A very large library is not compared passage by passage by meaning: that part is the hot-searchable subset above. Everything stays
        reachable through summaries and exact words, and the assistant can open the original text of anything it finds.
      </p>

      <h2>Citations</h2>
      <p>
        An answer built from your stored notes shows a <em>From your notes</em> chip for each source it used, with the name, the date it
        was added, and the passage. Click it to read the passage.
      </p>

      <h2>See, rename and delete</h2>
      <ul>
        <li>The <Link href="/memory">Memory page</Link> lists every source with its name, size, how often it has been used in answers, and how searchable it is.</li>
        <li>You can rename a source, read the start of what was stored, pin it, or delete it.</li>
        <li>Deleting a source removes its text, summaries, search entries and any excerpts of it kept in your chat history, and refunds its tokens.</li>
        <li>You can export everything you have stored as a zip file.</li>
      </ul>

      <h2>Privacy</h2>
      <p>
        Stored sources are tied to your account and are only read while answering your questions. See the <Link href="/privacy">privacy policy</Link> for how data is handled.
      </p>

      <h2>Availability</h2>
      <p>
        This memory system is being switched on for accounts gradually. If you do not see sources on your Memory page yet, it has not been
        enabled for your account.
      </p>
    </DocPage>
  );
}
