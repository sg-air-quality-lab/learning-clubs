import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Singapore Air Quality · Learning Clubs',
  description: 'Official hourly PM2.5 and PSI readings for Singapore, by region. Zoom, compare and download.',
};

export default function DataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
