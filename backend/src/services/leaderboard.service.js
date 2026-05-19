/**
 * Leaderboard Service
 * Uses Redis Sorted Sets keyed by date.
 * Each day's leaderboard key has a TTL that expires at end of day UTC.
 */

const redis = require('../config/redis');

const LEADERBOARD_PREFIX = 'sudoku:lb:';
const MAX_ENTRIES = 500;

/**
 * Get the Redis key for a given date
 */
function leaderboardKey(dateStr) {
  return `${LEADERBOARD_PREFIX}${dateStr}`;
}

/**
 * Compute seconds until end of the current UTC day
 */
function secondsUntilEndOfDay() {
  const now = new Date();
  const endOfDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59
  ));
  return Math.max(1, Math.floor((endOfDay - now) / 1000));
}

/**
 * Submit a score to the leaderboard.
 * @param {string} dateStr   - YYYY-MM-DD
 * @param {string} username  - player name
 * @param {number} timeMs    - time taken in milliseconds
 */
async function submitScore(dateStr, username, timeMs) {
  const key = leaderboardKey(dateStr);
  const ttl = secondsUntilEndOfDay();

  // Store username -> best time (lower is better, use score = timeMs)
  // Redis ZADD NX only adds if not exists; we want to keep best time
  // Use ZADD with LT flag to only update if new score is lower
  const existing = await redis.zscore(key, username);
  if (existing === null || parseFloat(existing) > timeMs) {
    await redis.zadd(key, timeMs, username);
  }

  // Ensure TTL is always refreshed
  await redis.expire(key, ttl);

  // Trim to top MAX_ENTRIES if needed
  const count = await redis.zcard(key);
  if (count > MAX_ENTRIES) {
    await redis.zremrangebyrank(key, MAX_ENTRIES, -1);
  }
}

/**
 * Get the full leaderboard for a date, sorted by time ascending then name ascending.
 * Returns array of { rank, username, timeMs }
 */
async function getLeaderboard(dateStr) {
  const key = leaderboardKey(dateStr);
  // ZRANGE with WITHSCORES returns [member, score, member, score, ...]
  const raw = await redis.zrange(key, 0, -1, 'WITHSCORES');

  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({
      username: raw[i],
      timeMs: parseFloat(raw[i + 1]),
    });
  }

  // Sort: primary by timeMs ascending, secondary by username alphabetically
  entries.sort((a, b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    return a.username.localeCompare(b.username);
  });

  return entries.map((e, idx) => ({ rank: idx + 1, ...e }));
}

/**
 * Check if a username already has a score for today
 */
async function getUserScore(dateStr, username) {
  const key = leaderboardKey(dateStr);
  const score = await redis.zscore(key, username);
  return score !== null ? parseFloat(score) : null;
}

module.exports = { submitScore, getLeaderboard, getUserScore };
