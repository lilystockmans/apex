import { RidePoint } from '../../types/ride';

const ALPHA = 0.98; // complementary filter weight (gyro trust)

export interface LeanResult {
  score: number;           // 0–100 (balance between left and right)
  maxLeanLeft: number;     // degrees equivalent (relative units)
  maxLeanRight: number;
  balanceGap: number;      // |left - right| — lower is better
  cornerCount: number;
}

export function scoreLean(points: RidePoint[]): LeanResult {
  let angle = 0; // complementary filter state
  let maxLeft = 0;
  let maxRight = 0;
  let cornerCount = 0;

  for (let i = 1; i < points.length; i++) {
    const dt = (points[i].ts - points[i - 1].ts) / 1000;
    if (dt <= 0 || dt > 2) continue; // skip gaps

    // Complementary filter: trust gyro for fast changes, accel for slow drift correction
    const gyroAngle = angle + points[i].gyro_z * dt; // integrate gyro Z
    const accelAngle = Math.atan2(points[i].accel_y, points[i].accel_z); // accel estimate
    angle = ALPHA * gyroAngle + (1 - ALPHA) * accelAngle;

    if (angle < -0.1) { // leaning left
      if (Math.abs(angle) > Math.abs(maxLeft)) maxLeft = angle;
      if (Math.abs(angle) > 0.15) cornerCount++;
    } else if (angle > 0.1) { // leaning right
      if (angle > maxRight) maxRight = angle;
    }
  }

  const leftMag = Math.abs(maxLeft);
  const balanceGap = Math.abs(leftMag - maxRight);
  const score = Math.round(100 - Math.min(100, balanceGap / 0.5 * 100));

  return { score, maxLeanLeft: leftMag, maxLeanRight: maxRight, balanceGap, cornerCount };
}
