export function computeTrustScore(total, joined) {
  if (total <= 0) return 8.5; // neutral default
  const joinRate = joined / total; // 0..1
  const score = Math.round((6 + joinRate * 4) * 10) / 10; // 6-10 band
  return Math.min(10, Math.max(0, score));
}


