export type RideStatus = 'recording' | 'complete' | 'recovered' | 'discarded';

export interface RideSession {
  id: string;               // UUID
  started_at: number;       // Unix ms
  ended_at: number | null;  // null = incomplete
  distance_m: number;
  duration_s: number;
  status: RideStatus;
}

export interface RidePoint {
  id?: number;
  session_id: string;
  ts: number;               // Unix ms
  lat: number;
  lon: number;
  speed_mps: number;
  accuracy_m: number;
  accel_x: number;          // calibrated values
  accel_y: number;
  accel_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  gps_lost: boolean;
}

export interface CalibrationData {
  accel_x: number;          // gravity vector at rest, bike upright
  accel_y: number;
  accel_z: number;
  captured_at: number;      // Unix ms
}
