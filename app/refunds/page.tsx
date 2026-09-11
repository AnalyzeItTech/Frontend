import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Refund Policy — AnalyzeIt',
  description: 'How AnalyzeIt handles paid plan cancellations and refunds.',
};

export default function RefundsPage() {
  return (
    <LegalLayout title="Refund Policy" updated="September 11, 2026">
      <p>
        Paid AnalyzeIt plans are billed through PayU. This policy explains cancellations and
        refunds. It is part of the{' '}
        <a href="/terms" className="text-[#E3836C] hover:underline">
          Terms of Service
        </a>
        .
      </p>

      <LegalSection title="1. Free plan">
        <p>
          The free plan does not require payment. You can close a free account at any time from
          support if self-serve deletion is not yet available.
        </p>
      </LegalSection>

      <LegalSection title="2. Cancellation">
        <p>
          You can cancel a paid subscription from your profile or billing page. Cancellation stops
          future renewals. You keep paid features until the end of the period already paid, unless
          we state otherwise at checkout.
        </p>
      </LegalSection>

      <LegalSection title="3. Refunds">
        <p>
          Fees are generally non-refundable once a billing period has started. If a charge failed,
          duplicated, or was taken in error, contact us within fourteen days with the PayU
          transaction id. We will review and, where appropriate, refund or credit the amount.
        </p>
        <p>
          Consumers in jurisdictions with mandatory cooling-off rights keep those rights to the
          extent they cannot be waived.
        </p>
      </LegalSection>

      <LegalSection title="4. Contact">
        <p>
          Billing questions:{' '}
          <a href="mailto:hello@analyzeit.ai" className="text-[#E3836C] hover:underline">
            hello@analyzeit.ai
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
