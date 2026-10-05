import type { Metadata } from 'next';
import { AppShell } from '../Components/app/AppShell';
import { OnboardingFlow } from '../Components/onboarding/OnboardingFlow';

export const metadata: Metadata = {
  title: 'Get started — AnalyzeIt',
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <AppShell active="chat">
      <OnboardingFlow />
    </AppShell>
  );
}
