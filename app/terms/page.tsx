import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service — AnalyzeIt',
  description: 'The terms that govern your AnalyzeIt account and use of the workspace.',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="September 11, 2026">
      <p>
        These Terms of Service (“Terms”) are an agreement between you and AnalyzeIt Inc. for use of
        the AnalyzeIt website, applications, and related services (the “Service”). By creating an
        account or signing in, you agree to these Terms, the{' '}
        <a href="/privacy" className="text-[#E3836C] hover:underline">
          Privacy Policy
        </a>
        , and the{' '}
        <a href="/acceptable-use" className="text-[#E3836C] hover:underline">
          Acceptable Use Policy
        </a>
        .
      </p>

      <LegalSection title="1. The Service">
        <p>
          AnalyzeIt is an analytics workspace. Chat, research, globe, dashboards, connectors,
          billing, and other product features are available only to authenticated account holders.
          Marketing pages (including this site’s homepage and legal pages) may be viewed without an
          account.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts">
        <p>
          You must provide accurate registration information and keep your credentials confidential.
          You are responsible for activity under your account. Notify us immediately if you suspect
          unauthorized access. We may suspend or close accounts that violate these Terms or that
          present a security risk.
        </p>
      </LegalSection>

      <LegalSection title="3. Plans and payment">
        <p>
          Free and paid plans are described on the site. Paid upgrades are processed by PayU.
          Fees are billed according to the plan you select. Taxes may apply. See our{' '}
          <a href="/refunds" className="text-[#E3836C] hover:underline">
            Refund Policy
          </a>{' '}
          for cancellations and refunds. We may change plan features or prices with notice for
          subsequent billing periods.
        </p>
      </LegalSection>

      <LegalSection title="4. Your content">
        <p>
          You retain rights to data you upload, connect, or generate in the workspace (“Customer
          Content”). You grant AnalyzeIt a limited license to host, process, and display Customer
          Content solely to provide the Service to you. You represent that you have the rights
          needed to use that content with AnalyzeIt.
        </p>
      </LegalSection>

      <LegalSection title="5. Assistant output">
        <p>
          Chat and research answers are generated with automated systems. They may be incomplete or
          incorrect. You are responsible for reviewing outputs before relying on them for business,
          financial, or operational decisions. AnalyzeIt is not a substitute for professional
          advice.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>
          You may not misuse the Service, attempt to access another user’s workspace, reverse
          engineer the product except as allowed by law, or use the assistant to generate unlawful
          content. Details are in the{' '}
          <a href="/acceptable-use" className="text-[#E3836C] hover:underline">
            Acceptable Use Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Intellectual property">
        <p>
          AnalyzeIt and its logos, interface, and software are owned by AnalyzeIt Inc. These Terms
          do not transfer any AnalyzeIt intellectual property to you except the limited right to
          use the Service while your account is in good standing.
        </p>
      </LegalSection>

      <LegalSection title="8. Availability and changes">
        <p>
          We aim for a reliable Service but do not guarantee uninterrupted availability. We may
          modify, suspend, or discontinue features. Preview connectors and experimental tools may
          change or be removed without notice.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers and liability">
        <p>
          The Service is provided “as is”. To the fullest extent permitted by law, AnalyzeIt
          disclaims implied warranties of merchantability, fitness for a particular purpose, and
          non-infringement. AnalyzeIt’s aggregate liability arising from these Terms is limited to
          the amounts you paid us in the twelve months before the claim, or fifty US dollars if you
          are on a free plan.
        </p>
      </LegalSection>

      <LegalSection title="10. Termination">
        <p>
          You may stop using the Service and request account deletion at any time. We may terminate
          access for breach of these Terms. Sections that by nature should survive (including
          intellectual property, disclaimers, and liability limits) remain in effect.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions about these Terms:{' '}
          <a href="mailto:legal@analyzeit.ai" className="text-[#E3836C] hover:underline">
            legal@analyzeit.ai
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
