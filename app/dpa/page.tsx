import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Data Processing Addendum — AnalyzeIt',
  description: 'How AnalyzeIt processes customer personal data on behalf of account holders.',
};

export default function DpaPage() {
  return (
    <LegalLayout title="Data Processing Addendum" updated="September 11, 2026">
      <p>
        This Data Processing Addendum (“DPA”) forms part of the{' '}
        <a href="/terms" className="text-[#E3836C] hover:underline">
          Terms of Service
        </a>{' '}
        when you use AnalyzeIt to process personal data in your workspace. AnalyzeIt acts as
        processor; you act as controller (or processor on behalf of your own customers).
      </p>

      <LegalSection title="1. Subject matter">
        <p>
          AnalyzeIt processes personal data that you submit through the Service — for example
          account fields, chat content, dashboard values, and records synced from connectors — to
          provide the workspace features you enable.
        </p>
      </LegalSection>

      <LegalSection title="2. Instructions">
        <p>
          We process that data only to provide, secure, and support the Service, and as otherwise
          documented in the{' '}
          <a href="/privacy" className="text-[#E3836C] hover:underline">
            Privacy Policy
          </a>
          , unless required by law.
        </p>
      </LegalSection>

      <LegalSection title="3. Subprocessors">
        <p>We use subprocessors to operate the Service, which may include:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Cloud hosting and database providers</li>
          <li>Language-model, search, and mapping providers used to fulfill your requests</li>
          <li>PayU for payment processing</li>
        </ul>
        <p>
          We remain responsible for subprocessors we engage. A current list is available on request
          at{' '}
          <a href="mailto:privacy@analyzeit.ai" className="text-[#E3836C] hover:underline">
            privacy@analyzeit.ai
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Security">
        <p>
          We implement technical and organizational measures described on our{' '}
          <a href="/security" className="text-[#E3836C] hover:underline">
            Security
          </a>{' '}
          page, including authentication, transport encryption, and credential encryption when a
          vault key is configured.
        </p>
      </LegalSection>

      <LegalSection title="5. Assistance and deletion">
        <p>
          We will reasonably assist with data-subject requests that you cannot fulfill in the
          product yourself. After account closure we delete or anonymize personal data as described
          in the Privacy Policy, except where retention is required by law.
        </p>
      </LegalSection>

      <LegalSection title="6. International transfers">
        <p>
          If we transfer personal data internationally, we use appropriate safeguards such as
          standard contractual clauses where required.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
