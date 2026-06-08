import { extractEvents, MotionEvent, SensorPoint } from './jerk';
import { RidePoint } from '../../types/ride';

const BRAKING_THRESHOLD = -0.2;     // g (longitudinal decel)
const JERK_SMOOTH = 1.0;            // m/s³ → score 100
const JERK_HARSH = 10.0;            // m/s³ → score 0

export function scoreBraking(points: RidePoint[]): {
  score: number;
  events: MotionEvent[];
  eventCount: number;
} {
  const events = extractEvents(points as unknown as SensorPoint[], 'accel_x', BRAKING_THRESHOLD);

  if (events.length === 0) {
    return { score: -1, events: [], eventCount: 0 }; // -1 = insufficient data
  }

  // Weighted mean: longer events count more
  const totalDuration = events.reduce((s, e) => s + e.duration_s, 0);
  const weightedScore = events.reduce((s, e) => {
    const rawScore = 100 - clamp((e.peak_jerk - JERK_SMOOTH) / (JERK_HARSH - JERK_SMOOTH) * 100, 0, 100);
    return s + rawScore * (e.duration_s / totalDuration);
  }, 0);

  return {
    score: Math.round(weightedScore),
    events,
    eventCount: events.length,
  };
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}
