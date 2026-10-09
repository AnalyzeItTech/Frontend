// Country-aware trust copy and price notes for marketing pages. Pure functions, no I/O.
// Every claim here must already be true of the product or stated on /privacy, /refund, /dpa or /security.
// What the visitor is actually charged is always INR via Razorpay; other currencies are estimates for reading only.

export const COUNTRY_COOKIE = 'ai_country';

const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO'];

// Data-protection regime a visitor in that country can cite. Names the law only; it is not a claim of certification.
const LAWS = {
  IN: { name: 'India', law: 'the Digital Personal Data Protection Act, 2023' },
  GB: { name: 'the United Kingdom', law: 'the UK GDPR' },
  US: { name: 'the United States', law: 'state privacy laws such as the CCPA' },
  CA: { name: 'Canada', law: 'PIPEDA' },
  AU: { name: 'Australia', law: 'the Privacy Act 1988' },
  SG: { name: 'Singapore', law: 'the PDPA' },
  AE: { name: 'the UAE', law: 'the UAE Personal Data Protection Law' },
  BR: { name: 'Brazil', law: 'the LGPD' },
  JP: { name: 'Japan', law: 'the APPI' },
  ZA: { name: 'South Africa', law: 'POPIA' },
};
for (const code of EU) LAWS[code] = { name: 'the EU / EEA', law: 'the GDPR' };

/** "in" -> "IN"; anything that is not a two-letter region -> null. */
export function normalizeCountry(value) {
  const v = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) && v !== 'XX' && v !== 'T1' ? v : null;
}

/** Country from the edge cookie first, then the browser locale ("en-GB" -> "GB"). Null when neither says. */
export function resolveCountry({ cookie, language } = {}) {
  const fromCookie = normalizeCountry(cookie);
  if (fromCookie) return fromCookie;
  const region = String(language || '').split('-')[1];
  return normalizeCountry(region);
}

/** Read the edge cookie out of document.cookie. */
export function cookieCountry(cookieString) {
  const m = String(cookieString || '').match(new RegExp(`(?:^|;\\s*)${COUNTRY_COOKIE}=([^;]*)`));
  return m ? normalizeCountry(decodeURIComponent(m[1])) : null;
}

function money(estimate) {
  if (!estimate || !Number.isFinite(Number(estimate.amount)) || !estimate.currency) return null;
  const whole = ['JPY', 'KRW', 'VND', 'CLP', 'ISK'].includes(estimate.currency);
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: estimate.currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(Number(estimate.amount));
  } catch {
    return `${estimate.currency} ${Number(estimate.amount).toFixed(2)}`;
  }
}

/** Second line under a price. `estimate` is the quote row's `local_estimate`; absent means we say nothing about it. */
export function localPriceNote(estimate, country) {
  const shown = money(estimate);
  if (!shown || country === 'IN') return null;
  return `About ${shown}/mo in ${estimate.currency}. You are billed in INR; your bank converts at its own rate.`;
}

/**
 * What to show a visitor from `country` (two letters, or null when unknown).
 * `email` is the privacy contact, passed in so this file stays free of app imports.
 */
export function trustProfile(country, email) {
  const code = normalizeCountry(country);
  const law = code ? LAWS[code] : null;
  const india = code === 'IN';

  const points = [
    india
      ? { title: 'Billed in rupees', body: 'Paid plans are charged in INR through Razorpay. The price on this page is the price on your statement.' }
      : { title: 'One clear currency', body: 'Paid plans are charged in INR through Razorpay. Where we can, we show an estimate in your currency for reading only.' },
    { title: 'Card details stay with Razorpay', body: 'We never store full card numbers. Payment is handled by Razorpay.' },
    { title: 'Cancel any time', body: 'Cancel from Billing whenever you like. If the service was materially unavailable, you can ask for a refund within 7 days of your first paid charge.' },
    law
      ? { title: `Your data rights in ${law.name}`, body: `You can ask for access, correction or deletion of your data, including under ${law.law}. Write to ${email}.` }
      : { title: 'Your data rights', body: `Depending on where you live you may have rights to access, correct or delete your data. Write to ${email}.` },
  ];
  if (india) {
    points.push({ title: 'Made for Indian businesses', body: 'The first module analyses Razorpay payments, including failed payments, for Indian D2C brands.' });
  }

  return {
    country: code,
    heading: india ? 'Why teams in India trust AnalyzeIt' : code ? 'What to expect when you pay from here' : 'What to expect when you pay',
    points,
    links: [
      { href: '/refund', label: 'Refund policy' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/dpa', label: 'Data processing terms' },
      { href: '/security', label: 'Security' },
    ],
  };
}
