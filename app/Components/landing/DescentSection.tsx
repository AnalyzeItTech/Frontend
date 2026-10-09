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
    id: 'discovery',
    index: '01',
    name: 'What stands out',
    category: 'Discovery',
    tagline:
      'Not sure what to ask? AnalyzeIt runs read-only checks across your tables and shows the few results that matter, each with a chart and the working.',
    align: 'left',
    detail: {
      category: 'DISCOVERY',
      title: 'Find what matters without knowing the question',
      subtitle: 'Changes, trends, differences between groups, unusual values, relationships and data-quality problems',
      narrative:
        'Each result is a card: a plain title, a chart, one sentence on what it means, how sure the evidence is, and a “Show the working” panel with the exact figures and the query that was run. It says how many checks ran and when only part of a large table could be read.',
      metrics: [
        { label: 'Method', value: 'Computed, not guessed' },
        { label: 'Confidence', value: 'Labelled by evidence' },
      ],
      steps: [
        'Reads your tables in read-only mode',
        'Runs checks for changes, trends, group differences, outliers, relationships and data quality',
        'Compares each move with the series’ own history, so ordinary ups and downs are not reported as news',
        'Shows the strongest few, with the exact query behind each',
      ],
    },
    specs: [
      { label: 'Evidence', value: 'Exact figures shown' },
      { label: 'Cost', value: 'No model needed to find them' },
    ],
  },
  {
    id: 'forecasts',
    index: '02',
    name: 'Forecasts with a tested range',
    category: 'Forecasts',
    tagline:
      'Ask for next quarter. The method is tested against your own past first, and the range comes from how wrong it really was.',
    align: 'right',
    detail: {
      category: 'FORECASTS',
      title: 'A forecast that has been checked against the past',
      subtitle: 'Several simple methods, picked by how well they would have predicted what already happened',
      narrative:
        'The answer is a chart of what happened, the forecast and an 80% range. It says how its typical miss compares with simply repeating the latest value, and it declines, with the reason, when there is too little history or too many gaps. It assumes the future behaves like the past.',
      metrics: [
        { label: 'Range', value: '80%, from past misses' },
        { label: 'Baseline', value: 'Beats “repeat latest” or says so' },
      ],
      steps: [
        'Builds one value per day, week, month, quarter or year from your data',
        'Tries several methods and tests each by predicting earlier periods',
        'Uses the best one and builds the range from its actual errors',
        'Includes a yearly pattern only when there are two full years of history',
      ],
    },
    specs: [
      { label: 'Range', value: '80%, tested' },
      { label: 'Honesty', value: 'Declines when it cannot test' },
    ],
  },
  {
    id: 'public-data',
    index: '03',
    name: 'Bring in public data',
    category: 'Online data',
    tagline:
      'Paste a link or ask for public data on a topic. It finds a table, tidies it, runs the same checks, and shows the source and the date.',
    align: 'left',
    detail: {
      category: 'ONLINE DATA',
      title: 'Public data, with its source shown',
      subtitle: 'A data link, World Bank, open-data catalogues and web search, depending on your plan',
      narrative:
        'Every answer names where the data came from, when it was downloaded and how recent it is, and says plainly that it comes from the internet and has not been checked by us. If nothing usable is found it lists what it tried and why each source failed.',
      metrics: [
        { label: 'Source', value: 'Always shown' },
        { label: 'Freshness', value: 'Newest period stated' },
      ],
      steps: [
        'Finds a table from your link or a public source',
        'Reshapes and cleans it, and tells you what it changed',
        'Runs the same checks as on your own data',
        'Follows each site’s robots.txt and never reaches private addresses',
      ],
    },
    specs: [
      { label: 'Provenance', value: 'Source and date' },
      { label: 'Safety', value: 'robots.txt respected' },
    ],
  },
  {
    id: 'exploration',
    index: '04',
    name: 'Ask, then change it safely',
    category: 'Conversation',
    tagline:
      'Ask follow-ups in plain words. Ask for a change to many records and see a preview first: nothing changes until you approve, and you can undo it.',
    align: 'right',
    detail: {
      category: 'CONVERSATION',
      title: 'Questions and changes you can check',
      subtitle: 'Read-only answers, and edits only after you approve a preview',
      narrative:
        'Questions about your data are answered from the data, with the query shown. A change to many records shows which records match and the before and after, applies only what you approved, skips anything edited since, and can be undone for 30 days. Deletes go to the trash.',
      metrics: [
        { label: 'Answers', value: 'From your data, query shown' },
        { label: 'Changes', value: 'Preview, approve, undo' },
      ],
      steps: [
        'Turns your question into a read-only query and shows it',
        'Shows a preview of any change before it happens',
        'Applies exactly the previewed records and skips any edited since',
        'Keeps an undo for 30 days',
      ],
    },
    specs: [
      { label: 'Mode', value: 'Read-only by default' },
      { label: 'Undo', value: '30 days' },
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
