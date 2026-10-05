import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '../../Components/docs/DocPage';

export const metadata: Metadata = {
  title: 'Connectors: what you can connect — AnalyzeIt docs',
  description: 'Which data sources AnalyzeIt can connect to today (Stripe, Salesforce, GitHub, SQL databases, public datasets), how access is controlled, and what is still rolling out.',
  alternates: { canonical: '/docs/connectors' },
};

export default function Page() {
  return (
    <DocPage title="Connectors" subtitle="What you can connect, how you stay in control of it, and what is not finished.">
      <h2>What you can connect</h2>
      <ul>
        <li><strong>Stripe and Salesforce</strong>, with an API key or access token.</li>
        <li><strong>GitHub</strong>, through OAuth.</li>
        <li><strong>SQL databases</strong>, queried read-only.</li>
        <li><strong>Public datasets</strong> from Kaggle, Hugging Face and OpenML.</li>
        <li><strong>Your own files</strong>: CSV, spreadsheets, JSON and PDFs, uploaded into a project.</li>
      </ul>
      <p>Each connector card in the app says whether it can sync live or imports a snapshot, so you know what you are getting before you connect it.</p>

      <h2>You decide what the assistant can read</h2>
      <p>
        Connected data becomes objects (tables) in a project. For each project you choose whether the assistant may read its data: ask me
        first, always allow, or never. You can override that per object, and “never” blocks the assistant from reading it at all.
      </p>
      <p>
        Changes are never made silently. If you ask the assistant to update a record, it shows you a before and after and waits for your
        approval.
      </p>

      <h2>Still rolling out</h2>
      <ul>
        <li>Delivery of reports by email, Slack and Notion. Reports are readable in the app today.</li>
        <li>Team invites and shared workspaces. Project sharing links with role-aware redaction are available now.</li>
      </ul>
      <p>
        Plans and limits are on <Link href="/docs/plans">What each plan includes</Link>. If a connector you need is missing,{' '}
        <Link href="/contact">tell us</Link>.
      </p>
    </DocPage>
  );
}
