// Worked examples that run a real tool when the page opens (currency, weather, unit conversion). Each page is a question people
// actually search for, answered live with its source shown, so no figure on these pages is ever written by hand: the number
// comes from the tool, and the text around it only explains where it comes from and what it does not mean.
// Only pairs and cities that the tools were checked against are listed here; add one only after trying it for real.

export const LIVE_CASES_UPDATED = '2026-10-06';

const CURRENCIES = [
  { code: 'EUR', name: 'euro', plural: 'euros', amount: 100, about: 'The euro is the currency of the countries in the euro area.' },
  { code: 'GBP', name: 'British pound', plural: 'pounds', amount: 100, about: 'The pound sterling is the currency of the United Kingdom.' },
  { code: 'AUD', name: 'Australian dollar', plural: 'Australian dollars', amount: 100, about: 'The Australian dollar is the currency of Australia.' },
  { code: 'CAD', name: 'Canadian dollar', plural: 'Canadian dollars', amount: 100, about: 'The Canadian dollar is the currency of Canada.' },
  { code: 'SGD', name: 'Singapore dollar', plural: 'Singapore dollars', amount: 100, about: 'The Singapore dollar is the currency of Singapore.' },
  { code: 'JPY', name: 'Japanese yen', plural: 'yen', amount: 1000, about: 'The yen is the currency of Japan. It has no small units in everyday use, so a larger amount is converted here.' },
  { code: 'CHF', name: 'Swiss franc', plural: 'Swiss francs', amount: 100, about: 'The Swiss franc is the currency of Switzerland.' },
  { code: 'CNY', name: 'Chinese yuan', plural: 'yuan', amount: 100, about: 'The yuan, also called the renminbi, is the currency of mainland China.' },
  { code: 'NZD', name: 'New Zealand dollar', plural: 'New Zealand dollars', amount: 100, about: 'The New Zealand dollar is the currency of New Zealand.' },
];

const INR_TO = [
  { code: 'USD', name: 'US dollar', plural: 'US dollars' },
  { code: 'EUR', name: 'euro', plural: 'euros' },
  { code: 'GBP', name: 'British pound', plural: 'pounds' },
];

const CITIES = [
  { slug: 'delhi', name: 'Delhi', where: 'Delhi' },
  { slug: 'bengaluru', name: 'Bengaluru', where: 'Karnataka' },
  { slug: 'chennai', name: 'Chennai', where: 'Tamil Nadu' },
  { slug: 'pune', name: 'Pune', where: 'Maharashtra' },
  { slug: 'kolkata', name: 'Kolkata', where: 'West Bengal' },
  { slug: 'hyderabad', name: 'Hyderabad', where: 'Telangana' },
  { slug: 'ahmedabad', name: 'Ahmedabad', where: 'Gujarat' },
  { slug: 'jaipur', name: 'Jaipur', where: 'Rajasthan' },
  { slug: 'lucknow', name: 'Lucknow', where: 'Uttar Pradesh' },
];

// Exact definitions only: 1 mile = 1.609344 km, 1 lb = 0.45359237 kg, 1 inch = 2.54 cm, 1 foot = 0.3048 m.
const UNITS = [
  { slug: 'km-to-miles', title: 'Kilometres to miles', question: 'Convert 10 km to miles', fact: 'One mile is defined as exactly 1.609344 kilometres, so miles = kilometres ÷ 1.609344.', also: ['miles-to-km'] },
  { slug: 'miles-to-km', title: 'Miles to kilometres', question: 'Convert 5 miles to km', fact: 'One mile is defined as exactly 1.609344 kilometres, so kilometres = miles × 1.609344.', also: ['km-to-miles'] },
  { slug: 'kg-to-pounds', title: 'Kilograms to pounds', question: 'Convert 70 kg to pounds', fact: 'One pound is defined as exactly 0.45359237 kilograms, so pounds = kilograms ÷ 0.45359237.', also: ['pounds-to-kg'] },
  { slug: 'pounds-to-kg', title: 'Pounds to kilograms', question: 'Convert 150 pounds to kg', fact: 'One pound is defined as exactly 0.45359237 kilograms, so kilograms = pounds × 0.45359237.', also: ['kg-to-pounds'] },
  { slug: 'celsius-to-fahrenheit', title: 'Celsius to Fahrenheit', question: 'Convert 25 celsius to fahrenheit', fact: 'Temperatures are not a plain multiplication: Fahrenheit = Celsius × 9 ÷ 5 + 32, because the two scales start at different points.', also: ['fahrenheit-to-celsius'] },
  { slug: 'fahrenheit-to-celsius', title: 'Fahrenheit to Celsius', question: 'Convert 100 fahrenheit to celsius', fact: 'Temperatures are not a plain multiplication: Celsius = (Fahrenheit − 32) × 5 ÷ 9, because the two scales start at different points.', also: ['celsius-to-fahrenheit'] },
  { slug: 'cm-to-inches', title: 'Centimetres to inches', question: 'Convert 100 cm to inches', fact: 'One inch is defined as exactly 2.54 centimetres, so inches = centimetres ÷ 2.54.', also: ['feet-to-cm'] },
  { slug: 'feet-to-cm', title: 'Feet to centimetres', question: 'Convert 6 feet to cm', fact: 'One foot is defined as exactly 0.3048 metres, which is 30.48 centimetres.', also: ['cm-to-inches'] },
];

const trim = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

function currencyCase(from, to, amount, about) {
  const slug = `${from.toLowerCase()}-to-${to.toLowerCase()}`;
  return {
    slug,
    kind: 'currency',
    title: `${from} to ${to} rate today, with the source shown`,
    description: trim(`Convert ${from === 'INR' ? 'Indian rupees' : about.plural} to ${to === 'INR' ? 'Indian rupees' : about.toPlural} using the live ECB reference rate, with the source and date shown and no AI model involved.`, 158),
    h1: `${from} to ${to}, with the source shown.`,
    subtitle: `Converting ${amount.toLocaleString('en-US')} ${from} to ${to} from a live reference-rate feed. The number comes from the feed, not from a model, and the date it applies to is shown.`,
    question: `Convert ${amount} ${from} to ${to}`,
    label: `${from} to ${to}`,
    group: 'Currency',
    sections: [
      { h: 'Where the rate comes from', p: [
        'The rate is the European Central Bank reference rate for the pair, fetched live through the Frankfurter service when the page opens. The reference rates are published once on each working day, so on a weekend you see the latest working-day rate, and the answer shows the date it applies to.',
      ] },
      { h: 'What this rate is and is not', p: [
        'It is a reference rate. It is not the rate your bank, card network or money-transfer service will use, because those add a margin or a fee. Use it to get a sense of the number, then compare it with what your provider quotes.',
        about.about,
      ] },
    ],
    also: [],
  };
}

const currencyCases = [
  ...CURRENCIES.map((c) => {
    const k = currencyCase(c.code, 'INR', c.amount, { name: c.name, plural: c.plural, about: c.about, toPlural: '' });
    return { ...k, description: trim(`Convert ${c.plural} to Indian rupees using the live ECB reference rate, with the source and date shown and no AI model involved.`, 158) };
  }),
  ...INR_TO.map((c) => {
    const k = currencyCase('INR', c.code, 10000, { name: 'Indian rupee', plural: 'Indian rupees', about: 'The rupee is the currency of India.', toPlural: c.plural });
    return { ...k, description: trim(`Convert 10,000 Indian rupees to ${c.plural} using the live ECB reference rate, with the source and date shown and no AI model involved.`, 158) };
  }),
];

const weatherCases = CITIES.map((c) => ({
  slug: `weather-${c.slug}`,
  kind: 'weather',
  title: `${c.name} weather right now, from a live service`,
  description: trim(`Current temperature and humidity in ${c.name} from a live weather service, with the source shown, or an honest message when it cannot be reached.`, 158),
  h1: `${c.name} weather, without inventing it.`,
  subtitle: `Conditions in ${c.name}${c.where === c.name ? '' : `, ${c.where}`} from a weather service when the page opens. No model writes the figures.`,
  question: `What is the weather in ${c.name} right now?`,
  label: `${c.name} weather`,
  group: 'Weather',
  sections: [
    { h: 'Where the figures come from', p: [
      'The temperature and humidity are read from a live weather service at the moment the page opens, so they describe now, not the forecast and not an earlier screenshot. The answer shows its source.',
    ] },
    { h: 'When it cannot be reached', p: [
      'If the weather service does not answer, or the place cannot be matched, you get a plain message saying so. AnalyzeIt does not fill the gap with a plausible number.',
    ] },
  ],
  also: [],
}));

const unitCases = UNITS.map((u) => ({
  slug: u.slug,
  kind: 'unit',
  title: `${u.title}: convert with the working shown`,
  description: trim(`${u.title} using an exact conversion, with the calculation shown and no AI model involved.`, 158),
  h1: `${u.title}, exactly.`,
  subtitle: 'A unit conversion is arithmetic, so it is done by a calculator tool and not guessed by a model.',
  question: u.question,
  label: u.title,
  group: 'Units',
  sections: [
    { h: 'The rule behind it', p: [u.fact] },
    { h: 'Why a tool and not a model', p: ['A language model can get a conversion slightly wrong while sounding sure. Here the figure comes from a deterministic converter, labelled “From tools · 0 tokens”, so the same question always gives the same answer.'] },
  ],
  also: u.also,
}));

export const LIVE_CASES = [...currencyCases, ...weatherCases, ...unitCases];

// Related pages: a few of the same kind, so every page links to others people look up next.
for (const c of LIVE_CASES) {
  const same = LIVE_CASES.filter((o) => o.kind === c.kind && o.slug !== c.slug);
  const named = c.also.map((s) => LIVE_CASES.find((o) => o.slug === s)).filter(Boolean);
  const idx = same.findIndex((o) => o.slug > c.slug);
  const rotated = idx < 0 ? same : [...same.slice(idx), ...same.slice(0, idx)];
  c.related = [...named, ...rotated.filter((o) => !named.includes(o))].slice(0, 4).map((o) => ({ slug: o.slug, label: o.label }));
}

export function liveCase(slug) {
  return LIVE_CASES.find((c) => c.slug === slug) ?? null;
}

export const CASE_GROUP_ORDER = ['Currency', 'Weather', 'Units'];
