// What shipped, newest first. Only things that are merged and working; unfinished work is marked rollingOut.
// Add an entry here with every notable release (the /changelog page renders this list).

export const CHANGELOG = [
  {
    date: '2026-10-07',
    items: [
      { title: 'Watch a real run, no account', body: 'Pick a public-data question at /case and watch AnalyzeIt find the data, download it and read it, then see the answer with its sources and the working. You get a link to keep for 30 days, and a way to try it on your own files.' },
      { title: 'Compare your numbers with a public series', body: 'Ask “does my revenue follow the dollar rate?” or “is it related to India’s GDP growth?”. It compares changes, not levels, so a shared trend or busy season does not look like a link, and an honest “no clear relationship” is a result too.' },
      { title: 'Patterns by weekday, hour and month', body: 'Discovery now compares groups by weekday, hour of the day and month of the year (with two full years), so it can say failures are higher on Sundays or in the evening.' },
      { title: 'Forecasts by group', body: '“Forecast revenue by region” gives the total and a separately tested forecast for each of the biggest groups.' },
      { title: 'Weekly digest', body: 'Turn on a weekly check of a project’s data. It is saved as a digest you can reopen, and can be queued by email or to a Slack webhook. Live connectors such as Razorpay now also stay current on their own schedule.' },
      { title: 'Invite teammates to view a project', body: 'Invite people by e-mail. They can see the project, its records and its digests, and cannot change anything. You can remove them at any time.' },
      { title: 'More kinds of public data', body: 'Online data now reads Excel (.xlsx) files, tables in PDFs, and pages that ship their data with the page or load it from a plain .json or .csv file. It also searches data.gov.uk again, and a second level of dataset pages on the same site.' },
      { title: 'Bulk edits on every chat screen, and stopping means stopping', body: 'The preview, approve and undo card for bulk edits now works on the new-project chat too. Stopping a run now stops the analysis behind it.' },
    ],
  },
  {
    date: '2026-10-06',
    items: [
      { title: 'Razorpay connector', body: 'Connect Razorpay with a key id and secret (a test key works too). AnalyzeIt reads payments and refunds, read-only, and refreshes them when you ask if they are more than 15 minutes old. Customer email, phone, card and UPI details are never stored.' },
      { title: 'Failure and refund rates, found for you', body: 'Ask “what is going wrong with my payments?”. AnalyzeIt compares failure and refund rates across payment method and bank, and finds the date a rate jumped and where it happened. It works on any file with a status column too.' },
      { title: 'A clearer front page', body: 'The home page now leads with the problem it solves and a sample of the output, and no longer waits behind an intro animation.' },
      { title: 'What stands out in your data', body: 'Ask “what stands out?” and AnalyzeIt runs read-only checks across your tables and shows the few results that matter, each as a card with a plain title, a chart, what it means, a confidence label and the full working. It says how many checks ran and when only part of a large table could be read.' },
      { title: 'See the work as it happens', body: 'A live checklist shows each step of a discovery run (loading, profiling, checking, ranking) with real counts.' },
      { title: 'Public data from the internet', body: 'Paste a link or ask for public data on a topic. AnalyzeIt finds a table (a link, World Bank, open-data catalogues, web search), tidies it, runs the same checks, and shows the source, the download date and the newest period. It says plainly that the data has not been checked by us, and does not save online answers to your memory. Free can use a link or a World Bank indicator; Premium and VIP search further.' },
      { title: 'Results in shared reports', body: 'A shared report now includes the result cards and charts. The exact query and the follow-up questions are left out.' },
      { title: 'Changing many records, with a preview and undo', body: 'Ask for a change to a group of records. You see which records match and the before and after, then approve. Records edited after the preview are skipped, and an approved change can be undone for 30 days. Deletes go to the trash.' },
      { title: 'Forecasts that are tested against the past', body: 'Ask “forecast revenue for the next quarter”. AnalyzeIt tries several simple methods, uses the one that would have predicted your past best, and shows the forecast with an 80% range built from how wrong it actually was. It says how that compares with simply repeating the latest value, and declines, with the reason, when there is too little history or too many gaps.' },
      { title: 'Guides and more worked examples', body: 'New guides on working with data, and live worked examples for more currency pairs, Indian cities and unit conversions.' },
    ],
  },
  {
    date: '2026-10-05',
    items: [
      { title: 'Connect Google Drive', body: 'The connectors page can connect Google Drive when the server says it is configured, then sync and show the file counts that come back. Files are described as added to memory only when ingestion wrote them. If Drive is not configured, the card says so and does not offer Connect.' },
      { title: 'Premium on Products matches the homepage', body: 'The Products page shows Premium in whole rupees, the same figure as the homepage. The dollar amount is only a reference.' },
      { title: 'Long documents are read section by section', body: 'On Premium and VIP, a long pasted document is read one section at a time instead of being cut to a few excerpts, and the answer says how much was read. Premium reads about 150,000 characters, VIP about 300,000. You can watch each section being read.' },
      { title: 'Try it without signing up', body: 'A public demo answers weather, currency, stock and math questions with no account. Tool answers are labelled “From tools · 0 tokens” and show their source.' },
      { title: 'Plans described once', body: 'The home page, Products and Billing now read plan features and prices from one place. Prices in rupees are whole rupees, and the top plan is called VIP everywhere.' },
      { title: 'Plain service-down message', body: 'When AnalyzeIt cannot be reached, the message now says what happened (the service may be waking up) instead of blaming demand.' },
      { title: 'Faster first question', body: 'Opening Research or the globe quietly wakes the agent, so the first question after a quiet spell waits less.' },
      { title: 'Intro that cannot trap you', body: 'The homepage intro finishes on its own within a few seconds and can be skipped.' },
      { title: 'Social preview image', body: 'Links to AnalyzeIt now show a proper preview card.' },
      { title: 'Calculator ignores ranges and dates', body: '“Pages 12-15” or “2026-10-05” is no longer treated as subtraction unless you ask for a calculation.' },
    ],
  },
  {
    date: '2026-10-04',
    items: [
      { title: 'Memory you can see and edit', body: 'The Memory page lists every stored source with its name, size, how often answers have used it and how searchable it is. Rename, preview, pin, export or delete.', rollingOut: true },
      { title: 'Answers cite your notes', body: 'Answers built from stored notes show a “From your notes” chip naming the source and the passage used.', rollingOut: true },
      { title: 'Exact-word recall across a large library', body: 'Names, ids and error codes are found anywhere in your stored sources, not only in the part searched by meaning. Tested with a user at the full 1 billion token plan size.', rollingOut: true },
      { title: 'Plan limits that are enforced', body: 'Projects running at once, priority when the agent is busy and how many memory results an answer can use now follow your plan.' },
      { title: 'Artifact lifetime follows your plan', body: 'Exported files and their links now last 7, 30 or 90 days depending on your plan (they used to last 24 hours for everyone).' },
      { title: 'Models run on Azure', body: 'All AI models are served from Azure AI Foundry.' },
    ],
  },
];
