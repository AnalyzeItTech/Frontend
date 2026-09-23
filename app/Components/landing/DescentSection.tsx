'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { DrawerDetail } from './InspectDrawer';
import { LandingProgressContext } from './LandingProgressContext';

interface IslandHighlight {
  id: string;
  index: string;
  name: string;
  category: string;
  tagline: string;
  align: 'left' | 'right';
  detail: DrawerDetail;
  specs: { label: string; value: string }[];
}

const HIGHLIGHTS: IslandHighlight[] = [
  {
    id: 'reports',
    index: '01',
    name: 'Reports Engine',
    category: 'Executive digest',
    tagline:
      'Automated weekly narratives delivered where you already work, without the spreadsheet scramble.',
    align: 'left',
    detail: {
      category: 'REPORTS ENGINE',
      title: 'Automated Executive Narratives',
      subtitle: 'Living summaries delivered to Slack, Notion & Email',
      narrative:
        'Replaces tedious spreadsheet assembly with continuous metric tracing that surfaces core business variance in plain sentences.',
      metrics: [
        { label: 'Format', value: 'Narrative Digest' },
        { label: 'Delivery', value: 'Slack & Email' },
      ],
      steps: [
        'Connects to data warehouses and billing streams in read-only mode',
        'Detects notable period-over-period deltas and baseline shifts',
        'Composes human-readable briefing with verified data citations',
      ],
    },
    specs: [
      { label: 'Latency', value: '< 120ms' },
      { label: 'Delivery', value: 'Slack & Email' },
    ],
  },
  {
    id: 'forecasts',
    index: '02',
    name: 'Probabilistic Forecasts',
    category: 'Seasonal horizons',
    tagline:
      'Forward-looking trajectory ranges that adapt naturally to seasonal trends and baseline shifts.',
    align: 'right',
    detail: {
      category: 'FORECASTS',
      title: 'Probabilistic Horizons',
      subtitle: 'Dynamic seasonal forecasting without manual parameter tuning',
      narrative:
        'Calculates uncertainty bands rather than rigid point estimates, allowing teams to anticipate headwinds and runway changes early.',
      metrics: [
        { label: 'Horizon', value: '30-Day Rolling' },
        { label: 'Confidence', value: 'Adaptive Range' },
      ],
      steps: [
        'Analyzes historical seasonality and baseline variance',
        'Projects dynamic upper and lower confidence intervals',
        'Enables scenario parameter testing using everyday language',
      ],
    },
    specs: [
      { label: 'Horizon', value: '30-day rolling' },
      { label: 'Band', value: '95% envelope' },
    ],
  },
  {
    id: 'monitoring',
    index: '03',
    name: 'Anomaly Monitoring',
    category: 'Contextual signals',
    tagline:
      'Contextual anomaly detection that explains root causes instead of sounding false alarms.',
    align: 'left',
    detail: {
      category: 'MONITORING',
      title: 'Contextual Signal Graph',
      subtitle: 'Root-cause attribution that suppresses notification noise',
      narrative:
        'Learns standard multi-metric variance to group correlated perturbations into a single actionable story instead of hundreds of alarm pings.',
      metrics: [
        { label: 'Detection', value: 'Multi-Metric Graph' },
        { label: 'Attribution', value: 'Root Cause Pinpoint' },
      ],
      steps: [
        'Monitors correlated metric graphs simultaneously',
        'Isolates upstream disruptions from downstream noise',
        'Delivers concise mitigation briefings before escalations occur',
      ],
    },
    specs: [
      { label: 'Noise cut', value: '87% quieter' },
      { label: 'Trace', value: 'Multi-table' },
    ],
  },
  {
    id: 'exploration',
    index: '04',
    name: 'Conversational Query',
    category: 'Natural language',
    tagline:
      'Ask follow-up questions in plain English and explore deeper without writing custom SQL.',
    align: 'right',
    detail: {
      category: 'EXPLORATION',
      title: 'Conversational Data Lineage',
      subtitle: 'Instant ad-hoc deep dives for non-technical teams',
      narrative:
        'Empowers any team member to investigate cohorts, churn factors, and channel efficiency in plain English while preserving full query transparency.',
      metrics: [
        { label: 'Interface', value: 'Natural Language' },
        { label: 'Transparency', value: 'Direct Verified SQL' },
      ],
      steps: [
        'Translates natural language questions into parameterized SQL queries',
        'Validates semantic query schema against warehouse metadata',
        'Renders interactive data tables alongside distilled takeaways',
      ],
    },
    specs: [
      { label: 'Mode', value: 'Read-only' },
      { label: 'Lineage', value: 'Full SQL' },
    ],
  },
];

interface DescentSectionProps {
  scrollProgress?: number;
  onInspect?: (detail: DrawerDetail) => void;
}

export const DescentSection: React.FC<DescentSectionProps> = ({
  onInspect: onInspectProp,
}) => {
  const landing = React.useContext(LandingProgressContext);
  const onInspect = onInspectProp ?? landing.setInspectedDetail;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  if (reduceMotion) {
    return (
      <section
        id="descent"
        className="relative w-full scroll-mt-[calc(var(--nav-h,96px)+16px)] py-16 px-6 md:px-16 max-w-7xl mx-auto space-y-8"
      >
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl bg-[#F3EDE4]/95 dark:bg-[#211E1C]/95 border border-[#4A4238]/10 dark:border-[#3A3430] p-6 md:p-8 space-y-3 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-[#5C534A] dark:text-[#C5B9AE]">
              {item.category}
            </p>
            <h3 className="font-serif text-2xl text-[#322C28] dark:text-[#F4EDE5]">{item.name}</h3>
            <p className="text-sm text-[#3F3830] dark:text-[#E6DCD2] leading-relaxed">{item.tagline}</p>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section id="descent" className="relative w-full scroll-mt-[calc(var(--nav-h,96px)+16px)]">
      {HIGHLIGHTS.map((item) => {
        const isLeft = item.align === 'left';
        return (
          <div
            key={item.id}
            className="relative min-h-screen w-full flex items-center px-6 md:px-16 pt-[calc(var(--nav-h,96px)+24px)] pb-24 max-w-7xl mx-auto pointer-events-none"
          >
            <motion.article
              initial={{ opacity: 0, x: isLeft ? -36 : 36 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.4 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto w-full max-w-md rounded-3xl bg-[#F3EDE4]/97 dark:bg-[#211E1C]/97 border border-[#4A4238]/12 dark:border-[#3A3430] shadow-lg p-6 sm:p-8 space-y-5 ${
                isLeft ? 'mr-auto' : 'ml-auto'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#C45A42] dark:text-[#EBA58F]">
                  {item.category}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#5C534A] dark:text-[#91867E]">
                  {item.index} / 04
                </span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl text-[#322C28] dark:text-[#F4EDE5] tracking-tight leading-tight">
                {item.name}
              </h3>

              <p className="text-sm sm:text-base text-[#3F3830] dark:text-[#C5B9AE] leading-relaxed">
                {item.tagline}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {item.specs.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl bg-[#E9DDD2]/55 dark:bg-[#171514]/70 border border-[#4A4238]/08 dark:border-[#3A3430] px-3.5 py-3"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-[#5C534A] dark:text-[#91867E] mb-1">
                      {s.label}
                    </div>
                    <div className="font-serif text-sm text-[#322C28] dark:text-[#F4EDE5]">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {onInspect && (
                <button
                  type="button"
                  onClick={() => onInspect(item.detail)}
                  className="group inline-flex items-center gap-2 text-sm font-medium text-[#322C28] dark:text-[#F4EDE5] hover:text-[#C45A42] transition-colors pt-1"
                >
                  <span>Learn more</span>
                  <span className="transform group-hover:translate-x-1 transition-transform duration-200">
                    →
                  </span>
                </button>
              )}
            </motion.article>
          </div>
        );
      })}
    </section>
  );
};
