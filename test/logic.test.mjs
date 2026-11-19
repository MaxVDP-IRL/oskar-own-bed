import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  applyNight,
  canLogDate,
  computeStreakState,
  dayNavLabel,
  effectiveDate,
  keptLongest,
  last7Nights,
  newlyUnlockedMilestones,
  validateBackup,
} from '../logic.js';

test('effective date rolls at 6am local time', () => {
  assert.equal(effectiveDate(new Date(2026, 10, 19, 5, 59)), '2026-11-18');
  assert.equal(effectiveDate(new Date(2026, 10, 19, 6, 0)), '2026-11-19');
});

test('canLogDate: today and any past night are loggable, the future is not', () => {
  assert.equal(canLogDate('2026-11-19', '2026-11-19'), true);
  assert.equal(canLogDate('2026-11-18', '2026-11-19'), true);
  assert.equal(canLogDate('2020-01-01', '2026-11-19'), true);
  assert.equal(canLogDate('2026-11-20', '2026-11-19'), false);
  assert.equal(canLogDate('2026-11-19', '2026-11-20'), true);
  assert.equal(canLogDate('2026-11-9', '2026-11-19'), false);
  assert.equal(canLogDate('2026-11-19', 'today'), false);
  assert.equal(canLogDate(undefined, '2026-11-19'), false);
});

test('day nav labels match Today / Yesterday / nights ago', () => {
  assert.deepEqual(dayNavLabel('2026-11-19', '2026-11-19'), {
    title: 'Today',
    sub: 'Thu, 19 Nov 2026',
  });
  assert.deepEqual(dayNavLabel('2026-11-18', '2026-11-19'), {
    title: 'Yesterday',
    sub: 'Wed, 18 Nov 2026 · tap for today',
  });
  assert.deepEqual(dayNavLabel('2026-11-16', '2026-11-19'), {
    title: 'Mon, 16 Nov 2026',
    sub: '3 nights ago · tap for today',
  });
});

test('backfill: filling the gap that broke a streak restores it, including today', () => {
  const today = '2026-11-19';
  const nights = ['2026-11-16', '2026-11-17', '2026-11-19']; // 18th missing
  const before = computeStreakState(nights, today);
  assert.equal(before.current, 1);
  assert.equal(before.longest, 2);
  assert.equal(before.todayDone, true);

  const filled = applyNight(nights, today, '2026-11-18', true);
  assert.equal(filled.ok, true);
  assert.equal(filled.changed, true);
  assert.deepEqual(filled.nights, ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']);
  assert.deepEqual(nights, ['2026-11-16', '2026-11-17', '2026-11-19']);

  const after = computeStreakState(filled.nights, today);
  assert.equal(after.current, 4);
  assert.equal(after.longest, 4);
  assert.equal(after.todayDone, true);
  assert.equal(keptLongest(before.longest, filled.nights, today), 4);

  const unlocked = newlyUnlockedMilestones(after.longest, [1]);
  assert.deepEqual(unlocked.map(m => m.threshold), [3]);
});

test('backfill: filling yesterday counts toward the streak while today is still open', () => {
  const today = '2026-11-19';
  const nights = ['2026-11-16', '2026-11-17'];
  assert.equal(computeStreakState(nights, today).current, 0);

  const filled = applyNight(nights, today, '2026-11-18', true);
  const after = computeStreakState(filled.nights, today);
  assert.equal(after.current, 3);
  assert.equal(after.todayDone, false);
  assert.equal(after.longest, 3);
});

test('backfill: a month boundary gap joins the streak', () => {
  const today = '2026-02-02';
  const nights = ['2026-01-30', '2026-01-31', '2026-02-02'];
  assert.equal(computeStreakState(nights, today).current, 1);
  const filled = applyNight(nights, today, '2026-02-01', true);
  assert.equal(computeStreakState(filled.nights, today).current, 4);
});

test('backfill: undoing the filled night breaks the streak again and keeps earlier nights', () => {
  const today = '2026-11-19';
  const filled = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'];
  const undone = applyNight(filled, today, '2026-11-18', false);
  assert.deepEqual(undone.nights, ['2026-11-16', '2026-11-17', '2026-11-19']);
  const streak = computeStreakState(undone.nights, today);
  assert.equal(streak.current, 1);
  assert.equal(streak.longest, 2);
  // Dino friends stay once earned, same as undoing tonight.
  assert.equal(keptLongest(4, undone.nights, today), 4);
});

test('backfill: a future night is rejected and the log is left untouched', () => {
  const nights = ['2026-11-17'];
  const rejected = applyNight(nights, '2026-11-19', '2026-11-20', true);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.nights, nights);
  assert.equal(computeStreakState(rejected.nights, '2026-11-19').longest, 1);

  const bad = applyNight(nights, '2026-11-19', '2026-11-18', 'yes');
  assert.deepEqual(bad, { ok: false, error: 'Need a yes or no', nights });
  assert.equal(applyNight(null, '2026-11-19', '2026-11-18', true).ok, false);
});

test('backfill: logging today is allowed, and repeating a mark is a no-op', () => {
  const added = applyNight([], '2026-11-19', '2026-11-19', true);
  assert.equal(added.ok, true);
  assert.deepEqual(added.nights, ['2026-11-19']);
  assert.equal(computeStreakState(added.nights, '2026-11-19').todayDone, true);

  const again = applyNight(added.nights, '2026-11-19', '2026-11-19', true);
  assert.equal(again.changed, false);
  assert.equal(again.nights, added.nights);

  const missing = applyNight(added.nights, '2026-11-19', '2026-11-18', false);
  assert.equal(missing.changed, false);
  assert.equal(missing.nights, added.nights);
});

test('backfill: other nights, including one already in the future, stay in the log', () => {
  const nights = ['2026-11-20', '2026-11-16', '2026-11-16'];
  const filled = applyNight(nights, '2026-11-19', '2026-11-18', true);
  assert.deepEqual(filled.nights, ['2026-11-16', '2026-11-18', '2026-11-20']);
  assert.equal(computeStreakState(filled.nights, '2026-11-19').todayDone, false);
});

test('backfill: a night years ago still saves, with no lower bound', () => {
  const filled = applyNight([], '2026-11-19', '2020-01-01', true);
  assert.equal(filled.ok, true);
  assert.deepEqual(filled.nights, ['2020-01-01']);
  const streak = computeStreakState(filled.nights, '2026-11-19');
  assert.equal(streak.current, 0);
  assert.equal(streak.longest, 1);
  assert.equal(keptLongest(0, filled.nights, '2026-11-19'), 1);
});

test('footprint window shows a filled gap and only marks the real today', () => {
  const nights = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'];
  const home = last7Nights(nights, '2026-11-19');
  assert.equal(home.at(-1).date, '2026-11-19');
  assert.equal(home.at(-1).isToday, true);
  assert.equal(home.at(-1).done, true);
  assert.equal(home.find(d => d.date === '2026-11-18').done, true);
  assert.equal(home[0].date, addDays('2026-11-19', -6));

  const earlier = last7Nights(['2026-11-12'], '2026-11-14', '2026-11-19');
  assert.equal(earlier.some(d => d.isToday), false);
  assert.equal(earlier.at(-1).date, '2026-11-14');
  assert.equal(earlier.find(d => d.date === '2026-11-12').done, true);
  assert.equal(earlier.find(d => d.date === '2026-11-13').done, false);
});

test('legacy saved state still validates and still computes the same streak', () => {
  const legacy = {
    nights: ['2026-11-01', '2026-11-02', '2026-11-03'],
    longest: 3,
    seenMilestones: [1, 3],
    settings: { sound: false },
  };
  assert.equal(validateBackup(legacy).ok, true);
  assert.equal(computeStreakState(legacy.nights, '2026-11-03').current, 3);
  assert.equal(computeStreakState(legacy.nights, '2026-11-04').current, 3);
  assert.equal(computeStreakState(legacy.nights, '2026-11-04').todayDone, false);
  assert.equal(keptLongest(legacy.longest, legacy.nights, '2026-11-04'), 3);

  const defaults = { nights: [], longest: 0, seenMilestones: [], settings: { sound: true } };
  const booted = { ...defaults, ...legacy, extraNote: 'kept-by-spread' };
  const saved = { ...legacy, extraNote: 'kept-by-spread' };
  const loaded = { ...defaults, ...saved };
  assert.deepEqual(loaded.nights, legacy.nights);
  assert.equal(loaded.longest, 3);
  assert.deepEqual(loaded.seenMilestones, [1, 3]);
  assert.equal(loaded.settings.sound, false);
  assert.equal(loaded.extraNote, 'kept-by-spread');
  assert.equal(booted.extraNote, 'kept-by-spread');
});
