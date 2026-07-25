import { Filesystem, Directory } from '@capacitor/filesystem';

const STATS = {
  total: 0,
  unique: 0,
  longest: '',
  lengths: {},
  milestones: { 100: false, 500: false, 1000: false, 5000: false, 10000: false }
};

async function loadWordlist() {
  try {
    // Read from Lexica's folder (Android 11+ scoped storage)
    const result = await Filesystem.readFile({
      path: 'Android/data/com.lexica.app/files/wordlist_user.txt',
      directory: Directory.ExternalStorage
    });

    const text = new TextDecoder().decode(result.data);
    const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);

    processWords(words);
  } catch (e) {
    document.querySelector('#words-today').textContent = '⚠️';
    document.querySelector('#total').textContent = 'No file';
    console.warn('Lexica wordlist not found:', e);
  }
}

function processWords(words) {
  const unique = new Set(words);
  STATS.total = words.length;
  STATS.unique = unique.size;
  STATS.longest = words.reduce((a, b) => a.length >= b.length ? a : b, '');

  // Length distribution
  const lengths = {};
  words.forEach(w => { lengths[w.length] = (lengths[w.length] || 0) + 1; });
  STATS.lengths = lengths;

  // Milestones
  Object.keys(STATS.milestones).forEach(m => {
    STATS.milestones[m] = STATS.total >= parseInt(m);
  });

  renderStats();
}

function renderStats() {
  document.querySelector('#words-today').textContent = STATS.total || '0';
  document.querySelector('#streak').textContent = '—'; // Placeholder
  document.querySelector('#total').textContent = STATS.total || '0';
  document.querySelector('#longest').textContent = STATS.longest || '—';

  // Milestones
  const list = document.querySelector('#milestone-list');
  list.innerHTML = '';
  Object.entries(STATS.milestones).forEach(([m, done]) => {
    const li = document.createElement('li');
    li.textContent = `${done ? '✅' : '⬜'} ${m} words`;
    li.className = done ? 'done' : '';
    list.appendChild(li);
  });

  // Length bars
  const container = document.querySelector('#length-bars');
  container.innerHTML = '';
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
      container.appendChild(row);
    });
}

// Export/Import (no cloud)
document.querySelector('#export-btn').addEventListener('click', async () => {
  const blob = new Blob([JSON.stringify(STATS, null, 2)], { type: 'application/json' });
  // Use Capacitor Filesystem to write to Downloads
  await Filesystem.writeFile({
    path: 'Download/vitalk_backup.json',
    data: await blob.text(),
    directory: Directory.ExternalStorage
  });
  alert('✅ Backup saved to Downloads/vitalk_backup.json');
});

document.querySelector('#import-btn').addEventListener('click', async () => {
  const result = await Filesystem.readFile({
    path: 'Download/vitalk_backup.json',
    directory: Directory.ExternalStorage
  });
  const data = JSON.parse(result.data);
  Object.assign(STATS, data);
  renderStats();
  alert('✅ Stats restored');
});

loadWordlist();
