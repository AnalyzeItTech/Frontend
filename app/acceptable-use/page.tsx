import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — AnalyzeIt',
  description: 'Rules for using AnalyzeIt chat, research, dashboards, and connectors.',
};

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy" updated="September 11, 2026">
      <p>
        This policy is part of the{' '}
        <a href="/terms" className="text-[#E3836C] hover:underline">
          Terms of Service
        </a>
        . It applies to every account.
      </p>

      <LegalSection title="1. Allowed use">
        <p>
          Use AnalyzeIt to analyze data you are authorized to access, ask questions about your
          workspace, build dashboards, and collaborate with people you invite.
        </p>
      </LegalSection>

      <LegalSection title="2. Prohibited use">
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Create an account for someone else without permission, or share your login.</li>
          <li>Attempt to access another customer’s projects, tokens, or connectors.</li>
          <li>Probe, scan, or overload the Service except through documented, authorized testing you own.</li>
          <li>Upload malware or content that is illegal, exploitative, or that you do not have rights to use.</li>
          <li>Use the assistant to generate scams, malware, or other harmful instructions.</li>
          <li>Circumvent plan limits, rate limits, or authentication.</li>
          <li>Resell the Service or scrape it to build a competing product without written consent.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Enforcement">
        <p>
          We may investigate suspected abuse, suspend features, or close accounts. We may report
          unlawful activity to authorities where required.
        </p>
      </LegalSection>

      <LegalSection title="4. Contact">
        <p>
          Report abuse to{' '}
          <a href="mailto:hello@analyzeit.ai" className="text-[#E3836C] hover:underline">
            hello@analyzeit.ai
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
