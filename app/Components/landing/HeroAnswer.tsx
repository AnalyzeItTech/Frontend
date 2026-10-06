'use client';

import example from '../../lib/fixtures/hero.example.json';
import { parseFindings } from '../../lib/findings.mjs';
import { FindingCards } from '../research/FindingCards';

/**
 * A real answer, not a picture of one: the output AnalyzeIt produced for this question on a public dataset, drawn with the same card
 * the product uses. Nothing here is typed in by hand (the figures come from the saved run), and the caption says what the data is.
 */
export function HeroAnswer() {
  const parsed = parseFindings(example.findings);
  if (!parsed) return null;
  return (
    <figure className="w-full max-w-xl lg:max-w-lg" aria-label="An example answer">
      <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#5C534A] dark:text-[#C5B9AE]">
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#C45A42]" />A real answer
      </p>
      <div className="ml-auto mb-3 w-fit max-w-[90%] rounded-2xl rounded-br-md bg-[#322C28] px-4 py-2 text-sm text-[#FFF7F1] shadow-sm dark:bg-[#E3836C] dark:text-[#171514]">
        {example.question}
      </div>
      <div className="rounded-3xl border border-[#4A4238]/10 bg-[#F3EDE4]/95 p-4 shadow-sm backdrop-blur-md dark:border-[#3A3430] dark:bg-[#171514]/92 sm:p-5">
        <FindingCards data={parsed} />
      </div>
      <figcaption className="mt-2 text-xs leading-relaxed text-[#5C534A] dark:text-[#C5B9AE]">
        Run on {example.dataset}. Open &ldquo;Show the working&rdquo; to see the exact figures and the query behind it.
      </figcaption>
    </figure>
  );
}
