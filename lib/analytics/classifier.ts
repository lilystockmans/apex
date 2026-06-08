import { RidePoint } from '../../types/ride';

export type RoadType = 'urban' | 'twisty' | 'highway' | 'mixed';

export function classifyRoad(points: RidePoint[]): RoadType {
  if (points.length < 10) return 'mixed';

  const speeds = points.map(p => p.speed_mps * 3.6); // km/h
  const avgSpeed = speeds.reduce((s, v) => s + v, 0) / speeds.length;

  let headingChanges = 0;
  for (let i = 2; i < points.length; i++) {
    const b1 = bearing(points[i - 2], points[i - 1]);
    const b2 = bearing(points[i - 1], points[i]);
    headingChanges += Math.abs(angleDiff(b1, b2));
  }
  const avgHeadingChange = headingChanges / (points.length - 2);

  if (avgSpeed < 30) return 'urban';
  if (avgSpeed > 90 && avgHeadingChange < 5) return 'highway';
  if (avgHeadingChange > 15) return 'twisty';
  return 'mixed';
}

function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x) * 180 / Math.PI;
}

function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}
