export type Criteria = {
  clarity: number;
  context: number;
  constraints: number;
  specificity: number;
  output_format: number;
};

export function xpForAttempt(score: number, difficulty: number) {
  return Math.round(score * difficulty / 10);
}

export function xpForRepeat(score: number, difficulty: number, previousBestScore: number | null) {
  const earned = xpForAttempt(score, difficulty);
  return Math.max(0, earned - (previousBestScore === null ? 0 : xpForAttempt(previousBestScore, difficulty)));
}

export function levelForXp(xp: number) {
  return Math.floor(Math.max(0, xp) / 100) + 1;
}

export function xpProgress(xp: number) {
  return Math.max(0, xp) % 100;
}

export function nextStreak(lastActive: string | null, today = new Date().toISOString().slice(0, 10)) {
  if (!lastActive) return 1;
  if (lastActive === today) return null;
  const yesterday = new Date(`${today}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return lastActive === yesterday.toISOString().slice(0, 10) ? "increment" : 1;
}
