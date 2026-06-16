import { supabase } from './supabase';
import { getRideSessions } from './storage';
import { getRollingBaseline } from './analytics';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  check: () => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-ride',
    title: 'First Ride',
    description: 'Recorded your first ride with Apex.',
    icon: '🏍️',
    check: () => getRideSessions().length >= 1,
  },
  {
    id: 'ten-rides',
    title: 'Ten Rides',
    description: 'Completed 10 rides.',
    icon: '🔟',
    check: () => getRideSessions().length >= 10,
  },
  {
    id: 'thirty-rides',
    title: 'Thirty Rides',
    description: 'Completed 30 rides.',
    icon: '🎯',
    check: () => getRideSessions().length >= 30,
  },
  {
    id: 'five-hundred-km',
    title: '500km Ridden',
    description: 'Total distance of 500km recorded.',
    icon: '📍',
    check: () => {
      const total = getRideSessions().reduce((s, r) => s + (r.distance_m ?? 0), 0);
      return total >= 500_000;
    },
  },
  {
    id: 'one-thousand-km',
    title: '1000km Ridden',
    description: 'Total distance of 1000km recorded.',
    icon: '🗺️',
    check: () => {
      const total = getRideSessions().reduce((s, r) => s + (r.distance_m ?? 0), 0);
      return total >= 1_000_000;
    },
  },
  {
    id: 'smooth-braker',
    title: 'Smooth Braker',
    description: 'Braking score above 80 for 5 consecutive rides.',
    icon: '🛑',
    // Stub — requires per-ride score history to be stored in kv_store at ride finalisation
    check: () => false,
  },
  {
    id: 'smooth-throttle',
    title: 'Smooth Throttle',
    description: 'Throttle score above 80 for 5 consecutive rides.',
    icon: '⚡',
    check: () => false,
  },
  {
    id: 'balanced-corners',
    title: 'Balanced Corners',
    description: 'Cornering score above 70.',
    icon: '↔️',
    check: () => (getRollingBaseline()?.lean ?? 0) > 70,
  },
  {
    id: 'level-up-street',
    title: 'Street Rider',
    description: 'Reached the Street skill level.',
    icon: '🛣️',
    check: () =>
      (getRollingBaseline()?.braking ?? 0) > 60 &&
      (getRollingBaseline()?.throttle ?? 0) > 60 &&
      getRideSessions().length >= 10,
  },
  {
    id: 'level-up-confident',
    title: 'Confident Rider',
    description: 'Reached the Confident skill level.',
    icon: '💪',
    check: () =>
      (getRollingBaseline()?.braking ?? 0) > 70 &&
      (getRollingBaseline()?.throttle ?? 0) > 70 &&
      (getRollingBaseline()?.lean ?? 0) > 70 &&
      getRideSessions().length >= 15,
  },
  {
    id: 'level-up-pre-track',
    title: 'Pre-Track',
    description: 'Reached the Pre-Track skill level.',
    icon: '🏎️',
    check: () =>
      (getRollingBaseline()?.braking ?? 0) > 80 &&
      (getRollingBaseline()?.throttle ?? 0) > 80 &&
      (getRollingBaseline()?.lean ?? 0) > 80 &&
      getRideSessions().length >= 20,
  },
  {
    id: 'level-up-track-ready',
    title: 'Track Ready',
    description: 'Reached Track Ready level. Time to book a session.',
    icon: '🏁',
    check: () =>
      (getRollingBaseline()?.braking ?? 0) > 85 &&
      (getRollingBaseline()?.throttle ?? 0) > 85 &&
      (getRollingBaseline()?.lean ?? 0) > 85 &&
      getRideSessions().length >= 30,
  },
];

export async function checkAndAwardAchievements(userId: string) {
  for (const achievement of ACHIEVEMENTS) {
    if (!achievement.check()) continue;

    const { data: existing } = await supabase
      .from('achievements')
      .select('id')
      .eq('id', achievement.id)
      .eq('user_id', userId)
      .single();

    if (existing) continue;

    await supabase.from('achievements').insert({ id: achievement.id, user_id: userId });
  }
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
