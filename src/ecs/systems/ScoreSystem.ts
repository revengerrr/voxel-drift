// commit: feat(score): implement score tracking and efficiency calculation
// description: Tracks player performance metrics each tick: manual vs
// automated harvesting, planets explored, active drones, and elapsed
// time. Computes automation ratio (the key leaderboard metric).
// Provides snapshot function for leaderboard submission.

import { players, drones } from "../world";
import { DroneState } from "../components";

/**
 * ScoreSystem — runs each physics tick.
 * Updates the player's Score component with current stats.
 */
export function scoreSystem(dt: number): void {
  for (const entity of players.entities) {
    const { score } = entity;
    if (!score) continue;

    // Count active drones
    let activeDroneCount = 0;
    for (const drone of drones.entities) {
      if (
        drone.drone &&
        drone.drone.state !== DroneState.Idle &&
        drone.drone.state !== DroneState.Error
      ) {
        activeDroneCount++;
      }
    }
    score.activeDrones = activeDroneCount;

    // Update elapsed time
    score.elapsedTime += dt;

    // Compute automation ratio
    const totalHarvest = score.manualHarvest + score.automatedHarvest;
    score.automationRatio =
      totalHarvest > 0 ? score.automatedHarvest / totalHarvest : 0;
  }
}

/** Snapshot score for leaderboard submission */
export interface ScoreSnapshot {
  manualHarvest: number;
  automatedHarvest: number;
  planetsExplored: number;
  activeDrones: number;
  automationRatio: number;
  elapsedTime: number;
  /** Composite score: weighted sum */
  totalScore: number;
}

export function getScoreSnapshot(): ScoreSnapshot | null {
  const player = players.entities[0];
  if (!player?.score) return null;

  const s = player.score;

  // Composite score formula:
  // - Automated harvest weighted 2x (reward automation)
  // - Automation ratio bonus (0-100% → 0-500 points)
  // - Time penalty (faster = better)
  const timePenalty = Math.max(0, 1 - s.elapsedTime / 3600); // decays over 1 hour
  const totalScore = Math.round(
    s.automatedHarvest * 2 +
      s.manualHarvest * 1 +
      s.automationRatio * 500 +
      s.planetsExplored * 100 +
      timePenalty * 200
  );

  return {
    manualHarvest: s.manualHarvest,
    automatedHarvest: s.automatedHarvest,
    planetsExplored: s.planetsExplored,
    activeDrones: s.activeDrones,
    automationRatio: Math.round(s.automationRatio * 100) / 100,
    elapsedTime: Math.round(s.elapsedTime),
    totalScore,
  };
}
