import { Accelerometer } from 'expo-sensors';
import { kvGet, kvSet } from './storage';
import { CalibrationData } from '../types/ride';

export async function captureCalibration(): Promise<CalibrationData> {
  return new Promise((resolve) => {
    const readings: { x: number; y: number; z: number }[] = [];
    const sub = Accelerometer.addListener((data) => {
      readings.push(data);
      if (readings.length >= 20) {
        sub.remove();
        const avg: CalibrationData = {
          accel_x: readings.reduce((s, r) => s + r.x, 0) / readings.length,
          accel_y: readings.reduce((s, r) => s + r.y, 0) / readings.length,
          accel_z: readings.reduce((s, r) => s + r.z, 0) / readings.length,
          captured_at: Date.now(),
        };
        kvSet('calibration', JSON.stringify(avg));
        resolve(avg);
      }
    });
    Accelerometer.setUpdateInterval(100); // 10Hz → ~2 seconds of samples
  });
}

export function getCalibration(): CalibrationData | null {
  const raw = kvGet('calibration');
  return raw ? (JSON.parse(raw) as CalibrationData) : null;
}

export function transformReading(
  raw: { x: number; y: number; z: number },
  cal: CalibrationData
) {
  return {
    longitudinal: raw.x - cal.accel_x, // braking/acceleration axis
    lateral: raw.y - cal.accel_y,       // lean axis
    vertical: raw.z - cal.accel_z,      // vertical axis
  };
}
