import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Cookie Policy — AnalyzeIt',
  description: 'How AnalyzeIt uses cookies and similar storage in the browser.',
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="September 11, 2026">
      <p>
        This policy describes cookies and similar technologies (local storage, session storage)
        used on analyzeit.ai and the AnalyzeIt application.
      </p>

      <LegalSection title="1. Essential storage">
        <p>We use essential storage to operate the product:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Session token and profile</strong> in local storage so we can keep you signed in
            and hide chat, dashboards, and other workspace features from visitors without an
            account.
          </li>
          <li>
            <strong>Theme preference</strong> so light or dark mode persists across visits.
          </li>
          <li>
            <strong>Incognito flag</strong> in session storage while that mode is enabled.
          </li>
        </ul>
        <p>
          These are required for the Service to function. The marketing homepage can be browsed
          without setting an account token.
        </p>
      </LegalSection>

      <LegalSection title="2. Analytics and advertising">
        <p>
          Free-tier research may load Google AdSense units after a run completes and once per
          session on research surfaces. AdSense may set third-party cookies or similar storage
          when those units load. Premium and VIP do not load AdSense at all
          (<code>ads_free</code>). You can also use browser controls or an ad blocker.
        </p>
        <p>
          Optional product analytics, if enabled later, will be documented here before they ship.
        </p>
      </LegalSection>

      <LegalSection title="3. Your controls">
        <p>
          You can clear site data in your browser. Signing out removes the AnalyzeIt session token
          from local storage. Blocking all storage may prevent sign-in and workspace features from
          working.
        </p>
      </LegalSection>

      <LegalSection title="4. Contact">
        <p>
          Questions:{' '}
          <a href="mailto:privacy@analyzeit.ai" className="text-[#E3836C] hover:underline">
            privacy@analyzeit.ai
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
