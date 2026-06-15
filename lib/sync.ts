import { supabase } from './supabase';
import { getRideSessions, getRidePoints, kvGet, kvSet } from './storage';
import { RideSession } from '../types/ride';

const SYNC_BATCH_SIZE = 10;

export async function syncRides() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const userId = sessionData.session.user.id;
  const lastSync = parseInt(kvGet('last_sync_ts') ?? '0');

  const localRides = getRideSessions().filter(r => r.started_at > lastSync);
  const toSync = localRides.slice(0, SYNC_BATCH_SIZE);

  for (const ride of toSync) {
    await uploadRide(ride, userId);
  }

  kvSet('last_sync_ts', Date.now().toString());
}

async function uploadRide(ride: RideSession, userId: string) {
  const { error } = await supabase.from('rides').upsert({
    id: ride.id,
    user_id: userId,
    started_at: new Date(ride.started_at).toISOString(),
    ended_at: ride.ended_at ? new Date(ride.ended_at).toISOString() : null,
    distance_m: ride.distance_m,
    duration_s: ride.duration_s,
  });

  if (error) {
    console.error('[SYNC] Failed to upload ride:', error.message);
    return;
  }

  const points = getRidePoints(ride.id);
  // Downsample to ~1Hz (local data is 10Hz)
  const downsampled = points.filter((_, i) => i % 10 === 0);

  if (downsampled.length > 0) {
    await supabase.from('ride_points').upsert(
      downsampled.map(p => ({
        ride_id: ride.id,
        ts: p.ts,
        lat: p.lat,
        lon: p.lon,
        speed_mps: p.speed_mps,
      }))
    );
  }
}

export async function syncWithRetry(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await syncRides();
      return;
    } catch (e) {
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
}
