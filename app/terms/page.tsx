import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';
import { EMAIL, JURISDICTION, LEGAL_NAME } from '../lib/legalEntity';

export const metadata: Metadata = {
  title: 'Terms of Service — AnalyzeIt',
  description: 'The terms that govern your AnalyzeIt account and use of the workspace.',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="September 11, 2026">
      <p>
        These Terms of Service (“Terms”) are an agreement between you and {LEGAL_NAME} for use of
        the AnalyzeIt website, applications, and related services (the “Service”). By creating an
        account or signing in, you agree to these Terms, the{' '}
        <a href="/privacy" className="text-[#E3836C] hover:underline">
          Privacy Policy
        </a>
        , and the{' '}
        <a href="/acceptable-use" className="text-[#E3836C] hover:underline">
          Acceptable Use Policy
        </a>
        . You must be at least 18 years old to use the Service.
      </p>

      <LegalSection title="1. The Service">
        <p>
          AnalyzeIt is a digital analytics workspace. Chat, research, globe, dashboards, connectors,
          billing, and other product features are available only to authenticated account holders.
          Marketing and legal pages may be viewed without an account.
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

      <LegalSection title="3. Licence">
        <p>
          We grant you a limited, non-exclusive, non-transferable, revocable licence to use the
          Service while your account is in good standing. You may not reverse engineer the product
          except as allowed by law, scrape the Service, or sublicense access.
        </p>
      </LegalSection>

      <LegalSection title="4. Plans and payment">
        <p>
          Free and paid plans are listed on{' '}
          <a href="/products" className="text-[#E3836C] hover:underline">
            Products
          </a>
          . Paid upgrades are processed by PayU. Charges are in Indian Rupees (INR); USD amounts on
          the site are for reference only. Taxes may apply. See the{' '}
          <a href="/refund" className="text-[#E3836C] hover:underline">
            Refund &amp; Cancellation Policy
          </a>{' '}
          for cancellations and refunds. We may change plan features or prices with notice for
          subsequent billing periods.
        </p>
      </LegalSection>

      <LegalSection title="5. Your content">
        <p>
          You retain rights to data you upload, connect, or generate (“Customer Content”). You grant
          {LEGAL_NAME} a limited licence to host, process, and display Customer Content solely to
          provide the Service to you.
        </p>
      </LegalSection>

      <LegalSection title="6. Assistant output">
        <p>
          Chat and research answers are generated with automated systems and may be incomplete or
          incorrect. You are responsible for reviewing outputs before relying on them. AnalyzeIt is
          not a substitute for professional advice.
        </p>
      </LegalSection>

      <LegalSection title="7. Acceptable use">
        <p>
          You may not misuse the Service, access another user’s workspace, or use the assistant to
          generate unlawful content. Details are in the{' '}
          <a href="/acceptable-use" className="text-[#E3836C] hover:underline">
            Acceptable Use Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Intellectual property">
        <p>
          AnalyzeIt and its logos, interface, and software are owned by {LEGAL_NAME}. These Terms do
          not transfer any intellectual property to you except the limited right to use the Service.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers and liability">
        <p>
          The Service is provided “as is”. To the fullest extent permitted by law, {LEGAL_NAME}{' '}
          disclaims implied warranties of merchantability, fitness for a particular purpose, and
          non-infringement. Aggregate liability arising from these Terms is limited to the amounts
          you paid us in the twelve months before the claim, or ₹4,000 if you are on a free plan.
        </p>
      </LegalSection>

      <LegalSection title="10. Termination">
        <p>
          You may stop using the Service and request account deletion at any time. We may terminate
          access for breach of these Terms. Surviving sections (intellectual property, disclaimers,
          liability) remain in effect.
        </p>
      </LegalSection>

      <LegalSection title="11. Governing law">
        <p>
          These Terms are governed by the laws of {JURISDICTION}, without regard to conflict-of-law
          rules. Courts at that jurisdiction have exclusive venue, except where applicable consumer
          law requires otherwise.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Questions:{' '}
          <a href={`mailto:${EMAIL.legal}`} className="text-[#E3836C] hover:underline">
            {EMAIL.legal}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
