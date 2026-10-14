// The standard lesson format.
//
// A lesson is plain data (JSON), not code. The player knows how to draw each
// building block, so every lesson looks consistent, works offline, stays small,
// and can be translated by translating its text alone. Interactive simulations
// are referenced by name from a reviewed registry; lessons never ship their own code.

export const FORMAT_VERSION = 1;

/** Short text. Lesson text supports **bold** and line breaks, nothing else. */
export type Text = string;

export interface Lesson {
  format: typeof FORMAT_VERSION;
  id: string;
  /** Bumped every time the lesson is improved. Old versions stay available. */
  version: number;
  /** BCP-47 language tag, e.g. "en", "de", "id". A translation is a copy of this file with its text translated. */
  language: string;
  title: Text;
  summary: Text;
  subjects: string[];
  /** e.g. "12–15" */
  ages: string;
  minutes: number;
  /** Learning clubs learn together; this says how many people one phone or screen is meant for. */
  groupSize: string;
  goals: Text[];
  /** Everything a group needs to prepare, household items preferred. */
  materials: Text[];
  authors: { name: string; role?: string }[];
  license: 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'CC0-1.0';
  /** Where facts and data come from. */
  sources: { title: string; url?: string }[];
  /** The lesson this one was adapted from, if any (a "fork"). */
  basedOn?: { id: string; version: number };
  steps: Step[];
}

export type Step =
  | ReadStep
  | PredictStep
  | EstimateStep
  | SimStep
  | DataStep
  | HandsOnStep
  | DiscussStep
  | ChallengeStep;

interface StepBase {
  id: string;
  title: Text;
}

/** A short explanation. Keep it to a few sentences; doing comes before telling. */
export interface ReadStep extends StepBase {
  type: 'read';
  body: Text;
}

/** Commit to an answer before seeing what happens. Wrong answers are never punished. */
export interface PredictStep extends StepBase {
  type: 'predict';
  prompt: Text;
  options: { id: string; text: Text }[];
  /** Omit when there is no single right answer; the reveal is shown either way. */
  answer?: string;
  reveal: Text;
}

/** Guess a number with a slider, then compare with the real value. */
export interface EstimateStep extends StepBase {
  type: 'estimate';
  prompt: Text;
  min: number;
  max: number;
  step: number;
  unit: string;
  answer: number;
  /** Guesses within this distance of the answer count as close. */
  tolerance: number;
  reveal: Text;
}

/** An interactive simulation from the reviewed registry. */
export interface SimStep extends StepBase {
  type: 'sim';
  sim: string;
  body: Text;
  /** Things to try, shown next to the simulation. */
  tasks: Text[];
}

/** Real measurements, bundled so the lesson works offline. Live data is used when online. */
export interface DataStep extends StepBase {
  type: 'data';
  body: Text;
  dataset: string;
  /** Optional: a question the player checks against the data itself. */
  find?: { kind: 'peak'; prompt: Text };
  questions: Text[];
}

/** Something to do with your hands, away from the screen. */
export interface HandsOnStep extends StepBase {
  type: 'handson';
  minutes: number;
  materials: Text[];
  instructions: Text[];
  safety?: Text;
  observe: Text;
}

/** A conversation for the group. Roles make sure everyone speaks. */
export interface DiscussStep extends StepBase {
  type: 'discuss';
  prompt: Text;
  roles?: { name: string; task: Text }[];
}

/** A real problem to work on together, ideally with another club elsewhere. */
export interface ChallengeStep extends StepBase {
  type: 'challenge';
  body: Text;
  constraints: Text[];
  deliverable: Text;
  connect?: Text;
}

export const STEP_TYPES = ['read', 'predict', 'estimate', 'sim', 'data', 'handson', 'discuss', 'challenge'] as const;

// ---------------------------------------------------------------- validation
// Every lesson is checked before it is shown. A teacher's lesson that breaks a rule
// gets a clear list of what to fix instead of a broken page.

export function validateLesson(input: unknown, known: { sims: string[]; datasets: string[] }): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  const isStr = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  const isStrList = (v: unknown, min = 1) => Array.isArray(v) && v.length >= min && v.every(isStr);
  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

  if (!input || typeof input !== 'object') return ['lesson: must be an object'];
  const l = input as Record<string, unknown>;

  if (l.format !== FORMAT_VERSION) err('format', `must be ${FORMAT_VERSION}`);
  if (!isStr(l.id) || !/^[a-z0-9-]+$/.test(String(l.id))) err('id', 'lowercase letters, digits and dashes only');
  if (!Number.isInteger(l.version) || (l.version as number) < 1) err('version', 'a whole number from 1');
  if (!isStr(l.language) || !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(String(l.language))) err('language', 'a language tag like "en"');
  for (const k of ['title', 'summary', 'ages', 'groupSize']) if (!isStr(l[k])) err(k, 'required text');
  if (!isNum(l.minutes) || (l.minutes as number) <= 0) err('minutes', 'a positive number');
  for (const k of ['subjects', 'goals', 'materials']) if (!isStrList(l[k])) err(k, 'a list with at least one entry');
  if (!Array.isArray(l.authors) || l.authors.length === 0 || !l.authors.every((a) => a && isStr((a as { name?: unknown }).name)))
    err('authors', 'at least one author with a name');
  if (!['CC-BY-4.0', 'CC-BY-SA-4.0', 'CC0-1.0'].includes(String(l.license))) err('license', 'an open licence (CC-BY-4.0, CC-BY-SA-4.0 or CC0-1.0)');
  if (!Array.isArray(l.sources)) err('sources', 'a list (may be empty)');

  if (!Array.isArray(l.steps) || l.steps.length === 0) {
    err('steps', 'at least one step');
    return errors;
  }

  const ids = new Set<string>();
  l.steps.forEach((raw, i) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const where = `step ${i + 1}${isStr(s.id) ? ` (${s.id})` : ''}`;
    if (!isStr(s.id)) err(where, 'needs an id');
    else if (ids.has(String(s.id))) err(where, 'id is used twice');
    else ids.add(String(s.id));
    if (!isStr(s.title)) err(where, 'needs a title');

    switch (s.type) {
      case 'read':
        if (!isStr(s.body)) err(where, 'needs a body');
        break;
      case 'predict': {
        if (!isStr(s.prompt)) err(where, 'needs a prompt');
        if (!isStr(s.reveal)) err(where, 'needs a reveal');
        const opts = s.options as { id?: unknown; text?: unknown }[] | undefined;
        if (!Array.isArray(opts) || opts.length < 2 || !opts.every((o) => isStr(o?.id) && isStr(o?.text)))
          err(where, 'needs at least two options, each with an id and text');
        else if (s.answer !== undefined && !opts.some((o) => o.id === s.answer)) err(where, 'answer must be one of the option ids');
        break;
      }
      case 'estimate': {
        if (!isStr(s.prompt) || !isStr(s.reveal)) err(where, 'needs a prompt and a reveal');
        const nums = ['min', 'max', 'step', 'answer', 'tolerance'];
        if (!nums.every((k) => isNum(s[k]))) err(where, `needs numbers for ${nums.join(', ')}`);
        else {
          const [min, max, step, answer] = nums.map((k) => s[k] as number);
          if (min >= max) err(where, 'min must be below max');
          if (step <= 0) err(where, 'step must be positive');
          if (answer < min || answer > max) err(where, 'answer must lie between min and max');
        }
        if (typeof s.unit !== 'string') err(where, 'needs a unit (may be empty)');
        break;
      }
      case 'sim':
        if (!known.sims.includes(String(s.sim))) err(where, `unknown simulation "${s.sim}"`);
        if (!isStr(s.body)) err(where, 'needs a body');
        if (!isStrList(s.tasks)) err(where, 'needs at least one task');
        break;
      case 'data':
        if (!known.datasets.includes(String(s.dataset))) err(where, `unknown dataset "${s.dataset}"`);
        if (!isStr(s.body)) err(where, 'needs a body');
        if (!isStrList(s.questions)) err(where, 'needs at least one question');
        if (s.find !== undefined) {
          const f = s.find as { kind?: unknown; prompt?: unknown };
          if (f.kind !== 'peak' || !isStr(f.prompt)) err(where, 'find must be { kind: "peak", prompt }');
        }
        break;
      case 'handson':
        if (!isNum(s.minutes)) err(where, 'needs minutes');
        if (!isStrList(s.materials) || !isStrList(s.instructions)) err(where, 'needs materials and instructions');
        if (!isStr(s.observe)) err(where, 'needs an observe prompt');
        break;
      case 'discuss':
        if (!isStr(s.prompt)) err(where, 'needs a prompt');
        if (s.roles !== undefined && (!Array.isArray(s.roles) || !s.roles.every((r) => isStr(r?.name) && isStr(r?.task))))
          err(where, 'roles need a name and a task');
        break;
      case 'challenge':
        if (!isStr(s.body) || !isStr(s.deliverable)) err(where, 'needs a body and a deliverable');
        if (!isStrList(s.constraints)) err(where, 'needs at least one constraint');
        break;
      default:
        err(where, `unknown type "${s.type}" (use one of: ${STEP_TYPES.join(', ')})`);
    }
  });

  return errors;
}
