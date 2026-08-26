'use client';

import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'What data sources can I connect?',
    answer:
      'AnalyzeIt connects directly with PostgreSQL, MySQL, Snowflake, BigQuery, ClickHouse, Stripe billing streams, and CSV/spreadsheet uploads. All database connections use strictly read-only credentials and encrypted tunnels.',
  },
  {
    question: 'Do I need technical or SQL knowledge to use AnalyzeIt?',
    answer:
      'No. The platform is designed from the ground up so anyone—from founders to operations managers—can ask questions in everyday English. For technical team members, the generated SQL queries and raw data tables are always visible and inspectable.',
  },
  {
    question: 'How does this differ from traditional BI dashboards?',
    answer:
      'Traditional BI tools require building static dashboards that quickly become outdated or cluttered with too many charts. AnalyzeIt functions more like an analytical assistant: monitoring your underlying metrics, drafting concise text explanations, and answering ad-hoc inquiries on demand.',
  },
  {
    question: 'How is my data protected?',
    answer:
      'AnalyzeIt connects using strictly read-only credentials and encrypts all network communication and stored configurations with AES-256 encryption. Your private business data is never used to train public language models.',
  },
  {
    question: 'Can my whole team collaborate in one workspace?',
    answer:
      'Yes. You can invite teammates with configurable permissions, share investigation threads, and set up automated digests delivered directly to your team’s Slack, Notion, or email channels.',
  },
];

export const FAQSection: React.FC = () => {
  // Store open state as a set of indices so users can open multiple or view all answers
  const [openSet, setOpenSet] = useState<Set<number>>(new Set([0, 1]));

  const toggle = (idx: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <section
      id="faq"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-4xl mx-auto space-y-16 pointer-events-auto"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#4A4238]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8FA98F]" />
          Common Questions
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#4A4238] font-normal">
          Frequently asked questions
        </h2>
      </div>

      {/* Accordion */}
      <div className="space-y-4">
        {FAQS.map((faq, idx) => {
          const isOpen = openSet.has(idx);
          return (
            <div
              key={idx}
              className="glass-card rounded-2xl overflow-hidden border border-[#4A4238]/10 transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/20 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="font-serif text-xl md:text-2xl text-[#4A4238] font-normal">
                  {faq.question}
                </span>
                <span
                  className={`text-[#D4826A] text-2xl font-light transition-transform duration-300 ${
                    isOpen ? 'rotate-45' : 'rotate-0'
                  }`}
                >
                  +
                </span>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-1 text-sm md:text-base text-[#4A4238]/75 leading-relaxed border-t border-[#4A4238]/6 animate-in fade-in duration-200">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
