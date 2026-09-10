import { effectiveDate, computeStreakState, last7Nights, MILESTONES, newlyUnlockedMilestones, nextMilestone, validateBackup } from './logic.js';
import { load, save } from './storage.js';

const DEFAULT_STATE = { nights: [], longest: 0, seenMilestones: [], settings: { sound: true } };

let state = { ...DEFAULT_STATE, ...load('state', DEFAULT_STATE) };
let view = 'today';

const $ = sel => document.querySelector(sel);
const viewToday = $('#view-today');
const viewFriends = $('#view-friends');
const viewSettings = $('#view-settings');
const celebrationEl = $('#celebration');
const modalEl = $('#milestone-modal');

function persist() {
  save('state', state);
}

function todayKey() {
  return effectiveDate();
}

function setView(next) {
  view = next;
  viewToday.classList.toggle('hidden', view !== 'today');
  viewFriends.classList.toggle('hidden', view !== 'friends');
  viewSettings.classList.toggle('hidden', view !== 'settings');
  if (view === 'friends') renderFriends();
  if (view === 'settings') renderSettings();
}

$('#gear-btn').addEventListener('click', () => setView('settings'));

// ---------------- Today view ----------------

function renderToday({ justLogged = false } = {}) {
  const today = todayKey();
  const streak = computeStreakState(state.nights, today);
  const week = last7Nights(state.nights, today);

  const weekHtml = week.map(day => {
    let cls = 'week-day';
    if (day.isToday) {
      cls += day.done ? ' today-done' : ' today-pending';
    } else if (day.done) {
      cls += ' done';
    } else {
      cls += ' missed';
    }
    const icon = day.done ? '🦶' : (day.isToday ? '🌙' : '·');
    return `<div class="${cls}">${icon}</div>`;
  }).join('');

  const showReassurance = !streak.todayDone;

  viewToday.innerHTML = `
    <div id="today-scroll">
      <div class="streak-header">
        <div class="streak-number${justLogged ? ' bump' : ''}">${streak.current}</div>
        <div class="streak-label">night${streak.current === 1 ? '' : 's'} in a row</div>
        <div class="best-badge">Best ever: ${streak.longest} 🏆</div>
      </div>

      <div class="week-row">${weekHtml}</div>

      <div class="big-button-wrap">
        <button id="main-button" class="${streak.todayDone ? 'done' : ''}">
          ${streak.todayDone ? 'See you<br>tomorrow!<br>🌙' : 'I stayed in<br>MY bed!<br>🦕'}
        </button>
        ${showReassurance ? `<div class="reassurance">Dino is watching over your room tonight 🦕🌙</div>` : ''}
        <button class="friends-nav-btn" id="friends-nav">🦕 My Dino Friends</button>
      </div>
    </div>
  `;

  $('#main-button').addEventListener('click', handleTap);
  $('#friends-nav').addEventListener('click', () => setView('friends'));
}

function handleTap() {
  const today = todayKey();
  if (state.nights.includes(today)) return;

  state.nights = [...state.nights, today].sort();
  const streak = computeStreakState(state.nights, today);
  if (streak.longest > state.longest) state.longest = streak.longest;
  persist();

  celebrate();

  const unlocked = newlyUnlockedMilestones(state.longest, state.seenMilestones);
  if (unlocked.length > 0) {
    const toShow = unlocked[unlocked.length - 1];
    state.seenMilestones = [...state.seenMilestones, ...unlocked.map(m => m.threshold)];
    persist();
    setTimeout(() => showMilestoneModal(toShow), 650);
  }

  renderToday({ justLogged: true });
}

// ---------------- Celebration ----------------

function celebrate() {
  const colors = ['#1fa64c', '#ffb400', '#ff6f61', '#3d7dd8', '#eafff0'];
  celebrationEl.classList.remove('hidden');
  celebrationEl.innerHTML = '';
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${1.1 + Math.random() * 0.9}s`;
    piece.style.animationDelay = `${Math.random() * 0.15}s`;
    celebrationEl.appendChild(piece);
  }
  setTimeout(() => { celebrationEl.classList.add('hidden'); celebrationEl.innerHTML = ''; }, 2200);

  if (state.settings.sound) playRoar();
  if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
}

let audioCtx = null;
function playRoar() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch {
    // audio not available; celebration still works visually
  }
}

function showMilestoneModal(milestone) {
  modalEl.classList.remove('hidden');
  modalEl.innerHTML = `
    <div class="milestone-card">
      <span class="milestone-emoji">${milestone.emoji}</span>
      <div class="milestone-title">${milestone.name}</div>
      <div class="milestone-sub">New dino friend unlocked!<br>${milestone.threshold} night${milestone.threshold === 1 ? '' : 's'} in your own bed 🎉</div>
      <button class="milestone-close" id="milestone-close">Yay!</button>
    </div>
  `;
  $('#milestone-close').addEventListener('click', () => modalEl.classList.add('hidden'));
}

// ---------------- Friends view ----------------

function renderFriends() {
  const cards = MILESTONES.map(m => {
    const unlocked = state.longest >= m.threshold;
    return `
      <div class="friend-card ${unlocked ? '' : 'locked'}">
        <div class="friend-emoji">${unlocked ? m.emoji : '❓'}</div>
        <div class="friend-name">${unlocked ? m.name : '???'}</div>
        <div class="friend-req">${unlocked ? 'Unlocked!' : `${m.threshold} nights`}</div>
      </div>
    `;
  }).join('');

  viewFriends.innerHTML = `
    <div class="friends-header">
      <button class="back-btn" id="friends-back">← Back</button>
      <div class="friends-title">🦕 Dino Friends</div>
    </div>
    <div class="friends-grid">${cards}</div>
  `;
  $('#friends-back').addEventListener('click', () => setView('today'));
}

// ---------------- Settings view (parent only) ----------------

function renderSettings() {
  const today = todayKey();
  const hasToday = state.nights.includes(today);

  viewSettings.innerHTML = `
    <div class="friends-header">
      <button class="back-btn" id="settings-back">← Back</button>
      <div class="friends-title">Parent Settings</div>
    </div>
    <div class="settings-body">
      <div class="settings-row">
        <span>Celebration sound</span>
        <button class="toggle ${state.settings.sound ? 'on' : ''}" id="sound-toggle" aria-label="Toggle sound"></button>
      </div>
      <div class="settings-row">
        <span>${hasToday ? "Undo tonight's tap" : 'Add tonight manually'}</span>
        <button class="settings-btn" id="manual-toggle">${hasToday ? 'Undo' : 'Add'}</button>
      </div>
      <div class="settings-row">
        <span>Backup</span>
        <button class="settings-btn" id="export-btn">Export</button>
      </div>
      <div class="settings-row">
        <span>Restore</span>
        <label class="settings-btn" for="import-input" style="cursor:pointer;">Import</label>
        <input type="file" id="import-input" accept="application/json" class="hidden">
      </div>
      <div class="settings-row">
        <span>Reset streak</span>
        <button class="settings-btn danger" id="reset-btn">Reset</button>
      </div>
      <div class="settings-row">
        <span>Erase everything (start fresh)</span>
        <button class="settings-btn danger" id="erase-all-btn">Erase all</button>
      </div>
      <div class="settings-note">Nights logged: ${state.nights.length} · Longest streak: ${state.longest}<br>Day rolls over at 6am.<br><br>"Reset streak" clears the current run but keeps the best-ever record. "Erase everything" wipes the record and all dino friends too — good for clearing out test taps before Oskar's first real night.</div>
    </div>
  `;

  $('#settings-back').addEventListener('click', () => setView('today'));

  $('#sound-toggle').addEventListener('click', () => {
    state.settings.sound = !state.settings.sound;
    persist();
    renderSettings();
  });

  $('#manual-toggle').addEventListener('click', () => {
    if (hasToday) {
      state.nights = state.nights.filter(d => d !== today);
    } else {
      state.nights = [...state.nights, today].sort();
    }
    const streak = computeStreakState(state.nights, today);
    if (streak.longest > state.longest) state.longest = streak.longest;
    persist();
    renderSettings();
  });

  $('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oskar-own-bed-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  $('#import-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      const result = validateBackup(obj);
      if (!result.ok) {
        alert(`Couldn't import backup: ${result.error}`);
        return;
      }
      state = {
        nights: [...new Set(obj.nights)].sort(),
        longest: 0,
        seenMilestones: obj.seenMilestones ?? [],
        settings: { ...DEFAULT_STATE.settings, ...(obj.settings ?? {}) },
      };
      const streak = computeStreakState(state.nights, todayKey());
      state.longest = Math.max(streak.longest, ...(state.nights.length ? [streak.longest] : [0]));
      persist();
      renderSettings();
      alert('Backup imported!');
    } catch {
      alert("Couldn't read that file.");
    }
  });

  $('#reset-btn').addEventListener('click', () => {
    if (!confirm("Reset Oskar's streak? This clears all logged nights (best-ever record is kept).")) return;
    const keepLongest = state.longest;
    state = { ...DEFAULT_STATE, settings: state.settings, longest: keepLongest, seenMilestones: state.seenMilestones };
    persist();
    renderSettings();
  });

  $('#erase-all-btn').addEventListener('click', () => {
    if (!confirm('Erase EVERYTHING? This wipes all nights, the best-ever record, and every dino friend. There is no undo — use Export first if you want a backup.')) return;
    state = { ...DEFAULT_STATE, settings: state.settings };
    persist();
    renderSettings();
  });
}

// ---------------- Boot ----------------

renderToday();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
