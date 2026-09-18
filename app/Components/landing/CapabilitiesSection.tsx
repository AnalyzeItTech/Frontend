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
    id: 'reports',
    category: 'Capability 01 · Reports Engine',
    headline: 'Answers without the assembly line.',
    body:
      'Stop spending Monday mornings stitching together spreadsheets and recreating charts. AnalyzeIt monitors your core metrics continuously and writes clear summaries delivered right where you already work.',
    callout: 'Automated',
    calloutDesc: 'scheduled executive briefings delivered to your team channels',
    bullets: [
      'Connects directly to your existing data sources and billing streams',
      'Drafts plain-language narratives explaining what changed and why',
      'Delivers scheduled briefings via email or shared channels',
    ],
  },
  {
    id: 'forecasts',
    category: 'Capability 02 · Forecast Horizons',
    headline: 'Look ahead with quiet confidence.',
    body:
      'See where your trajectory is heading before the quarter wraps up. Probabilistic projections adapt naturally to seasonal cycles, recent trends, and baseline variance without manual tuning.',
    callout: 'Adaptive',
    calloutDesc: 'rolling forward-looking horizon with uncertainty bounds',
    bullets: [
      'Identifies recurring baseline patterns automatically',
      'Projects likely outcomes with visible uncertainty',
      'Updates as new data arrives instead of waiting for a rebuild',
    ],
  },
  {
    id: 'monitoring',
    category: 'Capability 03 · Anomaly Monitoring',
    headline: 'Notice the shift, not the siren.',
    body:
      'Contextual anomaly detection explains root causes instead of flooding the team with false alarms. Correlated metrics collapse into one story you can act on.',
    callout: 'Quiet',
    calloutDesc: 'root-cause briefings instead of noisy threshold pings',
    bullets: [
      'Watches related metrics together so noise does not multiply',
      'Separates upstream causes from downstream symptoms',
      'Sends a concise briefing before the issue becomes a meeting',
    ],
  },
  {
    id: 'exploration',
    category: 'Capability 04 · Conversational Query',
    headline: 'Ask follow-ups in everyday words.',
    body:
      'Explore cohorts, churn, and channel mix without writing SQL. The generated query stays visible so analysts can trust and inspect the answer.',
    callout: 'Open',
    calloutDesc: 'plain-language questions with inspectable SQL',
    bullets: [
      'Turns natural-language questions into parameterized queries',
      'Checks the question against your schema before running',
      'Shows tables and takeaways together, not a widget maze',
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
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
