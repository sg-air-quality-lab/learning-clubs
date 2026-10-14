// All lessons in this library. Adding a lesson = adding its JSON file here.
// Every lesson is validated at build time, so a broken lesson never reaches a student.

import type { Lesson } from './schema';
import { validateLesson } from './schema';
import { DATASET_IDS } from './datasets';
import { SIM_IDS } from './sims';
import hazeSensorEn from '@/lessons/haze-sensor/en.json';

const RAW: unknown[] = [hazeSensorEn];

export const LESSONS: Lesson[] = RAW.map((raw) => {
  const errors = validateLesson(raw, { sims: SIM_IDS, datasets: DATASET_IDS });
  if (errors.length) {
    const id = (raw as { id?: string })?.id ?? 'unknown';
    throw new Error(`Lesson "${id}" does not follow the lesson format:\n- ${errors.join('\n- ')}`);
  }
  return raw as Lesson;
});

export function getLesson(id: string, language = 'en'): Lesson | undefined {
  return LESSONS.find((l) => l.id === id && l.language === language) ?? LESSONS.find((l) => l.id === id);
}
