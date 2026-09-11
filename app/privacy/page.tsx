import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — AnalyzeIt',
  description: 'How AnalyzeIt collects, uses, and protects personal and workspace data.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 11, 2026">
      <p>
        AnalyzeIt Inc. (“AnalyzeIt”, “we”, “us”) provides an analytics workspace that lets signed-in
        users chat with an assistant, build dashboards, connect data sources, and manage billing.
        This policy explains what we collect, why we collect it, and the choices you have. The
        product is only available to people with an AnalyzeIt account.
      </p>

      <LegalSection title="1. Information we collect">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Account data:</strong> name, email address, password (stored as a hash), plan
            tier, and profile preferences.
          </li>
          <li>
            <strong>Workspace data:</strong> projects, chat messages, research queries, dashboard
            layouts, custom objects, annotations, and export history you create while signed in.
          </li>
          <li>
            <strong>Connector data:</strong> credentials and synced records from sources you connect
            (for example Stripe or Salesforce). Credentials are encrypted at rest when a vault key
            is configured.
          </li>
          <li>
            <strong>Billing data:</strong> plan selection, transaction identifiers, and payment
            status processed by PayU. We do not store full card numbers on AnalyzeIt servers.
          </li>
          <li>
            <strong>Usage data:</strong> token and feature usage needed to enforce plan limits, plus
            technical logs such as IP address, browser type, and error events.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use information">
        <p>We use this information to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Create and authenticate your account and keep you signed in.</li>
          <li>Provide chat, research, globe, dashboard, connectors, and billing features.</li>
          <li>Send queries and necessary context to language-model and data providers so the assistant can answer you.</li>
          <li>Process payments, apply entitlements, and prevent abuse.</li>
          <li>Improve reliability, debug issues, and communicate service notices.</li>
        </ul>
        <p>
          We do not sell your personal information. Private business data you connect is not used to
          train public language models.
        </p>
      </LegalSection>

      <LegalSection title="3. Incognito mode">
        <p>
          When Incognito is on, queries and session data are treated as ephemeral and are not saved
          to your durable history on AnalyzeIt. Providers that process a live request may still
          receive the content of that request in order to generate a response.
        </p>
      </LegalSection>

      <LegalSection title="4. Sharing">
        <p>We share data only with:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Infrastructure and database hosts that store your workspace.</li>
          <li>Model, search, maps, and connector providers required to fulfill a request you make.</li>
          <li>PayU, to process payments you initiate.</li>
          <li>Authorities if required by law, or to protect AnalyzeIt, our users, or the public.</li>
        </ul>
        <p>
          More detail for enterprise customers is in our{' '}
          <a href="/dpa" className="text-[#E3836C] hover:underline">
            Data Processing Addendum
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Retention">
        <p>
          Account and workspace data are kept while your account is active. You can delete projects
          from the dashboard. If you ask us to close your account, we delete or anonymize personal
          data unless we must retain a limited record for legal, security, or billing reasons.
        </p>
      </LegalSection>

      <LegalSection title="6. Your choices">
        <p>
          You can access and update your name and password from your profile, export project data
          where the product supports it, and request deletion by writing to{' '}
          <a href="mailto:privacy@analyzeit.ai" className="text-[#E3836C] hover:underline">
            privacy@analyzeit.ai
          </a>
          . Depending on where you live, you may also have rights to access, correct, delete,
          restrict, or port your data, and to object to certain processing.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies">
        <p>
          We use essential storage (including local storage for your session token and theme) so the
          product can function. See the{' '}
          <a href="/cookies" className="text-[#E3836C] hover:underline">
            Cookie Policy
          </a>{' '}
          for details.
        </p>
      </LegalSection>

      <LegalSection title="8. Children">
        <p>
          AnalyzeIt is not directed to children under 16, and we do not knowingly collect personal
          information from them. If you believe a child has created an account, contact us and we
          will delete it.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          Privacy questions: {' '}
          <a href="mailto:privacy@analyzeit.ai" className="text-[#E3836C] hover:underline">
            privacy@analyzeit.ai
          </a>
          . General support: {' '}
          <a href="mailto:hello@analyzeit.ai" className="text-[#E3836C] hover:underline">
            hello@analyzeit.ai
          </a>
          . AnalyzeIt Inc.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
