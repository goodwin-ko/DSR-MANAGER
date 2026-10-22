/**
 * DSR Manager - Internal Testing General Rankings TOP 100 & Time-series Delta Tracker
 * (내부 테스트용 일반 랭킹 TOP 100 시계열 증감 분석 시스템)
 */

const HISTORY_STORAGE_KEY = 'dsr_internal_top100_history_v1';
const AUTO_SYNC_STORAGE_KEY = 'dsr_internal_auto_sync_enabled';

let currentTop100 = [];
let snapshotHistory = [];
let compareTarget = '1h'; // 'prev', '1h', '3h', '6h', '24h', 'baseline'
let filterRankRange = 'all'; // 'all', '1-30', '31-60', '61-100'
let onlyChangedFilter = false;
let searchQuery = '';
let currentSortKey = 'rank';
let sortAsc = true;
let isSyncing = false;
let autoSyncTimerId = null;

// Proxy helper (Obfuscated Cloudflare Worker fallback)
const CF_WORKER_PROXY = (typeof atob === "function") ? atob("aHR0cHM6Ly9kc3ItcHJveHkuanVudGtkZHlkLndvcmtlcnMuZGV2") : "";

/* --------------------------------------------------------------------------
   Initialization
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadSnapshotHistory();
  initTop100Data();
  initAutoSyncSetting();
  applyFiltersAndRender();
});

function initTop100Data() {
  if (typeof DSR_TOP100_INITIAL !== "undefined" && Array.isArray(DSR_TOP100_INITIAL)) {
    currentTop100 = JSON.parse(JSON.stringify(DSR_TOP100_INITIAL));
  } else {
    currentTop100 = [];
  }

  // If no snapshots exist in history, initialize baseline snapshot
  if (snapshotHistory.length === 0 && currentTop100.length > 0) {
    recordSnapshot(currentTop100, "기준치 (Baseline)");
  }
}

function loadSnapshotHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        snapshotHistory = parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load snapshot history:", e);
    snapshotHistory = [];
  }
}

function saveSnapshotHistory() {
  try {
    // Keep up to 72 historical snapshots (e.g. 3 days of hourly snapshots)
    if (snapshotHistory.length > 72) {
      snapshotHistory = snapshotHistory.slice(snapshotHistory.length - 72);
    }
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(snapshotHistory));
  } catch (e) {
    console.warn("Failed to save snapshot history:", e);
  }
}

function recordSnapshot(rankersList, label = "") {
  if (!rankersList || !rankersList.length) return;
  const now = new Date();
  const dateStr = label || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const records = {};
  rankersList.forEach(r => {
    if (r && r.nicName) {
      records[r.nicName.trim().toLowerCase()] = {
        rank: r.rank,
        nicName: r.nicName.trim(),
        userScore: r.userScore || 0,
        coin: r.coin || 0,
        sacredPower: r.sacredPower || 0,
        gold: r.gold || 0,
        seasonPoint: r.seasonPoint || 0,
        honorPoint: r.honorPoint || 0,
        totStats: r.totStats || 0,
        latestSlot: r.latestSlot || "-",
        charName: r.charName || "-"
      };
    }
  });

  snapshotHistory.push({
    timestamp: now.getTime(),
    dateStr: dateStr,
    records: records
  });

  saveSnapshotHistory();
  updateSnapshotMetaUI();
}

function updateSnapshotMetaUI() {
  const txtCount = document.getElementById("txtSnapshotCount");
  const txtLastSync = document.getElementById("txtLastSyncTime");
  if (txtCount) txtCount.textContent = snapshotHistory.length;
  if (txtLastSync && snapshotHistory.length > 0) {
    txtLastSync.textContent = snapshotHistory[snapshotHistory.length - 1].dateStr;
  }
}

/* --------------------------------------------------------------------------
   Comparison & Delta Engine
   -------------------------------------------------------------------------- */
function getComparisonSnapshot() {
  if (snapshotHistory.length <= 1) {
    return snapshotHistory[0] || null;
  }

  const now = Date.now();
  if (compareTarget === 'baseline') {
    return snapshotHistory[0];
  }
  if (compareTarget === 'prev') {
    return snapshotHistory[snapshotHistory.length - 2] || snapshotHistory[0];
  }

  const offsetMap = {
    '1h': 1 * 3600 * 1000,
    '3h': 3 * 3600 * 1000,
    '6h': 6 * 3600 * 1000,
    '24h': 24 * 3600 * 1000
  };

  const targetTime = now - (offsetMap[compareTarget] || 3600 * 1000);
  let bestSnap = snapshotHistory[0];
  let minDiff = Math.abs(snapshotHistory[0].timestamp - targetTime);

  // Exclude current/latest snapshot from being compared against itself
  for (let i = 0; i < snapshotHistory.length - 1; i++) {
    const snap = snapshotHistory[i];
    const diff = Math.abs(snap.timestamp - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      bestSnap = snap;
    }
  }

  return bestSnap;
}

function calculateDeltas(ranker, baseRecords) {
  if (!baseRecords) {
    return { deltaScore: 0, deltaCoin: 0, deltaSacred: 0, deltaGold: 0, deltaRank: 0 };
  }
  const k = (ranker.nicName || "").trim().toLowerCase();
  const base = baseRecords[k];
  if (!base) {
    return { deltaScore: 0, deltaCoin: 0, deltaSacred: 0, deltaGold: 0, deltaRank: 0 };
  }

  return {
    deltaScore: (ranker.userScore || 0) - (base.userScore || 0),
    deltaCoin: (ranker.coin || 0) - (base.coin || 0),
    deltaSacred: (ranker.sacredPower || 0) - (base.sacredPower || 0),
    deltaGold: (ranker.gold || 0) - (base.gold || 0),
    deltaRank: (base.rank || ranker.rank) - ranker.rank // positive means climbed ranks
  };
}

/* --------------------------------------------------------------------------
   Render Functions
   -------------------------------------------------------------------------- */
function applyFiltersAndRender() {
  const baseSnap = getComparisonSnapshot();
  const baseRecords = baseSnap ? baseSnap.records : {};

  // Update comparison label in insight headers
  const compLabel = getComparisonLabel();
  ["txtInsightCoinTime", "txtInsightSacredTime", "txtInsightScoreTime", "txtInsightGoldTime"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = `기준: ${compLabel}`;
  });

  // Calculate deltas for all items
  const enrichedList = currentTop100.map(r => {
    const deltas = calculateDeltas(r, baseRecords);
    return { ...r, ...deltas };
  });

  // Render Top 4 Insight Cards
  renderInsightCards(enrichedList);

  // Filter by rank range
  let list = enrichedList.filter(r => {
    if (filterRankRange === '1-30') return r.rank >= 1 && r.rank <= 30;
    if (filterRankRange === '31-60') return r.rank >= 31 && r.rank <= 60;
    if (filterRankRange === '61-100') return r.rank >= 61 && r.rank <= 100;
    return true;
  });

  // Filter by only changed
  const chkChanged = document.getElementById("chkOnlyChanged");
  onlyChangedFilter = chkChanged ? chkChanged.checked : false;
  if (onlyChangedFilter) {
    list = list.filter(r => (r.deltaCoin !== 0 || r.deltaSacred !== 0 || r.deltaScore !== 0 || r.deltaGold !== 0 || r.deltaRank !== 0));
  }

  // Filter by search query
  if (searchQuery) {
    list = list.filter(r => r.nicName.toLowerCase().includes(searchQuery));
  }

  // Sort
  list.sort((a, b) => {
    let valA = a[currentSortKey] !== undefined ? a[currentSortKey] : 0;
    let valB = b[currentSortKey] !== undefined ? b[currentSortKey] : 0;

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return a.rank - b.rank;
  });

  // Render Table
  renderTableRows(list);

  const txtDisplayCount = document.getElementById("txtDisplayCount");
  if (txtDisplayCount) txtDisplayCount.textContent = list.length;
}

function getComparisonLabel() {
  if (compareTarget === 'baseline') return "최초 기준치 대비";
  if (compareTarget === 'prev') return "직전 동기화 대비";
  if (compareTarget === '1h') return "1시간 전 대비";
  if (compareTarget === '3h') return "3시간 전 대비";
  if (compareTarget === '6h') return "6시간 전 대비";
  if (compareTarget === '24h') return "24시간 전 대비";
  return "이전 기록 대비";
}

function formatDeltaBadge(num, isRank = false) {
  if (num === 0 || isNaN(num)) {
    return `<span class="delta-badge zero">-</span>`;
  }
  if (isRank) {
    if (num > 0) return `<span class="delta-badge pos">▲${num}</span>`;
    return `<span class="delta-badge neg">▼${Math.abs(num)}</span>`;
  }
  const formatted = Math.abs(num).toLocaleString();
  if (num > 0) {
    return `<span class="delta-badge pos">+${formatted} ▲</span>`;
  }
  return `<span class="delta-badge neg">-${formatted} ▼</span>`;
}

function renderTableRows(list) {
  const tbody = document.getElementById("internalTableBody");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" style="text-align: center; padding: 40px; color: var(--text-muted);">
          🔍 조건에 일치하는 랭커가 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(r => {
    let rankBadge = `<span class="rank-num-cell">${r.rank}</span>`;
    if (r.rank === 1) rankBadge = `<span class="rank-num-cell rank-top1">🥇 1</span>`;
    else if (r.rank === 2) rankBadge = `<span class="rank-num-cell rank-top2">🥈 2</span>`;
    else if (r.rank === 3) rankBadge = `<span class="rank-num-cell rank-top3">🥉 3</span>`;

    const deltaRankHtml = r.deltaRank !== 0 ? ` ${formatDeltaBadge(r.deltaRank, true)}` : '';

    return `
      <tr onclick="openDetailHistoryModal('${r.nicName}')" title="클릭하여 ${r.nicName} 랭커의 시간대별 상세 이력 확인">
        <td>${rankBadge}${deltaRankHtml}</td>
        <td>
          <strong style="color: #60a5fa; font-size: 13px;">${r.nicName}</strong>
          ${r.charName && r.charName !== '-' ? `<div style="font-size: 10.5px; color: #94a3b8; margin-top: 1px;">${r.charName}</div>` : ''}
        </td>
        <td><strong style="color: #f1f5f9;">${(r.userScore || 0).toLocaleString()}</strong></td>
        <td>${formatDeltaBadge(r.deltaScore)}</td>
        <td><strong style="color: #fbbf24;">${(r.coin || 0).toLocaleString()}</strong></td>
        <td>${formatDeltaBadge(r.deltaCoin)}</td>
        <td><strong style="color: #38bdf8;">${(r.sacredPower || 0).toLocaleString()}</strong></td>
        <td>${formatDeltaBadge(r.deltaSacred)}</td>
        <td><strong style="color: #34d399;">${(r.gold || 0).toLocaleString()}</strong></td>
        <td>${formatDeltaBadge(r.deltaGold)}</td>
        <td style="color: #93c5fd;">${r.seasonPoint || 0}</td>
        <td style="color: #fca5a5;">${r.honorPoint || 0}</td>
        <td style="color: #cbd5e1;">${(r.totStats || 0).toLocaleString()}</td>
        <td style="font-size: 11.5px; color: #64748b;">${r.latestSlot || "-"}</td>
      </tr>
    `;
  }).join('');
}

function renderInsightCards(list) {
  const topCoins = [...list].sort((a, b) => b.deltaCoin - a.deltaCoin).slice(0, 5);
  const topSacreds = [...list].sort((a, b) => b.deltaSacred - a.deltaSacred).slice(0, 5);
  const topScores = [...list].sort((a, b) => b.deltaScore - a.deltaScore).slice(0, 5);
  const topGolds = [...list].sort((a, b) => b.deltaGold - a.deltaGold).slice(0, 5);

  renderInsightList("listTopCoinDelta", topCoins, 'deltaCoin', '주화');
  renderInsightList("listTopSacredDelta", topSacreds, 'deltaSacred', '성력');
  renderInsightList("listTopScoreDelta", topScores, 'deltaScore', '점');
  renderInsightList("listTopGoldDelta", topGolds, 'deltaGold', 'G');
}

function renderInsightList(containerId, topList, deltaField, unit) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const validItems = topList.filter(item => item[deltaField] > 0);
  if (validItems.length === 0) {
    container.innerHTML = `<div style="color: #64748b; font-size: 11.5px; text-align: center; padding: 10px 0;">해당 기간 내 증가 변동 없음</div>`;
    return;
  }

  container.innerHTML = validItems.map((item, idx) => `
    <div class="insight-item">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-weight: 800; color: #ffd700; width: 14px;">${idx + 1}.</span>
        <strong style="color: #f1f5f9; cursor: pointer;" onclick="openDetailHistoryModal('${item.nicName}')">${item.nicName}</strong>
        <span style="font-size: 10px; color: #64748b;">(${item.rank}위)</span>
      </div>
      <span class="delta-badge pos">+${item[deltaField].toLocaleString()} ${unit} ▲</span>
    </div>
  `).join('');
}

/* --------------------------------------------------------------------------
   Filter & Sort Controls
   -------------------------------------------------------------------------- */
function handleCompareTargetChange(val) {
  compareTarget = val;
  applyFiltersAndRender();
}

function setRankRangeFilter(range, btn) {
  filterRankRange = range;
  document.querySelectorAll("[data-range]").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  applyFiltersAndRender();
}

function handleInternalSearch(val) {
  searchQuery = (val || "").trim().toLowerCase();
  applyFiltersAndRender();
}

function handleSortColumn(key) {
  if (currentSortKey === key) {
    sortAsc = !sortAsc;
  } else {
    currentSortKey = key;
    // Default descending for metrics and deltas, ascending for rank
    sortAsc = (key === 'rank' || key === 'nicName');
  }

  document.querySelectorAll("#internalTop100Table th").forEach(th => {
    th.classList.remove("active");
    if (th.getAttribute("data-sort") === key) {
      th.classList.add("active");
    }
  });

  applyFiltersAndRender();
}

/* --------------------------------------------------------------------------
   Real-time Sync & Snapshot Collection
   -------------------------------------------------------------------------- */
async function triggerFullTop100Sync(isManual = true) {
  if (isSyncing) return;
  isSyncing = true;

  const btnSync = document.getElementById("btnSyncTop100Live");
  const progContainer = document.getElementById("syncProgressBarContainer");
  const progBar = document.getElementById("syncProgressBar");
  const statusTxt = document.getElementById("syncStatusText");

  if (btnSync) btnSync.disabled = true;
  if (progContainer) progContainer.style.display = "block";
  if (statusTxt) {
    statusTxt.style.display = "block";
    statusTxt.textContent = "1단계: 100위 랭킹 순위표 동기화 중...";
  }
  if (progBar) progBar.style.width = "10%";

  try {
    // 1. Fetch TOP 100 Board
    let fetchedRanks = await fetchTop100Boards();
    if (!fetchedRanks || fetchedRanks.length === 0) {
      throw new Error("랭킹 100위 목록을 가져오지 못했습니다.");
    }

    if (progBar) progBar.style.width = "25%";
    if (statusTxt) statusTxt.textContent = `2단계: 100명 세부 스탯(주화·성력·골드) 배치 파싱 중 (0 / ${fetchedRanks.length})...`;

    // 2. Fetch User Logs in Parallel Chunks
    const total = fetchedRanks.length;
    let completed = 0;
    const CHUNK_SIZE = 10;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = fetchedRanks.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (r) => {
        try {
          const stats = await fetchSingleRankerStats(r.nicName);
          Object.assign(r, stats);
        } catch (e) {}
        completed++;
      }));

      const pct = Math.floor(25 + ((completed / total) * 70));
      if (progBar) progBar.style.width = `${pct}%`;
      if (statusTxt) statusTxt.textContent = `2단계: 100명 세부 스탯(주화·성력·골드) 배치 파싱 중 (${completed} / ${total})...`;
    }

    currentTop100 = fetchedRanks;
    recordSnapshot(currentTop100);

    if (progBar) progBar.style.width = "100%";
    if (statusTxt) statusTxt.textContent = "✅ TOP 100 실시간 갱신 & 시간 스냅샷 기록 완료!";
    setTimeout(() => {
      if (progContainer) progContainer.style.display = "none";
      if (statusTxt) statusTxt.style.display = "none";
    }, 2000);

    applyFiltersAndRender();
  } catch (err) {
    console.error("Top 100 Sync Failed:", err);
    if (statusTxt) statusTxt.textContent = `❌ 동기화 실패: ${err.message}`;
  } finally {
    isSyncing = false;
    if (btnSync) btnSync.disabled = false;
  }
}

async function fetchTop100Boards() {
  // 1. Local or hosting server API endpoint
  try {
    const res = await fetch('/api/m16rankings_top100');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.rankings) && data.rankings.length > 0) {
        return data.rankings;
      }
    }
  } catch (e) {}

  // 2. Fallback: Query 4 anchor windows via Worker Proxy
  const anchors = ['Horus', 'DallDall', 'Jonas', 'kk2103'];
  const allRowsMap = {};

  await Promise.all(anchors.map(async (nic) => {
    const targetUrl = `https://m16tool.xyz/Game/DSR/Rank/Index?board=%EC%9C%A0%EC%A0%80%EB%9E%AD%ED%82%B9&nicname=${encodeURIComponent(nic)}`;
    try {
      let html = "";
      if (CF_WORKER_PROXY) {
        const sep = CF_WORKER_PROXY.includes("?") ? "&" : "?";
        const proxyUrl = `${CF_WORKER_PROXY}${sep}url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) html = await res.text();
      }
      if (!html) {
        const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
        if (res.ok) html = await res.text();
      }
      if (html) {
        const rows = parseRankingRowsFromHtml(html);
        rows.forEach(r => {
          if (r.rank <= 100) allRowsMap[r.rank] = r;
        });
      }
    } catch (e) {}
  }));

  return Object.keys(allRowsMap)
    .map(k => parseInt(k, 10))
    .sort((a, b) => a - b)
    .map(k => allRowsMap[k]);
}

function parseRankingRowsFromHtml(html) {
  const rows = [];
  if (!html) return rows;
  const trMatches = html.matchAll(/<tr[^>]*>\s*<td>\s*(\d+)\s*<\/td>\s*<td>\s*<a[^>]*nicName=([^&"'>]+)[^>]*>.*?<\/a>\s*<\/td>\s*<td>\s*([\d,]+)\s*<\/td>\s*<\/tr>/gis);
  for (const m of trMatches) {
    try {
      const rankNum = parseInt(m[1].trim(), 10);
      const nicName = decodeURIComponent(m[2].trim());
      const scoreNum = parseInt(m[3].replace(/,/g, '').trim(), 10);
      rows.push({
        rank: rankNum,
        nicName: nicName,
        userScore: scoreNum
      });
    } catch (e) {}
  }
  return rows;
}

async function fetchSingleRankerStats(nicName) {
  const targetUrl = `https://m16tool.xyz/Game/DSR/UserLog/RPGDetail?nicName=${encodeURIComponent(nicName)}&character=info1&_t=${Date.now()}`;
  let html = "";

  // 1. Try local server
  try {
    const res = await fetch(`/api/m16log?nicName=${encodeURIComponent(nicName)}`);
    if (res.ok) html = await res.text();
  } catch (e) {}

  // 2. Try Cloudflare Worker
  if (!html && CF_WORKER_PROXY) {
    try {
      const sep = CF_WORKER_PROXY.includes("?") ? "&" : "?";
      const res = await fetch(`${CF_WORKER_PROXY}${sep}url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) html = await res.text();
    } catch (e) {}
  }

  // 3. Fallback: codetabs
  if (!html) {
    try {
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
      if (res.ok) html = await res.text();
    } catch (e) {}
  }

  return parseRankerDetailStats(html);
}

function parseRankerDetailStats(html) {
  if (!html || html.length < 200) {
    return { coin: 0, gold: 0, sacredPower: 0, totStats: 0, seasonPoint: 0, honorPoint: 0, charName: "-", latestSlot: "-" };
  }

  let coin = 0;
  let gold = 0;
  let sacredPower = 0;
  let seasonPoint = 0;
  let honorPoint = 0;
  let strVal = 0, agiVal = 0, intVal = 0;
  let charName = "-";
  let latestSlot = "-";

  // Sacred power
  const spMatch = html.match(/"GodSwordPoint":\s*(\d+)/);
  if (spMatch) sacredPower = parseInt(spMatch[1], 10);

  // iPOINT / iRP
  const ipMatch = html.match(/"iPOINT":\s*(\d+)/);
  if (ipMatch) seasonPoint = parseInt(ipMatch[1], 10);
  const irpMatch = html.match(/"iRP":\s*(\d+)/);
  if (irpMatch) honorPoint = parseInt(irpMatch[1], 10);

  // Save slots
  const slots = html.matchAll(/"(Code1_\d+_[^"]+)":\s*"([^"]+)"/g);
  for (const m of slots) {
    latestSlot = m[1];
    const parts = m[2].split(',');
    if (parts.length >= 7) {
      gold = parseInt(parts[0], 10) || 0;
      coin = parseInt(parts[1], 10) || 0;
      strVal = parseInt(parts[4], 10) || 0;
      agiVal = parseInt(parts[5], 10) || 0;
      intVal = parseInt(parts[6], 10) || 0;
    }
  }

  const rawCharMatch = html.match(/직업\s*:\s*([^\n\r<]+)/);
  if (rawCharMatch) {
    charName = rawCharMatch[1].replace(/\|c[0-9a-fA-F]{8}|\|r/g, '').trim();
  }

  return {
    coin,
    gold,
    sacredPower,
    seasonPoint,
    honorPoint,
    totStats: strVal + agiVal + intVal,
    charName,
    latestSlot
  };
}

/* --------------------------------------------------------------------------
   Auto Hourly Sync Settings
   -------------------------------------------------------------------------- */
function initAutoSyncSetting() {
  const isEnabled = localStorage.getItem(AUTO_SYNC_STORAGE_KEY) === 'true';
  const chk = document.getElementById("chkAutoHourlySync");
  if (chk) chk.checked = isEnabled;
  if (isEnabled) startAutoHourlySync();
}

function toggleAutoHourlySync(enable) {
  localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enable ? 'true' : 'false');
  if (enable) {
    startAutoHourlySync();
  } else {
    stopAutoHourlySync();
  }
}

function startAutoHourlySync() {
  stopAutoHourlySync();
  // Check and run every 60 minutes
  autoSyncTimerId = setInterval(() => {
    triggerFullTop100Sync(false);
  }, 60 * 60 * 1000);
}

function stopAutoHourlySync() {
  if (autoSyncTimerId) {
    clearInterval(autoSyncTimerId);
    autoSyncTimerId = null;
  }
}

/* --------------------------------------------------------------------------
   Detail History Modal
   -------------------------------------------------------------------------- */
function openDetailHistoryModal(nicName) {
  if (!nicName) return;
  const modal = document.getElementById("detailHistoryModal");
  const title = document.getElementById("modalRankerTitle");
  const sub = document.getElementById("modalRankerSub");
  const content = document.getElementById("modalHistoryContent");

  const cleanNic = nicName.trim();
  const k = cleanNic.toLowerCase();

  if (title) title.textContent = `📈 [${cleanNic}] 시간대별 지표 변동 이력`;
  if (sub) sub.textContent = `총 ${snapshotHistory.length}개 스냅샷 기록 추이`;

  if (content) {
    const historyRows = [];
    for (let i = snapshotHistory.length - 1; i >= 0; i--) {
      const snap = snapshotHistory[i];
      const rec = snap.records[k];
      if (rec) {
        historyRows.push({
          timeStr: snap.dateStr,
          timestamp: snap.timestamp,
          ...rec
        });
      }
    }

    if (historyRows.length === 0) {
      content.innerHTML = `<div style="color: var(--text-muted); padding: 20px; text-align: center;">기록된 스냅샷 이력이 없습니다.</div>`;
    } else {
      content.innerHTML = `
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">
          수집된 시간대별 스냅샷에 기록된 <strong>${cleanNic}</strong> 랭커의 실제 수치 변화 추이입니다:
        </div>
        <div class="table-responsive" style="max-height: 450px;">
          <table class="internal-table" style="font-size: 12px;">
            <thead>
              <tr>
                <th>기록 시각 (Snapshot Time)</th>
                <th>순위</th>
                <th>스코어 (Score)</th>
                <th>제국주화 (Coin)</th>
                <th>성력 (Sacred)</th>
                <th>골드 (Gold)</th>
                <th>3대 스탯</th>
                <th>세이브 슬롯</th>
              </tr>
            </thead>
            <tbody>
              ${historyRows.map((row, idx) => {
                const prev = historyRows[idx + 1];
                const dCoin = prev ? (row.coin - prev.coin) : 0;
                const dSacred = prev ? (row.sacredPower - prev.sacredPower) : 0;
                const dScore = prev ? (row.userScore - prev.userScore) : 0;
                const dGold = prev ? (row.gold - prev.gold) : 0;

                return `
                  <tr>
                    <td style="color: #60a5fa; font-weight: 700;">${row.timeStr}</td>
                    <td style="font-weight: 800;">${row.rank}위</td>
                    <td>
                      ${(row.userScore || 0).toLocaleString()}
                      ${dScore !== 0 ? ` ${formatDeltaBadge(dScore)}` : ''}
                    </td>
                    <td>
                      <span style="color: #fbbf24; font-weight: 700;">${(row.coin || 0).toLocaleString()}</span>
                      ${dCoin !== 0 ? ` ${formatDeltaBadge(dCoin)}` : ''}
                    </td>
                    <td>
                      <span style="color: #38bdf8; font-weight: 700;">${(row.sacredPower || 0).toLocaleString()}</span>
                      ${dSacred !== 0 ? ` ${formatDeltaBadge(dSacred)}` : ''}
                    </td>
                    <td>
                      <span style="color: #34d399; font-weight: 700;">${(row.gold || 0).toLocaleString()}</span>
                      ${dGold !== 0 ? ` ${formatDeltaBadge(dGold)}` : ''}
                    </td>
                    <td>${(row.totStats || 0).toLocaleString()}</td>
                    <td style="font-size: 11px; color: #64748b;">${row.latestSlot || "-"}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  if (modal) modal.style.display = "flex";
}

function closeDetailHistoryModal() {
  const modal = document.getElementById("detailHistoryModal");
  if (modal) modal.style.display = "none";
}

/* --------------------------------------------------------------------------
   Export & History Clearing
   -------------------------------------------------------------------------- */
function exportAnalysisCsv() {
  if (!currentTop100 || !currentTop100.length) {
    alert("내보낼 랭킹 데이터가 없습니다.");
    return;
  }
  const baseSnap = getComparisonSnapshot();
  const baseRecords = baseSnap ? baseSnap.records : {};

  const headers = [
    "순위", "닉네임", "캐릭터", "현재스코어", "스코어증감",
    "현재주화", "주화증감", "현재성력", "성력증감", "현재골드", "골드증감",
    "시즌포인트", "명예포인트", "3대스탯합", "최신세이브슬롯"
  ];

  const rows = currentTop100.map(r => {
    const d = calculateDeltas(r, baseRecords);
    return [
      r.rank,
      `"${r.nicName}"`,
      `"${r.charName || '-'}"`,
      r.userScore || 0,
      d.deltaScore,
      r.coin || 0,
      d.deltaCoin,
      r.sacredPower || 0,
      d.deltaSacred,
      r.gold || 0,
      d.deltaGold,
      r.seasonPoint || 0,
      r.honorPoint || 0,
      r.totStats || 0,
      `"${r.latestSlot || '-'}"`
    ].join(',');
  });

  const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const dateTag = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  a.href = url;
  a.download = `DSR_Top100_Delta_Analysis_${dateTag}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function clearSnapshotHistory() {
  if (confirm("저장된 시간대별 스냅샷 이력을 초기화하고 현재 시점을 새로운 기준치(Baseline)로 설정하시겠습니까?")) {
    snapshotHistory = [];
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    recordSnapshot(currentTop100, "신규 기준치 (Baseline)");
    applyFiltersAndRender();
  }
}
