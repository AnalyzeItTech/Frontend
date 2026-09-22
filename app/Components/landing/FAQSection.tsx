import React from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'What data sources can I connect?',
    answer:
      'GitHub and Stripe Connect are available when OAuth is configured (GitHub is live for most accounts). Chat attachments upload into a turn for spreadsheet and document analysis. Salesforce remains Coming soon. Agent tools also cover markets, weather, web search, and project objects. Warehouse connectors are still on the roadmap.',
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
      'Credentials are encrypted at rest when a vault key is configured. Network traffic uses HTTPS in production. Private business data is not used to train public language models.',
  },
  {
    question: 'Can my whole team collaborate in one workspace?',
    answer:
      'Yes. Project sharing links and role-aware UI redaction are available. Full team invites, Slack digests, and Notion delivery are still rolling out.',
  },
];

export const FAQSection: React.FC = () => {
  return (
    <section
      id="faq"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-4xl mx-auto space-y-16 pointer-events-auto scroll-mt-[calc(var(--nav-h,56px)+24px)]"
    >
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#4A4238]/60 dark:text-[#91867E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9EBB9A]" />
          Common Questions
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#4A4238] dark:text-[#F4EDE5] font-normal">
          Frequently asked questions
        </h2>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, idx) => (
          <details
            key={faq.question}
            open={idx < 2}
            className="glass-card rounded-2xl overflow-hidden border border-[#4A4238]/10 dark:border-[#3A3430] transition-all duration-200 group"
          >
            <summary className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/20 dark:hover:bg-[#292522]/50 transition-colors list-none">
              <span className="font-serif text-xl md:text-2xl text-[#4A4238] dark:text-[#F4EDE5] font-normal">
                {faq.question}
              </span>
              <span className="text-[#E3836C] text-2xl font-light transition-transform duration-300 group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="px-6 pb-6 pt-1 text-sm md:text-base text-[#4A4238]/75 dark:text-[#C5B9AE] leading-relaxed border-t border-[#4A4238]/6 dark:border-[#3A3430]">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};
