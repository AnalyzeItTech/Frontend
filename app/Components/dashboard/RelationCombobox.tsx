'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  IconLink,
  IconSearch,
  IconX,
  IconCheck,
  IconPlus,
  IconRefresh,
  IconChevronDown,
} from '@tabler/icons-react';
import { fetchRecords, fetchRecordDetail, type ObjectRecord } from '../../lib/customObjectsApi';

interface RelationComboboxProps {
  projectId: string;
  targetObject: string;
  targetLabel?: string;
  value: string;
  resolvedLabel?: string;
  onChange: (recordId: string, record?: ObjectRecord | null) => void;
  required?: boolean;
  disabled?: boolean;
  mutationVersion?: number;
  onQuickCreate?: (targetObject: string) => void;
}

export function RelationCombobox({
  projectId,
  targetObject,
  targetLabel = 'Record',
  value,
  resolvedLabel,
  onChange,
  required = false,
  disabled = false,
  mutationVersion = 0,
  onQuickCreate,
}: RelationComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ObjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ObjectRecord | null>(null);
  const [displayLabel, setDisplayLabel] = useState<string>(resolvedLabel || '');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract the primary display name from a record's data or values
  const getRecordTitle = (rec: ObjectRecord): string => {
    const d = rec.values || rec.data || {};
    if (d.name) return String(d.name);
    if (d.title) return String(d.title);
    if (d.first_name || d.last_name) {
      return `${d.first_name || ''} ${d.last_name || ''}`.trim();
    }
    if (d.label) return String(d.label);
    if (d.deal_name) return String(d.deal_name);
    if (d.email) return String(d.email);
    return rec.id;
  };

  // Helper to extract secondary subtitle (e.g. email, status, amount)
  const getRecordSubtitle = (rec: ObjectRecord): string => {
    const d = rec.values || rec.data || {};
    const parts: string[] = [];
    if (d.email && getRecordTitle(rec) !== d.email) parts.push(d.email);
    if (d.status) parts.push(String(d.status));
    if (d.amount !== undefined) parts.push(`$${d.amount}`);
    if (d.priority) parts.push(String(d.priority));
    return parts.join(' • ');
  };

  // Fetch initial/selected record details if only ID is provided
  useEffect(() => {
    if (!value) {
      setSelectedRecord(null);
      setDisplayLabel('');
      return;
    }
    if (resolvedLabel) {
      setDisplayLabel(resolvedLabel);
    }
    let isCancelled = false;
    fetchRecordDetail(value)
      .then((rec) => {
        if (!isCancelled && rec) {
          setSelectedRecord(rec);
          setDisplayLabel(getRecordTitle(rec));
        }
      })
      .catch(() => {
        if (!isCancelled && !resolvedLabel) {
          setDisplayLabel(`Record (${value.slice(0, 8)}...)`);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [value, resolvedLabel, targetObject, projectId]);

  // Query records on search or when opened/mutated
  useEffect(() => {
    if (!isOpen || !projectId || !targetObject) return;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchRecords(projectId, targetObject, 15, 0, 'created_at', true, searchQuery)
        .then((resp) => {
          setResults(resp.records || []);
          setFocusedIndex(-1);
        })
        .catch((err) => {
          console.error(`Failed to load relation records for ${targetObject}:`, err);
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen, searchQuery, targetObject, projectId, mutationVersion]);

  // Click-outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const handleSelect = (rec: ObjectRecord) => {
    setSelectedRecord(rec);
    setDisplayLabel(getRecordTitle(rec));
    setIsOpen(false);
    onChange(rec.id, rec);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRecord(null);
    setDisplayLabel('');
    onChange('', null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < results.length) {
        handleSelect(results[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Selection Trigger ── */}
      {value && displayLabel ? (
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all cursor-pointer ${
            isOpen
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-neutral-800'
              : 'border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 hover:border-neutral-400 dark:hover:border-white/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <IconLink className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-neutral-900 dark:text-white truncate">
                {displayLabel}
              </span>
              <span className="font-mono text-[10px] text-neutral-400 truncate">
                {targetLabel} • ID: {value.slice(0, 10)}...
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-md text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Unlink reference"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
            <IconChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      ) : (
        <div
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all cursor-pointer ${
            isOpen
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-neutral-800'
              : 'border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 hover:border-neutral-400 dark:hover:border-white/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="text-neutral-400 flex items-center gap-1.5">
            <IconSearch className="w-3.5 h-3.5" />
            Select referenced {targetLabel}...
          </span>
          <IconChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      )}

      {/* ── Dropdown Panel ── */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/15 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-72">
          {/* Search bar header */}
          <div className="p-2 border-b border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center gap-2">
            <IconSearch className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${targetLabel} by name, email, ID...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
            />
            {loading ? (
              <IconRefresh className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
              >
                <IconX className="w-3 h-3" />
              </button>
            ) : null}
          </div>

          {/* Results list */}
          <div className="overflow-y-auto flex-1 p-1">
            {loading && results.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                <IconRefresh className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                Searching {targetLabel} records...
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                <span>No {targetLabel} records found{searchQuery ? ` matching "${searchQuery}"` : ''}</span>
                {onQuickCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onQuickCreate(targetObject);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium text-[11px] hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <IconPlus className="w-3 h-3" />
                    Create New {targetLabel}
                  </button>
                )}
              </div>
            ) : (
              results.map((rec, idx) => {
                const title = getRecordTitle(rec);
                const subtitle = getRecordSubtitle(rec);
                const isSelected = rec.id === value;
                const isFocused = idx === focusedIndex;

                return (
                  <div
                    key={rec.id}
                    onClick={() => handleSelect(rec)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-medium'
                        : isFocused
                        ? 'bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{title}</span>
                        {isSelected && <IconCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </div>
                      {subtitle && (
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                          {subtitle}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-neutral-400 shrink-0">
                      {rec.id.slice(0, 8)}...
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Quick Create Action */}
          {onQuickCreate && (
            <div className="p-1.5 border-t border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-neutral-800/30 flex justify-between items-center">
              <span className="text-[10px] text-neutral-400 font-mono px-1">
                {results.length} record{results.length !== 1 ? 's' : ''} shown
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onQuickCreate(targetObject);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
              >
                <IconPlus className="w-3 h-3" />
                New {targetLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
