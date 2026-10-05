import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '../../Components/docs/DocPage';
import { DemoClient } from '../../demo/DemoClient';

export const metadata: Metadata = {
  title: "Mumbai weather without inventing it",
  description: "Current weather for Mumbai from a live weather service, with the source shown. If the service cannot answer, AnalyzeIt says so instead of guessing.",
  alternates: { canonical: '/cases/weather-mumbai' },
};

export default function Page() {
  return (
    <DocPage title="Mumbai weather, without inventing it." subtitle="Weather is a classic place for a model to sound confident and be wrong. Here a weather service answers, and the source is shown.">
      <h2>Ask it yourself</h2>
      <p>This runs live when the page opens, so the figure below is today’s, not a screenshot.</p>
      <DemoClient preset="What is the weather in Mumbai right now?" />

      <h2>How it works</h2>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>The question is recognised as a weather lookup for Mumbai.</li>
        <li>AnalyzeIt calls the weather tool for current conditions.</li>
        <li>If the tool cannot answer, you are told that, with no guess in its place.</li>
      </ol>
      <p>Conditions change by the minute; this is the reading at the moment you ask.</p>
      <p>
        More on the difference between tool answers and model answers: <Link href="/docs/how-answers-work">How answers work</Link>.
      </p>
    </DocPage>
  );
}
