import {
  EMAIL,
  GSTIN,
  JURISDICTION,
  LEGAL_NAME,
  PHONE,
  REGISTERED_ADDRESS,
} from '../../lib/legalEntity';

export function OperatorBlock({
  quiet = false,
  updated,
}: {
  quiet?: boolean;
  updated?: string;
}) {
  return (
    <section
      className={
        quiet
          ? 'mt-16 space-y-1 rounded-2xl border border-[#4A4238]/10 dark:border-[#3A3430] bg-white/30 dark:bg-[#211E1C]/40 p-5 text-xs text-[#4A4238]/65 dark:text-[#C5B9AE]/80'
          : 'mt-4 space-y-1 rounded-2xl border border-[#4A4238]/10 dark:border-[#3A3430] bg-white/40 dark:bg-[#211E1C]/60 p-5 text-sm'
      }
    >
      <p className="font-mono text-[11px] uppercase tracking-widest text-[#4A4238]/45 dark:text-[#91867E]">
        Legal entity
      </p>
      <p className={`font-medium text-[#4A4238] dark:text-[#F4EDE5] ${quiet ? 'text-xs' : ''}`}>
        {LEGAL_NAME}
      </p>
      <p>{REGISTERED_ADDRESS}</p>
      <p>Governing law: {JURISDICTION}</p>
      {GSTIN ? <p>GSTIN: {GSTIN}</p> : null}
      {PHONE ? <p>Phone: {PHONE}</p> : null}
      <p>
        Legal:{' '}
        <a href={`mailto:${EMAIL.legal}`} className="text-[#E3836C] hover:underline">
          {EMAIL.legal}
        </a>
      </p>
      {updated ? (
        <p className="pt-2 text-[11px] text-[#4A4238]/45 dark:text-[#91867E]">
          Last updated {updated}
        </p>
      ) : null}
    </section>
  );
}
