import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Forgot password — AnalyzeIt',
  description: 'Reset access to your AnalyzeIt account.',
};

export default function ForgotPasswordPage() {
  return (
    <LegalLayout title="Forgot password">
      <p>
        Self-serve password reset is not available in the product yet. If you cannot sign in, email
        us from the address on the account and we will help you regain access.
      </p>

      <LegalSection title="What to send">
        <ul className="list-disc pl-5 space-y-2">
          <li>The email address on the account</li>
          <li>A short note that you cannot sign in</li>
        </ul>
        <p className="pt-2">
          Write to{' '}
          <a href="mailto:hello@analyzeit.ai?subject=Password%20reset" className="text-[#E3836C] hover:underline">
            hello@analyzeit.ai
          </a>
          .
        </p>
      </LegalSection>

      <p>
        Remembered it?{' '}
        <Link href="/login" className="text-[#E3836C] hover:underline">
          Sign in
        </Link>
        {' '}or{' '}
        <Link href="/login?tab=register" className="text-[#E3836C] hover:underline">
          create a new account
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
