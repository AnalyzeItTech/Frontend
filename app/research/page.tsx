'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconArrowUpRight,
  IconFileUpload,
  IconMapPin,
  IconSearch,
  IconSend,
  IconSparkles,
  IconTable,
  IconX,
} from '@tabler/icons-react';

const EarthGlobe = dynamic(
  () => import('../Components/3d/EarthGlobe').then((module) => module.EarthGlobe),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#E8DFD3]" /> }
);

type ResultKind = 'brief' | 'chart' | 'table';

const prompts = [
  'Compare India and Vietnam manufacturing growth',
  'What changed in global semiconductor demand?',
  'Find climate risks for Mumbai',
];

export default function ResearchPage() {
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResultKind | null>(null);
  const [saved, setSaved] = useState(false);

  const runResearch = (value = query) => {
    if (!value.trim()) return;
    const lowered = value.toLowerCase();
    setResult(lowered.includes('compare') || lowered.includes('growth') ? 'chart' : lowered.includes('risk') ? 'table' : 'brief');
    setSaved(false);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#E8DFD3] text-[#4A4238]">
      <EarthGlobe isExpanded={expanded} onToggleExpand={setExpanded} className="!fixed !z-0 opacity-95" />
      <div className="fixed inset-0 z-10 bg-gradient-to-r from-[#F3EDE4]/90 via-[#F3EDE4]/25 to-transparent pointer-events-none" />

      <header className="fixed top-5 left-4 right-4 z-[70] flex items-center justify-between gap-4 rounded-full border border-[#4A4238]/15 bg-[#F3EDE4]/80 px-5 py-3 shadow-sm backdrop-blur-xl sm:left-8 sm:right-8">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E3836C] text-sm font-semibold text-white">A</span>
          AnalyzeIt
        </Link>
        <div className="hidden items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[#786F64] md:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#8FA98F]" /> Research & Discovery
        </div>
        <Link href="/Dashboard" className="inline-flex items-center gap-1.5 rounded-full border border-[#4A4238]/15 px-3 py-1.5 text-xs font-medium transition hover:border-[#E3836C] hover:text-[#B86450]">
          Structured data <IconArrowUpRight size={14} />
        </Link>
      </header>

      <section className="relative z-20 flex min-h-screen items-center px-5 py-28 sm:px-12 lg:px-20">
        <div className="w-full max-w-xl">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4A4238]/10 bg-[#F3EDE4]/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-[#786F64] backdrop-blur">
            <IconSparkles size={13} className="text-[#E3836C]" /> Ask about the world, not a schema
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="font-serif text-5xl leading-[0.96] tracking-tight sm:text-6xl">
            Follow a question<br />
            <em className="text-[#E3836C]">where it leads.</em>
          </motion.h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#6B6155]">
            Search the web, news, geography, and your files. The research agent gathers context, condenses it, then chooses the clearest form for an answer.
          </p>

          <form onSubmit={(event) => { event.preventDefault(); runResearch(); }} className="mt-7 rounded-[1.35rem] border border-[#4A4238]/15 bg-[#FFF9F3]/90 p-2 shadow-xl shadow-[#4A4238]/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-3 py-2">
              <IconSearch size={18} className="shrink-0 text-[#E3836C]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask a question or explore a place…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8F8477]" />
              <button type="submit" aria-label="Research" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E3836C] text-white transition hover:bg-[#C96F5A]"><IconSend size={16} /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[#4A4238]/10 px-3 pt-2">
              <button type="button" className="inline-flex items-center gap-1 text-[11px] text-[#786F64] hover:text-[#B86450]"><IconFileUpload size={13} /> Add a file</button>
              <span className="text-[#4A4238]/15">•</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8F8477]">Sources selected per question</span>
            </div>
          </form>

          {!result && <div className="mt-5 flex flex-wrap gap-2">{prompts.map((prompt) => <button key={prompt} onClick={() => { setQuery(prompt); runResearch(prompt); }} className="rounded-full border border-[#4A4238]/12 bg-[#F3EDE4]/75 px-3 py-1.5 text-xs text-[#6B6155] backdrop-blur transition hover:border-[#E3836C]/50 hover:text-[#B86450]">{prompt}</button>)}</div>}
        </div>
      </section>

      <AnimatePresence>
        {result && (
          <motion.aside initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 22 }} className="fixed bottom-6 right-5 z-[70] w-[calc(100%-2.5rem)] max-w-md rounded-[1.5rem] border border-[#4A4238]/15 bg-[#FFF9F3]/95 p-5 shadow-2xl shadow-[#4A4238]/20 backdrop-blur-2xl sm:right-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#B86450]">Fresh research result</p><h2 className="mt-1 font-serif text-2xl">{result === 'chart' ? 'Growth comparison' : result === 'table' ? 'Risk signal matrix' : 'Research brief'}</h2></div>
              <button onClick={() => setResult(null)} className="rounded-full p-1 text-[#786F64] hover:bg-[#EDE4D8]"><IconX size={17} /></button>
            </div>
            {result === 'brief' && <p className="mt-4 text-sm leading-relaxed text-[#6B6155]">The agent has condensed the most relevant context into a short narrative, with sources and next questions attached to this result instead of a permanent dashboard widget.</p>}
            {result === 'chart' && <div className="mt-4"><div className="flex h-24 items-end gap-3 rounded-xl bg-[#F3EDE4] p-4">{[42, 65, 56, 82, 70, 92].map((height, index) => <span key={index} style={{ height: `${height}%` }} className={`flex-1 rounded-t-sm ${index > 3 ? 'bg-[#E3836C]' : 'bg-[#B8A9C9]'}`} />)}</div><div className="mt-2 flex justify-between text-[10px] font-mono text-[#8F8477]"><span>2021</span><span>2026</span></div></div>}
            {result === 'table' && <div className="mt-4 overflow-hidden rounded-xl border border-[#4A4238]/10 text-xs"><div className="grid grid-cols-3 bg-[#EDE4D8] px-3 py-2 font-mono text-[10px] uppercase text-[#786F64]"><span>Signal</span><span>Exposure</span><span>Trend</span></div>{[['Heat', 'High', 'Rising'], ['Flooding', 'Medium', 'Stable'], ['Supply chain', 'Medium', 'Rising']].map((row) => <div key={row[0]} className="grid grid-cols-3 border-t border-[#4A4238]/8 px-3 py-2.5 text-[#6B6155]">{row.map((value) => <span key={value}>{value}</span>)}</div>)}</div>}
            <div className="mt-5 flex items-center justify-between border-t border-[#4A4238]/10 pt-4"><div className="flex items-center gap-1.5 text-[11px] text-[#786F64]"><IconMapPin size={13} className="text-[#E3836C]" /> Map · web · news</div><button onClick={() => setSaved(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#4A4238] px-3 py-2 text-xs font-medium text-[#FFF9F3] hover:bg-[#E3836C]">{saved ? 'Ready to map' : 'Save to a record'} {saved ? <IconArrowUpRight size={13} /> : <IconTable size={13} />}</button></div>
            {saved && <p className="mt-3 rounded-lg bg-[#8FA98F]/15 px-3 py-2 text-xs text-[#546C54]">Choose an object and its fields in the Structured Data Platform. Research stays independent; only this finding crosses over.</p>}
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}
