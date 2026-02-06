import { DbItem, getFlagCount } from './db';

const GRAVITY = 1.8;

/**
 * HN ranking algorithm:
 * score = (votes - 1)^0.8 / (age_hours + 2)^gravity
 * 
 * Additional penalties:
 * - Text-only stories (no URL): 0.4x
 * - Flagged stories: 0.1x per flag (heavy penalty)
 */
export function calculateRankScore(item: DbItem, now: Date = new Date()): number {
  const ageMs = now.getTime() - new Date(item.created_at + 'Z').getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  const votes = Math.max(item.score, 1);
  const numerator = Math.pow(votes - 1, 0.8);
  const denominator = Math.pow(ageHours + 2, GRAVITY);
  
  let score = numerator / denominator;
  
  // Penalty for text-only posts (no URL)
  if (!item.url && item.type === 'story') {
    score *= 0.4;
  }
  
  // Penalty for flagged items
  if (item.dead) {
    score *= 0.01;
  }
  
  return score;
}

export function rankStories(items: DbItem[]): DbItem[] {
  const now = new Date();
  return items
    .map(item => ({ item, rankScore: calculateRankScore(item, now) }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .map(({ item }) => item);
}

/**
 * Check if a story should be penalized based on flag count
 * Auto-kill threshold: 5+ flags
 */
export function shouldKill(itemId: number): boolean {
  return getFlagCount(itemId) >= 5;
}
