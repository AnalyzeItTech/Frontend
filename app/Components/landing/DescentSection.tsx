'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DrawerDetail } from './InspectDrawer';

interface SideTelemetry {
  eyebrow: string;
  specs: { label: string; value: string }[];
  note: string;
}

interface IslandHighlight {
  id: string;
  index: string;
  name: string;
  category: string;
  tagline: string;
  align: 'left' | 'right';
  detail: DrawerDetail;
  telemetry: SideTelemetry;
}

const HIGHLIGHTS: IslandHighlight[] = [
  {
    id: 'reports',
    index: '01',
    name: 'Reports Engine',
    category: '01 // EXECUTIVE DIGEST',
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
    telemetry: {
      eyebrow: 'ARCHITECTURAL TELEMETRY // 01',
      specs: [
        { label: 'Synthesis Latency', value: '< 120ms' },
        { label: 'Data Verification', value: 'Multi-Warehouse Consensus' },
        { label: 'Delivery Target', value: 'Slack, Notion & Email' },
      ],
      note: 'Monitors ongoing business metrics continuously without manual dashboard assembly.',
    },
  },
  {
    id: 'forecasts',
    index: '02',
    name: 'Probabilistic Forecasts',
    category: '02 // SEASONAL HORIZONS',
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
    telemetry: {
      eyebrow: 'ARCHITECTURAL TELEMETRY // 02',
      specs: [
        { label: 'Model Horizon', value: '30-Day Rolling Window' },
        { label: 'Confidence Interval', value: '95% Adaptive Envelope' },
        { label: 'Drift Calibration', value: 'Continuous Real-Time' },
      ],
      note: 'Presents dynamic uncertainty bands rather than fragile single-point estimates.',
    },
  },
  {
    id: 'monitoring',
    index: '03',
    name: 'Anomaly Monitoring',
    category: '03 // CONTEXTUAL SIGNALS',
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
    telemetry: {
      eyebrow: 'ARCHITECTURAL TELEMETRY // 03',
      specs: [
        { label: 'Signal Graph', value: '142 Correlated Metrics' },
        { label: 'Noise Reduction', value: '87% Alarm Suppression' },
        { label: 'Root Cause Attribution', value: 'Instant Multi-Table Trace' },
      ],
      note: 'Suppresses downstream noise alerts and isolates upstream causal shifts.',
    },
  },
  {
    id: 'exploration',
    index: '04',
    name: 'Conversational Query',
    category: '04 // NATURAL LANGUAGE SQL',
    tagline:
      'Ask follow-up questions in plain English and explore deeper without writing custom SQL queries.',
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
    telemetry: {
      eyebrow: 'ARCHITECTURAL TELEMETRY // 04',
      specs: [
        { label: 'Semantic Engine', value: 'Parameterized Verified SQL' },
        { label: 'Permission Mode', value: 'Read-Only AES-256 Token' },
        { label: 'Audit Lineage', value: '100% Query Trace Transparency' },
      ],
      note: 'Allows anyone to explore data in plain words with fully inspectable underlying SQL.',
    },
  },
];

interface DescentSectionProps {
  scrollProgress?: number;
  onInspect?: (detail: DrawerDetail) => void;
}

export const DescentSection: React.FC<DescentSectionProps> = ({
  scrollProgress = 0,
  onInspect,
}) => {
  // Map normalized scroll progress [0.0 - 1.0] with generous travel gaps between milestones
  let activeIndex: number | null = null;
  if (scrollProgress >= 0.12 && scrollProgress <= 0.30) activeIndex = 0;
  else if (scrollProgress >= 0.36 && scrollProgress <= 0.54) activeIndex = 1;
  else if (scrollProgress >= 0.60 && scrollProgress <= 0.78) activeIndex = 2;
  else if (scrollProgress >= 0.84 && scrollProgress <= 0.99) activeIndex = 3;

  const currentItem = activeIndex !== null ? HIGHLIGHTS[activeIndex] : null;

  return (
    <section
      id="descent"
      className="relative h-[460vh] w-full"
    >
      {/* Sticky Fullscreen Pinned Stage */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-between px-6 md:px-16 max-w-7xl mx-auto pointer-events-none z-10">
        
        <AnimatePresence mode="wait">
          {currentItem && (
            <div
              key={currentItem.id}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pointer-events-none"
            >
              {/* Primary Interactive Milestone Card */}
              <div
                className={`lg:col-span-6 flex ${
                  currentItem.align === 'left'
                    ? 'lg:order-1 justify-start'
                    : 'lg:order-2 justify-end'
                }`}
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    x: currentItem.align === 'left' ? -40 : 40,
                    y: 20,
                    scale: 0.95,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    x: currentItem.align === 'left' ? -40 : 40,
                    y: -20,
                    scale: 0.95,
                  }}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-md pointer-events-auto glass-card p-6 md:p-8 rounded-3xl space-y-4 border border-[#4A4238]/10 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8FA98F] animate-pulse" />
                      <span className="text-[10px] font-mono tracking-wider uppercase text-[#4A4238]/60">
                        {currentItem.category}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono uppercase text-[#D4826A] bg-[#D4826A]/10 px-2 py-0.5 rounded">
                      Milestone {currentItem.index}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl sm:text-3xl text-[#4A4238] font-normal tracking-tight">
                    {currentItem.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#4A4238]/75 leading-relaxed">
                    {currentItem.tagline}
                  </p>

                  {onInspect && (
                    <div className="pt-3 border-t border-[#4A4238]/8">
                      <button
                        type="button"
                        onClick={() => onInspect(currentItem.detail)}
                        className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#4A4238] hover:text-[#D4826A] transition-colors cursor-pointer py-1"
                      >
                        <span>[ INSPECT ARCHITECTURE ]</span>
                        <span className="transform group-hover:translate-x-1.5 transition-transform duration-200">
                          →
                        </span>
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Complementary Side Telemetry Annotation Card (Opposite Side) */}
              <div
                className={`hidden lg:flex lg:col-span-6 ${
                  currentItem.align === 'left'
                    ? 'lg:order-2 justify-end'
                    : 'lg:order-1 justify-start'
                }`}
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    x: currentItem.align === 'left' ? 40 : -40,
                    y: 20,
                    scale: 0.95,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    x: currentItem.align === 'left' ? 40 : -40,
                    y: -20,
                    scale: 0.95,
                  }}
                  transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-sm pointer-events-auto p-6 rounded-3xl bg-[#F3EDE4]/85 backdrop-blur-md border border-[#4A4238]/10 space-y-4 shadow-sm"
                >
                  <div className="text-[10px] font-mono tracking-widest uppercase text-[#D4826A]">
                    {currentItem.telemetry.eyebrow}
                  </div>

                  <div className="space-y-2.5">
                    {currentItem.telemetry.specs.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 border-b border-[#4A4238]/6"
                      >
                        <span className="text-[#4A4238]/60 font-mono text-[11px]">
                          {s.label}
                        </span>
                        <span className="font-serif text-[#4A4238] font-medium text-sm">
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-[#4A4238]/65 leading-relaxed pt-1">
                    {currentItem.telemetry.note}
                  </p>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Milestone Indicator Bar Centered at Bottom */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto px-4 py-2 rounded-full bg-[#F3EDE4]/80 backdrop-blur-md border border-[#4A4238]/10 shadow-xs">
          {HIGHLIGHTS.map((h, i) => (
            <span
              key={h.id}
              className={`transition-all duration-300 rounded-full ${
                activeIndex === i
                  ? 'w-6 h-2 bg-[#D4826A]'
                  : 'w-2 h-2 bg-[#4A4238]/20'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
