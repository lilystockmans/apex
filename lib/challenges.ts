import { supabase } from './supabase';

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  metric: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface ChallengeEntry {
  challenge_id: string;
  user_id: string;
  score: number | null;
  ride_count: number;
  updated_at: string;
  profiles?: { username: string; current_level: string };
}

export async function getActiveChallenge(): Promise<Challenge | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .single();
  return data ?? null;
}

export async function updateChallengeEntry(
  challengeId: string,
  userId: string,
  score: number,
  rideCount: number
) {
  await supabase.from('challenge_entries').upsert({
    challenge_id: challengeId,
    user_id: userId,
    score,
    ride_count: rideCount,
    updated_at: new Date().toISOString(),
  });
}

export async function getChallengeLeaderboard(challengeId: string): Promise<ChallengeEntry[]> {
  const { data } = await supabase
    .from('challenge_entries')
    .select('*, profiles(username, current_level)')
    .eq('challenge_id', challengeId)
    .order('score', { ascending: false })
    .limit(50);
  return (data as ChallengeEntry[]) ?? [];
}
