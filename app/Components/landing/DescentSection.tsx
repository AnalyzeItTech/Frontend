'use client';

import React from 'react';
import { DrawerDetail } from './InspectDrawer';

interface IslandHighlight {
  id: string;
  name: string;
  category: string;
  tagline: string;
  align: 'left' | 'right';
  detail: DrawerDetail;
}

const HIGHLIGHTS: IslandHighlight[] = [
  {
    id: 'reports',
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
  },
  {
    id: 'forecasts',
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
  },
  {
    id: 'monitoring',
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
  },
  {
    id: 'exploration',
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
  },
];

interface DescentSectionProps {
  onInspect?: (detail: DrawerDetail) => void;
}

export const DescentSection: React.FC<DescentSectionProps> = ({ onInspect }) => {
  return (
    <section
      id="descent"
      className="relative py-24 md:py-40 px-6 md:px-16 max-w-7xl mx-auto space-y-44 md:space-y-60 pointer-events-none"
    >
      {HIGHLIGHTS.map((item, idx) => (
        <div
          key={item.id}
          className={`flex ${
            item.align === 'left' ? 'justify-start' : 'justify-end'
          }`}
        >
          <div className="max-w-md pointer-events-auto glass-card p-6 md:p-8 rounded-3xl space-y-4 transition-all duration-300 transform hover:-translate-y-1 border border-[#4A4238]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8FA98F]" />
                <span className="text-[10px] font-mono tracking-wider uppercase text-[#4A4238]/60">
                  {item.category}
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase text-[#D4826A] bg-[#D4826A]/10 px-2 py-0.5 rounded">
                Interactive
              </span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl text-[#4A4238] font-normal tracking-tight">
              {item.name}
            </h3>

            <p className="text-xs sm:text-sm text-[#4A4238]/75 leading-relaxed">
              {item.tagline}
            </p>

            {onInspect && (
              <div className="pt-3 border-t border-[#4A4238]/8">
                <button
                  type="button"
                  onClick={() => onInspect(item.detail)}
                  className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#4A4238] hover:text-[#D4826A] transition-colors cursor-pointer py-1"
                >
                  <span>[ INSPECT ARCHITECTURE ]</span>
                  <span className="transform group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};
