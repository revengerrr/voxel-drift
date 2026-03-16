// commit: feat(backend): add Supabase client and leaderboard API
// description: Initializes Supabase client for leaderboard persistence.
// Provides functions to submit scores and fetch the global leaderboard.
// Uses anon key (public) — Row Level Security on Supabase handles auth.
// Falls back gracefully if Supabase is not configured (offline mode).

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { ScoreSnapshot } from "../ecs/systems/ScoreSystem";

// ─── Types ────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: number;
  player_name: string;
  total_score: number;
  automation_ratio: number;
  automated_harvest: number;
  planets_explored: number;
  active_drones: number;
  elapsed_time: number;
  created_at: string;
}

// ─── Client Setup ─────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[Supabase] No credentials — running in offline mode");
    return null;
  }

  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return supabase;
}

// ─── Leaderboard API ──────────────────────────────────────────

/**
 * Submit a score to the global leaderboard.
 */
export async function submitScore(
  playerName: string,
  snapshot: ScoreSnapshot
): Promise<{ success: boolean; error?: string }> {
  const client = getClient();
  if (!client) {
    return { success: false, error: "Offline mode — score not submitted" };
  }

  const { error } = await client.from("leaderboard").insert({
    player_name: playerName,
    total_score: snapshot.totalScore,
    automation_ratio: snapshot.automationRatio,
    automated_harvest: snapshot.automatedHarvest,
    manual_harvest: snapshot.manualHarvest,
    planets_explored: snapshot.planetsExplored,
    active_drones: snapshot.activeDrones,
    elapsed_time: snapshot.elapsedTime,
  });

  if (error) {
    console.error("[Supabase] Submit error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fetch top N scores from the leaderboard.
 */
export async function fetchLeaderboard(
  limit: number = 20
): Promise<LeaderboardEntry[]> {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from("leaderboard")
    .select("*")
    .order("total_score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Supabase] Fetch error:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Fetch player's personal best score.
 */
export async function fetchPersonalBest(
  playerName: string
): Promise<LeaderboardEntry | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from("leaderboard")
    .select("*")
    .eq("player_name", playerName)
    .order("total_score", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}
