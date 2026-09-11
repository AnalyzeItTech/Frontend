import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';
import { EMAIL } from '../lib/legalEntity';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy — AnalyzeIt',
  description: 'AnalyzeIt is digital SaaS — no physical shipping. Delivery is account access.',
};

export default function ShippingPage() {
  return (
    <LegalLayout title="Shipping & Delivery Policy" updated="September 11, 2026">
      <p>
        AnalyzeIt is a digital software-as-a-service product. There is no physical shipping and no
        shipping charge.
      </p>

      <LegalSection title="1. What is delivered">
        <p>
          Delivery means access to your AnalyzeIt account (chat, dashboards, globe, connectors, and
          other workspace features included in your plan).
        </p>
      </LegalSection>

      <LegalSection title="2. When">
        <p>
          Access is typically <strong>immediate</strong> after successful signup or payment
          confirmation (within minutes). If provisioning is delayed, allow up to{' '}
          <strong>24 hours</strong>. Contact{' '}
          <a href={`mailto:${EMAIL.support}`} className="text-[#E3836C] hover:underline">
            {EMAIL.support}
          </a>{' '}
          if access is missing after that window.
        </p>
      </LegalSection>

      <LegalSection title="3. Delivery address">
        <p>
          The delivery address is the email on your AnalyzeIt account. Keep it accurate so we can
          reach you about billing and access.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
