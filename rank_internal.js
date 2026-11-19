/**
 * DSR Manager - Internal Testing General Rankings TOP 50 & Hourly Time-series Delta Tracker
 * (내부 테스트용 일반 랭킹 TOP 50 1시간 단위 자동 집계 및 증감 분석 시스템)
 */

const HISTORY_STORAGE_KEY = 'dsr_internal_top50_history_v2';
const AUTO_SYNC_STORAGE_KEY = 'dsr_internal_auto_sync_enabled';
const RANK_SOURCE_URL = 'https://m16tool.xyz/Game/DSR/Rank/Index?board=%EC%9C%A0%EC%A0%80%EB%9E%AD%ED%82%B9';

let currentTop50 = [];
let snapshotHistory = [];
let compareTarget = '24h'; // '24h' (하루치 누적), '1h', '3h', '6h', '12h', 'prev'
let filterRankRange = 'all'; // 'all', '1-20', '21-35', '36-50'
let onlyChangedFilter = false;
let searchQuery = '';
let currentSortKey = 'rank';
let sortAsc = true;
let isSyncing = false;
let autoSyncTimerId = null;
let selectedCompareNics = new Set();
let latestEnrichedList = [];

// Proxy helper (Obfuscated Cloudflare Worker fallback)
const CF_WORKER_PROXY = (typeof atob === "function") ? atob("aHR0cHM6Ly9kc3ItcHJveHkuanVudGtkZHlkLndvcmtlcnMuZGV2") : "";

const PET_INDEX_TO_NAME = {
  7: "탱크맨[Lv1][펫]", 8: "아이스 피닉스[Lv1][펫]", 9: "버드 캐터펄트[Lv1][펫]", 10: "버드 캐터펄트[Lv1][펫]",
  11: "공포인형 유이[Lv1][펫]", 12: "기타맨[Lv1][펫]", 13: "팔라딘[Lv1][펫]", 14: "드루이드[Lv1][펫]",
  15: "신성 성녀[Lv1][펫]", 16: "치프틴 퀄볼[Lv1][펫]",
  17: "중갑기사 로우[Lv2][펫]", 18: "고블린 블라스터[Lv2][펫]", 19: "서리정령[Lv2][펫]", 20: "이집트리치 인형[Lv2][펫]",
  21: "템플나이트[Lv2][펫]", 22: "워터보이[Lv2][펫]", 23: "드루이드[Lv2][펫]", 24: "엘프 성녀[Lv2][펫]",
  25: "투카르 치프틴[Lv2][펫]", 26: "투카르 치프틴[Lv2][펫]",
  29: "데몬기사 조던[Lv3][펫]", 30: "데몬기사 조던[Lv3][펫]", 31: "대형 대포[Lv3][펫]", 32: "빙결의 악몽[Lv3][펫]",
  33: "리퍼 인형[Lv3][펫]", 34: "드라군나이트[Lv3][펫]", 35: "리틀보이[Lv3][펫]", 36: "드루이드[Lv3][펫]",
  37: "하이엘프 성녀[Lv3][펫]", 38: "빙결의 악몽[Lv3][펫]",
  40: "대검기사 해곤[Lv4][펫]", 41: "맘 투석기[Lv4][펫]", 42: "빙결의 군주[Lv4][펫]", 43: "백스플 개구리[펫]",
  44: "그레이트 씨 헌터[펫]", 45: "스완 나이트[Lv4][펫]", 46: "엘프보이[Lv4][펫]", 47: "드워프 드루이드[Lv4][펫]",
  48: "고위 성녀[Lv4][펫]", 49: "밴디트 마스터[Lv4][펫]",
  51: "해골기사 조트[Lv5][펫]", 52: "옥크로 투석기[Lv5][펫]", 53: "빙결의 여군주[Lv5][펫]",
  54: "사령기사 루인[Lv6][펫]", 55: "블러드 엘프 마법기[Lv6][펫]", 56: "서리군주 베인[Lv6][펫]",
  57: "대군주 바로크[Lv7][펫]", 58: "블러드 엘프 마법병기[Lv7][펫]", 59: "마인드 마스터[Lv7][펫]",
  60: "족장 랜드호크[Lv8][펫]", 61: "블러드 위저드 탈렌[Lv8][펫]", 62: "혹한의 모그레인[Lv8][펫]",
  63: "카오스 엘리멘탈[Lv9][펫]", 64: "카오스 랜턴[Lv10][펫]", 65: "스핑거 도그[Lv11][펫]",
  66: "카오스 라이언[Lv12][펫]", 67: "켈자르맨서 코르[펫]", 68: "켈자르맨서 코르[펫]",
  69: "카오스 벨러그[Lv13][펫]", 70: "카오스 서리용[Lv14][펫]", 99: "백스플 개구리[펫]"
};

function calculateInternalPetStatsInfo(petName, petIdx = 0, petExp = 1818149888) {
  const cleanName = String(petName || "").replace(/\|c[0-9a-fA-F]{8}|\|r/g, "").trim();
  if ((!cleanName || cleanName === "없음" || cleanName === "미장착" || cleanName === "-") && !petIdx) {
    return { petStats: 0, tierLabel: "미장착" };
  }
  let maxPetStats = 2612632;
  let tierLabel = "Lv.1 기본 펫";

  if (cleanName.includes("Lv14") || cleanName.includes("서리용") || petIdx === 70) {
    maxPetStats = 28000000; tierLabel = "Lv.14 카오스 펫";
  } else if (cleanName.includes("Lv13") || cleanName.includes("벨러그") || petIdx === 69) {
    maxPetStats = 24500000; tierLabel = "Lv.13 카오스 펫";
  } else if (cleanName.includes("Lv12") || cleanName.includes("카오스 라이언") || petIdx === 66) {
    maxPetStats = 21500000; tierLabel = "Lv.12 카오스 펫";
  } else if (cleanName.includes("Lv11") || cleanName.includes("스핑거 도그") || petIdx === 65) {
    maxPetStats = 19000000; tierLabel = "Lv.11 카오스 펫";
  } else if (cleanName.includes("Lv10") || cleanName.includes("카오스 랜턴") || petIdx === 64) {
    maxPetStats = 17500000; tierLabel = "Lv.10 카오스 펫";
  } else if (cleanName.includes("Lv9") || cleanName.includes("카오스 엘리멘탈") || petIdx === 63) {
    maxPetStats = 16000000; tierLabel = "Lv.9 카오스 펫";
  } else if (cleanName.includes("Lv8") || cleanName.includes("탈렌") || cleanName.includes("랜드호크") || cleanName.includes("모그레인") || (petIdx >= 60 && petIdx <= 62)) {
    maxPetStats = 13999752; tierLabel = "Lv.8 고티어 펫";
  } else if (cleanName.includes("Lv7") || cleanName.includes("마인드 마스터") || cleanName.includes("바로크") || cleanName.includes("마법병기") || (petIdx >= 57 && petIdx <= 59)) {
    maxPetStats = 11900000; tierLabel = "Lv.7 업그레이드 펫";
  } else if (cleanName.includes("Lv6") || cleanName.includes("서리군주 베인") || cleanName.includes("루인") || cleanName.includes("마법기") || (petIdx >= 54 && petIdx <= 56)) {
    maxPetStats = 9850000; tierLabel = "Lv.6 업그레이드 펫";
  } else if (cleanName.includes("Lv5") || cleanName.includes("여군주") || cleanName.includes("옥크로") || cleanName.includes("조트") || (petIdx >= 51 && petIdx <= 53)) {
    maxPetStats = 7819772; tierLabel = "Lv.5 업그레이드 펫";
  } else if (cleanName.includes("Lv4") || cleanName.includes("밴디트 마스터") || cleanName.includes("빙결의 군주") || cleanName.includes("해곤") || cleanName.includes("맘 투석기") || cleanName.includes("스완") || cleanName.includes("엘프보이") || cleanName.includes("고위 성녀") || cleanName.includes("드워프 드루이드") || (petIdx >= 40 && petIdx <= 49 && petIdx !== 43 && petIdx !== 44)) {
    maxPetStats = 6120052; tierLabel = "Lv.4 진화 펫";
  } else if (cleanName.includes("Lv3") || cleanName.includes("빙결의 악몽") || cleanName.includes("데몬기사") || cleanName.includes("대형 대포") || cleanName.includes("리퍼 인형") || cleanName.includes("드라군") || cleanName.includes("리틀보이") || cleanName.includes("하이엘프") || (petIdx >= 29 && petIdx <= 38)) {
    maxPetStats = 5869092; tierLabel = "Lv.3 진화 펫";
  } else if (cleanName.includes("코르") || cleanName.includes("씨 헌터") || petIdx === 44 || petIdx === 67 || petIdx === 68) {
    maxPetStats = 4167485; tierLabel = "특수 펫";
  } else if (cleanName.includes("Lv2") || cleanName.includes("서리정령") || cleanName.includes("중갑기사") || cleanName.includes("블라스터") || cleanName.includes("이집트리치") || cleanName.includes("템플나이트") || cleanName.includes("워터보이") || cleanName.includes("엘프 성녀") || cleanName.includes("투카르") || (petIdx >= 17 && petIdx <= 26)) {
    maxPetStats = 3876422; tierLabel = "Lv.2 진화 펫";
  } else if (cleanName.includes("개구리") || petIdx === 43 || petIdx === 99) {
    maxPetStats = 3509595; tierLabel = "특수 펫";
  }

  let petStats = maxPetStats;
  const numExp = Number(petExp);
  if (!isNaN(numExp) && numExp > 0 && numExp < 1800000000) {
    const ratio = Math.min(1, Math.sqrt(numExp / 1818149888));
    petStats = Math.round(maxPetStats * ratio);
  }
  return { petStats, tierLabel };
}

/* --------------------------------------------------------------------------
   Initialization
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadSnapshotHistory();
  initTop50Data();
  initAutoSyncSetting();
  applyFiltersAndRender();
});

function initTop50Data() {
  if (typeof DSR_TOP100_INITIAL !== "undefined" && Array.isArray(DSR_TOP100_INITIAL)) {
    currentTop50 = JSON.parse(JSON.stringify(DSR_TOP100_INITIAL))
      .filter(r => r && r.rank >= 1 && r.rank <= 50)
      .slice(0, 50);
  } else {
    currentTop50 = [];
  }

  // Merge server/GitHub-collected hourly snapshots (DSR_INTERNAL_HISTORY)
  if (typeof DSR_INTERNAL_HISTORY !== "undefined" && Array.isArray(DSR_INTERNAL_HISTORY) && DSR_INTERNAL_HISTORY.length > 0) {
    mergeExternalHistory(DSR_INTERNAL_HISTORY);
  }

  // If no snapshots exist in history, initialize baseline snapshot
  if (snapshotHistory.length === 0 && currentTop50.length > 0) {
    recordSnapshot(currentTop50, "기준치 (Baseline)");
  } else {
    updateSnapshotMetaUI();
  }
}

function mergeExternalHistory(externalList) {
  const merged = [...snapshotHistory];
  externalList.forEach(ext => {
    if (!ext || !ext.timestamp || !ext.records) return;
    const exists = merged.some(s => Math.abs((s.timestamp || 0) - ext.timestamp) < 10 * 60 * 1000);
    if (!exists) {
      merged.push(ext);
    }
  });
  merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  snapshotHistory = merged.slice(-72);
  saveSnapshotHistory();
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
    // Keep up to 72 historical snapshots (3 days of hourly snapshots)
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
  rankersList.slice(0, 50).forEach(r => {
    if (r && r.nicName) {
      records[r.nicName.trim().toLowerCase()] = {
        rank: r.rank,
        nicName: r.nicName.trim(),
        userScore: r.userScore || 0,
        coin: r.coin || 0,
        sacredPower: r.sacredPower || 0,
        seasonPoint: r.seasonPoint || 0,
        honorPoint: r.honorPoint || 0,
        totStats: r.totStats || 0,
        petName: r.petName || "미장착",
        petStats: r.petStats || 0,
        runeStats: r.runeStats || 0,
        equippedRunes: r.equippedRunes || "미장착",
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

  const latestTs = snapshotHistory[snapshotHistory.length - 1].timestamp || Date.now();
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
    '12h': 12 * 3600 * 1000,
    '24h': 24 * 3600 * 1000
  };

  const targetTime = latestTs - (offsetMap[compareTarget] || 3600 * 1000);
  let bestSnap = snapshotHistory[0];
  let minDiff = Math.abs(snapshotHistory[0].timestamp - targetTime);

  // Exclude latest snapshot from being compared against itself
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
    return { deltaScore: 0, deltaCoin: 0, deltaSacred: 0, deltaRank: 0, deltaRuneStats: 0 };
  }
  const k = (ranker.nicName || "").trim().toLowerCase();
  const base = baseRecords[k];
  if (!base) {
    return { deltaScore: 0, deltaCoin: 0, deltaSacred: 0, deltaRank: 0, deltaRuneStats: 0 };
  }

  return {
    deltaScore: (ranker.userScore || 0) - (base.userScore || 0),
    deltaCoin: (ranker.coin || 0) - (base.coin || 0),
    deltaSacred: (ranker.sacredPower || 0) - (base.sacredPower || 0),
    deltaRank: (base.rank || ranker.rank) - ranker.rank, // positive means climbed ranks
    deltaRuneStats: (base.runeStats !== undefined) ? ((ranker.runeStats || 0) - (base.runeStats || 0)) : 0
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
  ["txtInsightCoinTime", "txtInsightSacredTime", "txtInsightScoreTime"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = `기준: ${compLabel}`;
  });

  // Calculate deltas for TOP 50 items
  const enrichedList = currentTop50.map(r => {
    const deltas = calculateDeltas(r, baseRecords);
    return { ...r, ...deltas };
  });
  latestEnrichedList = enrichedList;

  // Render Top 3 Insight Cards (Coin, Sacred, Score - NO Gold)
  renderInsightCards(enrichedList);

  // Filter by rank range
  let list = enrichedList.filter(r => {
    if (filterRankRange === '1-20') return r.rank >= 1 && r.rank <= 20;
    if (filterRankRange === '21-35') return r.rank >= 21 && r.rank <= 35;
    if (filterRankRange === '36-50') return r.rank >= 36 && r.rank <= 50;
    return r.rank >= 1 && r.rank <= 50;
  });

  // Filter by only changed
  const chkChanged = document.getElementById("chkOnlyChanged");
  onlyChangedFilter = chkChanged ? chkChanged.checked : false;
  if (onlyChangedFilter) {
    list = list.filter(r => (r.deltaCoin !== 0 || r.deltaSacred !== 0 || r.deltaScore !== 0 || r.deltaRank !== 0));
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
  if (compareTarget === '1h') return "최근 1시간 단위";
  if (compareTarget === '3h') return "3시간 누적 대비";
  if (compareTarget === '6h') return "6시간 누적 대비";
  if (compareTarget === '12h') return "12시간 누적 대비";
  if (compareTarget === '24h') return "24시간 (하루치 누적)";
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
    const isChecked = selectedCompareNics.has(r.nicName);
    const safeNic = (r.nicName || "").replace(/'/g, "\\'");

    const deltaRuneHtml = (r.deltaRuneStats && r.deltaRuneStats !== 0)
      ? `<div style="font-size: 10px; margin-top: 2px; color: ${r.deltaRuneStats > 0 ? '#34d399' : '#f87171'}; font-weight: 700;">룬 ${r.deltaRuneStats > 0 ? '+' : ''}${r.deltaRuneStats.toLocaleString()}</div>`
      : '';
    const runeInfoHtml = (r.equippedRunes && r.equippedRunes !== '미장착')
      ? `<div style="font-size: 10px; color: #34d399; margin-top: 2px;">💠 ${r.equippedRunes} (${(r.runeStats || 0).toLocaleString()})</div>`
      : `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">💠 룬 미장착</div>`;

    return `
      <tr onclick="openDetailHistoryModal('${safeNic}')" title="클릭하여 ${r.nicName} 랭커의 시간대별 상세 이력 확인">
        <td onclick="event.stopPropagation();" style="text-align: center;">
          <input type="checkbox" class="rank-compare-chk" ${isChecked ? 'checked' : ''} onchange="toggleCompareUser('${safeNic}', this.checked)" title="${r.nicName} 비교 선택">
        </td>
        <td>${rankBadge}${deltaRankHtml}</td>
        <td>
          <strong style="color: #60a5fa; font-size: 13px;">${r.nicName}</strong>
          ${r.charName && r.charName !== '-' ? `<div style="font-size: 10.5px; color: #94a3b8; margin-top: 1px;">${r.charName}</div>` : ''}
        </td>
        <td>
          <div style="color: #6ee7b7; font-weight: 700; font-size: 12px;">🐾 ${(r.petName || '정보 없음').replace(/\[펫\]/g, '').trim()}</div>
          <div style="font-size: 10.5px; color: #a78bfa; margin-top: 1px;">${(r.petStats || 0) > 0 ? `+${(r.petStats || 0).toLocaleString()}` : '-'}</div>
        </td>
        <td><strong style="color: #f1f5f9;">${(r.userScore || 0).toLocaleString()}</strong></td>
        <td>
          ${formatDeltaBadge(r.deltaScore)}
          ${runeInfoHtml}
          ${deltaRuneHtml}
        </td>
        <td><strong style="color: #fbbf24;">${(r.coin || 0).toLocaleString()}</strong></td>
        <td>${formatDeltaBadge(r.deltaCoin)}</td>
        <td><strong style="color: #38bdf8;">${(r.sacredPower || 0).toLocaleString()}</strong></td>
        <td>${formatDeltaBadge(r.deltaSacred)}</td>
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

  renderInsightList("listTopCoinDelta", topCoins, 'deltaCoin', '주화');
  renderInsightList("listTopSacredDelta", topSacreds, 'deltaSacred', '성력');
  renderInsightList("listTopScoreDelta", topScores, 'deltaScore', '점');
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
   Real-time Sync & Snapshot Collection (TOP 50)
   -------------------------------------------------------------------------- */
async function triggerFullTop50Sync(isManual = true) {
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
    statusTxt.textContent = "1단계: m16tool 유저랭킹 1위~50위 순위표 수집 중...";
  }
  if (progBar) progBar.style.width = "10%";

  try {
    // 0. Try fast 24h GetLog-reconstructed endpoint on local server first
    try {
      const apiRes = await fetch('/api/m16internal_top50_24h');
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData && Array.isArray(apiData.rankings) && apiData.rankings.length > 0 && Array.isArray(apiData.history) && apiData.history.length > 0) {
          currentTop50 = apiData.rankings.slice(0, 50);
          snapshotHistory = apiData.history.slice(-72);
          saveSnapshotHistory();
          updateSnapshotMetaUI();
          if (progBar) progBar.style.width = "100%";
          if (statusTxt) statusTxt.textContent = "✅ 마지막 저장데이터 기준 24시간(1시간 단위) 집계 완료!";
          setTimeout(() => {
            if (progContainer) progContainer.style.display = "none";
            if (statusTxt) statusTxt.style.display = "none";
          }, 2000);
          applyFiltersAndRender();
          return;
        }
      }
    } catch (e) {}

    // 1. Fetch TOP 50 Board from https://m16tool.xyz/Game/DSR/Rank/Index?board=%EC%9C%A0%EC%A0%80%EB%9E%AD%ED%82%B9
    let fetchedRanks = await fetchTop50Boards();
    if (!fetchedRanks || fetchedRanks.length === 0) {
      throw new Error("랭킹 50위 목록을 가져오지 못했습니다.");
    }

    if (progBar) progBar.style.width = "25%";
    if (statusTxt) statusTxt.textContent = `2단계: 50명 세부 스탯(주화·성력·스탯) 배치 파싱 중 (0 / ${fetchedRanks.length})...`;

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
      if (statusTxt) statusTxt.textContent = `2단계: 50명 세부 스탯(주화·성력·스탯) 배치 파싱 중 (${completed} / ${total})...`;
    }

    currentTop50 = fetchedRanks.slice(0, 50);
    recordSnapshot(currentTop50);

    if (progBar) progBar.style.width = "100%";
    if (statusTxt) statusTxt.textContent = "✅ TOP 50 실시간 갱신 & 1시간 스냅샷 기록 완료!";
    setTimeout(() => {
      if (progContainer) progContainer.style.display = "none";
      if (statusTxt) statusTxt.style.display = "none";
    }, 2000);

    applyFiltersAndRender();
  } catch (err) {
    console.error("Top 50 Sync Failed:", err);
    if (statusTxt) statusTxt.textContent = `❌ 동기화 실패: ${err.message}`;
  } finally {
    isSyncing = false;
    if (btnSync) btnSync.disabled = false;
  }
}

// Backward-compatible alias
function triggerFullTop100Sync(isManual = true) {
  return triggerFullTop50Sync(isManual);
}

async function fetchTop50Boards() {
  // 1. Local server API endpoint
  try {
    const res = await fetch('/api/m16rankings_top50');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.rankings) && data.rankings.length > 0) {
        return data.rankings.filter(r => r.rank >= 1 && r.rank <= 50).slice(0, 50);
      }
    }
  } catch (e) {}

  // 2. Fallback: Query Page 1 (1~30) & Page 2 (31~60) directly from RANK_SOURCE_URL via Worker Proxy
  const pageUrls = [
    RANK_SOURCE_URL,
    `${RANK_SOURCE_URL}&index=2`
  ];
  const allRowsMap = {};

  await Promise.all(pageUrls.map(async (targetUrl) => {
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
          if (r.rank >= 1 && r.rank <= 50) allRowsMap[r.rank] = r;
        });
      }
    } catch (e) {}
  }));

  return Object.keys(allRowsMap)
    .map(k => parseInt(k, 10))
    .sort((a, b) => a - b)
    .map(k => allRowsMap[k])
    .slice(0, 50);
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
    return { coin: 0, sacredPower: 0, totStats: 0, seasonPoint: 0, honorPoint: 0, charName: "-", latestSlot: "-" };
  }

  let coin = 0;
  let sacredPower = 0;
  let seasonPoint = 0;
  let honorPoint = 0;
  let strVal = 0, agiVal = 0, intVal = 0;
  let petIdx = 0, petExp = 1818149888;
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

  // Save slots (pick highest version slot)
  const slots = html.matchAll(/"(Code1_(\d+)_[^"]+)":\s*"([^"]+)"/g);
  let bestVer = -1;
  for (const m of slots) {
    if (m[1].includes("_1_1_1")) continue;
    const ver = parseInt(m[2], 10) || 0;
    const parts = m[3].split(',');
    if (parts.length >= 7 && ver >= bestVer) {
      bestVer = ver;
      latestSlot = m[1];
      coin = parseInt(parts[1], 10) || 0;
      strVal = parseInt(parts[4], 10) || 0;
      agiVal = parseInt(parts[5], 10) || 0;
      intVal = parseInt(parts[6], 10) || 0;
      if (parts.length > 31) petIdx = parseInt(parts[31], 10) || 0;
      if (parts.length > 32) petExp = parseInt(parts[32], 10) || 1818149888;
    }
  }

  const rawCharMatch = html.match(/"캐릭터"\s*:\s*"([^"]+)"/) || html.match(/직업\s*:\s*([^\n\r<]+)/);
  if (rawCharMatch) {
    charName = rawCharMatch[1].replace(/\|c[0-9a-fA-F]{8}|\|r/g, '').trim();
  }

  const petName = PET_INDEX_TO_NAME[petIdx] || (petIdx > 0 ? `미확인 펫(#${petIdx})` : "미장착");
  const petInfo = calculateInternalPetStatsInfo(petName, petIdx, petExp);

  let ownedPetCount = 0;
  for (const m of html.matchAll(/"(SP\d*_[A-Za-z0-9_]+)"\s*:\s*(\d+)/g)) {
    if (!m[1].startsWith("SP_LBOX") && !m[1].startsWith("SP_RGUP") && parseInt(m[2], 10) > 0) ownedPetCount++;
  }
  let ownedHeroCount = 0;
  for (const m of html.matchAll(/"(SH_\d+)"\s*:\s*(\d+)/g)) {
    if (parseInt(m[2], 10) > 0) ownedHeroCount++;
  }
  let boxPointSum = 0;
  for (const m of html.matchAll(/"(BoxPoint_[^"]+)"\s*:\s*(\d+)/g)) {
    boxPointSum += parseInt(m[2], 10) || 0;
  }

  let runeStats = 0;
  const equippedRunesList = [];
  const sd2Match = html.match(/"SDATA2"\s*:\s*"([^"]+)"/);
  if (sd2Match) {
    const sd2 = sd2Match[1].split(",").map(v => parseInt(v.trim(), 10) || 0);
    const runeDefs = [
      [30, 36, "힘", 40000],
      [31, 37, "민", 40000],
      [32, 38, "지", 40000],
      [33, 39, "균형", 45000],
      [34, 40, "투지", 0],
      [35, 41, "탐욕", 0]
    ];
    for (const [lvIdx, eqIdx, label, perLv] of runeDefs) {
      const lv = sd2[lvIdx] || 0;
      const eq = sd2[eqIdx] || 0;
      if (eq > 0 && lv > 0) {
        runeStats += lv * perLv;
        equippedRunesList.push(`${label}${lv}`);
      }
    }
  }
  const equippedRunes = equippedRunesList.length > 0 ? equippedRunesList.join("·") : "미장착";

  return {
    coin,
    sacredPower,
    seasonPoint,
    honorPoint,
    totStats: strVal + agiVal + intVal,
    charName,
    petIdx,
    petExp,
    petName,
    petStats: petInfo.petStats,
    petTierLabel: petInfo.tierLabel,
    runeStats,
    equippedRunes,
    ownedPetCount,
    ownedHeroCount,
    boxPointSum,
    latestSlot
  };
}

/* --------------------------------------------------------------------------
   Auto Hourly Sync Settings (Enabled by default)
   -------------------------------------------------------------------------- */
function initAutoSyncSetting() {
  const savedPref = localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
  const isEnabled = (savedPref === null) ? true : (savedPref === 'true');
  const chk = document.getElementById("chkAutoHourlySync");
  if (chk) chk.checked = isEnabled;
  if (isEnabled) {
    startAutoHourlySync();
    // If latest snapshot is older than 55 minutes, immediately collect a fresh hourly snapshot
    const latestSnap = snapshotHistory[snapshotHistory.length - 1];
    const ageMs = latestSnap ? (Date.now() - (latestSnap.timestamp || 0)) : Infinity;
    if (ageMs >= 55 * 60 * 1000) {
      triggerFullTop50Sync(false);
    }
  }
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
  // Run every 60 minutes
  autoSyncTimerId = setInterval(() => {
    triggerFullTop50Sync(false);
  }, 60 * 60 * 1000);
}

function stopAutoHourlySync() {
  if (autoSyncTimerId) {
    clearInterval(autoSyncTimerId);
    autoSyncTimerId = null;
  }
}

/* --------------------------------------------------------------------------
   Detail History Modal (No Gold Column)
   -------------------------------------------------------------------------- */
function openDetailHistoryModal(nicName) {
  if (!nicName) return;
  const modal = document.getElementById("detailHistoryModal");
  const title = document.getElementById("modalRankerTitle");
  const sub = document.getElementById("modalRankerSub");
  const content = document.getElementById("modalHistoryContent");

  const cleanNic = nicName.trim();
  const k = cleanNic.toLowerCase();

  if (title) title.textContent = `📈 [${cleanNic}] 1시간 단위 24시간 누적 변동 추이`;
  if (sub) sub.textContent = `마지막 저장데이터 기반 · 총 ${snapshotHistory.length}개 시간대별 구간`;

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
      const newestRow = historyRows[0];
      const oldestRow = historyRows[historyRows.length - 1];
      const totDScore = (newestRow.userScore || 0) - (oldestRow.userScore || 0);
      const totDCoin = (newestRow.coin || 0) - (oldestRow.coin || 0);
      const totDSacred = (newestRow.sacredPower || 0) - (oldestRow.sacredPower || 0);

      content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
          <div style="padding: 10px 12px; border-radius: 8px; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3);">
            <div style="font-size: 11px; color: #c084fc; font-weight: 700;">하루치 스코어 누적</div>
            <div style="margin-top: 4px;">${formatDeltaBadge(totDScore)}</div>
          </div>
          <div style="padding: 10px 12px; border-radius: 8px; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3);">
            <div style="font-size: 11px; color: #fbbf24; font-weight: 700;">하루치 주화 누적</div>
            <div style="margin-top: 4px;">${formatDeltaBadge(totDCoin)}</div>
          </div>
          <div style="padding: 10px 12px; border-radius: 8px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3);">
            <div style="font-size: 11px; color: #38bdf8; font-weight: 700;">하루치 성력 누적</div>
            <div style="margin-top: 4px;">${formatDeltaBadge(totDSacred)}</div>
          </div>
        </div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 10px;">
          마지막 저장데이터를 기준으로 <strong>1시간 단위</strong>로 묶어 역산한 <strong>${cleanNic}</strong> 랭커의 시간별 수치 및 증감 추이입니다:
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
   Export & History Clearing (No Gold)
   -------------------------------------------------------------------------- */
function exportAnalysisCsv() {
  if (!currentTop50 || !currentTop50.length) {
    alert("내보낼 랭킹 데이터가 없습니다.");
    return;
  }
  const baseSnap = getComparisonSnapshot();
  const baseRecords = baseSnap ? baseSnap.records : {};

  const headers = [
    "순위", "닉네임", "캐릭터", "현재스코어", "스코어증감",
    "현재주화", "주화증감", "현재성력", "성력증감",
    "시즌포인트", "명예포인트", "3대스탯합", "최신세이브슬롯"
  ];

  const rows = currentTop50.map(r => {
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
  a.download = `DSR_Top50_Delta_Analysis_${dateTag}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function clearSnapshotHistory() {
  if (confirm("저장된 시간대별 스냅샷 이력을 초기화하고 현재 시점을 새로운 기준치(Baseline)로 설정하시겠습니까?")) {
    snapshotHistory = [];
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    recordSnapshot(currentTop50, "신규 기준치 (Baseline)");
    applyFiltersAndRender();
  }
}

/* --------------------------------------------------------------------------
   Ranker Comparison Analysis (체크박스 다중 선택 랭킹 비교 분석)
   -------------------------------------------------------------------------- */
function toggleCompareUser(nicName, isChecked) {
  if (!nicName) return;
  if (isChecked) {
    selectedCompareNics.add(nicName);
  } else {
    selectedCompareNics.delete(nicName);
  }
  updateCompareActionBar();
}

function updateCompareActionBar() {
  const bar = document.getElementById("compareActionBar");
  const txtCount = document.getElementById("txtCompareCount");
  const pillsWrap = document.getElementById("compareSelectedPills");
  const btnOpen = document.getElementById("btnOpenCompareModal");
  if (!bar) return;

  const count = selectedCompareNics.size;
  if (count === 0) {
    bar.style.display = "none";
    return;
  }

  bar.style.display = "flex";
  if (txtCount) txtCount.textContent = count;
  if (btnOpen) btnOpen.disabled = count < 2;

  if (pillsWrap) {
    pillsWrap.innerHTML = Array.from(selectedCompareNics).map(nic => {
      const safeNic = nic.replace(/'/g, "\\'");
      return `
        <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(96, 165, 250, 0.45); color: #bfdbfe; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 600;">
          ${nic}
          <button type="button" onclick="removeCompareUser('${safeNic}')" style="background: none; border: none; color: #93c5fd; cursor: pointer; font-size: 13px; line-height: 1; padding: 0 2px;" title="선택 해제">×</button>
        </span>
      `;
    }).join('');
  }
}

function removeCompareUser(nicName) {
  selectedCompareNics.delete(nicName);
  updateCompareActionBar();
  applyFiltersAndRender();
}

function clearCompareSelection() {
  selectedCompareNics.clear();
  updateCompareActionBar();
  applyFiltersAndRender();
}

function estimatePetBaseTierLabel(petBaseScore) {
  if (petBaseScore >= 12000000) return "Lv.8 고티어 펫 구간 (~1,400만+)";
  if (petBaseScore >= 7000000) return "Lv.5~7 업그레이드 펫 구간 (~782만+)";
  if (petBaseScore >= 5950000) return "Lv.4 진화 펫 구간 (~612만)";
  if (petBaseScore >= 5000000) return "Lv.3 진화 펫 구간 (~586만)";
  if (petBaseScore >= 4050000) return "특수 펫(코르/씨헌터) 구간 (~416만)";
  if (petBaseScore >= 3750000) return "Lv.2 진화 펫 구간 (~387만)";
  if (petBaseScore >= 3400000) return "특수 펫(개구리) 구간 (~350만)";
  return "Lv.1 기본 펫 구간 (~261만)";
}

function computeScoreBreakdown(r) {
  const userScore = r.userScore || 0;
  const sacredPower = r.sacredPower || 0;
  const coin = r.coin || 0;
  const seasonPoint = r.seasonPoint || 0;
  const totStats = r.totStats || 0;

  const sacredContrib = sacredPower * 10;
  const coinContrib = coin * 10;
  const spContrib = seasonPoint * 10000;
  const statContrib = totStats * 1;

  const petName = r.petName || (r.petIdx ? (PET_INDEX_TO_NAME[r.petIdx] || `미확인 펫(#${r.petIdx})`) : "정보 없음");
  const calcPet = (r.petStats !== undefined && r.petStats > 0)
    ? { petStats: r.petStats, tierLabel: r.petTierLabel || "" }
    : calculateInternalPetStatsInfo(petName, r.petIdx || 0, r.petExp || 1818149888);

  const petStats = calcPet.petStats || 0;
  const petTierLabel = r.petTierLabel || calcPet.tierLabel || estimatePetBaseTierLabel(petStats);
  const runeStats = r.runeStats || 0;
  const equippedRunes = r.equippedRunes || "미장착";
  const etcContrib = Math.max(0, userScore - sacredContrib - coinContrib - spContrib - statContrib - petStats - runeStats);

  return {
    userScore,
    sacredPower,
    coin,
    seasonPoint,
    totStats,
    sacredContrib,
    coinContrib,
    spContrib,
    statContrib,
    petName,
    petStats,
    petTierLabel,
    runeStats,
    equippedRunes,
    etcContrib
  };
}

function openCompareRankersModal() {
  if (selectedCompareNics.size < 2) {
    alert("비교 분석을 위해 최소 2명 이상의 랭커를 체크박스로 선택해주세요.");
    return;
  }

  const modal = document.getElementById("compareRankersModal");
  const title = document.getElementById("modalCompareTitle");
  const sub = document.getElementById("modalCompareSub");
  const content = document.getElementById("modalCompareContent");
  if (!modal || !content) return;

  const sourceList = latestEnrichedList.length > 0 ? latestEnrichedList : currentTop50;
  const selectedRankers = Array.from(selectedCompareNics)
    .map(nic => sourceList.find(r => r.nicName === nic))
    .filter(Boolean)
    .sort((a, b) => (a.rank || 999) - (b.rank || 999));

  if (selectedRankers.length < 2) {
    alert("선택한 랭커 정보를 찾을 수 없습니다.");
    return;
  }

  const compLabel = getComparisonLabel();
  if (title) title.textContent = `⚖️ 선택 랭커 ${selectedRankers.length}명 비교 분석`;
  if (sub) sub.textContent = `기준: ${compLabel} | 총점 구성 요인(스펙·펫 베이스) 및 시간대별 증감(Δ) 차이 분석`;

  const analyzed = selectedRankers.map(r => ({
    ...r,
    bd: computeScoreBreakdown(r)
  }));

  // 최고 총점 기준 랭커
  const topByScore = [...analyzed].sort((a, b) => b.bd.userScore - a.bd.userScore)[0];
  // 최고 증감(스코어 Δ) 기준 랭커
  const topByDeltaScore = [...analyzed].sort((a, b) => (b.deltaScore || 0) - (a.deltaScore || 0))[0];

  // 차이 원인 요약 카드 생성
  const gapSummaryHtml = analyzed.map(item => {
    if (item.nicName === topByScore.nicName) {
      return `
        <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 10px; padding: 10px 14px;">
          <div style="font-size: 12.5px; font-weight: 700; color: #34d399;">👑 기준 랭커: ${item.nicName} (${item.rank}위, ${item.bd.userScore.toLocaleString()}점)</div>
          <div style="font-size: 11.5px; color: #cbd5e1; margin-top: 4px;">선택된 랭커 중 가장 높은 총점을 보유하고 있습니다. (${item.bd.petTierLabel})</div>
        </div>
      `;
    }

    const totalGap = topByScore.bd.userScore - item.bd.userScore;
    const diffs = [
      { label: "장착 펫 스탯", gap: topByScore.bd.petStats - item.bd.petStats, color: "#6ee7b7" },
      { label: "장착 룬 스탯", gap: topByScore.bd.runeStats - item.bd.runeStats, color: "#34d399" },
      { label: "미분류 잔여 (스페셜룬·기타)", gap: topByScore.bd.etcContrib - item.bd.etcContrib, color: "#c084fc" },
      { label: "성력 (×10)", gap: topByScore.bd.sacredContrib - item.bd.sacredContrib, color: "#38bdf8" },
      { label: "제국주화 (×10)", gap: topByScore.bd.coinContrib - item.bd.coinContrib, color: "#fbbf24" },
      { label: "시즌포인트 (×10,000)", gap: topByScore.bd.spContrib - item.bd.spContrib, color: "#60a5fa" },
      { label: "3대 스탯 (×1)", gap: topByScore.bd.statContrib - item.bd.statContrib, color: "#94a3b8" }
    ].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

    const topFactorsHtml = diffs.slice(0, 3).map(d => {
      const sign = d.gap >= 0 ? "-" : "+";
      const pct = totalGap > 0 ? Math.round((Math.abs(d.gap) / totalGap) * 100) : 0;
      return `<span style="display:inline-block; background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 2px 7px; font-size: 11px; color: ${d.color}; margin-right: 6px; margin-top: 4px;">${d.label}: ${sign}${Math.abs(d.gap).toLocaleString()}점 (${pct}%)</span>`;
    }).join('');

    return `
      <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(96, 165, 250, 0.25); border-radius: 10px; padding: 10px 14px;">
        <div style="font-size: 12.5px; font-weight: 700; color: #93c5fd;">
          📌 ${item.nicName} (${item.rank}위) — 기준 대비 <span style="color:#f87171;">-${totalGap.toLocaleString()}점</span> 차이
        </div>
        <div style="font-size: 11.5px; color: #cbd5e1; margin-top: 4px;">
          가장 큰 차이 요인: <strong style="color:${diffs[0].color};">${diffs[0].label}</strong>
        </div>
        <div style="margin-top: 4px;">${topFactorsHtml}</div>
      </div>
    `;
  }).join('');

  // 비교 테이블 행 헬퍼
  const renderCompareRow = (label, extractor, highlightMax = false, isDelta = false) => {
    const values = analyzed.map(extractor);
    const maxVal = highlightMax ? Math.max(...values.map(v => Number(v.raw || 0))) : null;
    const cells = values.map(v => {
      const isWinner = highlightMax && maxVal > 0 && Number(v.raw || 0) === maxVal;
      const winnerStyle = isWinner ? 'background: rgba(16, 185, 129, 0.12); font-weight: 700;' : '';
      return `<td style="padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: right; ${winnerStyle}">${v.html}</td>`;
    }).join('');
    const rowBg = isDelta ? 'background: rgba(30, 41, 59, 0.45);' : '';
    return `
      <tr style="${rowBg}">
        <td style="padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #cbd5e1; font-weight: 600; font-size: 12px; white-space: nowrap;">${label}</td>
        ${cells}
      </tr>
    `;
  };

  const formatDiffFromTop = (val, topVal) => {
    const diff = val - topVal;
    if (diff === 0) return `<span style="color:#34d399; font-size:11px;">(최고)</span>`;
    if (diff > 0) return `<span style="color:#34d399; font-size:11px;">(+${diff.toLocaleString()})</span>`;
    return `<span style="color:#f87171; font-size:11px;">(${diff.toLocaleString()})</span>`;
  };

  const headersHtml = analyzed.map(item => `
    <th style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.12); color: #60a5fa; font-size: 13px; min-width: 145px;">
      <div>${item.rank}위 · ${item.nicName}</div>
      <div style="font-size: 10.5px; color: #94a3b8; font-weight: 400; margin-top: 2px;">${item.charName && item.charName !== '-' ? item.charName : '캐릭터 정보 없음'}</div>
    </th>
  `).join('');

  content.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <!-- 1. 차이 원인 핵심 요약 -->
      <div>
        <div style="font-size: 12.5px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px;">🔎 점수 차이 핵심 원인 요약 (최고 점수자: ${topByScore.nicName} 기준)</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px;">
          ${gapSummaryHtml}
        </div>
      </div>

      <!-- 2. 시간대별 증감(Δ) 요약 배너 -->
      <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 10px 14px; font-size: 12px; color: #fde68a;">
        ⚡ <strong>${compLabel} 기준 최다 스코어 상승:</strong>
        ${topByDeltaScore.deltaScore > 0
          ? `<span style="color:#fff;">${topByDeltaScore.nicName}</span> (+${(topByDeltaScore.deltaScore || 0).toLocaleString()}점 / 주화 ${(topByDeltaScore.deltaCoin || 0) >= 0 ? '+' : ''}${(topByDeltaScore.deltaCoin || 0).toLocaleString()} / 성력 ${(topByDeltaScore.deltaSacred || 0) >= 0 ? '+' : ''}${(topByDeltaScore.deltaSacred || 0).toLocaleString()})`
          : `선택한 랭커 모두 해당 구간 스코어 변동이 없습니다.`}
      </div>

      <!-- 3. 상세 항목별 나란히 비교 테이블 -->
      <div style="overflow-x: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; background: rgba(15, 23, 42, 0.55);">
        <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
          <thead>
            <tr style="background: rgba(30, 41, 59, 0.85);">
              <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.12); color: #94a3b8; font-size: 11.5px;">비교 항목</th>
              ${headersHtml}
            </tr>
          </thead>
          <tbody>
            ${renderCompareRow("🏆 총 랭킹 점수", r => ({
              raw: r.bd.userScore,
              html: `<strong style="color:#f8fafc;">${r.bd.userScore.toLocaleString()}</strong><br>${formatDiffFromTop(r.bd.userScore, topByScore.bd.userScore)}`
            }), true)}
            ${renderCompareRow("🐾 장착 펫 (실제 스탯)", r => ({
              raw: r.bd.petStats,
              html: `<strong style="color:#6ee7b7;">${r.bd.petStats.toLocaleString()}</strong><br><span style="font-size:10.5px; color:#a7f3d0;">${(r.bd.petName || '정보 없음').replace(/\[펫\]/g, '').trim()}</span><br>${formatDiffFromTop(r.bd.petStats, topByScore.bd.petStats)}`
            }), true)}
            ${renderCompareRow("💠 장착 룬 스탯 (SDATA2)", r => ({
              raw: r.bd.runeStats,
              html: `<strong style="color:#34d399;">${r.bd.runeStats.toLocaleString()}</strong><br><span style="font-size:10.5px; color:#6ee7b7;">${r.bd.equippedRunes}</span><br>${formatDiffFromTop(r.bd.runeStats, topByScore.bd.runeStats)}`
            }), true)}
            ${renderCompareRow("🔍 미분류 잔여 (스페셜룬·기타)", r => ({
              raw: r.bd.etcContrib,
              html: `<strong style="color:#c084fc;">${r.bd.etcContrib.toLocaleString()}</strong><br><span style="font-size:10px; color:#94a3b8;">(스페셜룬 증폭·박스·서버보정)</span><br>${formatDiffFromTop(r.bd.etcContrib, topByScore.bd.etcContrib)}`
            }), true)}
            ${renderCompareRow("✨ 성력 기여분 (×10)", r => ({
              raw: r.bd.sacredContrib,
              html: `<strong style="color:#38bdf8;">${r.bd.sacredContrib.toLocaleString()}</strong> <span style="font-size:11px; color:#94a3b8;">(${r.bd.sacredPower.toLocaleString()})</span><br>${formatDiffFromTop(r.bd.sacredContrib, topByScore.bd.sacredContrib)}`
            }), true)}
            ${renderCompareRow("🪙 제국주화 기여분 (×10)", r => ({
              raw: r.bd.coinContrib,
              html: `<strong style="color:#fbbf24;">${r.bd.coinContrib.toLocaleString()}</strong> <span style="font-size:11px; color:#94a3b8;">(${r.bd.coin.toLocaleString()})</span><br>${formatDiffFromTop(r.bd.coinContrib, topByScore.bd.coinContrib)}`
            }), true)}
            ${renderCompareRow("🌟 시즌포인트 기여분 (×10,000)", r => ({
              raw: r.bd.spContrib,
              html: `<strong style="color:#60a5fa;">${r.bd.spContrib.toLocaleString()}</strong> <span style="font-size:11px; color:#94a3b8;">(${r.bd.seasonPoint} SP)</span><br>${formatDiffFromTop(r.bd.spContrib, topByScore.bd.spContrib)}`
            }), true)}
            ${renderCompareRow("📊 3대 스탯 합계 (×1)", r => ({
              raw: r.bd.statContrib,
              html: `<span style="color:#e2e8f0;">${r.bd.totStats.toLocaleString()}</span><br>${formatDiffFromTop(r.bd.statContrib, topByScore.bd.statContrib)}`
            }), true)}
            ${renderCompareRow("📦 박스포인트 합계 (참고)", r => ({
              raw: r.boxPointSum || 0,
              html: `<span style="color:#e2e8f0;">${(r.boxPointSum || 0).toLocaleString()}</span>`
            }), true)}
            ${renderCompareRow("🐾 보유 펫 종류 (참고)", r => ({
              raw: r.ownedPetCount || 0,
              html: `<span style="color:#a7f3d0;">${(r.ownedPetCount || 0).toLocaleString()}종</span>`
            }), true)}
            ${renderCompareRow("🦸 보유 영웅 수 (참고)", r => ({
              raw: r.ownedHeroCount || 0,
              html: `<span style="color:#93c5fd;">${(r.ownedHeroCount || 0).toLocaleString()}개</span>`
            }), true)}
            ${renderCompareRow("🏅 명예점수 (참고)", r => ({
              raw: r.honorPoint || 0,
              html: `<span style="color:#cbd5e1;">${(r.honorPoint || 0).toLocaleString()}</span>`
            }), true)}
            ${renderCompareRow(`📈 스코어 증감 (${compLabel})`, r => ({
              raw: r.deltaScore || 0,
              html: `${formatDeltaBadge(r.deltaScore || 0)}<br><span style="font-size:10px; color:#34d399;">💠 ${r.bd.equippedRunes} (${r.bd.runeStats.toLocaleString()})</span>`
            }), true, true)}
            ${renderCompareRow(`💠 룬 스탯 증감 (${compLabel})`, r => ({
              raw: r.deltaRuneStats || 0,
              html: formatDeltaBadge(r.deltaRuneStats || 0)
            }), true, true)}
            ${renderCompareRow(`🪙 주화 증감 (${compLabel})`, r => ({
              raw: r.deltaCoin || 0,
              html: formatDeltaBadge(r.deltaCoin || 0)
            }), true, true)}
            ${renderCompareRow(`✨ 성력 증감 (${compLabel})`, r => ({
              raw: r.deltaSacred || 0,
              html: formatDeltaBadge(r.deltaSacred || 0)
            }), true, true)}
            ${renderCompareRow(`👑 순위 변동 (${compLabel})`, r => ({
              raw: r.deltaRank || 0,
              html: formatDeltaBadge(r.deltaRank || 0, true)
            }), true, true)}
          </tbody>
        </table>
      </div>

      <!-- 4. 랭킹 점수 상승 가이드 -->
      <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(96, 165, 250, 0.25); border-radius: 10px; padding: 12px 14px; font-size: 11.5px; color: #cbd5e1; line-height: 1.65;">
        <div style="font-weight: 800; color: #93c5fd; margin-bottom: 4px;">💡 랭킹 점수 보완 · 상승 우선순위 가이드</div>
        <div>1️⃣ <strong>장착 펫 등급업:</strong> 가장 큰 고정 점수 폭 (Lv.1 약 261만 → Lv.3 약 587만 → Lv.5 약 782만 → Lv.8 약 1,400만)</div>
        <div>2️⃣ <strong>일반 룬 강화 · 장착:</strong> 힘·민·지 룬(Lv당 +4만) &amp; 균형 룬(Lv당 +4.5만) — 모두 Lv.70 장착 시 최대 <strong>+1,155만점</strong> 상승!</div>
        <div>3️⃣ <strong>성력 &amp; 제국주화 (×10배):</strong> 1 올릴 때마다 랭킹 점수 +10점 상승 (최상위권 핵심 격차 요인)</div>
        <div>4️⃣ <strong>시즌포인트 (×10,000배):</strong> 1P당 +10,000점 상승 (시즌 클리어 및 포인트 누적 필수)</div>
        <div>5️⃣ <strong>미분류 잔여 점수:</strong> 스페셜 룬 효과 증폭, 박스포인트(500배수), 서버 내부 보정 등 추가 반영분입니다.</div>
      </div>
    </div>
  `;

  modal.style.display = "flex";
}

function closeCompareRankersModal() {
  const modal = document.getElementById("compareRankersModal");
  if (modal) modal.style.display = "none";
}
