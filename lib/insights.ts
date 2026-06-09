import { getRollingBaseline } from './analytics';
import { DRILLS, Drill } from '../data/drills';
import { kvGet, kvSet } from './storage';

export function getActiveDrill(): Drill | null {
  const raw = kvGet('active_drill');
  if (!raw) return null;

  const { drillId, startedAt } = JSON.parse(raw);
  const drill = DRILLS.find(d => d.id === drillId);
  if (!drill) return null;

  const daysElapsed = (Date.now() - startedAt) / (1000 * 60 * 60 * 24);
  if (daysElapsed > drill.durationDays) {
    kvSet('active_drill', '');
    return null;
  }

  return drill;
}

export function getActiveDrillStartedAt(): number | null {
  const raw = kvGet('active_drill');
  if (!raw) return null;
  try {
    const { startedAt } = JSON.parse(raw);
    return startedAt ?? null;
  } catch {
    return null;
  }
}

export function assignDrill(): Drill | null {
  const baseline = getRollingBaseline();
  if (!baseline) return null;

  const scores = [
    { metric: 'braking' as const, score: baseline.braking },
    { metric: 'throttle' as const, score: baseline.throttle },
    { metric: 'lean' as const, score: baseline.lean },
  ].sort((a, b) => a.score - b.score);

  const weakest = scores[0];

  const candidates = DRILLS.filter(
    d => d.focusMetric === weakest.metric && weakest.score < d.targetThreshold
  );

  if (candidates.length === 0) return null;

  const drill = candidates.sort((a, b) => a.targetThreshold - b.targetThreshold)[0];

  kvSet('active_drill', JSON.stringify({ drillId: drill.id, startedAt: Date.now() }));
  return drill;
}
