import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

const STATS = {
  total: 0,
  unique: 0,
  longest: '',
  lengths: {},
  milestones: { 100: false, 500: false, 1000: false, 5000: false, 10000: false }
};

let currentWordlistPath = 'Not loaded';

// --- UI Elements ---
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettingsBtn = document.getElementById('close-settings');
const browseBtn = document.getElementById('browse-wordlist');
const pathDisplay = document.getElementById('wordlist-path');
const prefTotal = document.getElementById('pref-total');
const prefUnique = document.getElementById('pref-unique');
const prefLongest = document.getElementById('pref-longest');

// --- Drawer Controls ---
function openSettings() {
  settingsOverlay.classList.remove('hidden');
  updatePrefDisplay();
}

function closeSettings() {
  settingsOverlay.classList.add('hidden');
}

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeSettings();
});

// --- Wordlist Loading ---
async function loadWordlist() {
  const { value: savedUri } = await Preferences.get({ key: 'wordlist_uri' });
  
  if (savedUri) {
    try {
      const result = await Filesystem.readFile({
        path: savedUri,
        directory: Directory.ExternalStorage
      });
      const text = new TextDecoder().decode(result.data);
      const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
      currentWordlistPath = savedUri;
      pathDisplay.textContent = currentWordlistPath;
      processWords(words);
      return;
    } catch (e) {
      console.warn('Saved URI failed:', e);
    }
  }

  try {
    const result = await Filesystem.readFile({
      path: 'Android/data/com.lexica.app/files/wordlist_user.txt',
      directory: Directory.ExternalStorage
    });
    const text = new TextDecoder().decode(result.data);
    const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    currentWordlistPath = 'Android/data/com.lexica.app/files/wordlist_user.txt';
    pathDisplay.textContent = currentWordlistPath;
    processWords(words);
    return;
  } catch (e) {
    console.warn('Direct access failed:', e);
  }

  promptUserToPickFile();
}

function promptUserToPickFile() {
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
      currentWordlistPath = file.name;
      pathDisplay.textContent = currentWordlistPath;
      await Preferences.set({ key: 'wordlist_uri', value: file.name });
      processWords(words);
      document.body.removeChild(input);
    };
    reader.readAsText(file);
  };

  input.click();
}

// --- Browse Button in Drawer ---
browseBtn.addEventListener('click', () => {
  closeSettings();
  setTimeout(promptUserToPickFile, 300);
});

// --- Process Words ---
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
  updatePrefDisplay();
}

// --- Render Main Stats ---
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

// --- Update Preferences Drawer ---
function updatePrefDisplay() {
  prefTotal.textContent = STATS.total || '0';
  prefUnique.textContent = STATS.unique || '0';
  prefLongest.textContent = STATS.longest || '—';
  pathDisplay.textContent = currentWordlistPath || 'Not loaded';
}

// --- Start ---
loadWordlist();
