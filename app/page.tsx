import Link from 'next/link';
import { LESSONS } from '@/lib/lesson/registry';

const PRINCIPLES = [
  { title: 'Open to everyone', text: 'Free, open source, works offline on a cheap phone, and can be translated into any language.' },
  { title: 'Learn, then do', text: 'Every lesson moves from a guess, to understanding, to something you do with your hands.' },
  { title: 'Real problems', text: 'Real problems ignore school subjects. So do these lessons: physics, biology, geography and ethics together.' },
  { title: 'Together, without borders', text: 'Made for groups around one screen, and for clubs in different countries working on the same problem.' },
];

export default function Library() {
  return (
    <main className="page library">
      <header className="header">
        <p className="eyebrow">Learning Clubs · prototype</p>
        <h1>Learn together. Try it with your hands. Work on real problems.</h1>
        <p className="lede">
          Open lessons for groups of learners anywhere: a short guided path on a phone or screen, an experiment with everyday things, and a real
          problem to tackle, ideally with a club somewhere else in the world.
        </p>
      </header>

      <section aria-labelledby="lessons">
        <h2 id="lessons" className="section-title">Lessons</h2>
        <div className="lesson-grid">
          {LESSONS.map((l) => (
            <Link key={`${l.id}-${l.language}`} href={`/learn/${l.id}`} className="card lesson-card">
              <p className="eyebrow">{l.subjects.join(' · ')}</p>
              <h3>{l.title}</h3>
              <p className="muted">{l.summary}</p>
              <p className="lesson-meta">
                <span className="tag">Ages {l.ages}</span>
                <span className="tag">{l.minutes} min</span>
                <span className="tag">{l.steps.length} steps</span>
                <span className="tag">Works offline</span>
              </p>
            </Link>
          ))}
          <Link href="/data" className="card lesson-card tool-card">
            <p className="eyebrow">Tool · live data</p>
            <h3>Singapore air quality</h3>
            <p className="muted">Official hourly PM2.5 and PSI readings by region, plus citizen sensors. The data behind the haze lesson.</p>
          </Link>
          <Link href="/format" className="card lesson-card tool-card">
            <p className="eyebrow">For teachers</p>
            <h3>How a lesson is built</h3>
            <p className="muted">Every lesson uses the same eight building blocks, saved as simple data. That keeps lessons consistent, small and translatable.</p>
          </Link>
        </div>
      </section>

      <section aria-labelledby="principles">
        <h2 id="principles" className="section-title">What this is about</h2>
        <div className="principles">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="principle">
              <h3>{p.title}</h3>
              <p className="muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <p>
          Lessons are free to use, adapt and translate under open licences. Air quality data contains information from the National Environment
          Agency, accessed via <a href="https://data.gov.sg" target="_blank" rel="noreferrer">data.gov.sg</a>, licensed under the{' '}
          <a href="https://data.gov.sg/open-data-licence" target="_blank" rel="noreferrer">Singapore Open Data Licence</a>.
        </p>
      </footer>
    </main>
  );
}
