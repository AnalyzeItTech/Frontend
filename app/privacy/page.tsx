import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';
import { EMAIL, LEGAL_NAME } from '../lib/legalEntity';

export const metadata: Metadata = {
  title: 'Privacy Policy — AnalyzeIt',
  description: 'How AnalyzeIt collects, uses, and protects personal and workspace data.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 11, 2026">
      <p>
        {LEGAL_NAME} (“we”, “us”) provides AnalyzeIt, an analytics workspace for signed-in users.
        This policy explains what we collect, why, and the choices you have.
      </p>

      <LegalSection title="1. Information we collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Account data:</strong> name, email, password (stored as a hash), plan tier, and
            profile preferences.
          </li>
          <li>
            <strong>Workspace data:</strong> projects, chat messages, research queries, dashboard
            layouts, custom objects, and export history.
          </li>
          <li>
            <strong>Connector data:</strong> credentials and synced records from sources you connect.
            Credentials are encrypted at rest when a vault key is configured.
          </li>
          <li>
            <strong>Billing data:</strong> plan selection, transaction identifiers, and payment
            status processed by PayU. We do not store full card numbers.
          </li>
          <li>
            <strong>Usage data:</strong> token and feature usage for plan limits, plus technical
            logs (IP address, browser type, errors).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use information">
        <ul className="list-disc pl-5 space-y-2">
          <li>Create and authenticate your account.</li>
          <li>Provide chat, research, globe, dashboard, connectors, and billing.</li>
          <li>Send queries and necessary context to language-model and data providers to answer you.</li>
          <li>Process payments, apply entitlements, and prevent abuse.</li>
          <li>Improve reliability, debug issues, and send service notices.</li>
        </ul>
        <p>
          We do not sell your personal information. Private business data you connect is not used to
          train public language models.
        </p>
      </LegalSection>

      <LegalSection title="3. Sharing">
        <p>We share data only with:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Infrastructure and database hosts that store your workspace.</li>
          <li>Model, search, maps, and connector providers required to fulfill a request you make.</li>
          <li>PayU, to process payments you initiate.</li>
          <li>Authorities if required by law, or to protect {LEGAL_NAME}, our users, or the public.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Retention and cookies">
        <p>
          Account and workspace data are kept while your account is active. Essential storage
          (session token, theme) is used so the product can function. See the{' '}
          <a href="/cookies" className="text-[#E3836C] hover:underline">
            Cookie Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Your rights">
        <p>
          You can access and update your name and password from your profile, and request deletion
          at{' '}
          <a href={`mailto:${EMAIL.privacy}`} className="text-[#E3836C] hover:underline">
            {EMAIL.privacy}
          </a>
          . Depending on where you live, you may also have rights to access, correct, restrict, or
          port your data.
        </p>
      </LegalSection>

      <LegalSection title="6. International transfers">
        <p>
          Processors may handle data outside {LEGAL_NAME}’s country of registration. We use
          contractual and technical safeguards appropriate to the transfer.
        </p>
      </LegalSection>

      <LegalSection title="7. Children">
        <p>
          AnalyzeIt is not directed to children under 16. If you believe a child has created an
          account, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>
          Privacy:{' '}
          <a href={`mailto:${EMAIL.privacy}`} className="text-[#E3836C] hover:underline">
            {EMAIL.privacy}
          </a>
          . Support:{' '}
          <a href={`mailto:${EMAIL.support}`} className="text-[#E3836C] hover:underline">
            {EMAIL.support}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
