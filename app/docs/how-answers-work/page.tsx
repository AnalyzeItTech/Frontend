import type { Metadata } from 'next';
import { DocPage } from '../../Components/docs/DocPage';

export const metadata: Metadata = {
  title: 'How AnalyzeIt answers: tools and models — AnalyzeIt docs',
  description: 'When a live tool answers a question, when an AI model does, what “From tools · 0 tokens” means, and what happens when a tool fails.',
  alternates: { canonical: '/docs/how-answers-work' },
};

export default function Page() {
  return (
    <DocPage title="How answers work" subtitle="Some answers come from a live tool, some from a model. You can always tell which.">
      <h2>Two kinds of answer</h2>
      <p>
        <strong>A tool answer</strong> comes straight from a service built for the job: a weather service, an exchange-rate feed, a stock
        quote, a calculator. AnalyzeIt calls it and shows you what it returned, with the source. No AI model writes the number, so it cannot
        be invented. These answers carry the label <em>From tools · 0 tokens</em>, because no model tokens were used.
      </p>
      <p>
        <strong>A model answer</strong> is written by an AI model. AnalyzeIt uses models for questions that need reading, comparing or
        explaining: your own files and records, a long document, or an open question. The model can call tools while it works, and when
        it does, the tool results are what it is allowed to state as fact.
      </p>

      <h2>What happens when a tool fails</h2>
      <p>
        If a tool cannot answer (a city it cannot find, a feed that is down), AnalyzeIt says so and does not fill the gap with a guess.
        You will not see the “From tools” label on an answer where the tool failed.
      </p>

      <h2>Your own data</h2>
      <p>
        Questions about records you have connected (for example “how many charges failed?”) are answered by querying the records, and the
        count comes from the database, not from the model counting rows. The assistant only reads a project’s data if you have allowed it
        in that project’s AI data access settings, and you can turn that off at any time.
      </p>

      <h2>Sources and citations</h2>
      <p>
        Answers from live tools and the web list their sources. Answers built from your stored notes and files show a{' '}
        <em>From your notes</em> chip that names the source and shows the passage used.
      </p>

      <h2>What a model answer still can get wrong</h2>
      <p>
        Models can misread or over-summarise. For anything that matters, open the cited source or the record itself. Where AnalyzeIt can
        check a figure against a tool or your data, it does; where it cannot, treat the answer as a draft.
      </p>
    </DocPage>
  );
}
