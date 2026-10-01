'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconSearch,
  IconLayoutDashboard,
  IconPlus,
  IconMessageCircle,
  IconPresentation,
  IconTemplate,
  IconArrowRight,
  IconKeyboard,
} from '@tabler/icons-react';
import type { WidgetSpec } from '../../lib/chatApi';

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  group: 'navigation' | 'action' | 'widget' | 'mode';
  onSelect: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  widgets: WidgetSpec[];
  onJumpToWidget: (widgetId: string) => void;
  onAddWidget: () => void;
  onAskAboutDashboard: () => void;
  onTogglePresentationMode: () => void;
  onBrowseTemplates: () => void;
  isPresentationMode?: boolean;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[var(--coral)]/20 text-[var(--coral)] rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function CommandPalette({
  open,
  onClose,
  widgets,
  onJumpToWidget,
  onAddWidget,
  onAskAboutDashboard,
  onTogglePresentationMode,
  onBrowseTemplates,
  isPresentationMode = false,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build all actions
  const allActions: CommandAction[] = [
    {
      id: 'add-widget',
      label: 'Add widget',
      description: 'Pin a new widget to this dashboard',
      icon: <IconPlus size={15} />,
      group: 'action',
      keywords: ['new', 'create', 'pin', 'insert'],
      onSelect: () => { onAddWidget(); onClose(); },
    },
    {
      id: 'ask-dashboard',
      label: 'Ask about this dashboard',
      description: 'Open chat with full dashboard context',
      icon: <IconMessageCircle size={15} />,
      group: 'action',
      keywords: ['chat', 'ai', 'ask', 'analyze', 'explain'],
      onSelect: () => { onAskAboutDashboard(); onClose(); },
    },
    {
      id: 'presentation-mode',
      label: isPresentationMode ? 'Exit presentation mode' : 'Enter presentation mode',
      description: isPresentationMode ? 'Return to normal view' : 'Full-screen, auto-rotating view for TV/wall display',
      icon: <IconPresentation size={15} />,
      group: 'mode',
      keywords: ['fullscreen', 'tv', 'present', 'wall', 'kiosk', 'display'],
      onSelect: () => { onTogglePresentationMode(); onClose(); },
    },
    {
      id: 'browse-templates',
      label: 'Browse templates',
      description: 'Load a dashboard template',
      icon: <IconTemplate size={15} />,
      group: 'action',
      keywords: ['template', 'preset', 'layout', 'starter'],
      onSelect: () => { onBrowseTemplates(); onClose(); },
    },
    // Widget jump actions
    ...widgets.map((w) => ({
      id: `jump-${w.id}`,
      label: (w.title || w.label || 'Untitled widget') as string,
      description: `Jump to widget · ${(w.type || w.component || '')}`,
      icon: <IconLayoutDashboard size={15} />,
      group: 'widget' as const,
      keywords: [w.type || '', w.component || '', w.metric || ''],
      onSelect: () => { onJumpToWidget(w.id); onClose(); },
    })),
  ];

  const filtered = query.trim()
    ? allActions.filter((a) => {
        const q = query.toLowerCase();
        return (
          a.label.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.keywords?.some((k) => k.toLowerCase().includes(q))
        );
      })
    : allActions;

  useEffect(() => {
    setSelected(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filtered[selected]?.onSelect();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filtered, selected, onClose],
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  // Group labels
  const groupLabel: Record<string, string> = {
    action: 'Actions',
    mode: 'View',
    navigation: 'Navigate',
    widget: 'Jump to widget',
  };

  const groups: { group: string; actions: CommandAction[] }[] = [];
  let idx = 0;
  const seen = new Set<string>();
  for (const action of filtered) {
    if (!seen.has(action.group)) {
      seen.add(action.group);
      groups.push({ group: action.group, actions: [] });
    }
    groups[groups.length - 1].actions.push({ ...action, _idx: idx++ } as any);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[18%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
            role="dialog"
            aria-label="Command palette"
            aria-modal
          >
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
                <IconSearch size={16} className="text-[var(--text-muted)] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Jump to widget, action, or mode…"
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none font-mono"
                  aria-label="Search commands"
                  autoComplete="off"
                />
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)]">
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2" role="listbox">
                {filtered.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs font-mono text-[var(--text-muted)]">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                )}
                {(() => {
                  let globalIdx = 0;
                  return groups.map(({ group, actions }) => (
                    <div key={group}>
                      <div className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                        {groupLabel[group] || group}
                      </div>
                      {actions.map((action) => {
                        const myIdx = globalIdx++;
                        const isSelected = myIdx === selected;
                        return (
                          <button
                            key={action.id}
                            type="button"
                            data-idx={myIdx}
                            onClick={action.onSelect}
                            onMouseEnter={() => setSelected(myIdx)}
                            role="option"
                            aria-selected={isSelected}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--coral)]/8 text-[var(--text-primary)]'
                                : 'text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
                            }`}
                          >
                            <span
                              className={`shrink-0 ${
                                isSelected ? 'text-[var(--coral)]' : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {action.icon}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium truncate">
                                {highlight(action.label, query)}
                              </span>
                              {action.description && (
                                <span className="block text-[11px] font-mono text-[var(--text-muted)] truncate">
                                  {action.description}
                                </span>
                              )}
                            </span>
                            {isSelected && (
                              <IconArrowRight size={13} className="text-[var(--coral)] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-[var(--border)] flex items-center gap-3 text-[10px] font-mono text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><IconKeyboard size={11} /> Navigate</span>
                <span>↑↓ select · Enter confirm · Esc close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
