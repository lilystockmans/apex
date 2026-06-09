import { getRideSessions } from './storage';
import { getRollingBaseline } from './analytics';

export type SkillLevel = 'novice' | 'street' | 'confident' | 'pre-track' | 'track-ready';

export interface Level {
  id: SkillLevel;
  label: string;
  description: string;
  color: string;
  unlockCondition: () => boolean;
}

export const LEVELS: Level[] = [
  {
    id: 'novice',
    label: 'Novice',
    description: 'Getting started — building your baseline.',
    color: '#9CA3AF',
    unlockCondition: () => true,
  },
  {
    id: 'street',
    label: 'Street',
    description: 'Consistent on public roads. Inputs are getting smoother.',
    color: '#60A5FA',
    unlockCondition: () => {
      const sessions = getRideSessions();
      const baseline = getRollingBaseline();
      return (
        sessions.length >= 10 &&
        (baseline?.braking ?? 0) > 60 &&
        (baseline?.throttle ?? 0) > 60
      );
    },
  },
  {
    id: 'confident',
    label: 'Confident',
    description: 'Smooth and consistent across all metrics.',
    color: '#34D399',
    unlockCondition: () => {
      const sessions = getRideSessions();
      const baseline = getRollingBaseline();
      return (
        sessions.length >= 15 &&
        (baseline?.braking ?? 0) > 70 &&
        (baseline?.throttle ?? 0) > 70 &&
        (baseline?.lean ?? 0) > 70
      );
    },
  },
  {
    id: 'pre-track',
    label: 'Pre-Track',
    description: 'Ready to think about your first circuit session.',
    color: '#F59E0B',
    unlockCondition: () => {
      const sessions = getRideSessions();
      const baseline = getRollingBaseline();
      return (
        sessions.length >= 20 &&
        (baseline?.braking ?? 0) > 80 &&
        (baseline?.throttle ?? 0) > 80 &&
        (baseline?.lean ?? 0) > 80
      );
    },
  },
  {
    id: 'track-ready',
    label: 'Track Ready',
    description: 'Your inputs are track-day quality. Time to book a session.',
    color: '#FF6B35',
    unlockCondition: () => {
      const sessions = getRideSessions();
      const baseline = getRollingBaseline();
      return (
        sessions.length >= 30 &&
        (baseline?.braking ?? 0) > 85 &&
        (baseline?.throttle ?? 0) > 85 &&
        (baseline?.lean ?? 0) > 85
      );
    },
  },
];

export function getCurrentLevel(): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (LEVELS[i].unlockCondition()) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(): Level | null {
  const current = getCurrentLevel();
  const idx = LEVELS.findIndex(l => l.id === current.id);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

export interface LevelCondition {
  label: string;
  met: boolean;
}

export function getNextLevelConditions(): LevelCondition[] {
  const next = getNextLevel();
  if (!next) return [];

  const sessions = getRideSessions();
  const baseline = getRollingBaseline();
  const b = baseline?.braking ?? 0;
  const t = baseline?.throttle ?? 0;
  const l = baseline?.lean ?? 0;
  const count = sessions.length;

  switch (next.id) {
    case 'street':
      return [
        { label: `10 rides (${count} done)`, met: count >= 10 },
        { label: `Braking > 60 (${Math.round(b)})`, met: b > 60 },
        { label: `Throttle > 60 (${Math.round(t)})`, met: t > 60 },
      ];
    case 'confident':
      return [
        { label: `15 rides (${count} done)`, met: count >= 15 },
        { label: `Braking > 70 (${Math.round(b)})`, met: b > 70 },
        { label: `Throttle > 70 (${Math.round(t)})`, met: t > 70 },
        { label: `Cornering > 70 (${Math.round(l)})`, met: l > 70 },
      ];
    case 'pre-track':
      return [
        { label: `20 rides (${count} done)`, met: count >= 20 },
        { label: `Braking > 80 (${Math.round(b)})`, met: b > 80 },
        { label: `Throttle > 80 (${Math.round(t)})`, met: t > 80 },
        { label: `Cornering > 80 (${Math.round(l)})`, met: l > 80 },
      ];
    case 'track-ready':
      return [
        { label: `30 rides (${count} done)`, met: count >= 30 },
        { label: `Braking > 85 (${Math.round(b)})`, met: b > 85 },
        { label: `Throttle > 85 (${Math.round(t)})`, met: t > 85 },
        { label: `Cornering > 85 (${Math.round(l)})`, met: l > 85 },
      ];
    default:
      return [];
  }
}
