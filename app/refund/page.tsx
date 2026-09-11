import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';
import { EMAIL } from '../lib/legalEntity';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — AnalyzeIt',
  description: 'Cancellation, refund windows, and failed-renewal grace for AnalyzeIt paid plans.',
};

export default function RefundPage() {
  return (
    <LegalLayout title="Refund & Cancellation Policy" updated="September 11, 2026">
      <p>
        Paid AnalyzeIt plans are billed monthly through PayU in INR. This policy is part of the{' '}
        <a href="/terms" className="text-[#E3836C] hover:underline">
          Terms of Service
        </a>
        .
      </p>

      <LegalSection title="1. Cancellation">
        <p>
          You may cancel a paid subscription at any time from Billing or Profile. Cancellation
          stops future renewals. You keep paid features until the end of the period already paid.
        </p>
      </LegalSection>

      <LegalSection title="2. Refunds">
        <p>
          Request a refund within <strong>7 days</strong> of your first paid charge if the Service
          was materially unavailable. Write to{' '}
          <a href={`mailto:${EMAIL.support}`} className="text-[#E3836C] hover:underline">
            {EMAIL.support}
          </a>{' '}
          with your account email and PayU transaction id. Partial months after you have used paid
          features beyond a Free plan are not refunded, except where a charge failed, duplicated, or
          was taken in error.
        </p>
        <p>
          Consumers keep any mandatory cooling-off rights that cannot be waived in their
          jurisdiction.
        </p>
      </LegalSection>

      <LegalSection title="3. Failed renewals">
        <p>
          If a renewal payment fails, paid entitlements continue for a <strong>7-day</strong> grace
          period, then the account returns to Free.
        </p>
      </LegalSection>

      <LegalSection title="4. Chargebacks">
        <p>
          Contact us before filing a chargeback so we can investigate. Unjustified chargebacks may
          lead to account suspension.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <p>
          Billing:{' '}
          <a href={`mailto:${EMAIL.support}`} className="text-[#E3836C] hover:underline">
            {EMAIL.support}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
