'use client';

// Plays any lesson in the standard format: one step per screen, made for a group around one screen.

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lesson, Step } from '@/lib/lesson/schema';
import {
  ChallengeBlock,
  DataBlock,
  DiscussBlock,
  EstimateBlock,
  HandsOnBlock,
  PredictBlock,
  ReadBlock,
  SimBlock,
  type StepState,
} from './Blocks';
import { Inline } from './RichText';

const KIND: Record<Step['type'], string> = {
  read: 'Read',
  predict: 'Predict',
  estimate: 'Estimate',
  sim: 'Try it',
  data: 'Real data',
  handson: 'Hands on',
  discuss: 'Talk',
  challenge: 'Challenge',
};

const LICENSE_URL: Record<Lesson['license'], string> = {
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};

interface Saved {
  at: number;
  answers: Record<string, StepState>;
}

/** Browser storage can be missing or blocked; the lesson must work without it. */
function load(key: string): Saved | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: Saved) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export default function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const key = `lc:${lesson.id}:${lesson.language}:v${lesson.version}`;
  const [at, setAt] = useState(-1); // -1 = start screen, steps.length = finish screen
  const [answers, setAnswers] = useState<Record<string, StepState>>({});
  const [resumable, setResumable] = useState<Saved | null>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = load(key);
    if (s && s.at >= 0) setResumable(s);
  }, [key]);

  useEffect(() => {
    if (at >= 0) save(key, { at, answers });
  }, [key, at, answers]);

  const go = useCallback(
    (i: number) => {
      setAt(Math.max(-1, Math.min(lesson.steps.length, i)));
      top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [lesson.steps.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, button[role="radio"]')) return;
      if (e.key === 'ArrowRight') go(at + 1);
      if (e.key === 'ArrowLeft') go(at - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at, go]);

  const step = at >= 0 && at < lesson.steps.length ? lesson.steps[at] : null;
  const setStepState = (patch: Partial<StepState>) =>
    step && setAnswers((a) => ({ ...a, [step.id]: { ...a[step.id], ...patch } }));

  return (
    <div className="player" ref={top}>
      <header className="player-top">
        <Link href="/" className="back-link">
          ← Library
        </Link>
        <p className="player-title">{lesson.title}</p>
        {at >= 0 && (
          <div className="progress" aria-label={`Step ${Math.min(at + 1, lesson.steps.length)} of ${lesson.steps.length}`}>
            {lesson.steps.map((s, i) => (
              <button
                key={s.id}
                className={`progress-seg${i < at ? ' done' : ''}${i === at ? ' now' : ''}`}
                onClick={() => go(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
              />
            ))}
          </div>
        )}
      </header>

      <main className="player-body">
        {at === -1 && <StartScreen lesson={lesson} resumable={resumable} onStart={() => go(0)} onResume={(s) => (setAnswers(s.answers), go(s.at))} />}

        {step && (
          <article className="step" key={step.id}>
            <p className="eyebrow">
              {KIND[step.type]} · {at + 1} of {lesson.steps.length}
            </p>
            <h1>
              <Inline text={step.title} />
            </h1>
            <StepView step={step} state={answers[step.id] ?? {}} setState={setStepState} />
          </article>
        )}

        {at === lesson.steps.length && (
          <FinishScreen
            lesson={lesson}
            onRestart={() => {
              setAnswers({});
              go(0);
            }}
          />
        )}
      </main>

      {at >= 0 && at < lesson.steps.length && (
        <nav className="player-nav">
          <button className="ghost" onClick={() => go(at - 1)}>
            Back
          </button>
          <button className="primary" onClick={() => go(at + 1)}>
            {at === lesson.steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </nav>
      )}
    </div>
  );
}

function StepView({ step, state, setState }: { step: Step; state: StepState; setState: (p: Partial<StepState>) => void }) {
  switch (step.type) {
    case 'read':
      return <ReadBlock step={step} state={state} setState={setState} />;
    case 'predict':
      return <PredictBlock step={step} state={state} setState={setState} />;
    case 'estimate':
      return <EstimateBlock step={step} state={state} setState={setState} />;
    case 'sim':
      return <SimBlock step={step} state={state} setState={setState} />;
    case 'data':
      return <DataBlock step={step} state={state} setState={setState} />;
    case 'handson':
      return <HandsOnBlock step={step} state={state} setState={setState} />;
    case 'discuss':
      return <DiscussBlock step={step} state={state} setState={setState} />;
    case 'challenge':
      return <ChallengeBlock step={step} state={state} setState={setState} />;
  }
}

function StartScreen({
  lesson,
  resumable,
  onStart,
  onResume,
}: {
  lesson: Lesson;
  resumable: Saved | null;
  onStart: () => void;
  onResume: (s: Saved) => void;
}) {
  return (
    <article className="step start">
      <p className="eyebrow">{lesson.subjects.join(' · ')}</p>
      <h1>{lesson.title}</h1>
      <p className="lede">{lesson.summary}</p>

      <div className="facts">
        <div>
          <span className="tile-label">Ages</span>
          <span>{lesson.ages}</span>
        </div>
        <div>
          <span className="tile-label">Time</span>
          <span>about {lesson.minutes} min</span>
        </div>
        <div>
          <span className="tile-label">Group</span>
          <span>{lesson.groupSize}</span>
        </div>
      </div>

      <div className="card">
        <p className="tile-label">By the end, your group can</p>
        <ul className="goals">
          {lesson.goals.map((g, i) => (
            <li key={i}>
              <Inline text={g} />
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <p className="tile-label">Get ready</p>
        <ul className="plain">
          {lesson.materials.map((m, i) => (
            <li key={i}>
              <Inline text={m} />
            </li>
          ))}
        </ul>
      </div>

      <p className="muted small-print">Gather your group around one screen. Decide together before you tap: every guess is a group guess.</p>

      <div className="start-actions">
        <button className="primary big" onClick={onStart}>
          {resumable ? 'Start again' : 'Start'}
        </button>
        {resumable && (
          <button className="ghost big" onClick={() => onResume(resumable)}>
            Continue at step {resumable.at + 1}
          </button>
        )}
      </div>
    </article>
  );
}

function FinishScreen({ lesson, onRestart }: { lesson: Lesson; onRestart: () => void }) {
  return (
    <article className="step finish">
      <p className="eyebrow">Done</p>
      <h1>Can your group now…</h1>
      <ul className="goals check">
        {lesson.goals.map((g, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" />
              <span>
                <Inline text={g} />
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="card">
        <p className="tile-label">About this lesson</p>
        <p className="muted">
          Version {lesson.version} · by {lesson.authors.map((a) => a.name).join(', ')} · free to use, adapt and translate under{' '}
          <a href={LICENSE_URL[lesson.license]} target="_blank" rel="noreferrer">
            {lesson.license}
          </a>
          .
        </p>
        {lesson.sources.length > 0 && (
          <ul className="plain sources">
            {lesson.sources.map((s, i) => (
              <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="start-actions">
        <button className="ghost big" onClick={onRestart}>
          Run it again
        </button>
        <Link className="primary big as-button" href="/">
          Back to the library
        </Link>
      </div>
    </article>
  );
}
