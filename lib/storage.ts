import * as SQLite from 'expo-sqlite';
import { RideSession, RidePoint } from '../types/ride';

const db = SQLite.openDatabaseSync('apex.db');

export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS ride_sessions (
      id TEXT PRIMARY KEY,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      distance_m REAL DEFAULT 0,
      duration_s INTEGER DEFAULT 0,
      status TEXT DEFAULT 'recording'
    );

    CREATE TABLE IF NOT EXISTS ride_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      lat REAL, lon REAL,
      speed_mps REAL,
      accuracy_m REAL,
      accel_x REAL, accel_y REAL, accel_z REAL,
      gyro_x REAL, gyro_y REAL, gyro_z REAL,
      gps_lost INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// KV helpers
export function kvGet(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function kvSet(key: string, value: string) {
  db.runSync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [key, value]);
}

// Ride sessions
export function createRideSession(id: string, started_at: number) {
  db.runSync(
    'INSERT INTO ride_sessions (id, started_at, status) VALUES (?, ?, ?)',
    [id, started_at, 'recording']
  );
}

export function finalizeRideSession(id: string, ended_at: number, distance_m: number, duration_s: number) {
  db.runSync(
    'UPDATE ride_sessions SET ended_at = ?, distance_m = ?, duration_s = ?, status = ? WHERE id = ?',
    [ended_at, distance_m, duration_s, 'complete', id]
  );
}

export function getIncompleteSession(): RideSession | null {
  return db.getFirstSync<RideSession>(
    "SELECT * FROM ride_sessions WHERE status = 'recording' LIMIT 1"
  );
}

export function getRideSessions(): RideSession[] {
  return db.getAllSync<RideSession>(
    "SELECT * FROM ride_sessions WHERE status = 'complete' ORDER BY started_at DESC"
  );
}

export function getRideSessionById(id: string): RideSession | null {
  return db.getFirstSync<RideSession>(
    'SELECT * FROM ride_sessions WHERE id = ?',
    [id]
  );
}

export function discardSession(id: string) {
  db.runSync("UPDATE ride_sessions SET status = 'discarded' WHERE id = ?", [id]);
}

export function recoverSession(id: string, ended_at: number, distance_m: number, duration_s: number) {
  db.runSync(
    'UPDATE ride_sessions SET ended_at = ?, distance_m = ?, duration_s = ?, status = ? WHERE id = ?',
    [ended_at, distance_m, duration_s, 'recovered', id]
  );
}

// Ride points
export function insertRidePoint(point: RidePoint) {
  db.runSync(
    `INSERT INTO ride_points
     (session_id, ts, lat, lon, speed_mps, accuracy_m, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, gps_lost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      point.session_id, point.ts, point.lat, point.lon,
      point.speed_mps, point.accuracy_m,
      point.accel_x, point.accel_y, point.accel_z,
      point.gyro_x, point.gyro_y, point.gyro_z,
      point.gps_lost ? 1 : 0,
    ]
  );
}

export function getRidePoints(session_id: string): RidePoint[] {
  return db.getAllSync<RidePoint>(
    'SELECT * FROM ride_points WHERE session_id = ? ORDER BY ts ASC',
    [session_id]
  );
}

export function getLastRidePoints(session_id: string, count: number): RidePoint[] {
  return db.getAllSync<RidePoint>(
    'SELECT * FROM ride_points WHERE session_id = ? ORDER BY ts DESC LIMIT ?',
    [session_id, count]
  );
}

export function kvDelete(key: string) {
  db.runSync('DELETE FROM kv_store WHERE key = ?', [key]);
}

// Tables are created at module load so kvGet is always safe to call before initDb()
initDb();
