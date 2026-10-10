import type { ComponentType } from 'react';
import type { GroupId } from '../content/types';
import type { Appearance } from '../three/appearance';
import { IconFlame, IconFrame, IconLines, IconMuscle, IconSpot } from './Icons';

export const GROUP_STYLE: Record<GroupId, { color: string; short: string; Icon: ComponentType<{ size?: number }> }> = {
  volume: { color: '#ff8a3d', short: 'Volume', Icon: IconMuscle },
  conditioning: { color: '#ff4d6d', short: 'Leanness', Icon: IconFlame },
  detail: { color: '#2ee6d6', short: 'Detail', Icon: IconLines },
  development: { color: '#b39bff', short: 'Structure', Icon: IconFrame },
  presentation: { color: '#ffd23f', short: 'Stage', Icon: IconSpot },
};

/** Short stat names for the HUD bars. */
export const STAT: Record<keyof Appearance, { short: string; signed: boolean }> = {
  size: { short: 'Size', signed: true },
  fullness: { short: 'Fullness', signed: true },
  bodyFat: { short: 'Soft tissue', signed: false },
  smoothness: { short: 'Smoothing', signed: false },
  separation: { short: 'Separation', signed: false },
  striations: { short: 'Striations', signed: false },
  vascularity: { short: 'Veins', signed: false },
  detail: { short: 'Grain', signed: false },
};
