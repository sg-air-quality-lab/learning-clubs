// Datasets lessons can use. Each one is bundled with the app, so a lesson works offline.
// When the device is online and the database is connected, the player can also show live data.

import demo from '@/data/demo.json';

export interface DatasetPoint {
  t: string;
  device: string;
  v: number;
}

export interface Dataset {
  id: string;
  title: string;
  metric: 'pm25_1h';
  devices: string[];
  attribution: { text: string; url: string };
  points: DatasetPoint[];
  /** When set, the player offers the same series live from /api/series. */
  live?: { hours: number };
}

export const DATASETS: Record<string, Dataset> = {
  'nea-pm25-haze-2026-10': {
    id: 'nea-pm25-haze-2026-10',
    title: 'NEA hourly PM2.5, West and Central, 7–9 October 2026',
    metric: 'pm25_1h',
    devices: ['nea-west', 'nea-central'],
    attribution: {
      text: 'Contains information from the National Environment Agency, accessed via data.gov.sg, licensed under the Singapore Open Data Licence.',
      url: 'https://data.gov.sg/open-data-licence',
    },
    points: (demo.points as (DatasetPoint & { metric: string })[])
      .filter((p) => p.metric === 'pm25_1h')
      .map(({ t, device, v }) => ({ t, device, v })),
    live: { hours: 72 },
  },
};

export const DATASET_IDS = Object.keys(DATASETS);

/** The highest reading in a dataset, used to check "find the worst hour" answers against the data itself. */
export function peakOf(points: DatasetPoint[]): DatasetPoint | null {
  return points.reduce<DatasetPoint | null>((best, p) => (best && best.v >= p.v ? best : p), null);
}
