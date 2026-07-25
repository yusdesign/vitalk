import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

const STATS = {
  total: 0,
  unique: 0,
  longest: '',
  lengths: {},
  milestones: { 100: false, 500: false, 1000: false, 5000: false, 10000: false }
};

// Called when app starts
async function loadWordlist() {
  // 1. Check if we already have a saved URI
  const { value: savedUri } = await Preferences.get({ key: 'wordlist_uri' });
  
  if (savedUri) {
    // Try to read using the saved URI
    try {
      const result = await Filesystem.readFile({
        path: savedUri,
        directory: Directory.ExternalStorage
      });
      const text = new TextDecoder().decode(result.data);
      const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
      processWords(words);
      return;
    } catch (e) {
      console.warn('Saved URI failed, re-prompting:', e);
    }
  }

  // 2. No valid URI — prompt user to pick the file (silent, automatic)
  promptUserToPickFile();
}

function promptUserToPickFile() {
  // Create hidden file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
      processWords(words);
      
      // Save the file URI for next time (using Capacitor Preferences)
      // Note: We can't save the full URI easily with Filesystem, 
      // so we'll save the file name and rely on the picker again.
      // For now, we'll just remember that we loaded once.
      await Preferences.set({ key: 'wordlist_loaded', value: 'true' });
      document.body.removeChild(input);
    };
    reader.readAsText(file);
  };

  // Trigger the file picker automatically
  input.click();
}

function processWords(words) {
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
}

function renderStats() {
  document.querySelector('#words-today').textContent = STATS.total || '0';
  document.querySelector('#streak').textContent = '—';
  document.querySelector('#total').textContent = STATS.total || '0';
  document.querySelector('#longest').textContent = STATS.longest || '—';

  const list = document.querySelector('#milestone-list');
  list.innerHTML = '';
  Object.entries(STATS.milestones).forEach(([m, done]) => {
    const li = document.createElement('li');
    li.textContent = `${done ? '✅' : '⬜'} ${m} words`;
    li.className = done ? 'done' : '';
    list.appendChild(li);
  });

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

// Start the app
loadWordlist();
