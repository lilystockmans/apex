import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { insertRidePoint, kvGet } from './storage';
import { transformReading, getCalibration } from './calibration';

export const RECORDING_TASK = 'APEX_RIDE_RECORDING';

// Latest sensor readings — shared across the location callback within this JS context
let latestAccel = { x: 0, y: 0, z: 0 };
let latestGyro = { x: 0, y: 0, z: 0 };

// Called from record screen when recording starts
export function startSensorListeners() {
  Accelerometer.setUpdateInterval(100); // 10Hz
  Accelerometer.addListener((data) => {
    latestAccel = data;
  });
  Gyroscope.setUpdateInterval(100);
  Gyroscope.addListener((data) => {
    latestGyro = data;
  });
}

export function stopSensorListeners() {
  Accelerometer.removeAllListeners();
  Gyroscope.removeAllListeners();
}

// Must be defined at module load time (not inside a component or useEffect).
// Imported as a side-effect in app/_layout.tsx so it registers before any navigation.
TaskManager.defineTask(RECORDING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('[APEX] Recording task error:', error);
    return;
  }

  const locations = data?.locations as Location.LocationObject[];
  if (!locations?.length) return;

  const location = locations[locations.length - 1];
  const sessionId = kvGet('active_session_id');
  if (!sessionId) return;

  const cal = getCalibration();
  const transformed = cal
    ? transformReading(latestAccel, cal)
    : { longitudinal: latestAccel.x, lateral: latestAccel.y, vertical: latestAccel.z };

  const gpsLost = (location.coords.accuracy ?? 999) > 50;

  insertRidePoint({
    session_id: sessionId,
    ts: location.timestamp,
    lat: location.coords.latitude,
    lon: location.coords.longitude,
    speed_mps: location.coords.speed ?? 0,
    accuracy_m: location.coords.accuracy ?? 999,
    accel_x: transformed.longitudinal,
    accel_y: transformed.lateral,
    accel_z: transformed.vertical,
    gyro_x: latestGyro.x,
    gyro_y: latestGyro.y,
    gyro_z: latestGyro.z,
    gps_lost: gpsLost,
  });
});
