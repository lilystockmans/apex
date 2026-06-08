export interface MotionEvent {
  start_ts: number;
  end_ts: number;
  duration_s: number;
  peak_jerk: number;       // m/s³
  peak_decel: number;      // g (absolute value)
}

export type SensorPoint = { ts: number } & Record<string, unknown>;

/**
 * Extract motion events from a calibrated sensor stream.
 * @param points  Array of RidePoint (must be sorted by ts ascending)
 * @param axis    Which calibrated axis to analyse ('accel_x' = longitudinal)
 * @param threshold  Entry threshold in g (negative = braking, positive = throttle)
 * @param minDuration  Minimum event duration in seconds (filters noise)
 */
export function extractEvents(
  points: SensorPoint[],
  axis: string,
  threshold: number,        // e.g. -0.2 for braking, +0.1 for throttle
  minDuration = 0.5
): MotionEvent[] {
  const events: MotionEvent[] = [];
  let inEvent = false;
  let eventStart = 0;
  let eventPoints: { ts: number; val: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    const val = points[i][axis] as number;
    const ts = points[i].ts as number;

    const isActive = threshold < 0 ? val < threshold : val > threshold;

    if (isActive && !inEvent) {
      inEvent = true;
      eventStart = ts;
      eventPoints = [{ ts, val }];
    } else if (isActive && inEvent) {
      eventPoints.push({ ts, val });
    } else if (!isActive && inEvent) {
      inEvent = false;
      const duration_s = (ts - eventStart) / 1000;
      if (duration_s >= minDuration) {
        events.push(computeJerk(eventPoints, eventStart, ts, duration_s));
      }
      eventPoints = [];
    }
  }

  return events;
}

function computeJerk(
  points: { ts: number; val: number }[],
  start_ts: number,
  end_ts: number,
  duration_s: number
): MotionEvent {
  let maxJerk = 0;
  let peakDecel = 0;

  for (let i = 1; i < points.length; i++) {
    const dt = (points[i].ts - points[i - 1].ts) / 1000; // seconds
    if (dt <= 0) continue;
    const jerk = Math.abs((points[i].val - points[i - 1].val) / dt); // g/s
    const jerkMs3 = jerk * 9.81; // 1g = 9.81 m/s²
    if (jerkMs3 > maxJerk) maxJerk = jerkMs3;
    if (Math.abs(points[i].val) > peakDecel) peakDecel = Math.abs(points[i].val);
  }

  return { start_ts, end_ts, duration_s, peak_jerk: maxJerk, peak_decel: peakDecel };
}
