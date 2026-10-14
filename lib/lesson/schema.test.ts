import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLesson } from './schema.ts';

const known = { sims: ['scattering'], datasets: ['nea-pm25-haze-2026-10'] };
const lesson = JSON.parse(readFileSync(new URL('../../lessons/haze-sensor/en.json', import.meta.url), 'utf8'));

test('the haze lesson follows the format', () => {
  assert.deepEqual(validateLesson(lesson, known), []);
});

test('a broken lesson gets clear messages', () => {
  const broken = structuredClone(lesson);
  broken.license = 'all rights reserved';
  broken.steps[1].answer = 'nope';
  broken.steps[3].sim = 'unknown-sim';
  broken.steps.push({ id: 'hook', type: 'read', title: 'Again', body: 'x' });
  broken.steps.push({ id: 'z', type: 'video', title: 'Video' });
  const errors = validateLesson(broken, known);
  assert.ok(errors.some((e) => e.startsWith('license')));
  assert.ok(errors.some((e) => e.includes('answer must be one of the option ids')));
  assert.ok(errors.some((e) => e.includes('unknown simulation')));
  assert.ok(errors.some((e) => e.includes('id is used twice')));
  assert.ok(errors.some((e) => e.includes('unknown type "video"')));
});

test('estimate answers must lie in range', () => {
  const broken = structuredClone(lesson);
  broken.steps[2].answer = 500;
  assert.ok(validateLesson(broken, known).some((e) => e.includes('between min and max')));
});
