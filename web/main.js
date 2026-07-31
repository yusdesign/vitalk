// --- 🌱 Vitalk Web ---
// Adapted from src/main.js — web version using localStorage

console.log('🌱 Vitalk Web starting...');

// --- Reuse STATS object (same as Android) ---
const STATS = {
  total: 0,
  unique: 0,
  longest: '',
  lengths: {},
  milestones: { 100: false, 500: false, 1000: false, 5000: false, 10000: false }
};

// --- DOM refs (simplified — no settings drawer) ---
const statusEl = document.getElementById('status');
const statsContainer = document.getElementById('stats-container');

// --- Web-specific: Load from localStorage ---
function loadFromLocalStorage() {
  const keys = ['foundWords', 'missedWords', 'currentGameMode'];
  let found = [];
  let missed = [];
  let mode = { name: 'Sprint', time: 180, board: '4x4' };

  try {
    const foundData = localStorage.getItem('foundWords');
    if (foundData) {
      const parsed = JSON.parse(foundData);
      if (Array.isArray(parsed)) found = parsed;
    }
  } catch (e) { /* ignore */ }

  try {
    const missedData = localStorage.getItem('missedWords');
    if (missedData) {
      const parsed = JSON.parse(missedData);
      if (Array.isArray(parsed)) missed = parsed;
    }
  } catch (e) { /* ignore */ }

  try {
    const modeData = localStorage.getItem('currentGameMode');
    if (modeData) {
      const parsed = JSON.parse(modeData);
      if (parsed.name) mode.name = parsed.name;
      if (parsed.time) mode.time = parsed.time;
      if (parsed.board) mode.board = parsed.board;
    }
  } catch (e) { /* ignore */ }

  // Fallback: scan all keys
  if (found.length === 0 && missed.length === 0) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.every(w => typeof w === 'string')) {
          if (key.toLowerCase().includes('found')) found = parsed;
          else if (key.toLowerCase().includes('miss')) missed = parsed;
          else if (found.length === 0) found = parsed;
        }
      } catch (e) { /* ignore */ }
    }
  }

  return { found, missed, mode };
}

// --- Process Words (EXACTLY the same as Android) ---
function processWords(words) {
  console.log(`Processing ${words.length} words...`);
  const unique = new Set(words);
  STATS.total = words.length;
  STATS.unique = unique.size;
  STATS.longest = words.reduce((a, b) => a.length >= b.length ? a : b, '');

  const lengths = {};
  words.forEach(w => { lengths[w.length] = (lengths[w.length] || 0) + 1; });
  STATS.lengths = lengths;

  Object.keys(STATS.milestones).forEach(m => {
    STATS.milestones[m] = STATS.total >= parseInt(m);
  });

  renderStats();
  statusEl.textContent = `✅ Loaded ${words.length} words from web-lexica`;
  statsContainer.classList.remove('hidden');
}

// --- Render Stats (ADAPTED from Android — uses same logic) ---
function renderStats() {
  // Words today
  const wordsToday = document.querySelector('#words-today');
  if (wordsToday) wordsToday.textContent = STATS.total || '0';

  // Streak (not available in web version)
  const streak = document.querySelector('#streak');
  if (streak) streak.textContent = '—';

  // Total
  const total = document.querySelector('#total');
  if (total) total.textContent = STATS.total || '0';

  // Longest
  const longest = document.querySelector('#longest');
  if (longest) longest.textContent = STATS.longest || '—';

  // Milestones
  const milestoneList = document.querySelector('#milestone-list');
  if (milestoneList) {
    milestoneList.innerHTML = '';
    Object.entries(STATS.milestones).forEach(([m, done]) => {
      const li = document.createElement('li');
      li.textContent = `${done ? '✅' : '⬜'} ${m} words`;
      li.className = done ? 'done' : '';
      milestoneList.appendChild(li);
    });
  }

  // Length bars
  const lengthBars = document.querySelector('#length-bars');
  if (lengthBars) {
    lengthBars.innerHTML = '';
    const max = Math.max(...Object.values(STATS.lengths), 1);
    Object.entries(STATS.lengths)
      .sort((a, b) => a[0] - b[0])
      .forEach(([len, count]) => {
        const pct = (count / max) * 100;
        const row = document.createElement('div');
        row.className = 'bar-row';
        row.innerHTML = `
          <span class="bar-label">${len} letters</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <span class="bar-value">${count}</span>
        `;
        lengthBars.appendChild(row);
      });
  }
}

// --- Demo mode (fallback) ---
function loadDemo() {
  const demo = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape'];
  processWords(demo);
  statusEl.textContent = '📝 Loaded demo words (not from web-lexica)';
}

// --- Start ---
const data = loadFromLocalStorage();
if (data.found.length > 0) {
  processWords(data.found);
  // Show missed words if available (optional)
  if (data.missed.length > 0) {
    console.log(`Missed ${data.missed.length} words`);
  }
} else {
  statusEl.innerHTML = `
    ⚠️ No wordlist found in localStorage.<br>
    <small>Play a game on <a href="https://lexica.github.io/web-lexica/" target="_blank" style="color:#7ae0c0;">web-lexica</a> first, then reload this page.</small>
    <br><br>
    <button class="btn" id="demo-btn">📝 Load Demo Words</button>
  `;
  document.getElementById('demo-btn')?.addEventListener('click', loadDemo);
}
