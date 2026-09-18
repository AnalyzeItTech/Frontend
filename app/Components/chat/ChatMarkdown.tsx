'use client';

import { Fragment, type ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>);
    }
    const token = match[0];
    if (token.startsWith('`')) {
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
      !/^\s*\d+\.\s+/.test(lines[i])
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
