// Pure functions only. No DOM, no localStorage, no Date.now() except as default args.
export const DAY_BOUNDARY_HOUR = 6; // a night "counts" until 6am the next morning

export function effectiveDate(now = new Date()) {
  const shifted = new Date(now.getTime() - DAY_BOUNDARY_HOUR * 3600 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Front-loaded for a 5-year-old's patience: the first night is the hardest
// and gets its own celebration, then milestones widen out.
export const MILESTONES = [
  { threshold: 1, emoji: '🥚', name: 'Baby Egg' },
  { threshold: 3, emoji: '🦎', name: 'Lil Lizard' },
  { threshold: 5, emoji: '🦕', name: 'Bronto Buddy' },
  { threshold: 10, emoji: '🦖', name: 'Rex the Brave' },
  { threshold: 20, emoji: '🐉', name: 'Dragon King' },
];

export function computeStreakState(nights, todayStr) {
  const done = new Set(nights);
  const out = { current: 0, longest: 0, todayDone: done.has(todayStr) };
  if (done.size === 0) return out;

  const first = [...done].sort()[0];
  let streak = 0, best = 0;

  for (let d = first; d <= todayStr; d = addDays(d, 1)) {
    if (done.has(d)) {
      streak += 1;
      if (streak > best) best = streak;
    } else if (d !== todayStr) {
      streak = 0;
    }
  }

  out.current = streak;
  out.longest = best;
  return out;
}

export function newlyUnlockedMilestones(longest, seen) {
  const seenSet = new Set(seen);
  return MILESTONES.filter(m => longest >= m.threshold && !seenSet.has(m.threshold));
}

export function nextMilestone(longest) {
  return MILESTONES.find(m => m.threshold > longest) ?? null;
}

// Rolling 7-night window ending today, for the "very visual" streak row.
// A missed night is "paused" (greyed), never erased from view.
export function last7Nights(nights, todayStr) {
  const done = new Set(nights);
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(todayStr, -i);
    out.push({ date, done: done.has(date), isToday: date === todayStr });
  }
  return out;
}

export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'Not a backup object' };
  if (!Array.isArray(obj.nights)) return { ok: false, error: 'Missing nights array' };
  for (const d of obj.nights) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return { ok: false, error: 'Bad night date' };
    }
  }
  if (obj.seenMilestones !== undefined && !Array.isArray(obj.seenMilestones)) {
    return { ok: false, error: 'Bad seenMilestones' };
  }
  if (obj.settings !== undefined && (typeof obj.settings !== 'object' || obj.settings === null)) {
    return { ok: false, error: 'Bad settings' };
  }
  return { ok: true };
}
