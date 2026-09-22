import React from 'react';

interface Capability {
  id: string;
  category: string;
  headline: string;
  body: string;
  callout: string;
  calloutDesc: string;
  bullets: string[];
}

const CAPABILITIES: Capability[] = [
  {
    id: 'globe',
    category: 'Capability 01 · Globe',
    headline: 'Explore the world, then ask why.',
    body:
      'Search places, compare hubs, and hand a pin straight into Research. A map-first workspace — not a postage-stamp widget.',
    callout: 'Map-first',
    calloutDesc: 'search → pin → “Ask about this place.”',
    bullets: [
      'Search and browse places with room to see the map',
      'Compare hubs without burying the globe in chrome',
      'Send a selected place into Research in one step',
    ],
  },
  {
    id: 'research',
    category: 'Capability 02 · Research',
    headline: 'Ask in plain words. See how the answer was made.',
    body:
      'Chat and deep research with tool-backed answers. Simple calc, weather, FX, and stocks can resolve as From tools · 0 tokens — no fake “AI wrote this.”',
    callout: 'Provenance',
    calloutDesc: 'tool chips · Prepared on device when the browser helps compress context',
    bullets: [
      'Plain-language questions with visible tool provenance',
      'Zero-token tool paths when a calculator or live feed is enough',
      'API-orchestrated models — not a local LLM on your laptop',
    ],
  },
  {
    id: 'dashboard',
    category: 'Capability 03 · Dashboard',
    headline: 'Quiet canvases, not noisy boards.',
    body:
      'Build living summaries and widgets on warm paper — coral accents, clear empty states, charts that match the brand.',
    callout: 'Calm studio',
    calloutDesc: 'empty state → add first widget / templates',
    bullets: [
      'Warm paper surfaces instead of cold admin grey',
      'Clear empty states that invite the first widget',
      'Charts and KPIs tuned to the coral / cream system',
    ],
  },
  {
    id: 'connectors-objects',
    category: 'Capability 04 · Connectors & Objects',
    headline: 'Connect data. Shape objects. Stay honest.',
    body:
      'Connectors show real status (connected / ready / error). Import SQL, Stripe, Salesforce, GitHub, or public datasets from Kaggle, Hugging Face, and OpenML. Objects use one clear term and an illustrative schema when empty.',
    callout: 'Honest status',
    calloutDesc: 'status chips · Create object above the fold',
    bullets: [
      'Connected, ready, and error states you can trust',
      'One vocabulary: objects — not mixed “entities”',
      'Illustrative schema previews when the workspace is empty',
    ],
  },
  {
    id: 'deep-context',
    category: 'Capability 05 · Deep context',
    headline: 'Deep analysis over large corpora — orchestrated, not stuffed.',
    body:
      'Free stays focused; Premium compresses; Premium+ runs recursive inspect over an external store (RLM-style) with frequency encoding — not “we paste a billion tokens into one API call.”',
    callout: 'Deep · orchestrated',
    calloutDesc: 'budget / mode chips as stream events land',
    bullets: [
      'Tiered modes: focused, compressed, and deep recursive inspect',
      'Client “Prepared on device” hints before the request leaves the browser',
      'Honest framing — orchestrated context, not a magic single-call window',
    ],
  },
  {
    id: 'reliability',
    category: 'Capability 06 · Reliability',
    headline: 'Built to stay available.',
    body:
      'Product APIs and research paths run on hosted infrastructure (including Azure-hosted Model/B) so the workspace stays reachable while you explore.',
    callout: 'Hosted',
    calloutDesc: 'reachable research paths while you work',
    bullets: [
      'Hosted Model/B paths so exploration stays online',
      'No over-claimed SLAs — reliability without hype',
      'Account-gated Chat, Globe, dashboards, and connectors',
    ],
  },
];

export const CapabilitiesSection: React.FC = () => {
  return (
    <section
      id="capabilities"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto scroll-mt-[calc(var(--nav-h,56px)+24px)]"
    >
      <div className="max-w-2xl space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase text-[#C45A42]">
          <span className="w-2 h-2 rounded-full bg-[#E3836C]" />
          Core Capabilities
        </div>
        <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#4A4238] dark:text-[#F4EDE5] leading-tight">
          Everything you need to understand your business,{' '}
          <em className="font-serif italic text-[#E3836C]">
            without the noise.
          </em>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10">
        {CAPABILITIES.map((cap) => (
          <div
            key={cap.id}
            className="glass-card rounded-3xl p-8 md:p-10 space-y-8 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl border border-[#4A4238]/10 dark:border-[#3A3430]"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-[#5C534A] dark:text-[#C5B9AE]">
                  {cap.category}
                </span>
                <span className="w-2 h-2 rounded-full bg-[#9EBB9A]" />
              </div>
              <h3 className="font-serif text-2xl md:text-3xl text-[#4A4238] dark:text-[#F4EDE5] font-normal leading-snug">
                {cap.headline}
              </h3>
              <p className="text-sm md:text-base text-[#4A4238]/75 dark:text-[#C5B9AE] font-normal leading-relaxed">
                {cap.body}
              </p>
              <div className="pt-4 space-y-3 border-t border-[#4A4238]/8 dark:border-[#3A3430]">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E]">
                  How it works
                </div>
                {cap.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-[#4A4238]/85 dark:text-[#C5B9AE]"
                  >
                    <span className="text-[#9EBB9A] text-sm mt-0.5">✓</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F3EDE4]/80 dark:bg-[#292522] border border-[#4A4238]/8 dark:border-[#3A3430] flex items-baseline gap-3">
              <span className="font-serif text-2xl md:text-3xl font-medium text-[#E3836C]">
                {cap.callout}
              </span>
              <span className="text-xs text-[#4A4238]/70 dark:text-[#C5B9AE] leading-tight">
                {cap.calloutDesc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
