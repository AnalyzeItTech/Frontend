// Practical guides about working with data. Written to be useful on their own, with no invented figures: the advice is about method,
// and every claim about AnalyzeIt describes something that exists today (see /docs/discovery and the changelog).
// Blocks: { p }, { h2 }, { ul: [...] }, { ol: [...] }.

export const GUIDES_UPDATED = '2026-10-06';

export const GUIDES = [
  {
    slug: 'find-what-changed-in-your-data',
    title: 'How to find out what changed in your sales data',
    description: 'A step-by-step way to work out when a number moved, which part of the business moved it, and whether it is worth acting on.',
    published: '2026-10-06',
    blocks: [
      { p: 'Someone asks "why are sales down?" and the honest answer is usually "it depends where you look". The total is the last place the answer shows up. This guide is the order of questions that gets you to it fastest, with or without software.' },
      { h2: '1. Put the numbers on a time axis' },
      { p: 'Total by month (or by week, if you have enough rows). Draw it as a line. A table of figures hides the shape; a line shows you in seconds whether you are looking at a sudden drop, a slow slide or one odd month.' },
      { h2: '2. Decide which kind of change it is' },
      { ul: [
        'A step: the level changes at one point and stays changed. Something happened on that date: a price change, a new competitor, a tracking fix.',
        'A trend: it keeps moving the same way. Look for something gradual, such as a market shifting or a product ageing.',
        'A blip: one period is off and the next is back to normal. Often a late payment, an outage, or a one-off order.',
      ] },
      { h2: '3. Compare like with like' },
      { p: 'If your business has a busy season, compare March with last March, not with February. A quiet January after a busy December is not a decline. You need at least two full years of data before a seasonal comparison means much.' },
      { h2: '4. Split it by segment' },
      { p: 'Break the same line by region, product, channel or customer type. A flat total can hide one segment falling and another rising. A fall that sits in one segment points at a cause; a fall spread evenly points at the market or at how you measure.' },
      { h2: '5. Check what you are counting' },
      { ul: [
        'Did the number of records change, or the value of each? Fewer orders and smaller orders are different problems.',
        'Is all of the data there? A file that stopped loading halfway through a month makes that month look like a collapse.',
        'Did a definition change? A new way of recording refunds will move a total on its own.',
      ] },
      { h2: '6. Confirm with a second source' },
      { p: 'Before you act, check the finding against something that was collected separately: bank deposits, a payment provider report, customer counts from another system. If two independent sources agree, you can act. If they disagree, you have found a data problem, which is also useful.' },
      { h2: 'Doing this in AnalyzeIt' },
      { p: 'Ask "what stands out in my data?" and AnalyzeIt runs these checks across your tables. Each result is a card with a plain title, a chart, one sentence on what it means, and a "Show the working" panel with the figures and the exact query. Findings are labelled by how sure the evidence is, and it says how many checks it ran and what part of your data it could read.' },
    ],
    cta: { href: '/docs/discovery', label: 'How discovery works' },
  },
  {
    slug: 'real-change-or-random-noise',
    title: 'Real change or random noise? A plain guide to reading your numbers',
    description: 'Why every business number wobbles, how to tell a meaningful move from the usual wobble, and the five mistakes that produce false alarms.',
    published: '2026-10-06',
    blocks: [
      { p: 'Every number you track moves from one period to the next, even when nothing has changed. Weekly sales, daily sign-ups and monthly churn all wobble. The skill is separating a move that is bigger than the wobble from one that is not.' },
      { h2: 'Compare the move to the usual wobble' },
      { p: 'Look at how much the number normally changes between neighbouring periods. A drop that is about the same size as ordinary ups and downs tells you nothing. A drop several times larger than anything in the history is worth a closer look. Software does this with a statistical test; by hand, scan the history and ask "has it ever moved this much before?"' },
      { h2: 'Mistake 1: small groups' },
      { p: 'Three orders last month and six this month is a doubling, and it is almost certainly noise. The fewer records behind a number, the more it jumps around. Always ask how many records sit behind a percentage.' },
      { h2: 'Mistake 2: looking at too many things' },
      { p: 'If you examine a hundred segments, a few will look unusual by luck alone. The more comparisons you make, the stricter your bar should be for calling one of them real. A finding that survives a strict bar after you searched widely is far more believable than one you went looking for.' },
      { h2: 'Mistake 3: ignoring the calendar' },
      { p: 'A December spike that happens every December is a pattern, not news. A weekend dip in a business that sells to offices is the same. Check whether the "change" appears in the same place in earlier years before you call it new.' },
      { h2: 'Mistake 4: letting one big customer decide the average' },
      { p: 'One very large order can lift an average and make a whole month look strong. Recalculate without it, or look at the median. If the story disappears, it was one customer, not a trend. The same goes for a group made of just a handful of customers: their many orders are not many independent observations.' },
      { h2: 'Mistake 5: reading cause into a link' },
      { p: 'Two numbers that rise and fall together are linked, which is a good reason to investigate and not a reason to conclude. Ad spend and sales may both rise in the same busy season. A finding tells you where to look; it does not tell you why.' },
      { h2: 'How AnalyzeIt guards against these' },
      { p: 'Discovery compares each move with the series’ own history, applies a stricter bar when it has searched many places, checks for yearly seasonality when there are at least two full years of data, treats customer-clustered groups as the few independent customers they are, and labels each finding by the strength of its evidence: Confirmed in the data, Strong evidence, Likely, or Worth checking. It tested itself on realistic data with no real pattern before we trusted it, and on data with a planted pattern to see how often it was found.' },
    ],
    cta: { href: '/docs/discovery', label: 'How discovery works' },
  },
  {
    slug: 'free-public-datasets-and-how-to-check-them',
    title: 'Where to find free public data, and how to check it before you trust it',
    description: 'The main places public data lives, the checks to make before using it, and the traps that quietly spoil an analysis.',
    published: '2026-10-06',
    blocks: [
      { p: 'A great deal of useful data is free: economic indicators, population, health, energy, transport. Finding it is the easy part. Knowing whether to trust it is where analyses go wrong.' },
      { h2: 'Where public data lives' },
      { ul: [
        'International organisations publish indicators by country and year, for example the World Bank’s open data and Our World in Data.',
        'Government open-data portals publish datasets from agencies and cities. Many run on common platforms such as CKAN or Socrata, which is why their datasets look alike and can be searched in the same way.',
        'National statistical agencies publish the official figures for their country, often as downloadable tables.',
        'Research repositories and code-hosting sites hold datasets that accompany papers and projects, often as plain CSV files.',
      ] },
      { h2: 'Five checks before you use a dataset' },
      { ol: [
        'Who published it? An agency or organisation that collects the data is better than a copy of a copy.',
        'When was it last updated, and what period does it actually cover? A dataset can be downloaded today and describe a period years ago.',
        'What are the units and definitions? Percent or per person, current prices or adjusted for inflation, calendar year or fiscal year.',
        'What does it include? Check for rows that are totals (such as "World" or "All regions") sitting alongside the countries, which will double-count if you sum.',
        'How are gaps recorded? Some files use blank cells, others use 0 or a code like -999 for "missing". A zero that means "unknown" ruins an average.',
      ] },
      { h2: 'Traps that quietly spoil an analysis' },
      { ul: [
        'Mixing countries that report in different years, which makes a panel look like it jumps when only the reporting changed.',
        'Comparing a figure that was revised with one that was not.',
        'Assuming a column called "value" means what you hope. Read the description.',
        'Using a download without noting where and when you got it, so nobody can check it later.',
      ] },
      { h2: 'Using public data in AnalyzeIt' },
      { p: 'Paste a link to a data file or ask for public data on a topic. AnalyzeIt looks for the data, downloads a table, reshapes it where needed (for example, years laid out as columns), sets aside total rows, and runs the same discovery checks as on your own data. Every answer lists its source, the date it was downloaded, the newest period in the data, and a plain note that the data comes from the internet and has not been checked by AnalyzeIt. If nothing usable is found, it says what it tried and why each source failed. It follows each site’s robots.txt, and it never reaches internal or private addresses.' },
    ],
    cta: { href: '/docs/discovery', label: 'How online data works' },
  },
  {
    slug: 'clean-a-messy-csv',
    title: 'How to clean a messy CSV before you analyse it',
    description: 'A checklist for the problems that break spreadsheets and charts: stray header rows, decimal commas, ambiguous dates, hidden totals and more.',
    published: '2026-10-06',
    blocks: [
      { p: 'Most analysis problems that look like maths problems are data problems. A column that should be numbers is text, a date is read the wrong way round, a totals row is counted as a customer. Ten minutes of checking saves a wrong conclusion.' },
      { h2: 'Look at the shape first' },
      { ul: [
        'Is the real header on row 1, or are there title rows and notes above it?',
        'Are there footnotes or a totals row at the bottom?',
        'Do any rows repeat the header in the middle (common when files are stitched together)?',
      ] },
      { h2: 'Numbers that are not numbers' },
      { p: 'Currency symbols, thousands separators and percent signs turn a number into text. Parentheses often mean a negative: (45) is -45. In many countries the decimal mark is a comma and the thousands separator is a dot, so "1.234,56" means one thousand two hundred thirty-four and fifty-six hundredths. Indian digit grouping such as 12,34,567 has a different rhythm again. Decide which convention a file uses by looking at several values, not one.' },
      { h2: 'Dates: never guess' },
      { p: '04/05/2026 is the fourth of May in most of the world and the fifth of April in the United States. If every day value in the column is 12 or less, you cannot tell which is which from the data alone. Look for a value above 12 in either position, check the source’s documentation, or ask whoever made the file. A silent guess puts half your rows in the wrong month.' },
      { h2: 'Wide tables and long tables' },
      { p: 'A table with one column per year (2018, 2019, 2020 and so on) is easy to read and hard to chart or filter. Reshape it to one row per entity per year. Do the reverse only when you need to read it.' },
      { h2: 'Blank, zero and missing' },
      { p: 'They are three different things. Blank often means "not recorded", zero means "none", and special codes such as -999 or "n/a" mean "unknown". Convert them deliberately; averaging a -999 is a classic way to wreck a result.' },
      { h2: 'Duplicates and keys' },
      { p: 'If a column should be unique (an order id), check that it is. Repeated rows from a double export inflate every total. Also look for near-duplicates, such as the same customer spelled two ways.' },
      { h2: 'Encoding and delimiters' },
      { p: 'Accented characters that turn into symbols mean the file was saved in a different encoding. A file that opens as one long column may use semicolons or tabs instead of commas.' },
      { h2: 'Keep the original, and write down what you changed' },
      { p: 'Work on a copy. Note each change (for example, "removed the totals row", "read dates as day/month") so the result can be checked by someone else, including you in six months.' },
      { h2: 'What AnalyzeIt does for you' },
      { p: 'When AnalyzeIt downloads a table from the internet, it detects the header, reads numbers in these formats, converts dates (and refuses to guess an ambiguous day/month order), reshapes year-per-column tables, sets aside total rows and tells you what it changed. It also reports when a table was too messy to use, instead of analysing it anyway.' },
    ],
    cta: { href: '/docs/discovery', label: 'How online data works' },
  },
];

export function guide(slug) {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}

export function wordCount(g) {
  const parts = g.blocks.flatMap((b) => (b.p ? [b.p] : b.h2 ? [b.h2] : [...(b.ul || []), ...(b.ol || [])]));
  return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

export function readMinutes(g) {
  return Math.max(1, Math.round(wordCount(g) / 220));
}
