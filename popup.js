const STORAGE_KEY_WHITELIST = 'igUnfollowWhitelist';

const logEl = document.getElementById('log');
const whoEl = document.getElementById('who');
const followingCountEl = document.getElementById('followingCount');
const followersCountEl = document.getElementById('followersCount');
const unfollowersCountEl = document.getElementById('unfollowersCount');
const btnRefreshCounts = document.getElementById('btnRefreshCounts');
const btnLoadUnfollowers = document.getElementById('btnLoadUnfollowers');
const btnDownloadUnfollowers = document.getElementById('btnDownloadUnfollowers');
const btnUnfollow = document.getElementById('btnUnfollow');
const btnStop = document.getElementById('btnStop');
const loadProgressEl = document.getElementById('loadProgress');
const loadProgressTextEl = document.getElementById('loadProgressText');
const tabMain = document.getElementById('tabMain');
const tabWhitelist = document.getElementById('tabWhitelist');
const panelMain = document.getElementById('panelMain');
const panelWhitelist = document.getElementById('panelWhitelist');
const whitelistInput = document.getElementById('whitelistInput');
const btnWhitelistAdd = document.getElementById('btnWhitelistAdd');
const whitelistListEl = document.getElementById('whitelistList');
const whitelistCountEl = document.getElementById('whitelistCount');

let whitelistUsernames = [];
let tabJobPollId = null;

function clearTabJobPoll() {
  if (tabJobPollId != null) {
    clearInterval(tabJobPollId);
    tabJobPollId = null;
  }
}

const TAB_JOB_SESSION_KEYS = [
  '__ig_unfollow_log__',
  '__ig_unfollow_status__',
  '__ig_load_progress__',
  '__ig_unfollow_lock__',
];

/** True while a job should disable the main buttons. Lock alone is not enough: it can stay set with status=error (duplicate run) or orphan. */
function isJobActiveFromSession(s) {
  const st = s.__ig_unfollow_status__ || '';
  const locked = s.__ig_unfollow_lock__ === '1';
  if (st === 'running' || st === 'starting') return true;
  if (locked && st !== 'done' && st !== 'error' && st !== '') return true;
  return false;
}

/** Remove orphan lock when status is done or empty (not error — duplicate-run error may race with a live job). */
async function clearStaleUnfollowLock(tabId, s) {
  const st = s.__ig_unfollow_status__ || '';
  if (s.__ig_unfollow_lock__ !== '1' || isJobActiveFromSession(s)) return;
  if (st !== 'done' && st !== '') return;
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => sessionStorage.removeItem('__ig_unfollow_lock__'),
  });
}

function startTabJobPoll(tabId) {
  clearTabJobPoll();
  tabJobPollId = setInterval(async () => {
    try {
      const snap = await readTabSession(tabId, TAB_JOB_SESSION_KEYS);
      const logText = snap.__ig_unfollow_log__ || '';
      logEl.textContent = logText;
      logEl.scrollTop = logEl.scrollHeight;
      setLoadProgressUi(snap.__ig_load_progress__);
      if (!isJobActiveFromSession(snap)) {
        clearTabJobPoll();
        hideLoadProgressUi();
        await syncUiFromTab(tabId);
      }
    } catch {
      clearTabJobPoll();
    }
  }, 600);
}

function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

async function loadWhitelistFromStorage() {
  const data = await chrome.storage.local.get(STORAGE_KEY_WHITELIST);
  const raw = data[STORAGE_KEY_WHITELIST];
  if (!Array.isArray(raw)) {
    whitelistUsernames = [];
    return;
  }
  const seen = new Set();
  whitelistUsernames = [];
  for (const item of raw) {
    const n = normalizeUsername(item);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    whitelistUsernames.push(n);
  }
  whitelistUsernames.sort((a, b) => a.localeCompare(b));
}

async function persistWhitelist() {
  await chrome.storage.local.set({ [STORAGE_KEY_WHITELIST]: whitelistUsernames });
}

function renderWhitelistList() {
  if (!whitelistListEl || !whitelistCountEl) return;
  whitelistCountEl.textContent = String(whitelistUsernames.length);
  whitelistListEl.innerHTML = '';
  if (whitelistUsernames.length === 0) {
    const p = document.createElement('p');
    p.className = 'whitelist-empty';
    p.textContent = 'No protected usernames yet.';
    whitelistListEl.appendChild(p);
    return;
  }
  for (const name of whitelistUsernames) {
    const row = document.createElement('div');
    row.className = 'whitelist-row';
    const span = document.createElement('span');
    span.className = 'whitelist-name';
    span.textContent = name;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'whitelist-remove';
    rm.textContent = 'Remove';
    rm.addEventListener('click', () => {
      removeWhitelistUsername(name);
    });
    row.appendChild(span);
    row.appendChild(rm);
    whitelistListEl.appendChild(row);
  }
}

async function addWhitelistFromInput() {
  const n = normalizeUsername(whitelistInput && whitelistInput.value);
  if (!n) return;
  if (whitelistUsernames.includes(n)) {
    if (whitelistInput) whitelistInput.select();
    return;
  }
  whitelistUsernames.push(n);
  whitelistUsernames.sort((a, b) => a.localeCompare(b));
  if (whitelistInput) whitelistInput.value = '';
  await persistWhitelist();
  renderWhitelistList();
}

async function removeWhitelistUsername(name) {
  const key = normalizeUsername(name);
  whitelistUsernames = whitelistUsernames.filter((u) => u !== key);
  await persistWhitelist();
  renderWhitelistList();
}

function showTab(which) {
  const main = which === 'main';
  if (panelMain) panelMain.classList.toggle('active', main);
  if (panelWhitelist) panelWhitelist.classList.toggle('active', !main);
  if (tabMain) {
    tabMain.classList.toggle('active', main);
    tabMain.setAttribute('aria-selected', main ? 'true' : 'false');
  }
  if (tabWhitelist) {
    tabWhitelist.classList.toggle('active', !main);
    tabWhitelist.setAttribute('aria-selected', main ? 'false' : 'true');
  }
}

function appendLog(text) {
  logEl.textContent = text;
  logEl.scrollTop = logEl.scrollHeight;
}

function setSummaryFromResult(obj) {
  if (obj && obj.username) whoEl.textContent = '@' + obj.username;
  if (obj && typeof obj.followingCount === 'number') followingCountEl.textContent = String(obj.followingCount);
  if (obj && typeof obj.followersCount === 'number') followersCountEl.textContent = String(obj.followersCount);
  if (obj && typeof obj.unfollowersCount === 'number') unfollowersCountEl.textContent = String(obj.unfollowersCount);
}

function setUnfollowersCacheUi(ready) {
  btnUnfollow.disabled = !ready;
  btnDownloadUnfollowers.disabled = !ready;
}

function sanitizeFilenameSegment(name) {
  return String(name || 'list').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'list';
}

async function downloadCachedUnfollowersTxt() {
  const tab = await getActiveInstagramTab();
  if (!tab) {
    appendLog('Open instagram.com in the active tab.');
    return;
  }
  const s = await readTabSession(tab.id, [
    '__ig_unfollowers_list__',
    '__ig_unfollowers_ready__',
    '__ig_session_username__',
  ]);
  if (s.__ig_unfollowers_ready__ !== '1') {
    appendLog('Load unfollowers first, then download.');
    return;
  }
  let list;
  try {
    list = JSON.parse(s.__ig_unfollowers_list__ || '[]');
  } catch {
    appendLog('Could not read cached list — run Load Unfollowers again.');
    return;
  }
  if (!Array.isArray(list) || list.length === 0) {
    appendLog('Cached list is empty — nothing to download.');
    return;
  }
  const lines = list.map((u) => (u && u.username != null ? String(u.username) : '')).filter(Boolean);
  if (lines.length === 0) {
    appendLog('No usernames in cache — run Load Unfollowers again.');
    return;
  }
  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'unfollowers-' + sanitizeFilenameSegment(s.__ig_session_username__) + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function formatLoadProgressLine(progressJson, nowMs) {
  if (!progressJson) return { main: '', hint: '' };
  let p;
  try {
    p = JSON.parse(progressJson);
  } catch {
    return { main: '(Unreadable progress)', hint: '' };
  }
  const ageSec = (nowMs - (p.lastActivityAt || 0)) / 1000;
  let main = '';
  if (p.job === 'unfollow') {
    const parts = ['Unfollow'];
    if (typeof p.current === 'number' && typeof p.total === 'number') {
      parts.push(p.current + '/' + p.total);
    }
    if (p.activeUser) parts.push('@' + String(p.activeUser));
    if (typeof p.cacheRemaining === 'number') parts.push(p.cacheRemaining + ' in cache');
    if (p.detail) parts.push(p.detail);
    main = parts.join(' · ');
  } else {
    const listLabel =
      p.list === 'following' ? 'Following' : p.list === 'followers' ? 'Followers' : p.list === 'both' ? 'Both lists' : '';
    const parts = [];
    if (listLabel) parts.push(listLabel);
    if (typeof p.loaded === 'number') parts.push(p.loaded.toLocaleString() + ' accounts');
    if (typeof p.page === 'number' && p.page > 0) parts.push('page ' + p.page);
    if (p.detail) parts.push(p.detail);
    main = parts.join(' · ');
  }
  let hint = '';
  if (p.job === 'unfollow') {
    if ((p.step === 'fetch_profile' || p.step === 'unfollow_post') && ageSec > 50) {
      hint =
        'No heartbeat while waiting on the network — if this stays high, check the Instagram tab or your connection.';
    } else if (
      ageSec > 120 &&
      p.step !== 'delay_before' &&
      p.step !== 'delay_before_post' &&
      p.step !== 'rate_limit'
    ) {
      hint = 'No updates for a while — job may be stuck; try Stop, then reload instagram.com.';
    }
  } else {
    if (p.step === 'http_in_flight' && ageSec > 50) {
      hint =
        'No heartbeat while waiting on the network — large lists can take a while. If this stays several minutes, check the Instagram tab or your connection.';
    } else if (p.step !== 'rate_limit_backoff' && ageSec > 120) {
      hint = 'No updates for a while — job may be stuck; try Stop, then reload instagram.com.';
    }
  }
  return { main, hint };
}

function setLoadProgressUi(progressJson) {
  if (!loadProgressEl || !loadProgressTextEl) return;
  const { main, hint } = formatLoadProgressLine(progressJson, Date.now());
  if (!main && !hint) {
    loadProgressEl.hidden = true;
    loadProgressTextEl.textContent = '';
    return;
  }
  loadProgressEl.hidden = false;
  loadProgressTextEl.textContent = [main, hint].filter(Boolean).join('\n');
}

function hideLoadProgressUi() {
  if (!loadProgressEl || !loadProgressTextEl) return;
  loadProgressEl.hidden = true;
  loadProgressTextEl.textContent = '';
}

async function readTabSession(tabId, keys) {
  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (k) => {
      const o = {};
      k.forEach((key) => {
        o[key] = sessionStorage.getItem(key);
      });
      return o;
    },
    args: [keys],
  });
  return result || {};
}

async function syncUiFromTab(tabId) {
  const s = await readTabSession(tabId, [
    '__ig_session_user_id__',
    '__ig_session_username__',
    '__ig_unfollowers_ready__',
    '__ig_unfollowers_count__',
    '__ig_count_following__',
    '__ig_count_followers__',
    '__ig_unfollow_log__',
    '__ig_unfollow_status__',
    '__ig_load_progress__',
    '__ig_unfollow_lock__',
  ]);
  if (s.__ig_session_username__) whoEl.textContent = '@' + s.__ig_session_username__;
  if (s.__ig_count_following__) followingCountEl.textContent = s.__ig_count_following__;
  if (s.__ig_count_followers__) followersCountEl.textContent = s.__ig_count_followers__;
  if (s.__ig_unfollowers_count__) unfollowersCountEl.textContent = s.__ig_unfollowers_count__;
  else if (s.__ig_unfollowers_ready__ !== '1') unfollowersCountEl.textContent = '—';
  logEl.textContent = s.__ig_unfollow_log__ || '';
  logEl.scrollTop = logEl.scrollHeight;
  const jobActive = isJobActiveFromSession(s);
  if (jobActive) {
    setLoadProgressUi(s.__ig_load_progress__);
    btnRefreshCounts.disabled = true;
    btnLoadUnfollowers.disabled = true;
    btnUnfollow.disabled = true;
    btnDownloadUnfollowers.disabled = true;
    startTabJobPoll(tabId);
  } else {
    clearTabJobPoll();
    hideLoadProgressUi();
    btnRefreshCounts.disabled = false;
    const hasUser = !!s.__ig_session_user_id__;
    btnLoadUnfollowers.disabled = !hasUser;
    setUnfollowersCacheUi(s.__ig_unfollowers_ready__ === '1');
  }
  await clearStaleUnfollowLock(tabId, s);
}

async function getActiveInstagramTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return null;
  if (!tab.url.startsWith('https://www.instagram.com/')) return null;
  return tab;
}

async function requestStopCurrentJob() {
  const tab = await getActiveInstagramTab();
  if (!tab) {
    appendLog('Open instagram.com in the active tab to stop a job there.');
    return;
  }
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: 'MAIN',
    func: () => {
      sessionStorage.setItem('__ig_unfollow_cancel__', '1');
      if (window.__ig_force_unlock_timer) {
        clearTimeout(window.__ig_force_unlock_timer);
        window.__ig_force_unlock_timer = null;
      }
      window.__ig_force_unlock_timer = setTimeout(() => {
        window.__ig_force_unlock_timer = null;
        const st = sessionStorage.getItem('__ig_unfollow_status__');
        if (st === 'running' || st === 'starting') {
          sessionStorage.removeItem('__ig_unfollow_lock__');
          sessionStorage.setItem('__ig_unfollow_status__', 'done');
          sessionStorage.setItem(
            '__ig_unfollow_result__',
            JSON.stringify({ ok: false, cancelled: true, forcedUnlock: true }),
          );
          sessionStorage.removeItem('__ig_load_progress__');
          const prev = sessionStorage.getItem('__ig_unfollow_log__') || '';
          sessionStorage.setItem(
            '__ig_unfollow_log__',
            prev + '\n[Forced unlock after Stop — a request may still finish in the background]\n',
          );
        }
      }, 5000);
    },
  });
  appendLog(logEl.textContent + '\n[Stop requested — job should wind down shortly]\n');
}

async function pollProgress(tabId) {
  const maxMs = 3_600_000;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const [{ result: snap } = {}] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => ({
        status: sessionStorage.getItem('__ig_unfollow_status__'),
        log: sessionStorage.getItem('__ig_unfollow_log__') || '',
        progress: sessionStorage.getItem('__ig_load_progress__'),
      }),
    });
    const status = snap && snap.status;
    const logText = (snap && snap.log) || '';
    const placeholder =
      !logText && (status === 'starting' || status === 'running')
        ? 'Waiting for Instagram tab…'
        : '…';
    appendLog(logText || placeholder);
    setLoadProgressUi(snap && snap.progress);
    if (status === 'done' || status === 'error') {
      hideLoadProgressUi();
      const [{ result: resultJson } = {}] = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => sessionStorage.getItem('__ig_unfollow_result__'),
      });
      return { status, resultJson };
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  hideLoadProgressUi();
  return { status: 'timeout', resultJson: null };
}

async function runPhase(tabId, config) {
  clearTabJobPoll();
  btnRefreshCounts.disabled = true;
  btnLoadUnfollowers.disabled = true;
  btnUnfollow.disabled = true;
  btnDownloadUnfollowers.disabled = true;
  let logTailAfterSync = null;
  let parsedResult = null;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (cfg) => {
        sessionStorage.setItem('__ig_unfollow__', JSON.stringify(cfg));
        sessionStorage.removeItem('__ig_unfollow_log__');
        sessionStorage.removeItem('__ig_unfollow_result__');
        sessionStorage.removeItem('__ig_load_progress__');
        sessionStorage.setItem('__ig_unfollow_status__', 'starting');
      },
      args: [config],
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      files: ['page_runner.js'],
    });
    await new Promise((r) => setTimeout(r, 50));
    const { status, resultJson } = await pollProgress(tabId);
    if (status === 'timeout') {
      logTailAfterSync = '\n[Polling stopped after 1h]';
      return { ok: false, timeout: true, obj: null };
    }
    if (resultJson) {
      try {
        parsedResult = JSON.parse(resultJson);
        logTailAfterSync = '\n---\n' + JSON.stringify(parsedResult, null, 2);
      } catch {
        logTailAfterSync = '\n---\n' + resultJson;
      }
    }
    const ok = status === 'done' && parsedResult && parsedResult.ok === true;
    return { ok, obj: parsedResult, status };
  } finally {
    await syncUiFromTab(tabId);
    if (logTailAfterSync) appendLog(logEl.textContent + logTailAfterSync);
  }
}

async function runCountsFlow() {
  logEl.textContent = '';
  const tab = await getActiveInstagramTab();
  if (!tab) {
    whoEl.textContent = '—';
    followingCountEl.textContent = '—';
    followersCountEl.textContent = '—';
    unfollowersCountEl.textContent = '—';
    btnLoadUnfollowers.disabled = true;
    btnUnfollow.disabled = true;
    btnDownloadUnfollowers.disabled = true;
    appendLog('Open instagram.com in the active tab and sign in.');
    return;
  }
  appendLog('Loading profile counts…\n');
  const { ok, obj } = await runPhase(tab.id, { command: 'counts' });
  if (ok && obj && obj.command === 'counts') {
    setSummaryFromResult(obj);
    unfollowersCountEl.textContent = '—';
  }
  if (!ok && obj && obj.error) {
    whoEl.textContent = '—';
    followingCountEl.textContent = '—';
    followersCountEl.textContent = '—';
    unfollowersCountEl.textContent = '—';
  }
}

async function runLoadUnfollowersFlow() {
  const tab = await getActiveInstagramTab();
  if (!tab) {
    appendLog('Open instagram.com in the active tab.');
    return;
  }
  appendLog('Loading following & followers, then building unfollowers cache…\n');
  const { ok, obj } = await runPhase(tab.id, { command: 'load_unfollowers' });
  if (ok && obj && typeof obj.unfollowersCount === 'number') {
    unfollowersCountEl.textContent = String(obj.unfollowersCount);
  }
}

async function runUnfollowFlow() {
  const tab = await getActiveInstagramTab();
  if (!tab) {
    appendLog('Open instagram.com in the active tab.');
    return;
  }
  appendLog('Unfollow phase (from cache)…\n');
  await runPhase(tab.id, {
    command: 'unfollow',
    whitelist: [...whitelistUsernames],
  });
}

btnRefreshCounts.addEventListener('click', () => runCountsFlow());
btnLoadUnfollowers.addEventListener('click', () => runLoadUnfollowersFlow());
btnDownloadUnfollowers.addEventListener('click', () => downloadCachedUnfollowersTxt());
btnUnfollow.addEventListener('click', () => runUnfollowFlow());
btnStop.addEventListener('click', () => requestStopCurrentJob());
tabMain.addEventListener('click', () => showTab('main'));
tabWhitelist.addEventListener('click', () => showTab('whitelist'));
btnWhitelistAdd.addEventListener('click', () => addWhitelistFromInput());
if (whitelistInput) {
  whitelistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addWhitelistFromInput();
    }
  });
}

async function initPopup() {
  clearTabJobPoll();
  await loadWhitelistFromStorage();
  renderWhitelistList();
  showTab('main');
  const tab = await getActiveInstagramTab();
  if (!tab) {
    whoEl.textContent = '—';
    followingCountEl.textContent = '—';
    followersCountEl.textContent = '—';
    unfollowersCountEl.textContent = '—';
    btnLoadUnfollowers.disabled = true;
    btnUnfollow.disabled = true;
    btnDownloadUnfollowers.disabled = true;
    logEl.textContent = 'Open instagram.com in the active tab and sign in.';
    return;
  }
  await syncUiFromTab(tab.id);
  const s = await readTabSession(tab.id, ['__ig_session_username__']);
  if (!s.__ig_session_username__) await runCountsFlow();
}

window.addEventListener('pagehide', () => clearTabJobPoll());

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}
