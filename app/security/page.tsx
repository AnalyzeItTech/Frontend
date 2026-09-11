import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Security — AnalyzeIt',
  description: 'How AnalyzeIt protects accounts, credentials, and workspace data.',
};

export default function SecurityPage() {
  return (
    <LegalLayout title="Security" updated="September 11, 2026">
      <p>
        AnalyzeIt is built so that product features stay behind an account, credentials stay
        scoped, and workspace data is only loaded for the signed-in user.
      </p>

      <LegalSection title="1. Account gate">
        <p>
          Chat, research, globe, dashboards, connectors, objects, billing, and related tools require
          a valid AnalyzeIt account. Visitors without a session are sent to sign in or register.
          API routes that serve customer data expect a bearer token.
        </p>
      </LegalSection>

      <LegalSection title="2. Authentication">
        <p>
          Passwords are stored as hashes. Sessions use a bearer token kept in the browser. We
          recommend a unique password and signing out on shared devices. Social sign-in may be
          offered later; until then, email and password are the supported method.
        </p>
      </LegalSection>

      <LegalSection title="3. Read-only IAM for connectors">
        <p>
          When you connect an external system, grant the minimum access the connector needs —
          preferably a read-only role. AnalyzeIt is designed to display and analyze data, not to
          change source systems. Connector credentials are encrypted at rest when a vault key is
          configured. Treat current provider sync as preview until live pulls are fully rolled out.
        </p>
      </LegalSection>

      <LegalSection title="4. Transport and isolation">
        <p>
          Production traffic is served over HTTPS. Workspace records are scoped to your account.
          Project sharing uses explicit links and role-aware UI redaction. Incognito mode avoids
          writing durable history for that session.
        </p>
      </LegalSection>

      <LegalSection title="5. Model providers">
        <p>
          Assistant requests are sent to language-model and search providers as needed to answer
          you. Do not paste secrets into chat that you would not share with those processors. We do
          not use your private connected business data to train public models.
        </p>
      </LegalSection>

      <LegalSection title="6. Reporting issues">
        <p>
          If you discover a vulnerability, email{' '}
          <a href="mailto:security@analyzeit.ai" className="text-[#E3836C] hover:underline">
            security@analyzeit.ai
          </a>
          . Please do not publicly disclose an issue until we have had a reasonable chance to
          investigate and fix it.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
