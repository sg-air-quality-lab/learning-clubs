'use client';

// Reviewed simulations, by the name lessons use to refer to them (see lib/lesson/sims.ts).
import type { ComponentType } from 'react';
import Scattering from './Scattering';

export const SIMS: Record<string, ComponentType> = {
  scattering: Scattering,
};
