import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '../../Components/docs/DocPage';

export const metadata: Metadata = {
  title: 'Connectors: what you can connect — AnalyzeIt docs',
  description: 'Which data sources AnalyzeIt can connect to today (Razorpay, Stripe, Salesforce, GitHub, SQL databases, public datasets), how access is controlled, and what is still rolling out.',
  alternates: { canonical: '/docs/connectors' },
};

export default function Page() {
  return (
    <DocPage title="Connectors" subtitle="What you can connect, how you stay in control of it, and what is not finished.">
      <h2>What you can connect</h2>
      <ul>
        <li><strong>Razorpay</strong>, with a key id and secret. Read-only payments and refunds.</li>
        <li><strong>Stripe and Salesforce</strong>, with an API key or access token.</li>
        <li><strong>GitHub</strong>, through OAuth.</li>
        <li><strong>SQL databases</strong>, queried read-only.</li>
        <li><strong>Public datasets</strong> from Kaggle, Hugging Face and OpenML.</li>
        <li><strong>Your own files</strong>: CSV, spreadsheets, JSON and PDFs, uploaded into a project.</li>
      </ul>
      <p>Each connector card in the app says whether it can sync live or imports a snapshot, so you know what you are getting before you connect it.</p>

      <h2>Razorpay, in detail</h2>
      <p>
        Generate a key in Razorpay (Account &amp; Settings, then API Keys) and paste the key id and secret. A test-mode key works if you want to look first. The secret goes into an
        encrypted vault and is never shown again.
      </p>
      <ul>
        <li>AnalyzeIt only reads payments and refunds. It never moves money.</li>
        <li>It stores amounts (in rupees), status, method, bank, error code and time. It does not store customer email, phone, card or UPI details.</li>
        <li>The first sync looks back 90 days and reads up to 3,000 payments and 3,000 refunds; later syncs read what is new and re-check the last week, because a payment can change status after it is created.</li>
        <li>When you ask a question, the data is refreshed first if it has not been for 15 minutes. You can also sync from the connector card.</li>
        <li>If Razorpay rejects the saved keys (for example, after you regenerate them), the card says so and asks you to reconnect.</li>
      </ul>
      <p>
        Ask “what is going wrong with my payments?” and AnalyzeIt compares failure and refund rates across method and bank and looks for the date a rate jumped. Read more in{' '}
        <Link href="/docs/discovery">Discovery</Link>.
      </p>

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
