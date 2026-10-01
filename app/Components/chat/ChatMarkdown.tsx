'use client';

import { Fragment, type ReactNode } from 'react';
import { parseTableAt, safeHref } from '../../lib/chatExtras.mjs';

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\[[^\]\n]+\]\([^)\s]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>);
    }
    const token = match[0];
    if (token.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const href = m ? safeHref(m[2]) : null;
      nodes.push(
        href ? (
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--text-primary)]">
            {m![1]}
          </a>
        ) : (
          <Fragment key={key++}>{m ? m[1] : token}</Fragment>
        ),
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-[var(--surface-2)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--text-primary)]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }
  return nodes;
}

function headingClass(level: number) {
  if (level <= 1) return 'mt-3 mb-1.5 text-base font-semibold tracking-tight text-[var(--text-primary)]';
  if (level === 2) return 'mt-3 mb-1 text-[15px] font-semibold tracking-tight text-[var(--text-primary)]';
  if (level === 3) return 'mt-2.5 mb-1 text-sm font-semibold text-[var(--text-primary)]';
  return 'mt-2 mb-1 text-sm font-medium text-[var(--text-primary)]';
}

export function ChatMarkdown({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      blocks.push(
        <p key={key++} role="heading" aria-level={level} className={headingClass(level)}>
          {renderInline(heading[2].trim())}
        </p>,
      );
      i += 1;
      continue;
    }

    if (/^\s*```/.test(line)) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence (or end of a still-streaming block)
      blocks.push(
        <pre key={key++} className="my-2 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-3 text-xs">
          <code className="font-mono">{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const table = parseTableAt(lines, i);
    if (table) {
      blocks.push(
        <div key={key++} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {table.header.map((h, c) => (
                  <th key={c} className="px-2 py-1.5 font-semibold text-[var(--text-primary)]" style={{ textAlign: table.align[c] }}>
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r} className="border-b border-[var(--border)]/60">
                  {row.map((cell, c) => (
                    <td key={c} className="px-2 py-1.5 text-[var(--text-secondary)]" style={{ textAlign: table.align[c] }}>
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i = table.next;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote key={key++} className="my-2 border-l-2 border-[var(--border)] pl-3 text-[var(--text-secondary)]">
          {renderInline(quote.join(' '))}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="my-3 border-[var(--border)]" />);
      i += 1;
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      const ordered = /^\s*\d+\.\s+/.test(line);
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[i]) : /^\s*[-*•]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*•]\s+/, ''));
        i += 1;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List
          key={key++}
          className={`my-2 space-y-1 pl-5 text-[var(--text-secondary)] ${ordered ? 'list-decimal' : 'list-disc'}`}
        >
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !parseTableAt(lines, i)
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={key++} className="my-1.5 leading-relaxed text-[var(--text-secondary)] last:mb-0 first:mt-0">
        {renderInline(para.join(' '))}
      </p>,
    );
  }

  return <div className={`chat-markdown ${className}`}>{blocks.length ? blocks : renderInline(text)}</div>;
}
