'use client';

// One component per building block of the lesson format (lib/lesson/schema.ts).

import { useEffect, useMemo, useState } from 'react';
import type {
  ChallengeStep,
  DataStep,
  DiscussStep,
  EstimateStep,
  HandsOnStep,
  PredictStep,
  ReadStep,
  SimStep,
} from '@/lib/lesson/schema';
import { DATASETS, peakOf, type DatasetPoint } from '@/lib/lesson/datasets';
import { DEVICES, METRICS } from '@/lib/config';
import { fmtDateTime, fmtValue } from '@/lib/format';
import { pm25Band } from '@/lib/sim/scattering';
import AirChart, { type ChartSeries } from '@/components/AirChart';
import type { Zoom } from '@/components/zoom';
import { SIMS } from '@/components/sims';
import RichText, { Inline } from './RichText';
import { useDark } from './useDark';

/** Per-step answers, saved on this device so a group can pick up where it stopped. */
export interface StepState {
  choice?: string;
  guess?: number;
  locked?: boolean;
  checked?: number[];
  notes?: string;
  found?: boolean;
}

interface BlockProps<S> {
  step: S;
  state: StepState;
  setState: (patch: Partial<StepState>) => void;
}

// ---------------------------------------------------------------- read

export function ReadBlock({ step }: BlockProps<ReadStep>) {
  return <RichText text={step.body} className="rich lead" />;
}

// ---------------------------------------------------------------- predict

export function PredictBlock({ step, state, setState }: BlockProps<PredictStep>) {
  const revealed = !!state.locked;
  return (
    <div className="block-stack">
      <p className="prompt">
        <Inline text={step.prompt} />
      </p>
      <div className="options" role="radiogroup" aria-label="Your answer">
        {step.options.map((o) => {
          const picked = state.choice === o.id;
          const right = revealed && step.answer === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={picked}
              disabled={revealed}
              className={`option${picked ? ' picked' : ''}${right ? ' right' : ''}`}
              onClick={() => setState({ choice: o.id })}
            >
              <span className="option-dot" aria-hidden />
              <Inline text={o.text} />
              {right && <span className="option-badge">✓</span>}
            </button>
          );
        })}
      </div>
      {!revealed ? (
        <button className="primary" disabled={!state.choice} onClick={() => setState({ locked: true })}>
          {state.choice ? 'Lock in our answer' : 'Pick an answer first'}
        </button>
      ) : (
        <div className="reveal">
          <p className="reveal-verdict">
            {!step.answer
              ? 'Here is what happens:'
              : state.choice === step.answer
                ? 'Spot on.'
                : 'Not this time, and that’s how learning works. Here is what happens:'}
          </p>
          <RichText text={step.reveal} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- estimate

export function EstimateBlock({ step, state, setState }: BlockProps<EstimateStep>) {
  const guess = state.guess ?? Math.round((step.min + step.max) / 2 / step.step) * step.step;
  const revealed = !!state.locked;
  const off = Math.abs(guess - step.answer);
  const pos = (v: number) => `${((v - step.min) / (step.max - step.min)) * 100}%`;

  return (
    <div className="block-stack">
      <p className="prompt">
        <Inline text={step.prompt} />
      </p>
      <div className="estimate">
        <div className="estimate-value">
          {fmtValue(guess)} <small>{step.unit}</small>
        </div>
        <div className="estimate-track">
          <input
            type="range"
            min={step.min}
            max={step.max}
            step={step.step}
            value={guess}
            disabled={revealed}
            aria-label="Your guess"
            onChange={(e) => setState({ guess: Number(e.target.value) })}
          />
          {revealed && (
            <span className="estimate-answer" style={{ left: pos(step.answer) }} aria-hidden>
              <span>{fmtValue(step.answer)}</span>
            </span>
          )}
        </div>
        <div className="range-ends">
          <span>{step.min}</span>
          <span>{step.max}</span>
        </div>
      </div>
      {!revealed ? (
        <button className="primary" onClick={() => setState({ guess, locked: true })}>
          Lock in our guess
        </button>
      ) : (
        <div className="reveal">
          <p className="reveal-verdict">
            {off === 0
              ? 'Exactly right!'
              : off <= step.tolerance
                ? `Very close: you were ${fmtValue(off)} away.`
                : `You were ${fmtValue(off)} away. Most people are surprised by this one.`}
          </p>
          <RichText text={step.reveal} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- sim

export function SimBlock({ step }: BlockProps<SimStep>) {
  const Sim = SIMS[step.sim];
  return (
    <div className="block-stack">
      <RichText text={step.body} />
      {Sim ? <Sim /> : <p className="notice">This simulation is not available.</p>}
      <div className="tasks">
        <p className="tile-label">Try this</p>
        <ol>
          {step.tasks.map((t, i) => (
            <li key={i}>
              <Inline text={t} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- data

type LiveStatus = 'idle' | 'loading' | 'on' | 'unavailable';

export function DataBlock({ step, state, setState }: BlockProps<DataStep>) {
  const ds = DATASETS[step.dataset];
  const dark = useDark();
  const [zoom, setZoom] = useState<Zoom>(null);
  const [live, setLive] = useState<{ status: LiveStatus; points: DatasetPoint[] }>({ status: 'idle', points: [] });
  const points = live.status === 'on' ? live.points : ds.points;
  const metric = METRICS[ds.metric];

  const series: ChartSeries[] = useMemo(
    () =>
      ds.devices.map((id) => {
        const dev = DEVICES.find((d) => d.id === id)!;
        return {
          id,
          name: dev.name,
          color: dark ? dev.color.dark : dev.color.light,
          data: points
            .filter((p) => p.device === id)
            .map((p) => [Date.parse(p.t), p.v] as [number, number])
            .sort((a, b) => a[0] - b[0]),
        };
      }),
    [ds, points, dark],
  );
  const times = points.map((p) => Date.parse(p.t));
  const peak = peakOf(points);

  async function goLive() {
    if (!ds.live) return;
    setLive({ status: 'loading', points: [] });
    try {
      if (!navigator.onLine) throw new Error('offline');
      const to = new Date();
      const from = new Date(to.getTime() - ds.live.hours * 3600_000);
      const res = await fetch(
        `/api/series?metric=${ds.metric}&devices=${ds.devices.join(',')}&from=${from.toISOString()}&to=${to.toISOString()}&fixed=1`,
      );
      const json = await res.json();
      if (!res.ok || json.demo || !json.points?.length) throw new Error('no live data');
      setLive({ status: 'on', points: json.points });
      setZoom(null);
      setState({ found: false });
    } catch {
      setLive({ status: 'unavailable', points: [] });
    }
  }

  return (
    <div className="block-stack">
      <RichText text={step.body} />
      <div className="card chart-card lesson-chart">
        <div className="chart-head">
          <p className="tile-label">{live.status === 'on' ? `Live: last ${ds.live!.hours / 24} days` : ds.title}</p>
          {ds.live && (
            <button
              className="ghost small"
              onClick={() => (live.status === 'on' ? (setLive({ status: 'idle', points: [] }), setZoom(null)) : goLive())}
              disabled={live.status === 'loading'}
            >
              {live.status === 'on' ? 'Back to the haze days' : live.status === 'loading' ? 'Loading…' : 'Show live data'}
            </button>
          )}
        </div>
        {live.status === 'unavailable' && (
          <p className="notice">Live data isn’t available right now, so this shows the recorded haze days. The lesson works the same.</p>
        )}
        <AirChart
          series={series}
          metric={metric}
          daily={false}
          dark={dark}
          xMin={Math.min(...times)}
          xMax={Math.max(...times)}
          zoom={zoom}
          onZoom={setZoom}
        />
        <p className="attribution">
          <a href={ds.attribution.url} target="_blank" rel="noreferrer">
            {ds.attribution.text}
          </a>
        </p>
      </div>

      {step.find && peak && (
        <div className="find">
          <p className="prompt">
            <Inline text={step.find.prompt} />
          </p>
          {!state.found ? (
            <button className="primary" onClick={() => setState({ found: true })}>
              Check our answer
            </button>
          ) : (
            <div className="reveal">
              <p className="reveal-verdict">
                Worst hour: <strong>{fmtDateTime(peak.t)}</strong> in{' '}
                <strong>{DEVICES.find((d) => d.id === peak.device)?.name}</strong>, with {fmtValue(peak.v)} µg/m³ ({pm25Band(peak.v)}).
              </p>
            </div>
          )}
        </div>
      )}

      <div className="tasks">
        <p className="tile-label">Talk about it</p>
        <ol>
          {step.questions.map((q, i) => (
            <li key={i}>
              <Inline text={q} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- hands-on

export function HandsOnBlock({ step, state, setState }: BlockProps<HandsOnStep>) {
  const checked = state.checked ?? [];
  const toggle = (i: number) => setState({ checked: checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i] });
  return (
    <div className="block-stack">
      <div className="handson-meta">
        <span className="tag">Away from the screen · about {step.minutes} min</span>
      </div>
      <div className="tasks">
        <p className="tile-label">You need</p>
        <ul className="plain">
          {step.materials.map((m, i) => (
            <li key={i}>
              <Inline text={m} />
            </li>
          ))}
        </ul>
      </div>
      {step.safety && (
        <p className="notice">
          <strong>Safety:</strong> <Inline text={step.safety} />
        </p>
      )}
      <ol className="checklist">
        {step.instructions.map((t, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" checked={checked.includes(i)} onChange={() => toggle(i)} />
              <span>
                <Inline text={t} />
              </span>
            </label>
          </li>
        ))}
      </ol>
      <Timer minutes={step.minutes} />
      <div className="observe">
        <p className="tile-label">What did you notice?</p>
        <p className="prompt">
          <Inline text={step.observe} />
        </p>
        <Notes state={state} setState={setState} placeholder="Write down what your group noticed…" />
      </div>
    </div>
  );
}

function Timer({ minutes }: { minutes: number }) {
  const [end, setEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!end) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [end]);
  const left = end ? Math.max(0, end - now) : minutes * 60_000;
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000)
    .toString()
    .padStart(2, '0');
  return (
    <div className="timer">
      <span className="timer-value" aria-live="off">
        {mm}:{ss}
      </span>
      {end && left === 0 ? (
        <span className="tag">Time’s up</span>
      ) : (
        <button className="ghost small" onClick={() => (end ? setEnd(null) : (setEnd(Date.now() + minutes * 60_000), setNow(Date.now())))}>
          {end ? 'Reset timer' : 'Start timer'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- discuss

export function DiscussBlock({ step, state, setState }: BlockProps<DiscussStep>) {
  const [order, setOrder] = useState<number[] | null>(null);
  const roles = step.roles ?? [];
  const shown = order ? order.map((i) => roles[i]) : roles;
  return (
    <div className="block-stack">
      <p className="prompt big">
        <Inline text={step.prompt} />
      </p>
      {roles.length > 0 && (
        <>
          <div className="roles">
            {shown.map((r, i) => (
              <div key={r.name} className="role card">
                {order && <span className="role-person">Person {i + 1}</span>}
                <p className="role-name">{r.name}</p>
                <p className="muted">
                  <Inline text={r.task} />
                </p>
              </div>
            ))}
          </div>
          <button className="ghost small" onClick={() => setOrder([...roles.keys()].sort(() => Math.random() - 0.5))}>
            {order ? 'Deal roles again' : 'Deal out the roles'}
          </button>
        </>
      )}
      <Notes state={state} setState={setState} placeholder="Your group’s conclusion…" />
    </div>
  );
}

// ---------------------------------------------------------------- challenge

export function ChallengeBlock({ step, state, setState }: BlockProps<ChallengeStep>) {
  return (
    <div className="block-stack">
      <RichText text={step.body} className="rich lead" />
      <div className="tasks">
        <p className="tile-label">Your constraints</p>
        <ul className="plain">
          {step.constraints.map((c, i) => (
            <li key={i}>
              <Inline text={c} />
            </li>
          ))}
        </ul>
      </div>
      <div className="card deliverable">
        <p className="tile-label">What you make</p>
        <p>
          <Inline text={step.deliverable} />
        </p>
      </div>
      {step.connect && (
        <div className="connect">
          <p className="tile-label">Connect</p>
          <p>
            <Inline text={step.connect} />
          </p>
        </div>
      )}
      <Notes state={state} setState={setState} placeholder="Sketch your plan here, or on paper…" rows={6} />
    </div>
  );
}

// ---------------------------------------------------------------- shared

function Notes({
  state,
  setState,
  placeholder,
  rows = 3,
}: {
  state: StepState;
  setState: (p: Partial<StepState>) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      className="notes"
      rows={rows}
      placeholder={placeholder}
      value={state.notes ?? ''}
      onChange={(e) => setState({ notes: e.target.value })}
      aria-label="Notes"
    />
  );
}
