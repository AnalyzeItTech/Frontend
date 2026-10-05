// What shipped, newest first. Only things that are merged and working; unfinished work is marked rollingOut.
// Add an entry here with every notable release (the /changelog page renders this list).

export const CHANGELOG = [
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
