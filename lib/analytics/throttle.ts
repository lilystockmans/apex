import { extractEvents, MotionEvent, SensorPoint } from './jerk';
import { RidePoint } from '../../types/ride';

const THROTTLE_THRESHOLD = 0.1;   // g (longitudinal accel)
const JERK_SMOOTH = 0.5;
const JERK_HARSH = 8.0;

export function scoreThrottle(points: RidePoint[]): {
  score: number;
  events: MotionEvent[];
} {
  const events = extractEvents(points as unknown as SensorPoint[], 'accel_x', THROTTLE_THRESHOLD);
  if (events.length === 0) return { score: -1, events: [] };

  const totalDuration = events.reduce((s, e) => s + e.duration_s, 0);
  const weightedScore = events.reduce((s, e) => {
    const rawScore = 100 - Math.max(0, Math.min(100,
      (e.peak_jerk - JERK_SMOOTH) / (JERK_HARSH - JERK_SMOOTH) * 100
    ));
    return s + rawScore * (e.duration_s / totalDuration);
  }, 0);

  return { score: Math.round(weightedScore), events };
}
