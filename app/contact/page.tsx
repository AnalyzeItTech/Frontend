import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Contact — AnalyzeIt',
  description: 'Contact AnalyzeIt for support, privacy, security, and legal questions.',
};

export default function ContactPage() {
  return (
    <LegalLayout title="Contact" updated="September 11, 2026">
      <p>
        We are glad to hear from you. Product features such as chat still require an account;
        these inboxes are for humans.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: 'Support', email: 'hello@analyzeit.ai', note: 'Accounts, billing, and product help' },
          { label: 'Privacy', email: 'privacy@analyzeit.ai', note: 'Data requests and this policy' },
          { label: 'Security', email: 'security@analyzeit.ai', note: 'Vulnerability reports' },
          { label: 'Legal', email: 'legal@analyzeit.ai', note: 'Terms, DPA, and contracts' },
        ].map((item) => (
          <a
            key={item.email}
            href={`mailto:${item.email}`}
            className="rounded-2xl border border-[#4A4238]/10 dark:border-[#3A3430] bg-white/50 dark:bg-[#211E1C] p-5 hover:border-[#E3836C]/40 transition-colors"
          >
            <div className="font-mono text-[11px] uppercase tracking-widest text-[#4A4238]/45 dark:text-[#91867E] mb-1">
              {item.label}
            </div>
            <div className="font-medium text-[#4A4238] dark:text-[#F4EDE5]">{item.email}</div>
            <div className="text-xs mt-1 text-[#4A4238]/55 dark:text-[#C5B9AE]">{item.note}</div>
          </a>
        ))}
      </div>

      <LegalSection title="Hours">
        <p>
          We read email on business days. For payment issues, include your account email and PayU
          transaction id.
        </p>
      </LegalSection>

      <LegalSection title="Need the product?">
        <p>
          <Link href="/login?tab=register" className="text-[#E3836C] hover:underline">
            Create an account
          </Link>{' '}
          or{' '}
          <Link href="/login" className="text-[#E3836C] hover:underline">
            sign in
          </Link>{' '}
          to use chat, dashboards, and the rest of the workspace.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
