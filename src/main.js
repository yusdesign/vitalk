import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

console.log('🧠 Vitalk starting...');

const STATS = {
  total: 0,
  unique: 0,
  longest: '',
  lengths: {},
  milestones: { 100: false, 500: false, 1000: false, 5000: false, 10000: false }
};

let currentWordlistPath = 'Not loaded';
let debugLogs = [];

// --- UI Elements ---
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettingsBtn = document.getElementById('close-settings');
const browseBtn = document.getElementById('browse-wordlist');
const checkLexicaBtn = document.getElementById('check-lexica');
const clearDebugBtn = document.getElementById('clear-debug');
const pathDisplay = document.getElementById('wordlist-path');
const lexicaStatus = document.getElementById('lexica-status');
const prefTotal = document.getElementById('pref-total');
const prefUnique = document.getElementById('pref-unique');
const prefLongest = document.getElementById('pref-longest');
const surfeitCount = document.getElementById('surfeit-count');
const debugConsole = document.getElementById('debug-console');

// --- Debug Logger ---
function addDebugLog(message, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const entry = { time, message, type };
  debugLogs.push(entry);
  if (debugLogs.length > 50) debugLogs.shift();
  renderDebugLogs();
  console.log(`[${type}] ${message}`);
}

function renderDebugLogs() {
  if (!debugConsole) return;
  debugConsole.innerHTML = debugLogs.map(entry => `
    <div class="log-entry">
      <span class="log-time">${entry.time}</span>
      <span class="log-${entry.type}">${entry.message}</span>
    </div>
  `).join('');
  debugConsole.scrollTop = debugConsole.scrollHeight;
}

// --- Drawer Controls ---
function openSettings() {
  addDebugLog('Opening settings drawer', 'info');
  if (settingsOverlay) {
    settingsOverlay.classList.remove('hidden');
    updatePrefDisplay();
    checkLexicaInstalled();
  } else {
    addDebugLog('settingsOverlay not found!', 'error');
  }
}

function closeSettings() {
  addDebugLog('Closing settings drawer', 'info');
  if (settingsOverlay) {
    settingsOverlay.classList.add('hidden');
  }
}

// --- Test button for debugging ---
// Add a hidden test button to the page if settings button doesn't work
function addTestButton() {
  const testBtn = document.createElement('button');
  testBtn.textContent = '🔧 Open Settings (Test)';
  testBtn.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); z-index:9999; background:#1e3a3a; color:#7ae0c0; padding:0.8rem 2rem; border:none; border-radius:40px; font-size:1rem; cursor:pointer;';
  testBtn.addEventListener('click', openSettings);
  document.body.appendChild(testBtn);
  addDebugLog('Test button added to page', 'info');
}

// --- Setup Event Listeners ---
if (settingsBtn) {
  settingsBtn.addEventListener('click', openSettings);
  addDebugLog('Settings button found and bound', 'ok');
} else {
  addDebugLog('settingsBtn not found!', 'error');
  // Add test button as fallback
  setTimeout(addTestButton, 1000);
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', closeSettings);
  addDebugLog('Close button found and bound', 'ok');
} else {
  addDebugLog('closeSettingsBtn not found!', 'error');
}

if (settingsOverlay) {
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });
  addDebugLog('Settings overlay found', 'ok');
} else {
  addDebugLog('settingsOverlay not found!', 'error');
}

// --- Lexica Detection ---
async function checkLexicaInstalled() {
  addDebugLog('Checking for Lexica...', 'info');
  if (lexicaStatus) {
    lexicaStatus.textContent = '🔍 Checking...';
    lexicaStatus.className = '';
  }
  
  try {
    // Check if Lexica's data folder exists
    const result = await Filesystem.readdir({
      path: 'Android/data/com.lexica.app',
      directory: Directory.ExternalStorage
    });
    addDebugLog(`Lexica folder found: ${result.files?.length || 0} items`, 'ok');
    if (lexicaStatus) {
      lexicaStatus.textContent = '✅ Lexica is installed';
      lexicaStatus.className = 'status-ok';
    }
    
    // Now check for wordlist file
    try {
      const fileResult = await Filesystem.readFile({
        path: 'Android/data/com.lexica.app/files/wordlist_user.txt',
        directory: Directory.ExternalStorage
      });
      const text = new TextDecoder().decode(fileResult.data);
      const words = text.split('\n').filter(w => w.trim().length > 0);
      addDebugLog(`Wordlist found: ${words.length} words`, 'ok');
      if (lexicaStatus) {
        lexicaStatus.textContent = `✅ Wordlist found: ${words.length} words`;
        lexicaStatus.className = 'status-ok';
      }
      // Auto-load if not loaded
      if (STATS.total === 0) {
        processWords(words);
        currentWordlistPath = 'Android/data/com.lexica.app/files/wordlist_user.txt';
        if (pathDisplay) pathDisplay.textContent = currentWordlistPath;
        await Preferences.set({ key: 'wordlist_uri', value: currentWordlistPath });
      }
    } catch (e) {
      addDebugLog(`Wordlist file not found: ${e.message}`, 'warn');
      if (lexicaStatus) {
        lexicaStatus.textContent = '⚠️ Lexica installed but no wordlist found. Play some games!';
        lexicaStatus.className = 'status-warning';
      }
    }
  } catch (e) {
    addDebugLog(`Lexica not found: ${e.message}`, 'error');
    if (lexicaStatus) {
      lexicaStatus.textContent = '❌ Lexica not installed or inaccessible';
      lexicaStatus.className = 'status-error';
    }
  }
}

// --- Wordlist Loading (File Picker Only) ---
async function loadWordlist() {
  addDebugLog('Checking for saved wordlist...', 'info');
  
  // 1. Try to load from saved URI
  try {
    const { value: savedUri } = await Preferences.get({ key: 'wordlist_uri' });
    if (savedUri) {
      addDebugLog(`Saved URI found: ${savedUri}`, 'info');
      try {
        const result = await Filesystem.readFile({
          path: savedUri,
          directory: Directory.ExternalStorage
        });
        const text = new TextDecoder().decode(result.data);
        const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
        if (words.length > 0) {
          addDebugLog(`Loaded ${words.length} words from saved URI`, 'ok');
          currentWordlistPath = savedUri;
          if (pathDisplay) pathDisplay.textContent = currentWordlistPath;
          updateWordlistStatus(`✅ Loaded: ${savedUri} (${words.length} words)`);
          processWords(words);
          return;
        }
      } catch (e) {
        addDebugLog(`Saved URI failed: ${e.message}`, 'warn');
        await Preferences.remove({ key: 'wordlist_uri' });
      }
    }
  } catch (e) {
    addDebugLog(`Preferences error: ${e.message}`, 'warn');
  }

  // 2. No valid wordlist — prompt user to pick one
  addDebugLog('No valid wordlist found. Prompting user to select file.', 'info');
  updateWordlistStatus('⚠️ Please select your Lexica wordlist file');
  promptUserToPickFile();
}

function promptUserToPickFile() {
  addDebugLog('Opening file picker...', 'info');
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      addDebugLog('File selection cancelled', 'warn');
      updateWordlistStatus('⚠️ No file selected. Tap "Browse" to try again.');
      return;
    }
    
    addDebugLog(`File selected: ${file.name}`, 'ok');
    updateWordlistStatus(`📂 Loading: ${file.name}...`);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
        
        if (words.length === 0) {
          addDebugLog('File is empty or invalid', 'error');
          updateWordlistStatus('❌ File is empty. Please select your Lexica wordlist.');
          return;
        }
        
        addDebugLog(`Loaded ${words.length} words from picker`, 'ok');
        currentWordlistPath = file.name;
        if (pathDisplay) pathDisplay.textContent = currentWordlistPath;
        updateWordlistStatus(`✅ Loaded: ${file.name} (${words.length} words)`);
        
        // Save the file name (we can't save the full path due to SAF restrictions)
        await Preferences.set({ key: 'wordlist_uri', value: file.name });
        addDebugLog('Saved file name to preferences', 'ok');
        
        processWords(words);
      } catch (err) {
        addDebugLog(`Error reading file: ${err.message}`, 'error');
        updateWordlistStatus('❌ Error reading file. Please try again.');
      } finally {
        document.body.removeChild(input);
      }
    };
    reader.readAsText(file);
  };

  // Trigger the file picker
  input.click();
}

// --- Update wordlist status on main screen ---
function updateWordlistStatus(message) {
  const statusEl = document.getElementById('wordlist-status');
  if (statusEl) statusEl.textContent = message;
}

// --- Browse Button ---
if (browseBtn) {
  browseBtn.addEventListener('click', () => {
    addDebugLog('Browse button clicked', 'info');
    closeSettings();
    setTimeout(promptUserToPickFile, 300);
  });
} else {
  addDebugLog('browseBtn not found!', 'error');
}

// --- Check Lexica Button ---
if (checkLexicaBtn) {
  checkLexicaBtn.addEventListener('click', () => {
    addDebugLog('Manual Lexica check', 'info');
    checkLexicaInstalled();
  });
} else {
  addDebugLog('checkLexicaBtn not found!', 'error');
}

// --- Clear Debug ---
if (clearDebugBtn) {
  clearDebugBtn.addEventListener('click', () => {
    debugLogs = [];
    renderDebugLogs();
    addDebugLog('Debug log cleared', 'info');
  });
} else {
  addDebugLog('clearDebugBtn not found!', 'error');
}

// --- Process Words ---
function processWords(words) {
  addDebugLog(`Processing ${words.length} words...`, 'info');
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
  addDebugLog(`Stats updated: ${STATS.total} total, ${STATS.unique} unique`, 'ok');
}

// --- Render Main Stats ---
function renderStats() {
  const elements = {
    wordsToday: document.querySelector('#words-today'),
    streak: document.querySelector('#streak'),
    total: document.querySelector('#total'),
    longest: document.querySelector('#longest'),
    milestoneList: document.querySelector('#milestone-list'),
    lengthBars: document.querySelector('#length-bars')
  };

  if (elements.wordsToday) elements.wordsToday.textContent = STATS.total || '0';
  if (elements.streak) elements.streak.textContent = '—';
  if (elements.total) elements.total.textContent = STATS.total || '0';
  if (elements.longest) elements.longest.textContent = STATS.longest || '—';

  if (elements.milestoneList) {
    elements.milestoneList.innerHTML = '';
    Object.entries(STATS.milestones).forEach(([m, done]) => {
      const li = document.createElement('li');
      li.textContent = `${done ? '✅' : '⬜'} ${m} words`;
      li.className = done ? 'done' : '';
      elements.milestoneList.appendChild(li);
    });
  }

  if (elements.lengthBars) {
    elements.lengthBars.innerHTML = '';
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
        elements.lengthBars.appendChild(row);
      });
  }
}

// --- Update Preferences Drawer ---
function updatePrefDisplay() {
  if (prefTotal) prefTotal.textContent = STATS.total || '0';
  if (prefUnique) prefUnique.textContent = STATS.unique || '0';
  if (prefLongest) prefLongest.textContent = STATS.longest || '—';
  if (pathDisplay) pathDisplay.textContent = currentWordlistPath || 'Not loaded';
  
  // Calculate surfeit (excess beyond milestones)
  const milestones = [100, 500, 1000, 5000, 10000];
  let lastMilestone = 0;
  for (const m of milestones) {
    if (STATS.total >= m) lastMilestone = m;
  }
  const surfeit = STATS.total - lastMilestone;
  if (surfeitCount) surfeitCount.textContent = surfeit > 0 ? `+${surfeit}` : '0';
}

// --- Start ---
addDebugLog('Initializing Vitalk...', 'info');
loadWordlist();
addDebugLog('Ready', 'ok');

// --- Add test button after 2 seconds if no stats appear ---
setTimeout(() => {
  if (STATS.total === 0) {
    addDebugLog('No stats loaded after 2s - adding test button', 'warn');
    addTestButton();
  }
}, 2000);
