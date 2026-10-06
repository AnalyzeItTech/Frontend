import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '../../Components/docs/DocPage';

export const metadata: Metadata = {
  title: 'Discovery, forecasts, online data and bulk edits — AnalyzeIt',
  description: 'How AnalyzeIt finds what stands out in your data, forecasts a number with a tested range, brings in public data with its source shown, and changes many records only after a preview you approve.',
  alternates: { canonical: '/docs/discovery' },
};

export default function Page() {
  return (
    <DocPage title="Discovery, forecasts, online data and bulk edits" subtitle="What each one does, how sure it is, and what it will not do.">
      <h2>Discovery: what stands out in your data</h2>
      <p>
        You often do not know the exact question. Ask “what stands out in my data?” and AnalyzeIt reads your tables, runs a set of read-only checks, and shows the few results that matter. The
        checks look for sudden changes, steady trends, differences between groups, results that depend on one group, unusual values, columns that move together, and data-quality problems.
        Finding them does not need a language model, so it is fast and the figures are computed, not written.
      </p>
      <h2>How to read a result</h2>
      <p>Each result is a card:</p>
      <ul>
        <li>A plain title that says what happened, for example that something was lower than usual in a given month.</li>
        <li>A chart of the evidence.</li>
        <li>One sentence on what it means.</li>
        <li>A confidence label: Confirmed in the data, Strong evidence, Likely, or Worth checking.</li>
        <li>“Show the working”: what it is based on, the exact figures, where the data came from and the exact query that was run.</li>
        <li>Follow-up questions you can click.</li>
      </ul>
      <p>The summary also says how many checks ran, how many tables and rows were read, and when only part of a large table could be read.</p>
      <h2>How it avoids false alarms</h2>
      <p>
        A number that moves is not always news. Each move is compared with that series’ own history, and the bar is stricter when many places were searched. Yearly seasonality is checked when there
        are at least two full years of data, and flagged as a caveat when there are fewer. Groups that are really a few customers are treated as that many independent observations, not as thousands.
        Before relying on it, the method was run against realistic data with no real pattern, and against data with a planted pattern to see how often it was found. It is still a screening tool:
        a finding tells you where to look, not why.
      </p>
      <p>
        Read more in the guides:{' '}
        <Link href="/guides/real-change-or-random-noise">real change or random noise</Link> and{' '}
        <Link href="/guides/find-what-changed-in-your-data">how to find what changed</Link>.
      </p>

      <h2>Failure and refund rates</h2>
      <p>
        A status column (captured, failed, refunded, cancelled) hides the rate that matters. When a table has one, AnalyzeIt reads each problem outcome as a rate and looks
        for two things: which group is out of line (for example one payment method failing far more than the others), and the date a rate jumped, traced to where it happened.
        A rate is reported only when it rests on enough events, and the bar allows for every group and every split point it tried. The status column itself is never reported as
        “explaining” its own rate, because that is true by definition.
      </p>

      <h2>Forecasts</h2>
      <p>
        Ask “forecast revenue for the next quarter” (or for any number that has a date next to it in your data). AnalyzeIt builds one value per period, tries several simple methods, and uses the one
        that would have predicted the past best. It does not trust a method because it looks good on the data it was fitted to: each method is tested by pretending to be at earlier points in time,
        forecasting what came next, and comparing with what really happened.
      </p>
      <ul>
        <li>The result is a chart of what happened, the forecast, and an 80% range. The range comes from how wrong that method actually was in those tests.</li>
        <li>It says how its typical miss compares with simply repeating the latest value. If it could not beat that, it says so and labels the forecast “Worth checking”.</li>
        <li>A yearly pattern is included only when there are at least two full years of history.</li>
        <li>A half-filled newest period is left out and said so; small gaps in the middle are filled and said so; large gaps, too little history or no date column get a clear reason instead of a line.</li>
        <li>For a total (revenue, orders) the headline is the total over the period you asked for; for a level (a rate, a price) it is the value at the end.</li>
      </ul>
      <p>
        A forecast assumes the future behaves like the past, so it cannot see a price change, a campaign or anything new. The wording is built from the figures, not written by a model.
        Read more: <Link href="/guides/forecast-without-fooling-yourself">how to forecast without fooling yourself</Link>.
      </p>

      <h2>Online data</h2>
      <p>
        Paste a link to a data file, or ask for public data on a topic. AnalyzeIt finds the data, downloads a table, tidies it, and runs the same checks. It tries, in order: the link you gave,
        World Bank indicators, open-data catalogues (Socrata and CKAN portals), web search, and, on VIP, links to data files found on the pages it opens. It reads CSV, JSON, GeoJSON, tables on web
        pages and Google Sheets.
      </p>
      <ul>
        <li>Free: a link you paste, or a World Bank indicator.</li>
        <li>Premium: adds catalogues and web search, and up to three tables.</li>
        <li>VIP: adds following links on pages, and up to four tables.</li>
        <li>Daily limits: 10 runs on Free, 50 on Premium and 150 on VIP.</li>
      </ul>
      <p>
        Every online answer names its source, the date it was downloaded, the newest period in the data, and says plainly that the data comes from the internet and has not been checked by AnalyzeIt.
        If nothing usable is found, it lists what it tried and why each source failed. It follows each site’s robots.txt, stays within small download limits, and never reaches internal or private
        addresses. Online answers are not saved to your memory.
      </p>
      <p>
        Read more:{' '}
        <Link href="/guides/free-public-datasets-and-how-to-check-them">where to find public data and how to check it</Link>.
      </p>

      <h2>Changing many records</h2>
      <p>
        Ask for a change to a group of records, such as closing every open order. AnalyzeIt never changes data on its own. It first works out exactly which records match and shows a preview: how many,
        a sample, and the before and after for each field. Nothing changes until you choose Approve.
      </p>
      <ul>
        <li>A change must name which records to change; it can never apply to every record by accident, and covers at most 500 records at a time.</li>
        <li>Approval applies the list the preview showed. A record someone edited after the preview is skipped, never overwritten, and the result says how many were skipped.</li>
        <li>You can undo an approved change for 30 days. Records edited since are left as they are and counted.</li>
        <li>Deletes go to the trash for 30 days, where they can be restored.</li>
      </ul>

      <h2>Sharing</h2>
      <p>A shared report includes these result cards with their charts and reasoning. It leaves out the exact query and the follow-up questions, and you can switch the link off at any time.</p>
    </DocPage>
  );
}
