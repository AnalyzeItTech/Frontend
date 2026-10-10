'use client';

import example from '../../lib/fixtures/hero.example.json';
import { parseFindings } from '../../lib/findings.mjs';
import { FindingCards } from '../research/FindingCards';

/**
 * A real output, not a picture of one: what AnalyzeIt produced for this question on sample data, drawn with the same card the product
 * uses. Nothing here is typed in by hand (the figures come from the saved run), and the caption says plainly that the data is a sample.
 */
export function HeroAnswer() {
  const all = parseFindings(example.findings);
  if (!all) return null;
  // One card up here keeps the headline in view; the other finding is in the saved run and on the product page.
  const parsed = { ...all, findings: all.findings.slice(0, 1) };
  return (
    <figure className="w-full max-w-xl lg:max-w-lg" aria-label="An example answer">
      <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#5C534A] dark:text-[#C5B9AE]">
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#C45A42]" />What you get
      </p>
      <div className="ml-auto mb-3 w-fit max-w-[90%] rounded-2xl rounded-br-md bg-[#322C28] px-4 py-2 text-sm text-[#FFF7F1] shadow-sm dark:bg-[#E3836C] dark:text-[#171514]">
        {example.question}
      </div>
      <div className="rounded-3xl border border-[#4A4238]/10 bg-[#F3EDE4]/95 p-4 shadow-sm backdrop-blur-md dark:border-[#3A3430] dark:bg-[#171514]/92 sm:p-5">
        <FindingCards data={parsed} />
      </div>
      <figcaption className="mt-2 text-xs leading-relaxed text-[#5C534A] dark:text-[#C5B9AE]">
        This is {example.dataset}. Bring your own data to see yours. Open &ldquo;Show the working&rdquo; on a card for the exact figures and the query behind it.
      </figcaption>
    </figure>
  );
}
