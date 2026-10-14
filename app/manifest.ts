import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Learning Clubs',
    short_name: 'Learning Clubs',
    description: 'Open lessons for learning clubs: learn together, try it with your hands, work on real problems.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9f9f7',
    theme_color: '#0b0b0b',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
