import { getRidePoints, getRideSessions, kvGet, kvSet } from '../storage';
import { scoreBraking } from './braking';
import { scoreThrottle } from './throttle';
import { scoreLean } from './lean';
import { classifyRoad } from './classifier';

const EMA_ALPHA = 0.3;
const MIN_RIDES_FOR_SCORE = 3;

export interface RideScores {
  braking: number;    // 0–100, or -1 if insufficient data
  throttle: number;
  lean: number;
  roadType: string;
  brakingEvents: number;
}

export function scoreRide(sessionId: string): RideScores {
  const points = getRidePoints(sessionId);
  const validPoints = points.filter(p => !p.gps_lost && p.speed_mps > 0);

  const braking = scoreBraking(validPoints);
  const throttle = scoreThrottle(validPoints);
  const lean = scoreLean(validPoints);
  const roadType = classifyRoad(validPoints);

  return {
    braking: braking.score,
    throttle: throttle.score,
    lean: lean.score,
    roadType,
    brakingEvents: braking.eventCount,
  };
}

export function getRollingBaseline(): { braking: number; throttle: number; lean: number } | null {
  const raw = kvGet('rolling_baseline');
  return raw ? JSON.parse(raw) : null;
}

export function updateRollingBaseline(newScores: RideScores) {
  const current = getRollingBaseline();

  if (!current) {
    kvSet('rolling_baseline', JSON.stringify({
      braking: newScores.braking,
      throttle: newScores.throttle,
      lean: newScores.lean,
    }));
    return;
  }

  const updated = {
    braking: newScores.braking >= 0
      ? EMA_ALPHA * newScores.braking + (1 - EMA_ALPHA) * current.braking
      : current.braking,
    throttle: newScores.throttle >= 0
      ? EMA_ALPHA * newScores.throttle + (1 - EMA_ALPHA) * current.throttle
      : current.throttle,
    lean: newScores.lean >= 0
      ? EMA_ALPHA * newScores.lean + (1 - EMA_ALPHA) * current.lean
      : current.lean,
  };

  kvSet('rolling_baseline', JSON.stringify(updated));
}

export function hasEnoughRides(): boolean {
  const sessions = getRideSessions();
  return sessions.length >= MIN_RIDES_FOR_SCORE;
}
