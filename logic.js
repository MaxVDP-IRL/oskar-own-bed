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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function daysBefore(earlier, later) {
  const [y1, m1, d1] = earlier.split('-').map(Number);
  const [y2, m2, d2] = later.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function formatDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// Same shape as the goal tracker: Today / Yesterday / the date, with a
// "tap for today" hint once you have stepped off tonight.
export function dayNavLabel(dateStr, todayStr) {
  const dateText = formatDay(dateStr);
  if (dateStr === todayStr) return { title: 'Today', sub: dateText };
  if (dateStr === addDays(todayStr, -1)) {
    return { title: 'Yesterday', sub: `${dateText} · tap for today` };
  }
  const n = daysBefore(dateStr, todayStr);
  const unit = n === 1 ? 'night' : 'nights';
  return { title: dateText, sub: `${n} ${unit} ago · tap for today` };
}

// Today and any earlier night can be logged. Tomorrow cannot.
// No lower bound — same rule as the goal tracker and the bench tracker.
export function canLogDate(dateStr, todayStr) {
  return typeof dateStr === 'string'
    && typeof todayStr === 'string'
    && ISO_DATE.test(dateStr)
    && ISO_DATE.test(todayStr)
    && dateStr <= todayStr;
}

// Add or remove one night. Other nights stay put, including any date that
// is already in the list, so a correction cannot drop history.
// Streaks are not stored here — callers recompute them from the result.
export function applyNight(nights, todayStr, dateStr, stayed) {
  if (!Array.isArray(nights)) return { ok: false, error: 'Missing nights array', nights: [] };
  if (typeof stayed !== 'boolean') return { ok: false, error: 'Need a yes or no', nights };
  if (!canLogDate(dateStr, todayStr)) {
    return { ok: false, error: 'Only today or a past night can be logged', nights };
  }
  const has = nights.some(d => d === dateStr);
  if (stayed === has) return { ok: true, changed: false, nights };
  const next = stayed
    ? [...new Set([...nights, dateStr])].sort()
    : nights.filter(d => d !== dateStr);
  return { ok: true, changed: true, nights: next };
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

// Best-ever only moves up. Reset and a mistaken undo keep dino friends
// the child already earned; a backfilled gap can still set a new record.
export function keptLongest(storedLongest, nights, todayStr) {
  const computed = computeStreakState(nights, todayStr).longest;
  const stored = Number.isFinite(storedLongest) ? storedLongest : 0;
  return Math.max(stored, computed);
}

export function newlyUnlockedMilestones(longest, seen) {
  const seenSet = new Set(seen);
  return MILESTONES.filter(m => longest >= m.threshold && !seenSet.has(m.threshold));
}

export function nextMilestone(longest) {
  return MILESTONES.find(m => m.threshold > longest) ?? null;
}

// Seven-night window ending on endStr, for the footprint row.
// A missed night is "paused" (greyed), never erased from view.
// Pass the real today separately when the window ends on an earlier night,
// so only the true today is marked.
export function last7Nights(nights, endStr, todayStr = endStr) {
  const done = new Set(nights);
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(endStr, -i);
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
