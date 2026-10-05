import { FirstRunGate } from '../Components/onboarding/FirstRunGate';

/**
 * First-run accounts leave chat for /onboarding.
 * This layout does not render or restyle the chat empty state or the composer.
 */
export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FirstRunGate />
      {children}
    </>
  );
}
