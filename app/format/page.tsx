import type { Metadata } from 'next';
import Link from 'next/link';
import { LESSONS } from '@/lib/lesson/registry';
import { FORMAT_VERSION } from '@/lib/lesson/schema';

export const metadata: Metadata = { title: 'How a lesson is built · Learning Clubs' };

const BLOCKS = [
  { type: 'read', name: 'Read', text: 'A short explanation. A few sentences at most: doing comes before telling.' },
  { type: 'predict', name: 'Predict', text: 'The group commits to an answer before seeing what happens. Wrong answers are never punished.' },
  { type: 'estimate', name: 'Estimate', text: 'Guess a number with a slider, then compare with the real value.' },
  { type: 'sim', name: 'Try it', text: 'An interactive simulation with sliders, chosen from a reviewed collection.' },
  { type: 'data', name: 'Real data', text: 'Real measurements, bundled so the lesson works offline, with live data when online.' },
  { type: 'handson', name: 'Hands on', text: 'An experiment with everyday things, away from the screen, with a timer and safety notes.' },
  { type: 'discuss', name: 'Talk', text: 'A question for the group, with roles so that everyone speaks.' },
  { type: 'challenge', name: 'Challenge', text: 'A real problem to work on together, ideally with a partner club elsewhere.' },
];

export default function FormatPage() {
  const example = LESSONS[0];
  const snippet = JSON.stringify(
    { ...example, goals: example.goals.slice(0, 1), materials: example.materials.slice(0, 1), steps: example.steps.slice(1, 3) },
    null,
    2,
  );
  return (
    <main className="page narrow">
      <header className="header">
        <p className="eyebrow">
          <Link href="/" className="eyebrow-link">← Library</Link> · For teachers
        </p>
        <h1>How a lesson is built</h1>
        <p className="lede">
          A lesson is not a web page. It is a small data file that lists its steps, using eight building blocks. The app knows how to draw each
          block, so every lesson looks and works the same, on any phone, tablet or computer.
        </p>
      </header>

      <section className="card">
        <h2>Why data and not code</h2>
        <ul className="plain">
          <li><strong>Translatable:</strong> all text sits in one file. Translate the text, and the lesson exists in a new language.</li>
          <li><strong>Small:</strong> a whole lesson is a few kilobytes, which matters where mobile data is expensive.</li>
          <li><strong>Safe:</strong> lessons never run their own code on learners’ phones. Simulations come from a reviewed collection.</li>
          <li><strong>Checked:</strong> every lesson is validated before it is shown, so a mistake gives the author a clear message, not a broken page.</li>
          <li><strong>Improvable:</strong> each lesson has a version number and an open licence, so others can adapt it and credit the original.</li>
        </ul>
      </section>

      <section>
        <h2 className="section-title">The eight building blocks</h2>
        <div className="blocks-grid">
          {BLOCKS.map((b) => (
            <div key={b.type} className="card block-card">
              <p className="tile-label"><code>{b.type}</code></p>
              <h3>{b.name}</h3>
              <p className="muted">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>What it looks like</h2>
        <p className="muted">An excerpt of the haze lesson (format version {FORMAT_VERSION}), showing two of its steps:</p>
        <pre className="code"><code>{snippet}</code></pre>
      </section>
    </main>
  );
}
