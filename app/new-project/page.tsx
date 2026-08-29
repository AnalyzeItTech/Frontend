'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconArrowLeft,
  IconSend,
  IconShieldLock,
  IconSparkles,
  IconDatabase,
  IconUpload,
  IconFileSpreadsheet,
  IconCheck,
  IconAlertCircle,
  IconTerminal2,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { ThemeToggle } from '../Components/ui/ThemeToggle';
import { useTheme } from '../Components/ui/ThemeProvider';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metrics?: Array<{ label: string; value: string; change?: string; positive?: boolean }>;
  sqlSnippet?: string;
  incognito?: boolean;
}

export default function NewProjectPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isIncognito, setIsIncognito] = useState(false);
  const [projectTitle, setProjectTitle] = useState('Untitled Analysis Workspace');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      content:
        'Hello Devansh. Welcome to your new project space. You can connect a live database stream, upload CSV or spreadsheet files, or ask a question in plain words to begin.',
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      incognito: isIncognito,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsThinking(true);

    // Dynamic intelligent response simulation
    setTimeout(() => {
      let botMsg: Message;
      const lower = text.toLowerCase();

      if (lower.includes('churn') || lower.includes('retention')) {
        botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          content:
            'I analyzed the Q3 subscriber cohorts. Enterprise tier churn remained stable at 1.2%, but mid-tier self-serve accounts saw a 4.1% uptick following the August billing policy change.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metrics: [
            { label: 'Net Retention', value: '118.4%', change: '+2.1%', positive: true },
            { label: 'Self-Serve Churn', value: '4.1%', change: '+1.4%', positive: false },
            { label: 'ARR at Risk', value: '$42,500', change: '-8.2%', positive: true },
          ],
          sqlSnippet: `SELECT cohort_month, tier, COUNT(id) AS active_users,
       SUM(mrr) AS cohort_revenue,
       (1.0 - (churned_count / total_count)) * 100 AS retention_rate
FROM subscriptions
WHERE cohort_month >= '2026-07-01'
GROUP BY 1, 2 ORDER BY 1 DESC;`,
          incognito: isIncognito,
        };
      } else if (lower.includes('funnel') || lower.includes('checkout') || lower.includes('drop')) {
        botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          content:
            'Anomaly localized on Step 3 (Payment Verification). A 6.4% drop-off was concentrated on Safari iOS 17.4 devices due to an autofill iframe timeout.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metrics: [
            { label: 'Checkout Success', value: '88.3%', change: '-6.4%', positive: false },
            { label: 'Affected Users', value: '1,420', change: '+340', positive: false },
          ],
          incognito: isIncognito,
        };
      } else {
        botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          content: `I've initialized the dataset query model for "${text}". All tables and continuous streams are ready for interactive exploratory drill-down.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metrics: [
            { label: 'Tables Ingested', value: '14', positive: true },
            { label: 'Query Latency', value: '18ms', positive: true },
          ],
          incognito: isIncognito,
        };
      }

      setMessages((prev) => [...prev, botMsg]);
      setIsThinking(false);
    }, 1100);
  };

  const handleFileUpload = () => {
    const sampleFiles = ['q3_financial_cohorts.csv', 'user_telemetry_events.parquet', 'stripe_invoices_2026.xlsx'];
    const randomFile = sampleFiles[Math.floor(Math.random() * sampleFiles.length)];
    if (!attachedFiles.includes(randomFile)) {
      setAttachedFiles((prev) => [...prev, randomFile]);
      handleSendMessage(`Attached data source: ${randomFile}. Please inspect the column schemas and summary stats.`);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-500 ${
        isIncognito
          ? 'bg-[#100D16] text-[#E7E2EE]'
          : 'bg-[#F3EDE4] dark:bg-[#161311] text-[#4A4238] dark:text-[#EDE6DC]'
      }`}
    >
      {/* ─── Top Header Navigation ────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-30 px-5 sm:px-8 py-3.5 flex items-center justify-between border-b backdrop-blur-xl transition-colors duration-300 ${
          isIncognito
            ? 'bg-[#100D16]/80 border-purple-500/20'
            : 'bg-[#F3EDE4]/80 dark:bg-[#161311]/80 border-[#4A4238]/10 dark:border-white/10'
        }`}
      >
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Back to Dashboard Link */}
          <Link
            href="/Dashboard"
            className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
              isIncognito
                ? 'border-purple-500/30 text-purple-300 hover:bg-purple-950/50'
                : 'border-[#4A4238]/15 dark:border-white/15 text-[#4A4238]/70 dark:text-[#EDE6DC]/70 hover:text-[#4A4238] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <IconArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>

          {/* Project Title Editor */}
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                autoFocus
                className="font-serif text-lg font-medium px-2 py-0.5 rounded border border-[#D4826A] bg-transparent focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-2 font-serif text-lg sm:text-xl font-medium tracking-tight hover:text-[#D4826A] transition-colors cursor-pointer text-left"
              >
                <span>{projectTitle}</span>
                <span className="text-xs font-mono opacity-0 group-hover:opacity-60 transition-opacity">✎</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls & Incognito Switch */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Incognito Mode Pill Toggle */}
          <button
            type="button"
            onClick={() => setIsIncognito((v) => !v)}
            className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-mono uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              isIncognito
                ? 'bg-purple-900/60 border-purple-500 text-purple-200 shadow-md shadow-purple-950/40 ring-2 ring-purple-500/30'
                : 'bg-white/60 dark:bg-white/05 border-[#4A4238]/15 dark:border-white/15 text-[#4A4238]/70 dark:text-[#EDE6DC]/70 hover:border-[#D4826A]/40'
            }`}
            title="When active, queries and session data are ephemeral and bypassed from storage"
          >
            <IconShieldLock
              size={15}
              className={`transition-colors ${isIncognito ? 'text-purple-300' : 'text-[#4A4238]/50 dark:text-white/50'}`}
            />
            <span className="hidden sm:inline">Incognito Mode</span>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isIncognito ? 'bg-purple-400 animate-pulse' : 'bg-[#4A4238]/20 dark:bg-white/20'
              }`}
            />
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Profile Avatar for Devansh */}
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-xs font-bold transition-colors ${
              isIncognito
                ? 'bg-purple-900/50 border-purple-400/40 text-purple-200'
                : 'bg-[#E8C4A0] dark:bg-[#3D352E] border-[#4A4238]/20 dark:border-white/15 text-[#4A4238] dark:text-[#EDE6DC]'
            }`}
            title="Signed in as Devansh"
          >
            DV
          </div>
        </div>
      </header>

      {/* ─── Incognito Security Notice Banner ─────────────────────────────── */}
      <AnimatePresence>
        {isIncognito && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-purple-950/70 border-b border-purple-500/25 px-6 py-2.5 flex items-center justify-center gap-3 text-xs font-mono text-purple-200"
          >
            <IconShieldLock size={15} className="text-purple-400 flex-shrink-0" />
            <span>
              <strong>Incognito Mode Active:</strong> All questions, generated SQL, and attached schemas are completely isolated from your saved dashboard history.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Conversational Workspace ───────────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Chat Stream Messages */}
        <div className="flex-1 space-y-5 pb-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div
                  className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-serif font-bold text-xs shadow-xs ${
                    msg.incognito ? 'bg-purple-600' : 'bg-[#D4826A]'
                  }`}
                >
                  A
                </div>
              )}

              <div
                className={`max-w-xl space-y-3 ${
                  msg.sender === 'user'
                    ? `${
                        msg.incognito
                          ? 'bg-purple-900/60 border border-purple-500/30 text-purple-100'
                          : 'bg-[#4A4238] dark:bg-[#EDE6DC] text-[#F3EDE4] dark:text-[#161311]'
                      } p-4 rounded-2xl rounded-tr-xs text-sm leading-relaxed shadow-sm`
                    : `${
                        isIncognito
                          ? 'bg-[#1A1624] border border-purple-500/20 text-purple-100'
                          : 'glass-card border border-[#4A4238]/08 dark:border-white/10 text-[#4A4238] dark:text-[#EDE6DC]'
                      } p-5 rounded-2xl rounded-tl-xs text-sm leading-relaxed shadow-sm`
                }`}
              >
                <div className="leading-relaxed">{msg.content}</div>

                {/* Metric Summary Cards */}
                {msg.metrics && msg.metrics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    {msg.metrics.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border ${
                          isIncognito
                            ? 'bg-purple-950/40 border-purple-500/25'
                            : 'bg-white/60 dark:bg-white/05 border-[#4A4238]/10 dark:border-white/10'
                        }`}
                      >
                        <div className="text-[10px] font-mono uppercase tracking-wider opacity-60">{m.label}</div>
                        <div className="font-serif text-base font-semibold mt-0.5">{m.value}</div>
                        {m.change && (
                          <div
                            className={`text-[10px] font-mono font-medium mt-0.5 ${
                              m.positive ? 'text-[#8FA98F]' : 'text-[#E14759]'
                            }`}
                          >
                            {m.change}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* SQL Code Block */}
                {msg.sqlSnippet && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-t-xl bg-black/40 text-[10px] font-mono text-white/60">
                      <span className="flex items-center gap-1.5">
                        <IconTerminal2 size={12} /> SQL Verification Query
                      </span>
                      <span>Read-only</span>
                    </div>
                    <pre className="p-3 rounded-b-xl bg-black/60 text-emerald-400 font-mono text-xs overflow-x-auto border border-t-0 border-white/10">
                      {msg.sqlSnippet}
                    </pre>
                  </div>
                )}

                <div className="text-[10px] font-mono opacity-40 text-right">{msg.timestamp}</div>
              </div>

              {msg.sender === 'user' && (
                <div
                  className={`w-8 h-8 rounded-full border flex-shrink-0 flex items-center justify-center font-mono text-xs font-bold ${
                    msg.incognito
                      ? 'bg-purple-900/50 border-purple-400/40 text-purple-200'
                      : 'bg-[#E8C4A0] dark:bg-[#3D352E] border-[#4A4238]/20 text-[#4A4238] dark:text-[#EDE6DC]'
                  }`}
                >
                  DV
                </div>
              )}
            </motion.div>
          ))}

          {/* Thinking animation indicator */}
          {isThinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-serif font-bold text-xs ${
                  isIncognito ? 'bg-purple-600' : 'bg-[#D4826A]'
                }`}
              >
                A
              </div>
              <div
                className={`px-4 py-3 rounded-2xl text-xs font-mono flex items-center gap-2 ${
                  isIncognito
                    ? 'bg-[#1A1624] border border-purple-500/20 text-purple-300'
                    : 'glass-card text-[#4A4238]/70 dark:text-[#EDE6DC]/70'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#D4826A] animate-ping" />
                <span>Synthesizing data stream and hypotheses…</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Starter Prompt Chips ───────────────────────────────────────── */}
        {messages.length < 3 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-mono uppercase tracking-wider opacity-50 flex items-center gap-1.5">
              <IconSparkles size={13} className="text-[#D4826A]" /> Suggested Exploration Starters
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSendMessage('Analyze Q3 ARR cohort retention and identify top drop-off factors')}
                className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  isIncognito
                    ? 'bg-[#1A1624]/60 border-purple-500/20 hover:border-purple-400 text-purple-200'
                    : 'glass-card hover:border-[#D4826A]/40 text-[#4A4238] dark:text-[#EDE6DC]'
                }`}
              >
                <div className="font-serif font-medium">Q3 Cohort Churn Audit</div>
                <div className="text-[11px] opacity-60 mt-0.5">Identify drop-off across enterprise tiers</div>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Inspect checkout funnel anomaly on mobile devices')}
                className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  isIncognito
                    ? 'bg-[#1A1624]/60 border-purple-500/20 hover:border-purple-400 text-purple-200'
                    : 'glass-card hover:border-[#D4826A]/40 text-[#4A4238] dark:text-[#EDE6DC]'
                }`}
              >
                <div className="font-serif font-medium">Checkout Funnel Anomaly</div>
                <div className="text-[11px] opacity-60 mt-0.5">Pinpoint step 3 drop-off on iOS browsers</div>
              </button>
            </div>
          </div>
        )}

        {/* ─── Input Bar & Connector Dropzone ──────────────────────────────── */}
        <div className="sticky bottom-4 z-20 space-y-2">
          {/* Attached Files List */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {attachedFiles.map((file, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
                    isIncognito
                      ? 'bg-purple-950/80 border-purple-500/30 text-purple-200'
                      : 'bg-white/80 dark:bg-white/10 border-[#4A4238]/15 dark:border-white/15 text-[#4A4238] dark:text-[#EDE6DC]'
                  }`}
                >
                  <IconFileSpreadsheet size={13} className="text-[#D4826A]" />
                  <span>{file}</span>
                </span>
              ))}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`p-2 sm:p-2.5 rounded-2xl border shadow-xl backdrop-blur-xl flex items-center gap-2 transition-all ${
              isIncognito
                ? 'bg-[#1A1624]/90 border-purple-500/30 focus-within:border-purple-400'
                : 'glass-card border-[#4A4238]/15 dark:border-white/15 focus-within:border-[#D4826A]/50'
            }`}
          >
            {/* File Upload / Source Button */}
            <button
              type="button"
              onClick={handleFileUpload}
              title="Attach CSV, SQL, or Spreadsheet"
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                isIncognito
                  ? 'bg-purple-950/60 border-purple-500/25 text-purple-300 hover:text-white'
                  : 'bg-black/5 dark:bg-white/5 border-transparent hover:border-[#4A4238]/15 text-[#4A4238]/60 dark:text-[#EDE6DC]/60 hover:text-[#4A4238] dark:hover:text-white'
              }`}
            >
              <IconUpload size={16} />
            </button>

            {/* Input field */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isIncognito
                  ? 'Ask in Incognito (no logs saved)…'
                  : 'Ask a question or specify a metric hypothesis…'
              }
              className="flex-1 px-3 py-2 bg-transparent text-sm placeholder-current/35 focus:outline-none"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputMessage.trim() || isThinking}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs ${
                isIncognito
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-[#4A4238] hover:bg-[#383129] dark:bg-[#EDE6DC] dark:hover:bg-white dark:text-[#161311] text-[#F3EDE4]'
              }`}
            >
              <span>Send</span>
              <IconSend size={14} className={isIncognito ? 'text-purple-200' : 'text-[#D4826A]'} />
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}
