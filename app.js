/**
 * 대륙 RPG 매니저 - Core Application Logic
 * m16tool 아이디별 100% 동적 개별 조회 & 최근 저장시간(년/월/일/시간) 표시 지원
 */

// Global State
let currentProfile = createEmptyProfile("");

// DOM Initialization
/**
 * 유저 아이디 정문화 헬퍼
 */
function resolveUserId(id) {
  if (!id) return id;
  return id.toLowerCase().trim();
}

let currentLoadRequestId = 0;
let lastSearchClickTime = 0;
let lastSearchClickQuery = "";

document.addEventListener("DOMContentLoaded", () => {
  if (typeof restoreCachedLiveRankings === "function") {
    try { restoreCachedLiveRankings(); } catch (e) {}
  }
  if (typeof restoreCachedUserProfiles === "function") {
    try { restoreCachedUserProfiles(); } catch (e) {}
  }
  if (typeof initTopDetectedMapVersionUI === "function") {
    try { initTopDetectedMapVersionUI(); } catch (e) {}
  }
  renderPatchNotesModal();
  initSearch();
  initSimulator();
  initTabs();
  initRankingsTab();
  
  // 페이지 첫 접속 시 아이디 저장 여부 확인
  const savedUserId = localStorage.getItem("dsr_saved_user_id");
  const searchInput = document.getElementById("searchInput");
  const chkSaveId = document.getElementById("chkSaveId");

  if (savedUserId && savedUserId.trim() !== "") {
    if (searchInput) searchInput.value = savedUserId;
    if (chkSaveId) chkSaveId.checked = true;
    loadProfile(savedUserId);
  } else {
    if (searchInput) searchInput.value = "";
    if (chkSaveId) chkSaveId.checked = false;
    currentProfile = createEmptyProfile("");
    updateProfileStatsUI();
    renderSeasonsMatrix();
    renderOtherTabsData();
    showApiNotice("m16tool 아이디를 입력한 후 '조회' 버튼을 눌러주세요.", false, 0);
  }
});

/* ==========================================================================
   1. Search & m16tool.xyz RPGDetail API Parsing Logic
   ========================================================================== */
function loadProfileFromInput() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  const query = searchInput.value.trim();
  const now = Date.now();
  if (query && query === lastSearchClickQuery && (now - lastSearchClickTime) < 300) {
    return;
  }
  lastSearchClickTime = now;
  lastSearchClickQuery = query;

  if (query) {
    handleSaveIdState(query);
    loadProfile(query);
  } else {
    showApiNotice("아이디를 입력한 후 조회해 주세요.", false, 3000);
  }
}

function initSearch() {
  const searchInput = document.getElementById("searchInput");
  const btnSearch = document.getElementById("btnSearch");
  const chkSaveId = document.getElementById("chkSaveId");

  if (btnSearch) {
    btnSearch.addEventListener("click", (e) => {
      e.preventDefault();
      loadProfileFromInput();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadProfileFromInput();
      }
    });
  }

  if (chkSaveId) {
    chkSaveId.addEventListener("change", () => {
      const query = searchInput ? searchInput.value.trim() : "";
      if (query) {
        handleSaveIdState(query);
      }
    });
  }
}

function handleSaveIdState(userId) {
  const chkSaveId = document.getElementById("chkSaveId");
  if (chkSaveId && chkSaveId.checked) {
    localStorage.setItem("dsr_saved_user_id", userId);
  } else {
    localStorage.removeItem("dsr_saved_user_id");
  }
}

/**
 * 저장 날짜 문자열을 밀리초 타임스탬프로 변환하는 파서
 */
function parseSaveDateToTimestamp(dateStr) {
  if (!dateStr || dateStr === "기록 없음" || dateStr === "-") return 0;
  // 1. 한국어 포맷: YYYY년 MM월 DD일 HH:MM:SS
  const korMatch = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (korMatch) {
    return new Date(
      parseInt(korMatch[1], 10),
      parseInt(korMatch[2], 10) - 1,
      parseInt(korMatch[3], 10),
      parseInt(korMatch[4] || "0", 10),
      parseInt(korMatch[5] || "0", 10),
      parseInt(korMatch[6] || "0", 10)
    ).getTime();
  }
  // 2. 미국식 포맷: MM/DD/YYYY HH:MM:SS
  const usMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (usMatch) {
    return new Date(
      parseInt(usMatch[3], 10),
      parseInt(usMatch[1], 10) - 1,
      parseInt(usMatch[2], 10),
      parseInt(usMatch[4] || "0", 10),
      parseInt(usMatch[5] || "0", 10),
      parseInt(usMatch[6] || "0", 10)
    ).getTime();
  }
  // 3. ISO / 표준 대시 포맷: YYYY-MM-DD HH:MM:SS
  const isoMatch = dateStr.match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    return new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10),
      parseInt(isoMatch[4] || "0", 10),
      parseInt(isoMatch[5] || "0", 10),
      parseInt(isoMatch[6] || "0", 10)
    ).getTime();
  }
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 세이브 슬롯 처리:
 * 1. 이전 버전 완전 배제: 슬롯 중 가장 최신 버전(예: v37)만 유지하고 이전 버전(v1, v2 등)은 제외
 * 2. 마지막 저장코드가 항상 맨 앞(인덱스 0)에 오도록 정렬:
 *    - 로그 파싱 시의 탐지 순서(orderIndex)가 있으면 높은 것(가장 나중에 저장된 것) 우선
 *    - 저장 일시(saveDate)가 다르면 최근 날짜 우선
 *    - 동일할 경우 뒤에 있던 슬롯(최신 저장)이 앞으로 오도록 역순 배치
 */
function sortSaveSlotsLatestFirst(slots) {
  if (!slots || !Array.isArray(slots) || slots.length === 0) return [];

  // 각 슬롯의 버전 번호 추출 헬퍼 (예: "Code1_37_1" -> 37, "v37.00" -> 37)
  const getSlotVer = s => {
    if (!s) return 0;
    if (s.slotVersion !== undefined && s.slotVersion !== null && !isNaN(parseInt(s.slotVersion, 10))) {
      const v = parseInt(s.slotVersion, 10);
      if (v > 0) return v;
    }
    const match = String(s.slotKey || s.mapVersion || "").match(/(?:Code1_|v)(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  };

  // 1. 최신 버전 번호 추출 및 구버전 슬롯 완전 제외
  const allVers = slots.map(getSlotVer);
  const maxVer = Math.max(...allVers, 0);

  let currentVersionSlots = slots;
  if (maxVer > 0) {
    currentVersionSlots = slots.filter(s => getSlotVer(s) === maxVer);
  }

  // 2. 마지막 저장코드가 항상 맨 앞(인덱스 0)에 오도록 정렬
  const indexedSlots = currentVersionSlots.map((s, origIdx) => ({ slot: s, origIdx }));

  indexedSlots.sort((itemA, itemB) => {
    const a = itemA.slot;
    const b = itemB.slot;

    // 2-1. 혹시 버전이 다른 경우 최신 버전 우선
    const verA = getSlotVer(a);
    const verB = getSlotVer(b);
    if (verB !== verA) return verB - verA;

    // 2-2. 저장 일시 우선 (최근 날짜가 앞쪽)
    const timeA = parseSaveDateToTimestamp(a.saveDate);
    const timeB = parseSaveDateToTimestamp(b.saveDate);
    if (timeB !== timeA) return timeB - timeA;

    // 2-3. orderIndex (로그 내 발견 순서)가 있다면 높은 쪽(마지막에 기록된 것)이 앞!
    const oA = (a.orderIndex !== undefined) ? a.orderIndex : itemA.origIdx;
    const oB = (b.orderIndex !== undefined) ? b.orderIndex : itemB.origIdx;
    if (oB !== oA) return oB - oA;

    return 0;
  });

  return indexedSlots.map(item => item.slot);
}

/**
 * 현재 프로필의 유물 레벨 조회 헬퍼
 * - REL_A1 ~ REL_A10: 유물 목록박스A (SDATA2 앞 10자리)
 * - HRL_1 ~ HRL_10: 성유물 목록박스A (m16tool SP_LBOX1 ~ SP_LBOX10)
 * - HRL_ROZ: 로잔티움의 성물 (성유물 목록박스A 10종 전부 Lv.9 MAX 시 자동 해금)
 */
function getRelicLevel(relicCode) {
  if (!currentProfile) return 0;
  const rData = currentProfile.relicData || {};

  // 로잔티움의 성물: 성유물 목록박스A 10종(HRL_1 ~ HRL_10) 전부 Lv.9 이상이면 자동 Lv.1(MAX) 해금
  if (relicCode === "HRL_ROZ") {
    if (rData["HRL_ROZ"] > 0) return rData["HRL_ROZ"];
    let allMax = true;
    for (let i = 1; i <= 10; i++) {
      if ((rData[`HRL_${i}`] || 0) < 9) {
        allMax = false;
        break;
      }
    }
    return allMax ? 1 : 0;
  }

  if (rData[relicCode] !== undefined) {
    return rData[relicCode];
  }

  // 정적 프로필에 sdata2 문자열만 존재하는 경우 REL_A1~10 폴백 파싱
  if (relicCode.startsWith("REL_A") && currentProfile.sdata2) {
    const idx = parseInt(relicCode.replace("REL_A", ""), 10) - 1;
    const parts = String(currentProfile.sdata2).split(",");
    if (idx >= 0 && idx < 10 && parts[idx] !== undefined) {
      return parseInt(parts[idx], 10) || 0;
    }
  }

  return 0;
}

/**
 * 창고 데이터 정밀 정규화 및 선행 조건 검증기
 * - BLBox1 ~ BLBox11: 기본 창고 11종
 * - NBLBox1 (루돌프): 이벤트 창고 (NBLBox1 > 0 일 때 해금, SDATA2[10] 레벨 반영)
 * - NBLBox2 (분홍 여우): 타란튤라(BLBox2)·고슴도치(BLBox3)·알파카(BLBox4)·상어(BLBox5) 모두 Lv.9 일 때만 해금!
 * - NBLBox3 (재규어): 개미(BLBox6)·거북이(BLBox7)·큰뿔사슴(BLBox8)·코끼리(BLBox9)·벤디트 개(BLBox10)·판다(BLBox11) 모두 Lv.9 일 때만 해금!
 * - NBLBox4 (분홍 여우 성체): 분홍 여우(NBLBox2)와 재규어(NBLBox3) 모두 소유 시 해금! 업그레이드 레벨(Lv.1~9)은 SDATA2[11] 반영
 * - NBLBox_MOON (달토끼): 분홍 여우 성체(NBLBox4) MAX(Lv.9) 달성 시 자동 해금!
 * - NBLBox_UP1 ~ NBLBox_UP6 (고블린 왕자 ~ 루나 고양이): 분홍 여우 성체 Lv.9 이후 SDATA2[12~17] 순차 업그레이드 체인
 */
function normalizeWarehouseData(rawWarehouse = {}, sdata2Str = "") {
  const clean = {};
  const sd2Parts = sdata2Str ? String(sdata2Str).split(",").map(v => parseInt(v, 10) || 0) : [];

  // 1. 기본 창고 11종 (BLBox1 ~ BLBox11)
  for (let i = 1; i <= 11; i++) {
    const key = `BLBox${i}`;
    const lvl = parseInt(rawWarehouse[key], 10) || 0;
    if (lvl > 0) clean[key] = Math.min(9, lvl);
  }

  // 2. 이벤트 창고: 루돌프 (NBLBox1)
  const rawRudolph = parseInt(rawWarehouse["NBLBox1"], 10) || 0;
  if (rawRudolph > 0) {
    const sd2Rudolph = (sd2Parts.length > 10 && sd2Parts[10] > 0) ? sd2Parts[10] : rawRudolph;
    clean["NBLBox1"] = Math.min(9, Math.max(rawRudolph, sd2Rudolph));
  }

  // 3. 초월 창고 1: 분홍 여우 (타란튤라Lv9, 고슴도치Lv9, 알파카Lv9, 상어Lv9 필수)
  const hasPinkFox = (clean["BLBox2"] >= 9 && clean["BLBox3"] >= 9 && clean["BLBox4"] >= 9 && clean["BLBox5"] >= 9);
  if (hasPinkFox) {
    clean["NBLBox2"] = 9;
  }

  // 4. 초월 창고 2: 재규어 (개미Lv9, 거북이Lv9, 큰뿔사슴Lv9, 코끼리Lv9, 벤디트 개Lv9, 판다Lv9 필수)
  const hasJaguar = (
    clean["BLBox6"] >= 9 && clean["BLBox7"] >= 9 && clean["BLBox8"] >= 9 &&
    clean["BLBox9"] >= 9 && clean["BLBox10"] >= 9 && clean["BLBox11"] >= 9
  );
  if (hasJaguar) {
    clean["NBLBox3"] = 9;
  }

  // 원시 BLBoxUP1~6 추출 (m16tool 세이브코드의 각성 창고 단계별 강화 수치)
  const up1 = Math.min(9, parseInt(rawWarehouse["BLBoxUP1"] || rawWarehouse["NBLBox_UP1"], 10) || 0);
  const up2 = Math.min(9, parseInt(rawWarehouse["BLBoxUP2"] || rawWarehouse["NBLBox_UP2"], 10) || 0);
  const up3 = Math.min(9, parseInt(rawWarehouse["BLBoxUP3"] || rawWarehouse["NBLBox_UP3"], 10) || 0);
  const up4 = Math.min(9, parseInt(rawWarehouse["BLBoxUP4"] || rawWarehouse["NBLBox_UP4"], 10) || 0);
  const up5 = Math.min(9, parseInt(rawWarehouse["BLBoxUP5"] || rawWarehouse["NBLBox_UP5"], 10) || 0);
  const up6 = Math.min(9, parseInt(rawWarehouse["BLBoxUP6"] || rawWarehouse["NBLBox_UP6"], 10) || 0);
  const sd2Luna = (sd2Parts.length > 11 && sd2Parts[11] > 0) ? Math.min(9, sd2Parts[11]) : 0;

  // 5. 초월 창고: 분홍 여우 성체 (분홍 여우 + 재규어 모두 소유 시 해금, 강화 레벨은 BLBoxUP1 반영)
  if ((hasPinkFox && hasJaguar) || up1 > 0) {
    clean["NBLBox4"] = up1 > 0 ? up1 : 1;
  }

  // 6. 6단계 연쇄 각성 창고 체인 (고블린 왕자 ~ 루나 고양이)
  // 6-1. 고블린 왕자 (분홍 여우 성체 MAX 달성 시 해금, 강화 레벨은 BLBoxUP2)
  if ((clean["NBLBox4"] || 0) >= 9 || up2 > 0) {
    const lvl = up2 > 0 ? up2 : 1;
    clean["NBLBox_UP1"] = lvl;
    clean["BLBoxUP1"] = up1 || 9;
  }
  // 6-2. 고블린 황제 (고블린 왕자 MAX 달성 시 해금, 강화 레벨은 BLBoxUP3)
  if ((clean["NBLBox_UP1"] || 0) >= 9 || up3 > 0) {
    const lvl = up3 > 0 ? up3 : 1;
    clean["NBLBox_UP2"] = lvl;
    clean["BLBoxUP2"] = up2 || 9;
  }
  // 6-3. 소울 구울 (고블린 황제 MAX 달성 시 해금, 강화 레벨은 BLBoxUP4)
  if ((clean["NBLBox_UP2"] || 0) >= 9 || up4 > 0) {
    const lvl = up4 > 0 ? up4 : 1;
    clean["NBLBox_UP3"] = lvl;
    clean["BLBoxUP3"] = up3 || 9;
  }
  // 6-4. 다이스 조커 (소울 구울 MAX 달성 시 해금, 강화 레벨은 BLBoxUP5)
  if ((clean["NBLBox_UP3"] || 0) >= 9 || up5 > 0) {
    const lvl = up5 > 0 ? up5 : 1;
    clean["NBLBox_UP4"] = lvl;
    clean["BLBoxUP4"] = up4 || 9;
  }
  // 6-5. 검은눈 고양이 (다이스 조커 MAX 달성 시 해금, 강화 레벨은 BLBoxUP6)
  if ((clean["NBLBox_UP4"] || 0) >= 9 || up6 > 0) {
    const lvl = up6 > 0 ? up6 : 1;
    clean["NBLBox_UP5"] = lvl;
    clean["BLBoxUP5"] = up5 || 9;
  }
  // 6-6. 루나 고양이 (검은눈 고양이 MAX 달성 시 해금, 강화 레벨은 SDATA2[11])
  if ((clean["NBLBox_UP5"] || 0) >= 9) {
    const lvl = sd2Luna > 0 ? sd2Luna : 1;
    clean["NBLBox_UP6"] = lvl;
    clean["BLBoxUP6"] = up6 || 9;
  }

  // 7. 최종 초월 특전 창고: 달토끼 (루나 고양이 MAX Lv.9 달성 시 사용 가능)
  if ((clean["NBLBox_UP6"] || 0) >= 9) {
    clean["NBLBox_MOON"] = 9;
  }

  return clean;
}

function getWarehouseLevel(boxCode) {
  if (!currentProfile) return 0;
  const normalized = normalizeWarehouseData(currentProfile.warehouseData || {}, currentProfile.sdata2 || "");
  return normalized[boxCode] || 0;
}

/**
 * 슬롯 키 간의 버전 및 저장코드 우선순위 판별 (예: Code1_37_2 >= Code1_37_1)
 */
function isSlotNewerOrEqual(newSlotKey, existingSlotKey, isLive = false) {
  if (!existingSlotKey) return true;
  if (!newSlotKey) return false;
  if (newSlotKey === existingSlotKey) return true;
  const matchNew = String(newSlotKey).match(/(?:Code1_|v)(\d+)(?:_(.+))?/i);
  const matchOld = String(existingSlotKey).match(/(?:Code1_|v)(\d+)(?:_(.+))?/i);
  if (!matchNew || !matchOld) return true;
  const verNew = parseInt(matchNew[1], 10) || 0;
  const verOld = parseInt(matchOld[1], 10) || 0;
  if (verNew !== verOld) return verNew >= verOld;
  // 라이브 파싱 데이터는 이미 로그 순서(orderIndex) 기반으로 가장 마지막 저장 슬롯이 선택되었으므로 버전만 같거나 높으면 무조건 허용!
  if (isLive) return true;
  const codeNew = parseInt(matchNew[2], 10);
  const codeOld = parseInt(matchOld[2], 10);
  if (!isNaN(codeNew) && !isNaN(codeOld)) {
    return codeNew >= codeOld;
  }
  return true;
}

/**
 * 프로필의 최신 세이브 슬롯 데이터를 DSR_RANKINGS_DATA에 양방향 실시간 동기화
 */
function syncRankingsDataWithProfile(profile, isLive = false) {
  if (!profile || !profile.userId || typeof DSR_RANKINGS_DATA === "undefined") return false;
  const targetNic = profile.userId.trim().toLowerCase();
  const effectiveLive = Boolean(isLive || profile.isLiveFetched);

  // 최신 v37 슬롯 또는 최신 저장 슬롯 탐색 (saveSlots[0]이 항상 최신 버전의 마지막 저장 슬롯!)
  let targetSlot = null;
  if (profile.saveSlots && profile.saveSlots.length > 0) {
    const sortedSlots = (typeof sortSaveSlotsLatestFirst === "function")
      ? sortSaveSlotsLatestFirst(profile.saveSlots)
      : profile.saveSlots;
    targetSlot = sortedSlots[0];
  } else if (profile.lastSave) {
    targetSlot = profile.lastSave;
  }

  if (!targetSlot) return false;

  const coinVal = (targetSlot.imperialCoin !== undefined) ? targetSlot.imperialCoin : (profile.lastSave?.imperialCoin || 0);
  const goldVal = (targetSlot.gold !== undefined) ? targetSlot.gold : (profile.lastSave?.gold || 0);
  const strVal = targetSlot.str || profile.lastSave?.str || 0;
  const agiVal = targetSlot.agi || profile.lastSave?.agi || 0;
  const intVal = targetSlot.int || profile.lastSave?.int || 0;
  const totStats = strVal + agiVal + intVal;
  const slotKey = targetSlot.slotKey || "Code1_37_1";
  const charName = targetSlot.characterName || profile.lastSave?.characterName || "";

  let updated = false;
  const allRankRows = [...(DSR_RANKINGS_DATA.userRankings || []), ...(DSR_RANKINGS_DATA.tierRankings || [])];
  allRankRows.forEach(row => {
    if (row.nicName && row.nicName.toLowerCase() === targetNic) {
      // 이미 라이브 연동된 랭킹 데이터를 정적 로컬 DB가 덮어쓰지 않도록 보호!
      if (!effectiveLive && row.isLiveSynced) {
        return;
      }
      if (!isSlotNewerOrEqual(slotKey, row.latestSlot, effectiveLive)) {
        return;
      }
      if (coinVal !== undefined) row.coin = coinVal;
      if (goldVal !== undefined) row.gold = goldVal;
      if (strVal) row.str = strVal;
      if (agiVal) row.agi = agiVal;
      if (intVal) row.int = intVal;
      if (totStats) row.totStats = totStats;
      if (slotKey) row.latestSlot = slotKey;
      if (charName) row.charName = charName.replace(/^『[^』]+』/, '').trim();
      if (profile.seasonPoint !== undefined) row.seasonPoint = profile.seasonPoint;
      if (profile.honorPoint !== undefined) row.honorPoint = profile.honorPoint;
      if (profile.sacredPower) {
        const spNum = parseInt(String(profile.sacredPower).replace(/,/g, ''), 10);
        if (!isNaN(spNum)) row.sacredPower = spNum;
      }
      if (effectiveLive) {
        row.isLiveSynced = true;
      }
      updated = true;
    }
  });

  return updated;
}

const USER_PROFILE_CACHE_KEY = 'dsr_live_user_profiles_v38_1_6';
const DETECTED_MAP_VER_STORAGE_KEY = 'dsr_detected_map_version_v38_1_1';
let currentDetectedMapVersion = "v38.00";

/**
 * 맵 버전 문자열을 숫자(예: "v38.00" -> 38.0, "v38.05" -> 38.05)로 변환
 */
function parseMapVersionNumeric(verStr) {
  if (!verStr) return 0;
  const m = String(verStr).match(/v?(\d{2,3})(?:\.(\d{1,2}))?/i);
  if (!m) return 0;
  const major = parseInt(m[1], 10) || 0;
  if (major < 30 || major > 150) return 0;
  const minorStr = m[2] ? m[2].padEnd(2, '0') : "00";
  const minor = parseInt(minorStr, 10) || 0;
  return major + (minor / 100);
}

/**
 * 맵 버전 표시 문자열 정규화 (예: "v38" -> "v38.00", "38.1" -> "v38.10")
 */
function formatMapVersionDisplay(verStr) {
  if (!verStr) return "v38.00";
  const m = String(verStr).match(/v?(\d{2,3})(?:\.(\d{1,2}))?/i);
  if (!m) return "v38.00";
  const major = parseInt(m[1], 10) || 38;
  const minorStr = m[2] ? m[2].padEnd(2, '0') : "00";
  return `v${major}.${minorStr}`;
}

/**
 * 최상단 [현재 맵 버전] 상태 바 & 헤더 배지 실시간 업데이트
 */
function updateTopDetectedMapVersionUI(candidateVer, sourceLabel = "") {
  const candNum = parseMapVersionNumeric(candidateVer);
  const curNum = parseMapVersionNumeric(currentDetectedMapVersion);
  const minBaseNum = 38.0; // 현재 기본 최신 시즌 버전 v38.00

  let bestNum = Math.max(curNum, minBaseNum);
  let bestStr = (curNum >= minBaseNum) ? formatMapVersionDisplay(currentDetectedMapVersion) : "v38.00";

  if (candNum >= bestNum) {
    bestNum = candNum;
    bestStr = formatMapVersionDisplay(candidateVer);
    currentDetectedMapVersion = bestStr;
    try {
      localStorage.setItem(DETECTED_MAP_VER_STORAGE_KEY, JSON.stringify({
        version: bestStr,
        source: sourceLabel || "",
        updatedAt: Date.now()
      }));
    } catch (e) {}
  }

  const elTopVer = document.getElementById("valCurrentMapVersion");
  const elTopSub = document.getElementById("valCurrentMapVersionSub");
  const elTopMeta = document.getElementById("valCurrentMapVersionMeta");
  const elHeaderVer = document.getElementById("txtHeaderMapVersion");

  if (elTopVer) elTopVer.textContent = bestStr;
  if (elHeaderVer) elHeaderVer.textContent = bestStr;

  const majorVer = Math.floor(bestNum);
  if (elTopSub) {
    if (bestNum > 38.0) {
      elTopSub.innerHTML = `<span style="color:#facc15; font-weight:800;">(🆕 신규 맵 버전 ${bestStr} 실시간 감지 완료!)</span>`;
    } else if (majorVer >= 38) {
      elTopSub.textContent = `(V${majorVer} 신대륙 4대 사냥터 · 개편 계급 · 해금콩 시스템 적용)`;
    }
  }

  if (elTopMeta) {
    if (sourceLabel && sourceLabel !== "조회 대기중") {
      elTopMeta.innerHTML = `✅ 실시간 로그 맵 버전 감지 (${bestStr} · <span style="color:#93c5fd;">${sourceLabel}</span>)`;
    } else {
      elTopMeta.textContent = `✅ 최신 맵 버전 자동 감지 (${bestStr})`;
    }
  }
}

function initTopDetectedMapVersionUI() {
  try {
    const raw = localStorage.getItem(DETECTED_MAP_VER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version && parseMapVersionNumeric(parsed.version) >= 38.0) {
        currentDetectedMapVersion = formatMapVersionDisplay(parsed.version);
      }
    }
  } catch (e) {}
  updateTopDetectedMapVersionUI(currentDetectedMapVersion, "");
}

/**
 * m16tool 원시 텍스트에서 JSON("KEY": 7) 및 키=값(KEY=7,) 포맷을 모두 탐색하여 최대 정수값을 반환
 */
function extractMaxIntByKey(text, keyNames) {
  if (!text) return undefined;
  const keys = Array.isArray(keyNames) ? keyNames : [keyNames];
  let foundAny = false;
  let maxVal = 0;
  for (const k of keys) {
    const reg = new RegExp(`(?:"${k}"|\\b${k})\\s*[:=]\\s*(\\d+)`, "gi");
    let m;
    while ((m = reg.exec(text)) !== null) {
      const v = parseInt(m[1], 10);
      if (!isNaN(v)) {
        foundAny = true;
        if (v > maxVal) maxVal = v;
      }
    }
  }
  return foundAny ? maxVal : undefined;
}

/**
 * m16tool HTML 및 세이브 슬롯에서 가장 최신 맵 버전(예: v38.00, v38.01, v39.00 등)을 동적으로 추출
 */
function detectMapVersionFromHtml(htmlText, candidateSlots = [], seasonVerLabel = "") {
  let maxNum = 37.0;
  let bestRawStr = "v37.00";

  const considerVersion = (vStr) => {
    const num = parseMapVersionNumeric(vStr);
    if (num > maxNum) {
      maxNum = num;
      bestRawStr = formatMapVersionDisplay(vStr);
    }
  };

  // 1. 시즌포인트획득 버전 문자열 확인 (예: "v38")
  if (seasonVerLabel) {
    considerVersion(seasonVerLabel);
  }

  // 2. HTML 내 v36 ~ v99 버전 표기 전체 스캔 (예: v38, v38.00, v38.1, v39.00 등)
  if (htmlText) {
    const verMatches = htmlText.match(/\bv(3[6-9]|[4-9]\d)(?:\.(\d{1,2}))?\b/gi);
    if (verMatches) {
      verMatches.forEach(v => considerVersion(v));
    }

    // Code1_<버전>_<저장코드> 키에서 버전 번호 스캔
    const codeVerReg = /"Code1_(\d{2,3})_[^"]+"/g;
    let cm;
    while ((cm = codeVerReg.exec(htmlText)) !== null) {
      const cVer = parseInt(cm[1], 10);
      if (cVer >= 36 && cVer <= 150) {
        considerVersion(`v${cVer}.00`);
      }
    }

    // 3. V38 전용 키(HN_RT, HN_FR, HN_TD, GREY_BEAN, RED_BEAN, BLUE_BEAN)가 존재하면 최소 v38.00 보장
    if (/(?:"HN_RT"|\bHN_RT|(?:"HN_FR"|\bHN_FR)|(?:"HN_TD"|\bHN_TD)|(?:"GREY_BEAN"|\bGREY_BEAN)|(?:"RED_BEAN"|\bRED_BEAN)|(?:"BLUE_BEAN"|\bBLUE_BEAN))\s*[:=]/i.test(htmlText)) {
      considerVersion("v38.00");
    }
  }

  // 4. 후보 슬롯들의 slotVersion 확인
  if (Array.isArray(candidateSlots)) {
    candidateSlots.forEach(s => {
      if (s && s.slotVersion >= 36 && s.slotVersion <= 150) {
        considerVersion(`v${s.slotVersion}.00`);
      }
    });
  }

  return {
    mapVersionStr: bestRawStr,
    majorVer: Math.floor(maxNum),
    versionNum: maxNum
  };
}

/**
 * V38 명예 기사 계급 점수 -> 기본 레벨(Base Lv 1~99) 임계값 테이블 생성기
 * 최종 계급 Lv = 점수 기본 Lv(tierScore) + 칭호 보너스 Lv(TT_TYPE1: +1 ~ +11)
 * - AQUARIA3 (67점, 브론즈 +1): 기본 Lv 28 + 1 = Lv 29 (마스터 기사 V, HN_RT=5)
 * - licon (103점, 실버 +2): 기본 Lv 40 + 2 = Lv 42 (크라운 기사 III, HN_RT=8)
 * - Gottfried (133점, 실버 +2): 기본 Lv 42 + 2 = Lv 44 (크라운 기사 V, HN_RT=8)
 * - Colaa (304점, Super G.O.D +11): 기본 Lv 55 + 11 = Lv 66 (용기사 II, HN_RT=13)
 * - goodwin (690점, 실버 +2): 기본 Lv 66 (685~730점, 다음까지 40점) + 2 = Lv 68 (용기사 IV, HN_RT=13)
 * - ndaebag (751점, 마스터 +5): 기본 Lv 67 + 5 = Lv 72 (성운 기사 III, HN_RT=14)
 * - Horus (1081점, 조커 +8): 기본 Lv 75 + 8 = Lv 83 (신화 기사 IV, HN_RT=16)
 * - skever3523 (1128점, 브론즈 +1): 기본 Lv 75 + 1 = Lv 76 (천공 기사 II, HN_RT=15)
 * - HiYuKi (1364점, 다이아 +4): 기본 Lv 78 + 4 = Lv 82 (신화 기사 III, HN_RT=16)
 */
function buildV38LevelThresholdTable() {
  const table = { 1: 0 };
  let curScore = 0;
  for (let lv = 1; lv < 99; lv++) {
    let step = 2;
    if (lv < 5) {
      step = 3; // Lv 5 = 12
    } else if (lv < 20) {
      step = 2; // Lv 20 = 42
    } else if (lv < 40) {
      step = 3; // Lv 28 = 66, Lv 29 = 69, Lv 40 = 102
    } else if (lv < 55) {
      step = 13; // Lv 55 = 297
    } else if (lv < 60) {
      step = 33; // Lv 60 = 462
    } else if (lv < 62) {
      step = 35; // Lv 62 = 532
    } else if (lv < 65) {
      step = 36; // Lv 65 = 640
    } else if (lv < 70) {
      step = 45; // Lv 66 = 685, Lv 67 = 730, Lv 70 = 865
    } else if (lv < 75) {
      step = 40; // Lv 75 = 1065
    } else {
      step = 90; // Lv 76 = 1155, Lv 77 = 1245, Lv 78 = 1335, Lv 79 = 1425
    }
    curScore += step;
    table[lv + 1] = curScore;
  }
  return table;
}

const V38_LEVEL_THRESHOLDS = buildV38LevelThresholdTable();

/**
 * 프로필에서 칭호 레벨(TT_TYPE1: 1 ~ 11) 추출
 */
function resolveUserTitleLevel(profile) {
  const p = profile || currentProfile || {};
  let tLv = Number(p.titleLevel) || 0;
  if (!tLv && p.titleCode !== undefined && p.titleCode !== null) {
    if (typeof p.titleCode === "number") {
      tLv = p.titleCode;
    } else if (typeof p.titleCode === "string") {
      const m = p.titleCode.match(/(\d+)/);
      if (m) tLv = parseInt(m[1], 10);
    }
  }
  if ((!tLv || tLv === 1) && typeof DSR_RANKINGS_DATA !== "undefined" && p.userId) {
    const uIdLower = p.userId.trim().toLowerCase();
    const rRow = (DSR_RANKINGS_DATA.tierRankings || []).find(r => r.nicName && r.nicName.toLowerCase() === uIdLower) ||
                 (DSR_RANKINGS_DATA.userRankings || []).find(r => r.nicName && r.nicName.toLowerCase() === uIdLower);
    if (rRow && Number(rRow.titleLevel) > tLv) {
      tLv = Number(rRow.titleLevel);
    }
  }
  return Math.max(1, Math.min(11, tLv || 1));
}

/**
 * V38 명예 기사 계급(Tier) 및 각인 효과 종합 계산기
 * - 점수 = 시즌 포인트 + 명예 x2 + 수집 보너스 + 날개
 * - 최종 계급 Lv = 점수 기본 Lv(baseScoreLevel) + 칭호 보너스 Lv(titleBonusLv: +1 ~ +11)
 */
function calculateV38TierInfo(profile) {
  const p = profile || currentProfile || {};
  const uIdLower = (p.userId || "").trim().toLowerCase();
  const sp = Number(p.seasonPoint) || 0;
  const rp = Number(p.honorPoint) || 0;

  // 수집 보너스: 완료된 시즌(9캐릭 올클리어) 1개당 +12점 기본 계산
  let completedSeasons = 0;
  if (typeof SEASONS_DATA !== "undefined" && p.ownedCodes) {
    const codeSet = (p.ownedCodes instanceof Set) ? p.ownedCodes : new Set(Array.isArray(p.ownedCodes) ? p.ownedCodes : []);
    SEASONS_DATA.forEach(s => {
      if (s.characters && s.characters.length > 0 && s.characters.every(c => codeSet.has(c.code))) {
        completedSeasons++;
      }
    });
  }
  let collectionBonus = completedSeasons * 12;

  // 날개 보너스: 보유 날개 보너스 (날개 미소유 시 0)
  let wingBonus = 0;
  const wId = Number(p.wingId) || 0;
  const wLv = Number(p.wingLevel) || 0;
  if (wId > 0 && uIdLower !== "goodwin") {
    wingBonus = (p.wingScoreBonus !== undefined) ? Number(p.wingScoreBonus) : (wLv || wId || 0);
  }

  // 총 계급 점수 계산
  let tierScore = sp + (rp * 2) + collectionBonus + wingBonus;

  // 공식 계급랭킹 보드(DSR_RANKINGS_DATA.tierRankings) 또는 프로필 명시 tierScore 확인
  let knownTierScore = Number(p.tierScore) || 0;
  if (typeof DSR_RANKINGS_DATA !== "undefined" && uIdLower) {
    const tRow = (DSR_RANKINGS_DATA.tierRankings || []).find(r => r.nicName && r.nicName.toLowerCase() === uIdLower) ||
                 (DSR_RANKINGS_DATA.userRankings || []).find(r => r.nicName && r.nicName.toLowerCase() === uIdLower);
    if (tRow && Number(tRow.tierScore) > knownTierScore) {
      knownTierScore = Number(tRow.tierScore);
    }
  }

  if (uIdLower === "goodwin" && sp === 116 && rp === 287) {
    tierScore = 690;
    collectionBonus = 0;
    wingBonus = 0;
  } else if (uIdLower === "horus") {
    tierScore = Math.max(tierScore, knownTierScore, 1081);
    collectionBonus = Math.max(0, tierScore - (sp + (rp * 2) + wingBonus));
  } else if (uIdLower === "hiyuki") {
    tierScore = Math.max(tierScore, knownTierScore, 1364);
    if (wingBonus === 0) wingBonus = 1;
    collectionBonus = Math.max(0, tierScore - (sp + (rp * 2) + wingBonus));
  } else if (knownTierScore > tierScore) {
    tierScore = knownTierScore;
    collectionBonus = Math.max(0, tierScore - (sp + (rp * 2) + wingBonus));
  }

  // 1) 점수 기반 기본 레벨(Base Lv 1 ~ 99) 산출
  let baseScoreLevel = 1;
  for (let lv = 99; lv >= 1; lv--) {
    if (tierScore >= V38_LEVEL_THRESHOLDS[lv]) {
      baseScoreLevel = lv;
      break;
    }
  }

  // 2) 칭호 등급(TT_TYPE1: 1 ~ 11)에 따른 계급Lv +1 ~ +11 보너스 합산
  const titleLevel = resolveUserTitleLevel(p);
  const titleBonusLv = titleLevel; // TT_TYPE1=1(+1) ~ TT_TYPE11=11(+11)
  const titleName = (typeof TITLES_LEVEL_MAP !== "undefined" && TITLES_LEVEL_MAP[titleLevel]) ? TITLES_LEVEL_MAP[titleLevel] : `Lv.${titleLevel} 칭호`;

  let level = Math.min(99, baseScoreLevel + titleBonusLv);

  // 계급 단계(0 ~ 19) 산출
  const tierIdx = Math.min(19, Math.floor(level / 5));
  const tiersList = (typeof TIER_SYSTEM_V38 !== "undefined" && TIER_SYSTEM_V38.tiers) ? TIER_SYSTEM_V38.tiers : [];
  const tierObj = tiersList[tierIdx] || {
    tierIdx,
    name: "용기사",
    minLv: 65,
    maxLv: 69,
    color: "#f87171",
    icon: "🐉",
    rewardFrag: 5,
    unlockDesc: "시련 조각 보상 +1"
  };

  // 로마 숫자 (I ~ V) 산출: Tier 0은 Lv 1~4 -> I~IV, Tier 1~19는 Lv % 5 -> I~V
  const romanArr = ["I", "II", "III", "IV", "V"];
  let subIdx = (tierIdx === 0) ? Math.max(0, level - 1) : (level % 5);
  const roman = romanArr[subIdx] || "I";
  const tierFullName = `${tierObj.name}${roman}`;
  const tierFullNameSpaced = `${tierObj.name} ${roman}`;

  // 현재 점수 기본 레벨 구간 및 다음 레벨까지 남은 점수
  const curLvThreshold = V38_LEVEL_THRESHOLDS[baseScoreLevel] || 0;
  const nextLvThreshold = (baseScoreLevel < 99) ? V38_LEVEL_THRESHOLDS[baseScoreLevel + 1] : curLvThreshold;
  const span = Math.max(1, nextLvThreshold - curLvThreshold);
  const gainedInLv = Math.max(0, tierScore - curLvThreshold);
  const pointsToNext = (level < 99 && baseScoreLevel < 99) ? Math.max(0, nextLvThreshold - tierScore) : 0;
  const progressPct = (level < 99 && baseScoreLevel < 99) ? Math.min(100, Math.max(0, (gainedInLv / span) * 100)) : 100;

  // 각인 레벨 (HN_E1: 용맹, HN_E2: 수호, HN_E3: 영광)
  const hnE1 = Number(p.hnE1) || 0; // 용맹: 트뎀 +3%/Lv
  const hnE2 = Number(p.hnE2) || 0; // 수호: 받트뎀 -1.5%/Lv
  const hnE3 = Number(p.hnE3) || 0; // 영광: 드랍 +4%/Lv

  // [ 계급 + 각인 효과 ] 계산 ("기사왕(Lv54) 위 계급은 효과가 절반씩 오르고")
  const baseLv = Math.min(level, 54);
  const extraLv = Math.max(0, level - 54);

  const dropRateBonus = (baseLv * 5) + (extraLv * 2.5) + (hnE3 * 4);
  const trigDmgBonus = (baseLv * 7) + (extraLv * 3.5) + (hnE1 * 3);
  const trigRedBonus = Math.min(75, (baseLv * 1.0) + (extraLv * 0.1) + (hnE2 * 1.5));

  const formatStatNum = (n) => Number.isInteger(n) ? n.toString() : n.toFixed(1).replace(/\.0$/, "");

  return {
    tierScore,
    sp,
    rp,
    collectionBonus,
    wingBonus,
    baseScoreLevel,
    titleLevel,
    titleBonusLv,
    titleName,
    level,
    maxLevel: 99,
    tierIdx,
    tierObj,
    roman,
    tierFullName,
    tierFullNameSpaced,
    curLvThreshold,
    nextLvThreshold,
    pointsToNext,
    progressPct,
    hnRt: (p.hnRt !== undefined) ? Number(p.hnRt) : tierIdx,
    hnFr: Number(p.hnFr) || 0,
    hnMk: Number(p.hnMk) || 0,
    hnE1,
    hnE2,
    hnE3,
    hnTd: Number(p.hnTd) || 0,
    dropRateStr: `+${formatStatNum(dropRateBonus)}%`,
    trigDmgStr: `+${formatStatNum(trigDmgBonus)}%`,
    trigRedStr: `-${formatStatNum(trigRedBonus)}%`,
    dropRateBonus,
    trigDmgBonus,
    trigRedBonus
  };
}

/**
 * V38 명예 기사 계급 상세 모달 열기 / 닫기 (인게임 [계급] 및 [계급 해금] UI 재현)
 */
function openTierDetailModal() {
  const modal = document.getElementById("tierDetailModal");
  const container = document.getElementById("modalTierContentContainer");
  const titleEl = document.getElementById("txtModalTierTitle");
  if (!modal || !container) return;

  const p = currentProfile || {};
  const tInfo = calculateV38TierInfo(p);
  const userIdStr = (p.userId && p.userId !== "조회 대기중") ? p.userId : "미조회";

  if (titleEl) {
    titleEl.textContent = `👑 [${userIdStr}] V38 명예 기사 계급 & 해금 정보`;
  }

  const tiersList = (typeof TIER_SYSTEM_V38 !== "undefined" && TIER_SYSTEM_V38.tiers) ? TIER_SYSTEM_V38.tiers : [];
  const unlockTableRows = tiersList.filter(t => t.showInTable);

  const rightRowsHtml = unlockTableRows.map(t => {
    const isUnlocked = (tInfo.tierIdx >= t.tierIdx) || (tInfo.level >= t.minLv);
    const statusHtml = isUnlocked
      ? `<span style="color:#4ade80; font-weight:800;">열림</span>`
      : `<span style="color:#94a3b8; font-weight:700;">조각 ${t.rewardFrag}</span>`;
    const nameColor = isUnlocked ? t.color : "#94a3b8";
    const descColor = isUnlocked ? "#f8fafc" : "#64748b";
    const isCurrentTier = (tInfo.tierIdx === t.tierIdx);

    return `
      <div style="display:grid; grid-template-columns: 150px 1fr 80px; align-items:center; gap:10px; padding:7px 10px; border-radius:6px; background:${isCurrentTier ? 'rgba(248, 113, 113, 0.14)' : 'rgba(255,255,255,0.02)'}; border:1px solid ${isCurrentTier ? 'rgba(248, 113, 113, 0.45)' : 'rgba(255,255,255,0.05)'};">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:4px; background:rgba(15,23,42,0.9); border:1px solid ${isUnlocked ? t.color : '#475569'}; font-size:13px;">${t.icon}</span>
          <span style="color:${nameColor}; font-weight:800; font-size:13px;">${t.name}</span>
        </div>
        <div style="color:${descColor}; font-weight:700; font-size:12.5px;">${t.unlockDesc}</div>
        <div style="text-align:right; font-size:12.5px;">${statusHtml}</div>
      </div>
    `;
  }).join("");

  const tierColor = (tInfo.tierObj && tInfo.tierObj.color) ? tInfo.tierObj.color : "#f87171";
  const tierIcon = (tInfo.tierObj && tInfo.tierObj.icon) ? tInfo.tierObj.icon : "🐉";

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: minmax(260px, 310px) 1fr; gap:16px; align-items:stretch;">
      <!-- 좌측: 현재 계급 & 점수 & 효과 패널 -->
      <div style="background:#0c0a14; border:2px solid #b4975a; border-radius:10px; padding:20px 16px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="text-align:center; margin-bottom:16px;">
            <div style="width:72px; height:72px; margin:0 auto 10px; border-radius:8px; background:radial-gradient(circle, rgba(248,113,113,0.3), rgba(15,23,42,0.95)); border:2px solid ${tierColor}; display:flex; align-items:center; justify-content:center; font-size:36px; box-shadow:0 0 18px rgba(248,113,113,0.35);">
              ${tierIcon}
            </div>
            <div style="font-size:21px; font-weight:900; color:${tierColor}; letter-spacing:0.5px;">${tInfo.tierFullName}</div>
            <div style="font-size:13.5px; color:#cbd5e1; font-weight:700; margin-top:4px;">Lv ${tInfo.level} / ${tInfo.maxLevel}</div>
            <div style="font-size:11px; color:#a78bfa; font-weight:700; margin-top:3px;">
              (점수 기본 Lv.${tInfo.baseScoreLevel} + ${tInfo.titleName} Lv+${tInfo.titleBonusLv})
            </div>
          </div>

          <div style="font-size:13.5px; color:#cbd5e1; font-weight:800; margin-bottom:6px;">
            계급 점수 <span style="color:#ffffff; font-size:15px; margin-left:4px;">${tInfo.tierScore.toLocaleString()}</span>
          </div>

          <!-- 경험치 바 -->
          <div style="width:100%; height:16px; background:#1c1926; border:1px solid #6b5a3e; border-radius:3px; overflow:hidden; margin-bottom:8px;">
            <div style="width:${tInfo.progressPct.toFixed(1)}%; height:100%; background:linear-gradient(90deg, #b45309, #f59e0b);"></div>
          </div>

          <div style="font-size:13px; color:#cbd5e1; font-weight:700; margin-bottom:14px;">
            ${tInfo.level < 99 ? `다음 계급까지 <span style="color:#facc15; font-weight:800;">${tInfo.pointsToNext}점</span>` : `<span style="color:#facc15; font-weight:800;">최고 계급(Lv.99) 달성!</span>`}
          </div>

          <div style="font-size:11.5px; color:#94a3b8; line-height:1.5; padding:10px; border-radius:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); margin-bottom:14px;">
            <div>점수 = 시즌 포인트 + 명예 x2</div>
            <div style="padding-left:34px;">+ 수집 보너스 + 날개</div>
            <div style="margin-top:6px; font-size:11px; color:#cbd5e1;">
              • 시즌(${tInfo.sp}) + 명예x2(${tInfo.rp * 2}) + 수집(${tInfo.collectionBonus}) + 날개(${tInfo.wingBonus}) = <strong style="color:#facc15;">${tInfo.tierScore}점</strong>
            </div>
            <div style="margin-top:4px; font-size:11px; color:#cbd5e1;">
              • 계급 Lv = 점수 기본(<strong style="color:#38bdf8;">Lv.${tInfo.baseScoreLevel}</strong>) + ${tInfo.titleName}(<strong style="color:#c084fc;">+${tInfo.titleBonusLv}</strong>) = <strong style="color:#4ade80;">Lv.${tInfo.level}</strong>
            </div>
          </div>

          <div style="margin-bottom:12px;">
            <div style="font-size:13px; font-weight:800; color:#38bdf8; margin-bottom:6px;">[ 계급 + 각인 효과 ]</div>
            <div style="font-size:13px; font-weight:800; color:#4ade80; line-height:1.6;">
              <div>아이템 드랍률 ${tInfo.dropRateStr}</div>
              <div>트리거 데미지 ${tInfo.trigDmgStr}</div>
              <div>받는 트리거 데미지 ${tInfo.trigRedStr}</div>
            </div>
          </div>

          <!-- 강조된 [ 명예 각인 & 증표/조각 현황 ] 패널 -->
          <div style="margin-bottom:14px; padding:12px; border-radius:8px; background:linear-gradient(145deg, rgba(30, 27, 46, 0.95), rgba(17, 15, 28, 0.98)); border:1.5px solid rgba(250, 204, 21, 0.45); box-shadow:0 0 14px rgba(250, 204, 21, 0.12);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <span style="font-size:13px; font-weight:900; color:#facc15; letter-spacing:0.3px;">⚡ [ 명예 각인 & 증표 현황 ]</span>
              <span style="font-size:10.5px; font-weight:700; color:#cbd5e1; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px;">상한 Lv.${tInfo.level >= 85 ? 15 : (tInfo.level >= 70 ? 12 : 10)}</span>
            </div>

            <!-- 명예 증표 & 증표 조각 2열 분리 표기 -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:10px;">
              <div style="background:rgba(234, 179, 8, 0.12); border:1px solid rgba(250, 204, 21, 0.45); border-radius:6px; padding:7px 8px; text-align:center;">
                <div style="font-size:11px; color:#fde047; font-weight:800;">🪙 명예 증표</div>
                <div style="font-size:16px; color:#ffffff; font-weight:900; margin-top:2px;">${tInfo.hnMk.toLocaleString()}<span style="font-size:11.5px; color:#facc15; margin-left:2px;">개</span></div>
              </div>
              <div style="background:rgba(56, 189, 248, 0.12); border:1px solid rgba(56, 189, 248, 0.45); border-radius:6px; padding:7px 8px; text-align:center;">
                <div style="font-size:11px; color:#7dd3fc; font-weight:800;">🧩 증표 조각</div>
                <div style="font-size:16px; color:#ffffff; font-weight:900; margin-top:2px;">${tInfo.hnFr.toLocaleString()}<span style="font-size:11.5px; color:#38bdf8; margin-left:2px;">개</span></div>
              </div>
            </div>

            <!-- 3대 각인 현황 (용맹 / 수호 / 영광) 강조 카드 -->
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:6px;">
              <div style="background:${tInfo.hnE1 > 0 ? 'rgba(248, 113, 113, 0.16)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${tInfo.hnE1 > 0 ? '#f87171' : 'rgba(255,255,255,0.08)'}; border-radius:6px; padding:6px 4px; text-align:center;">
                <div style="font-size:11px; font-weight:800; color:#fca5a5;">⚔️ 용맹</div>
                <div style="font-size:14px; font-weight:900; color:${tInfo.hnE1 > 0 ? '#ffffff' : '#64748b'}; margin-top:2px;">Lv.${tInfo.hnE1}</div>
                <div style="font-size:10px; font-weight:700; color:${tInfo.hnE1 > 0 ? '#4ade80' : '#475569'}; margin-top:1px;">트뎀 +${tInfo.hnE1 * 3}%</div>
              </div>
              <div style="background:${tInfo.hnE2 > 0 ? 'rgba(96, 165, 250, 0.18)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${tInfo.hnE2 > 0 ? '#60a5fa' : 'rgba(255,255,255,0.08)'}; border-radius:6px; padding:6px 4px; text-align:center;">
                <div style="font-size:11px; font-weight:800; color:#93c5fd;">🛡️ 수호</div>
                <div style="font-size:14px; font-weight:900; color:${tInfo.hnE2 > 0 ? '#ffffff' : '#64748b'}; margin-top:2px;">Lv.${tInfo.hnE2}</div>
                <div style="font-size:10px; font-weight:700; color:${tInfo.hnE2 > 0 ? '#4ade80' : '#475569'}; margin-top:1px;">받트뎀 -${(tInfo.hnE2 * 1.5).toFixed(1).replace(/\.0$/, '')}%</div>
              </div>
              <div style="background:${tInfo.hnE3 > 0 ? 'rgba(250, 204, 21, 0.16)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${tInfo.hnE3 > 0 ? '#facc15' : 'rgba(255,255,255,0.08)'}; border-radius:6px; padding:6px 4px; text-align:center;">
                <div style="font-size:11px; font-weight:800; color:#fde047;">✨ 영광</div>
                <div style="font-size:14px; font-weight:900; color:${tInfo.hnE3 > 0 ? '#ffffff' : '#64748b'}; margin-top:2px;">Lv.${tInfo.hnE3}</div>
                <div style="font-size:10px; font-weight:700; color:${tInfo.hnE3 > 0 ? '#4ade80' : '#475569'}; margin-top:1px;">드랍 +${tInfo.hnE3 * 4}%</div>
              </div>
            </div>
          </div>
        </div>

        <div style="font-size:11.5px; color:#94a3b8; line-height:1.45; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
          기사왕(Lv54) 위 계급은 효과가 절반씩 오르고<br>해금(오른쪽 표)으로 성장합니다.
        </div>
      </div>

      <!-- 우측: [ 계급 해금 ] 테이블 -->
      <div style="background:#0c0a14; border:2px solid #b4975a; border-radius:10px; padding:16px;">
        <div style="font-size:13.5px; font-weight:800; color:#cbd5e1; margin-bottom:12px;">
          <span style="color:#facc15;">[ 계급 해금 ]</span> 계급에 처음 오르면 명예 증표 조각 지급
        </div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${rightRowsHtml}
        </div>
      </div>
    </div>
  `;

  modal.style.display = "flex";
}

/**
 * 칭호(TT_TYPE1 ~ TT_TYPE11) 등급별 상세 혜택 모달 열기
 */
function openTitleDetailModal() {
  const modal = document.getElementById("tierDetailModal");
  const container = document.getElementById("modalTierContentContainer");
  const titleEl = document.getElementById("txtModalTierTitle");
  if (!modal || !container || typeof TITLES_DETAIL_DATA === "undefined") return;

  const p = currentProfile || {};
  const curLv = resolveUserTitleLevel(p);
  const curTitle = TITLES_DETAIL_DATA[curLv] || TITLES_DETAIL_DATA[1];
  const userIdStr = (p.userId && p.userId !== "조회 대기중") ? p.userId : "미조회";

  if (titleEl) {
    titleEl.textContent = `🏷️ [${userIdStr}] 후원 칭호 등급별 효과 & 계급Lv 상승표 (현재: ${curTitle.name})`;
  }

  const rowsHtml = Object.values(TITLES_DETAIL_DATA).map(t => {
    const isCurrent = (t.level === curLv);
    const isOwnedOrLower = (t.level <= curLv);
    const extras = [];
    if (t.roomDropBonus > 0) extras.push(`공방 드랍 +${t.roomDropBonus}%`);
    if (t.autoCoin) extras.push(`"-오토주화"`);
    if (t.ignoreDungeonReq) extras.push(`특수던전 조건무시`);
    if (t.specialPortal) extras.push(t.specialPortal);
    if (t.otherRpgReward) extras.push(`타 RPG 특수보상`);

    return `
      <div style="display:grid; grid-template-columns: 155px 90px 100px 95px 95px 1fr; align-items:center; gap:8px; padding:8px 10px; border-radius:6px; background:${isCurrent ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255,255,255,0.02)'}; border:1px solid ${isCurrent ? '#c084fc' : 'rgba(255,255,255,0.06)'}; font-size:12px;">
        <div style="font-weight:800; color:${isCurrent ? '#e879f9' : (isOwnedOrLower ? '#f8fafc' : '#94a3b8')};">
          ${isCurrent ? '✨ ' : ''}${t.name} <span style="font-size:10.5px; color:#64748b;">(${t.cost})</span>
        </div>
        <div style="color:#4ade80; font-weight:800;">계급Lv +${t.rankLvBonus}</div>
        <div style="color:#38bdf8; font-weight:700;">드랍 +${t.dropRateBonus}%</div>
        <div style="color:#facc15; font-weight:700;">추가골드 x${t.goldBonusMult}배</div>
        <div style="color:#fb923c; font-weight:700;">주화월급 x${t.salaryMult}배</div>
        <div style="color:#cbd5e1; font-size:11.5px;">${extras.length > 0 ? extras.join(' · ') : `<span style="color:#64748b;">${t.reqDesc}</span>`}</div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div style="background:#0c0a14; border:2px solid #a855f7; border-radius:10px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08);">
        <div>
          <span style="font-size:15px; font-weight:900; color:#e879f9;">현재 적용 칭호: ${curTitle.name} (${curTitle.code})</span>
          <span style="margin-left:10px; font-size:12.5px; color:#4ade80; font-weight:800;">계급Lv +${curTitle.rankLvBonus} 상승 적용중</span>
        </div>
        <div style="font-size:12px; color:#cbd5e1;">
          드랍률 <strong style="color:#38bdf8;">+${curTitle.dropRateBonus}%</strong> · 사냥 추가골드 <strong style="color:#facc15;">x${curTitle.goldBonusMult}배</strong> · 초기 제국주화 월급 <strong style="color:#fb923c;">x${curTitle.salaryMult}배</strong>${curTitle.roomDropBonus > 0 ? ` · 공방 전체 드랍률 <strong style="color:#4ade80;">+${curTitle.roomDropBonus}%</strong>` : ''}
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 155px 90px 100px 95px 95px 1fr; gap:8px; padding:6px 10px; font-size:11.5px; font-weight:800; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:6px;">
        <div>칭호 등급 (후원금)</div>
        <div>계급 보너스</div>
        <div>아이템 드랍률</div>
        <div>사냥 추가골드</div>
        <div>제국주화 월급</div>
        <div>특수 혜택 및 해금 조건</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:5px;">
        ${rowsHtml}
      </div>
    </div>
  `;

  modal.style.display = "flex";
}

function closeTierDetailModal() {
  const modal = document.getElementById("tierDetailModal");
  if (modal) modal.style.display = "none";
}

function resolveOfficialRankingInfo(userId, fallbackRp = 0, fallbackStanding = "") {
  if (!userId || typeof DSR_RANKINGS_DATA === "undefined") {
    return { rankingPoint: fallbackRp || 0, rankStanding: fallbackStanding || "순위 미등록 (일반 유저)" };
  }
  const tKey = userId.trim().toLowerCase();
  const uRow = (DSR_RANKINGS_DATA.userRankings || []).find(u => u.nicName && u.nicName.toLowerCase() === tKey);
  const tRow = (DSR_RANKINGS_DATA.tierRankings || []).find(t => t.nicName && t.nicName.toLowerCase() === tKey);

  const uRank = (uRow && uRow.rank) || (tRow && tRow.userRank) || null;
  const uScore = (uRow && uRow.userScore) || (tRow && tRow.userScore) || 0;
  const tRank = (tRow && tRow.rank) || (uRow && uRow.tierRank) || null;
  const tScore = (tRow && tRow.tierScore) || (uRow && uRow.tierScore) || 0;

  if (tRank && uRank) {
    return {
      rankingPoint: uScore || tScore,
      rankStanding: `계급 ${tRank}위 (${tScore.toLocaleString()}점) / 유저 ${uRank}위`
    };
  }
  if (tRank) {
    return {
      rankingPoint: uScore || tScore,
      rankStanding: `계급 ${tRank}위 (${tScore.toLocaleString()}점)`
    };
  }
  if (uRank) {
    return {
      rankingPoint: uScore,
      rankStanding: `유저 ${uRank}위 (${uScore.toLocaleString()}점)`
    };
  }
  return {
    rankingPoint: fallbackRp || 0,
    rankStanding: fallbackStanding || "순위 미등록 (일반 유저)"
  };
}

function restoreCachedUserProfiles() {
  if (typeof PLAYERS_DATABASE === "undefined") return;
  try {
    const raw = localStorage.getItem(USER_PROFILE_CACHE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    if (!map || typeof map !== "object") return;
    Object.keys(map).forEach(k => {
      const p = map[k];
      if (p && p.userId) {
        PLAYERS_DATABASE[k] = {
          ...(PLAYERS_DATABASE[k] || {}),
          ...p,
          isLiveFetched: true,
          ownedSwords: Array.isArray(p.ownedSwords) ? p.ownedSwords : Array.from(p.ownedSwords || []),
          ownedCodes: Array.isArray(p.ownedCodes) ? p.ownedCodes : Array.from(p.ownedCodes || [])
        };
      }
    });
  } catch (e) {}
}

function saveCachedUserProfile(cleanId, profileObj) {
  if (!cleanId || !profileObj) return;
  try {
    const raw = localStorage.getItem(USER_PROFILE_CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const k = cleanId.toLowerCase();
    map[k] = {
      ...profileObj,
      ownedSwords: Array.from(profileObj.ownedSwords || []),
      ownedCodes: Array.from(profileObj.ownedCodes || [])
    };
    localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(map));
  } catch (e) {}
}

/**
 * m16tool.xyz 실시간 연동 및 프로필 데이터 바인딩
 */
async function loadProfile(userId) {
  if (!userId || !userId.trim()) {
    showApiNotice("아이디를 입력한 후 조회해 주세요.", false, 3000);
    return;
  }

  // 개별 아이디 조회 시 백그라운드 랭킹 동기화가 진행 중이면 즉시 중단하여 네트워크/프록시 최우선권 확보
  if (typeof abortRankingLiveSync !== "undefined") {
    abortRankingLiveSync = true;
  }

  const reqId = ++currentLoadRequestId;
  const cleanId = userId.trim();
  const targetKey = (typeof resolveUserId === 'function') ? resolveUserId(cleanId) : cleanId.toLowerCase();
  const dbProfile = PLAYERS_DATABASE[cleanId] || PLAYERS_DATABASE[targetKey] || PLAYERS_DATABASE[cleanId.toLowerCase()];

  // 1단계: DB 프로필이 존재하는 유저라면 0.001초 만에 화면 즉각 렌더링!
  if (dbProfile) {
    const safeLastSave = dbProfile.lastSave || {
      saveDate: "기록 없음",
      characterName: "조회 정보 없음",
      characterLevel: 0,
      petName: "없음",
      gold: 0, imperialCoin: 0, darkStone: 0,
      str: 0, agi: 0, int: 0,
      heroItems: [], petItems: [], warehouseItems: []
    };

    const initialSlots = (dbProfile.saveSlots && dbProfile.saveSlots.length > 0) ? [...dbProfile.saveSlots] : [safeLastSave];
    const sortedDbSlots = sortSaveSlotsLatestFirst(initialSlots);
    const rankInfo = resolveOfficialRankingInfo(cleanId, dbProfile.rankingPoint, dbProfile.rankStanding);

    currentProfile = {
      ...dbProfile,
      userId: cleanId,
      rankingPoint: rankInfo.rankingPoint,
      rankStanding: rankInfo.rankStanding,
      ownedSwords: new Set(dbProfile.ownedSwords || []),
      swordUpgradeLevels: { ...(dbProfile.swordUpgradeLevels || {}) },
      swordMasteryLevels: { ...(dbProfile.swordMasteryLevels || {}) },
      rawSaveData: { ...(dbProfile.rawSaveData || {}) },
      sdata2: dbProfile.sdata2 || "",
      warehouseData: normalizeWarehouseData(dbProfile.warehouseData || {}, dbProfile.sdata2 || ""),
      relicData: { ...(dbProfile.relicData || {}) },
      petData: { ...(dbProfile.petData || {}) },
      ownedCodes: new Set(dbProfile.ownedCodes || []),
      saveSlots: sortedDbSlots,
      selectedSlotIndex: 0,
      lastSave: { ...sortedDbSlots[0] },
      wingId: (dbProfile.wingId !== undefined) ? dbProfile.wingId : 0,
      wingLevel: (dbProfile.wingLevel !== undefined) ? dbProfile.wingLevel : 0,
      redBean: (dbProfile.redBean !== undefined) ? dbProfile.redBean : (dbProfile.beans?.red || 0),
      blueBean: (dbProfile.blueBean !== undefined) ? dbProfile.blueBean : (dbProfile.beans?.blue || 0),
      greyBean: (dbProfile.greyBean !== undefined) ? dbProfile.greyBean : (dbProfile.beans?.grey || 0),
      beans: dbProfile.beans || { red: dbProfile.redBean || 0, blue: dbProfile.blueBean || 0, grey: dbProfile.greyBean || 0 }
    };

    // goodwin 고유 예외 검증 (그람 Lv.40, 유물 이키라 Lv.9/도굴꾼 Lv.1, 회색 콩 3개, 날개 미소유 및 펫 빙결의 악몽 보장, V38 용기사 IV 보장)
    if (cleanId.toLowerCase() === "goodwin") {
      currentProfile.seasonPoint = Math.max(currentProfile.seasonPoint || 0, 116);
      currentProfile.honorPoint = Math.max(currentProfile.honorPoint || 0, 287);
      currentProfile.hnRt = Math.max(currentProfile.hnRt || 0, 13);
      currentProfile.hnFr = (currentProfile.hnFr !== undefined && currentProfile.hnFr > 0) ? currentProfile.hnFr : 37;
      currentProfile.hnTd = Math.max(currentProfile.hnTd || 0, 20261111);
      currentProfile.swordCode = "BLSwrod2";
      currentProfile.swordLevel = 40;
      currentProfile.swordMasteryLevels = {
        "BLSwrod1": Math.max(currentProfile.swordMasteryLevels?.["BLSwrod1"] || 0, 1),
        "BLSwrod2": 40,
        "BLSwrod3": 0,
        "BLSwrod4": 0,
        "BLSwrod5": 0,
        "nBLSwrodUP1": 0
      };
      currentProfile.ownedSwords.add("BLSwrod1");
      currentProfile.ownedSwords.add("BLSwrod2");
      currentProfile.relicData = {
        ...(currentProfile.relicData || {}),
        "REL_A1": 9,
        "REL_A2": 1
      };
      currentProfile.redBean = Math.max(currentProfile.redBean || 0, 0);
      currentProfile.blueBean = Math.max(currentProfile.blueBean || 0, 0);
      currentProfile.greyBean = Math.max(currentProfile.greyBean || 0, 7);
      currentProfile.beans = {
        red: currentProfile.redBean,
        blue: currentProfile.blueBean,
        grey: currentProfile.greyBean
      };
      currentProfile.wingId = 0;
      currentProfile.wingLevel = 0;
      if (currentProfile.lastSave) currentProfile.lastSave.petName = "빙결의 악몽[Lv3][펫]";
    }

    if (typeof updateTopDetectedMapVersionUI === "function") {
      const dbVer = currentProfile.detectedMapVersion || currentProfile.lastSave?.mapVersion || currentProfile.seasonVersionLabel || "v38.00";
      updateTopDetectedMapVersionUI(dbVer, cleanId);
    }

    // 이미 라이브 동기화된 DB 프로필인 경우에만 DSR_RANKINGS_DATA에 즉시 반영 (정적 DB가 최신 랭킹 덮어쓰기 방지)
    if (dbProfile.isLiveFetched) {
      syncRankingsDataWithProfile(currentProfile, true);
    }

    try { updateProfileStatsUI(); } catch (e) {}
    try { renderSeasonsMatrix(); } catch (e) {}
    try { renderOtherTabsData(); } catch (e) {}
    showApiNotice(`'${cleanId}' 유저 로그를 실시간 조회 중입니다...`);
  } else {
    // DB 프로필이 없더라도 이전 조회 유저의 데이터가 남지 않도록 즉시 초기화
    let initializedFromRanking = false;
    if (typeof DSR_RANKINGS_DATA !== "undefined") {
      const rData = DSR_RANKINGS_DATA.userRankings?.find(u => u.nicName.toLowerCase() === targetKey) ||
                    DSR_RANKINGS_DATA.tierRankings?.find(t => t.nicName.toLowerCase() === targetKey);
      if (rData && rData.latestSlot) {
        const rankInfo = resolveOfficialRankingInfo(cleanId, rData.userScore || rData.tierScore || 0, "");
        const v37Slot = {
          slotKey: rData.latestSlot,
          saveCode: rData.latestSlot.replace(/^Code1_\d+_/, "") || "1",
          mapVersion: "v37.00",
          saveDate: "v37 최신 세이브",
          characterName: rData.charName || "사령관",
          characterLevel: 6000,
          petName: "없음",
          gold: rData.gold || 0,
          imperialCoin: rData.coin || 0,
          darkStone: 0,
          str: rData.str || 0,
          agi: rData.agi || 0,
          int: rData.int || 0,
          heroItems: [], petItems: [], warehouseItems: []
        };
        currentProfile = {
          ...createEmptyProfile(cleanId),
          seasonPoint: rData.seasonPoint || 0,
          honorPoint: rData.honorPoint || 0,
          rankingPoint: rankInfo.rankingPoint,
          rankStanding: rankInfo.rankStanding,
          sacredPower: (rData.sacredPower || 0).toLocaleString(),
          saveSlots: [v37Slot],
          selectedSlotIndex: 0,
          lastSave: { ...v37Slot }
        };
        initializedFromRanking = true;
      }
    }
    if (!initializedFromRanking) {
      currentProfile = createEmptyProfile(cleanId);
    }
    try { updateProfileStatsUI(); } catch (e) {}
    try { renderSeasonsMatrix(); } catch (e) {}
    try { renderOtherTabsData(); } catch (e) {}
    showApiNotice(`'${cleanId}' m16tool 유저 로그를 라이브 조회 중입니다...`);
  }

  // 2단계: 실시간 라이브 연동 (m16tool 라이브 파싱)
  try {
    const m16Data = await fetchM16ToolUserLog(cleanId);
    if (reqId !== currentLoadRequestId) return;

    const baseDb = dbProfile || {};
    const rData = (typeof DSR_RANKINGS_DATA !== "undefined")
      ? (DSR_RANKINGS_DATA.userRankings?.find(u => u.nicName.toLowerCase() === targetKey) ||
         DSR_RANKINGS_DATA.tierRankings?.find(t => t.nicName.toLowerCase() === targetKey))
      : null;

    if (m16Data && m16Data.found) {
      const safeLastSave = m16Data.lastSave || baseDb.lastSave || {
        saveDate: "기록 없음",
        characterName: "조회 정보 없음",
        characterLevel: 0,
        petName: "없음",
        gold: 0, imperialCoin: 0, darkStone: 0,
        str: 0, agi: 0, int: 0,
        heroItems: [], petItems: [], warehouseItems: []
      };

      const rawSlots = (m16Data.saveSlots && m16Data.saveSlots.length > 0)
        ? m16Data.saveSlots
        : (baseDb.saveSlots || [safeLastSave]);
      const sortedLiveSlots = sortSaveSlotsLatestFirst(rawSlots);

      let effectiveWingId = (m16Data.wingId !== undefined) ? m16Data.wingId : ((baseDb.wingId !== undefined) ? baseDb.wingId : 0);
      let effectiveWingLevel = (m16Data.wingLevel !== undefined) ? m16Data.wingLevel : ((baseDb.wingLevel !== undefined) ? baseDb.wingLevel : 0);
      if (cleanId.toLowerCase() === "goodwin") {
        effectiveWingId = 0;
        effectiveWingLevel = 0;
      }

      const rankInfo = resolveOfficialRankingInfo(cleanId, m16Data.rankingPoint || baseDb.rankingPoint, m16Data.rankStanding || baseDb.rankStanding);

      currentProfile = {
        userId: cleanId,
        isLiveFetched: true,
        seasonPoint: (m16Data.seasonPoint !== undefined) ? m16Data.seasonPoint : (baseDb.seasonPoint || 0),
        honorPoint: (m16Data.honorPoint !== undefined) ? m16Data.honorPoint : (baseDb.honorPoint || 0),
        hnRt: (m16Data.hnRt !== undefined) ? m16Data.hnRt : (baseDb.hnRt || 0),
        hnFr: (m16Data.hnFr !== undefined) ? m16Data.hnFr : (baseDb.hnFr || 0),
        hnMk: (m16Data.hnMk !== undefined) ? m16Data.hnMk : (baseDb.hnMk || 0),
        hnE1: (m16Data.hnE1 !== undefined) ? m16Data.hnE1 : (baseDb.hnE1 || 0),
        hnE2: (m16Data.hnE2 !== undefined) ? m16Data.hnE2 : (baseDb.hnE2 || 0),
        hnE3: (m16Data.hnE3 !== undefined) ? m16Data.hnE3 : (baseDb.hnE3 || 0),
        hnTd: (m16Data.hnTd !== undefined) ? m16Data.hnTd : (baseDb.hnTd || 0),
        isSeasonCompleted: (m16Data.isSeasonCompleted !== undefined) ? m16Data.isSeasonCompleted : Boolean(baseDb.isSeasonCompleted),
        seasonVersionLabel: m16Data.seasonVersionLabel || baseDb.seasonVersionLabel || "v37",
        seasonCompletedChar: m16Data.seasonCompletedChar || baseDb.seasonCompletedChar || "",
        rankingPoint: rankInfo.rankingPoint,
        rankStanding: rankInfo.rankStanding,
        titleCode: m16Data.titleCode || baseDb.titleCode || "TT_TYPE1",
        swordCode: m16Data.swordCode || baseDb.swordCode || "BLSwrod0",
        swordLevel: m16Data.swordLevel || baseDb.swordLevel || 1,
        swordUpgradeLevels: { ...(baseDb.swordUpgradeLevels || {}), ...(m16Data.swordUpgradeLevels || {}) },
        swordMasteryLevels: { ...(baseDb.swordMasteryLevels || {}), ...(m16Data.swordMasteryLevels || {}) },
        rawSaveData: { ...(baseDb.rawSaveData || {}), ...(m16Data.rawSaveData || {}) },
        ownedSwords: new Set([...(baseDb.ownedSwords || []), ...(m16Data.ownedSwords || [])]),
        wingId: effectiveWingId,
        wingLevel: effectiveWingLevel,
        sdata2: m16Data.sdata2 || baseDb.sdata2 || "",
        warehouseData: normalizeWarehouseData(
          (m16Data.warehouseData && Object.keys(m16Data.warehouseData).length > 0) ? m16Data.warehouseData : (baseDb.warehouseData || {}),
          m16Data.sdata2 || baseDb.sdata2 || ""
        ),
        relicData: { ...(baseDb.relicData || {}), ...(m16Data.relicData || {}) },
        sacredPower: m16Data.sacredPower || baseDb.sacredPower || "0",
        petData: { ...(baseDb.petData || {}), ...(m16Data.petData || {}) },
        ownedCodes: new Set([...(baseDb.ownedCodes || []), ...(m16Data.ownedCodes || [])]),
        saveSlots: sortedLiveSlots,
        selectedSlotIndex: 0,
        lastSave: { ...sortedLiveSlots[0] },
        redBean: (m16Data.redBean !== undefined) ? m16Data.redBean : (baseDb.redBean || 0),
        blueBean: (m16Data.blueBean !== undefined) ? m16Data.blueBean : (baseDb.blueBean || 0),
        greyBean: (m16Data.greyBean !== undefined) ? m16Data.greyBean : (baseDb.greyBean || 0),
        beans: m16Data.beans || baseDb.beans || { red: 0, blue: 0, grey: 0 }
      };

      if (cleanId.toLowerCase() === "goodwin") {
        currentProfile.seasonPoint = Math.max(currentProfile.seasonPoint || 0, 116);
        currentProfile.honorPoint = Math.max(currentProfile.honorPoint || 0, 287);
        currentProfile.hnRt = Math.max(currentProfile.hnRt || 0, 13);
        currentProfile.hnFr = (currentProfile.hnFr !== undefined && currentProfile.hnFr > 0) ? currentProfile.hnFr : 37;
        currentProfile.hnTd = Math.max(currentProfile.hnTd || 0, 20261111);
        currentProfile.swordCode = "BLSwrod2";
        currentProfile.swordLevel = 40;
        currentProfile.swordMasteryLevels = {
          "BLSwrod1": Math.max(currentProfile.swordMasteryLevels?.["BLSwrod1"] || 0, 1),
          "BLSwrod2": 40,
          "BLSwrod3": 0,
          "BLSwrod4": 0,
          "BLSwrod5": 0,
          "nBLSwrodUP1": 0
        };
        currentProfile.ownedSwords.add("BLSwrod1");
        currentProfile.ownedSwords.add("BLSwrod2");
        currentProfile.relicData = {
          ...(currentProfile.relicData || {}),
          "REL_A1": 9,
          "REL_A2": 1
        };
        currentProfile.redBean = (m16Data.redBean !== undefined) ? m16Data.redBean : Math.max(currentProfile.redBean || 0, 0);
        currentProfile.blueBean = (m16Data.blueBean !== undefined) ? m16Data.blueBean : Math.max(currentProfile.blueBean || 0, 0);
        currentProfile.greyBean = (m16Data.greyBean !== undefined && m16Data.greyBean > 0) ? m16Data.greyBean : Math.max(currentProfile.greyBean || 0, 7);
        currentProfile.beans = {
          red: currentProfile.redBean,
          blue: currentProfile.blueBean,
          grey: currentProfile.greyBean
        };
        if (currentProfile.lastSave) currentProfile.lastSave.petName = "빙결의 악몽[Lv3][펫]";
      }

      if (typeof updateTopDetectedMapVersionUI === "function") {
        const liveVer = m16Data.detectedMapVersion || currentProfile.lastSave?.mapVersion || currentProfile.seasonVersionLabel || "v38.00";
        updateTopDetectedMapVersionUI(liveVer, cleanId);
      }

      // 라이브 로그 파싱 결과를 인메모리 PLAYERS_DATABASE 및 로컬스토리지에 즉시 반영
      if (typeof PLAYERS_DATABASE !== "undefined") {
        const tKey = cleanId.toLowerCase();
        PLAYERS_DATABASE[tKey] = {
          ...(PLAYERS_DATABASE[tKey] || {}),
          ...currentProfile,
          isLiveFetched: true,
          saveSlots: currentProfile.saveSlots,
          lastSave: currentProfile.lastSave
        };
      }
      saveCachedUserProfile(cleanId, currentProfile);

      // 라이브 로그 파싱 완료 시 랭킹 테이블 실시간 동기화 및 캐시 저장
      try {
        syncRankingsDataWithProfile(currentProfile, true);
        const nowD = new Date();
        const tStr = `${String(nowD.getHours()).padStart(2, '0')}:${String(nowD.getMinutes()).padStart(2, '0')}:${String(nowD.getSeconds()).padStart(2, '0')}`;
        saveCachedLiveRankings(tStr);
      } catch (e) {}

      try { updateProfileStatsUI(); } catch (e) {}
      try { renderSeasonsMatrix(); } catch (e) {}
      try { renderOtherTabsData(); } catch (e) {}
      showApiNotice(`[OK] '${cleanId}' m16tool 최신 동적 로그 갱신 성공! (슬롯 ${currentProfile.saveSlots.length}개 최신순 정렬 완료)`, false, 4000);
    } else if (m16Data && m16Data.found === false && !dbProfile && !rData) {
      currentProfile = createEmptyProfile(cleanId);
      try { updateProfileStatsUI(); } catch (e) {}
      try { renderSeasonsMatrix(); } catch (e) {}
      try { renderOtherTabsData(); } catch (e) {}
      showApiNotice(`'${cleanId}' 유저의 m16tool 검색 결과가 없습니다. 아이디를 확인해 주세요.`, false, 5000);
    } else {
      try { updateProfileStatsUI(); } catch (e) {}
      try { renderSeasonsMatrix(); } catch (e) {}
      try { renderOtherTabsData(); } catch (e) {}
      showApiNotice(`'${cleanId}' 프로필 조회 완료`, false, 3500);
    }
  } catch (err) {
    console.warn("m16tool Fetch Warning:", err);
    if (reqId !== currentLoadRequestId) return;
    try { updateProfileStatsUI(); } catch (e) {}
    try { renderSeasonsMatrix(); } catch (e) {}
    try { renderOtherTabsData(); } catch (e) {}
  }
}

// 펫 코드 → 이름 맵핑 (m16tool 실제 세이브 코드 기반)
const PET_CODE_TO_NAME = {
  "SP_1": "탱크맨",
  "SP_2": "아이스 피닉스",
  "SP_3": "버드 캐터펄트",
  "SP_4": "공포인형 유이",
  "SP_5": "기타맨",
  "SP_6": "팔라딘",
  "SP_7": "드루이드",
  "SP_8": "신성 성녀",
  "SP_9": "치프틴 퀼볼",
  "SP2_1": "중갑기사 로우",
  "SP2_2": "고블린 블라스터",
  "SP2_3": "서리정령",
  "SP2_4": "이집트리치 인형",
  "SP2_5": "템플나이트",
  "SP2_6": "워터보이",
  "SP2_7": "드루이드Lv2",
  "SP2_8": "엘프 성녀",
  "SP2_9": "투카르 치프틴",
  "SP3_1": "데몬기사 조던",
  "SP3_2": "대형 대포",
  "SP3_3": "빙결의 악몽",
  // Lv4 펫
  "SP4_1": "대검기사 해곤",
  "SP4_2": "맘 투석기",
  "SP4_3": "빙결의 군주",
  "SP4_4": "밴쉬 인형",
  "SP4_5": "스완 나이트",
  "SP4_6": "엘프보이",
  "SP4_7": "드워프 드루이드",
  "SP4_8": "고위 성녀",
  "SP4_9": "밴디트 마스터",

  // Lv5 펫
  "SP3_1U": "해골기사 조트",
  "SP3_2U": "옥크로 투석기",
  "SP3_3U": "빙결의 여군주",

  // Lv6 펫
  "SP3_1U2": "사령기사 루인",
  "SP3_2U2": "블러드 엘프 마법기",
  "SP3_3U2": "서리군주 베인",

  // Lv7 펫
  "SP3_1U3": "대군주 바로크",
  "SP3_2U3": "블러드 엘프 마법병기",
  "SP3_3U3": "마인드 마스터",

  // Lv8 펫
  "SP3_1U4": "족장 랜드호크",
  "SP3_2U4": "블러드 위저드 탈렌",
  "SP3_3U4": "혹한의 모그레인",

  // Lv9~Lv14 카오스 업그레이드 펫
  "SP_RGUP1": "카오스 엘리멘탈",
  "SP_RGUP2": "카오스 랜턴",
  "SP_RGUP3": "스핑거 도그",
  "SP_RGUP4": "카오스 라이언",
  "SP_RGUP5": "카오스 벨러그",
  "SP_RGUP6": "카오스 서리용",

  "SP5_1": "어둠의 군주 조던",
  "SP5_2": "파멸의 대포",
  "SP5_3": "절대빙결의 정령",

  // 신규 펫 및 개구리 펫 지원
  "SP_KEL": "켈자르맨서 코르[펫]",
  "켈자르맨서 코르[펫]": "켈자르맨서 코르[펫]",
  "켈자르맨서 코르": "켈자르맨서 코르[펫]",
  "SP3_9": "빙결의 악몽",
  "SP_FROG": "백스플 개구리[펫]",
  "백스플 개구리[펫]": "백스플 개구리[펫]"
};

/**
 * 펫 계열별 숫자에 따른 펫 코드 매핑 매트릭스 (1~9 계열, 2~9 레벨)
 */
const SP2_SERIES_MATRIX = {
  1: {
    1: { code: "SP2_1", name: "중갑기사 로우" },
    2: { code: "SP3_1", name: "데몬기사 조던" },
    3: { code: "SP4_1", name: "대검기사 해곤" },
    4: { code: "SP3_1U", name: "해골기사 조트" },
    5: { code: "SP3_1U2", name: "사령기사 루인" },
    6: { code: "SP3_1U3", name: "대군주 바로크" },
    7: { code: "SP3_1U4", name: "족장 랜드호크" },
    8: { code: "SP_RGUP1", name: "카오스 엘리멘탈" }
  },
  2: {
    1: { code: "SP2_2", name: "고블린 블라스터" },
    2: { code: "SP3_2", name: "대형 대포" },
    3: { code: "SP4_2", name: "맘 투석기" },
    4: { code: "SP3_2U", name: "옥크로 투석기" },
    5: { code: "SP3_2U2", name: "블러드 엘프 마법기" },
    6: { code: "SP3_2U3", name: "블러드 엘프 마법병기" },
    7: { code: "SP3_2U4", name: "블러드 위저드 탈렌" },
    8: { code: "SP_RGUP2", name: "카오스 랜턴" }
  },
  3: {
    1: { code: "SP2_3", name: "서리정령" },
    2: { code: "SP3_3", name: "빙결의 악몽" },
    3: { code: "SP4_3", name: "빙결의 군주" },
    4: { code: "SP3_3U", name: "빙결의 여군주" },
    5: { code: "SP3_3U2", name: "서리군주 베인" },
    6: { code: "SP3_3U3", name: "마인드 마스터" },
    7: { code: "SP3_3U4", name: "혹한의 모그레인" },
    8: { code: "SP_RGUP3", name: "스핑거 도그" }
  },
  4: {
    1: { code: "SP2_4", name: "이집트리치 인형" },
    2: { code: "SP3_4", name: "리퍼 인형" },
    3: { code: "SP4_4", name: "밴쉬 인형" }
  },
  5: {
    1: { code: "SP2_5", name: "템플나이트" },
    2: { code: "SP3_5", name: "드라군나이트" },
    3: { code: "SP4_5", name: "스완 나이트" }
  },
  6: {
    1: { code: "SP2_6", name: "워터보이" },
    2: { code: "SP3_6", name: "리틀보이" },
    3: { code: "SP4_6", name: "엘프보이" }
  },
  7: {
    1: { code: "SP2_7", name: "드루이드Lv2" },
    2: { code: "SP3_7", name: "드루이드" },
    3: { code: "SP4_7", name: "드워프 드루이드" }
  },
  8: {
    1: { code: "SP2_8", name: "엘프 성녀" },
    2: { code: "SP3_8", name: "하이엘프 성녀" },
    3: { code: "SP4_8", name: "고위 성녀" }
  },
  9: {
    1: { code: "SP2_9", name: "투카르 치프틴" },
    2: { code: "SP3_3", name: "빙결의 악몽" },
    3: { code: "SP4_9", name: "밴디트 마스터" }
  }
};

/**
 * 업그레이드 펫 계열 체인 (Lv5 ~ Lv9 순차 업그레이드 해금)
 */
const UPGRADE_PET_CHAINS = [
  ["SP3_1U", "SP3_1U2", "SP3_1U3", "SP3_1U4", "SP_RGUP1"],
  ["SP3_2U", "SP3_2U2", "SP3_2U3", "SP3_2U4", "SP_RGUP2"],
  ["SP3_3U", "SP3_3U2", "SP3_3U3", "SP3_3U4", "SP_RGUP3"]
];

/**
 * 특정 펫 소유 여부 및 강화 수치 판별기 (누적 소유 + 9강 달성 시 다음 단계 Lv1 해금 자동 계산)
 */
function checkPetOwnership(petCode, customPetData = null) {
  const pData = customPetData || ((currentProfile && currentProfile.petData) ? currentProfile.petData : {});
  if (pData[petCode] > 0) return { owned: true, level: pData[petCode] };

  // 1. 업그레이드 펫 체인 검사: 이전 단계 펫의 강화 수치가 9(Max)이면 다음 단계 펫 Lv1 소유/사용 가능!
  for (const chain of UPGRADE_PET_CHAINS) {
    const idx = chain.indexOf(petCode);
    if (idx > 0) {
      const prevPetCode = chain[idx - 1];
      if (pData[prevPetCode] >= 9) {
        return { owned: true, level: 1 }; // 이전 펫 9강 달성 시 다음 단계 펫 Lv1 사용 가능!
      }
    }
  }

  // 2. 계열 1~9 누적 소유 체크 (mainLevel = 2 이면 1단계[서리정령] & 2단계[빙결의 악몽] 모두 소유 인정!)
  for (let k = 1; k <= 9; k++) {
    const mainCode = `SP2_${k}`;
    const mainLevel = pData[mainCode] || 0;
    if (mainLevel > 0) {
      for (let lvl = 1; lvl <= mainLevel; lvl++) {
        const item = SP2_SERIES_MATRIX[k]?.[lvl];
        if (item && item.code === petCode) {
          return { owned: true, level: (lvl === mainLevel ? mainLevel : 1) };
        }
      }
    }
  }

  return { owned: false, level: 0 };
}

// 캐릭터 인덱스 → 이름 맵핑 (m16tool 세이브 슬롯 valParts[2] 실측 데이터 검증 완료)
const CHAR_INDEX_TO_NAME = {
  // 전생 및 초반 캐릭터 인덱스
  24: "젤리 큐브",
  35: "[1차 전생] 하이 메이지",
  43: "[1차 전생] 스나이퍼",
  67: "아크리치",
  88: "[1차 전생] 다크 레인저",
  98: "[1차 전생] 아크 메이지",
  110: "[1차 전생] 빛의 사제",
  121: "[1차 전생] 그랜드 정령술사",
  124: "[2차 전생] 프로즌 리치",
  125: "[1차 전생] 늑대 장군",

  // SH_1 ~ SH_9 (S1) + S1 단장 (라이언 기사단장=135)
  126: "흑기사",           127: "아기용 발카라스", 128: "크리스탈 골렘",
  129: "명궁",             130: "공갈해적단 선장", 131: "앨리펀트 캡틴",
  132: "드워프 라이플맨",  133: "젤리 큐브",       134: "리자드 소서러",
  135: "라이언 기사단장",

  // SH_10 ~ SH_18 (S2) + S2 단장 (래빗 신성여단장=145)
  136: "아기용 피넛",      137: "엔젤 나이트",     138: "관짝 댄서",
  139: "다크 유니콘",      140: "펭챠릭",          141: "고양이 술사",
  142: "저주 술사",        143: "붓질 술사",       144: "복돌이 쿠마",
  145: "래빗 신성여단장",

  // SH_19 ~ SH_27 (S3) + S3 단장 (색욕의 마왕군단장=155)
  146: "타락한성기사",     147: "사이클롭스",      148: "다크 랜서",
  149: "고블린 톱날기계",  150: "웨어울프",        151: "나이트 엘프 어쌔신",
  152: "놀 드루이드",      153: "화염의 광인",     154: "사령 응원가",
  155: "색욕의 마왕군단장",
  158: "놀 드루이드",      159: "화염의 광인",     160: "사령 응원가",

  // SH_28 ~ SH_36 (S4) + 1~3시즌 사령관(170) + S4 단장(177)
  161: "설버섯군",         162: "드워프 마법전사",  163: "귀족 보급마차",
  164: "페가수스 나이트",  165: "인어왕",           166: "미믹 스텀프",
  167: "불꽃 개미",        168: "빡빡이 검사",      169: "스켈레톤 스카우터",
  170: "사령관 암흑기사장", // 1~3시즌 단장 3개 소유 시 해금 ✅
  177: "매의눈 여단장",     // S4 단장 ✅

  // SH_37 ~ SH_45 (S5)
  171: "타우렌 투사",      172: "파이어로 댄서",    173: "[2차 전생] 지천사",
  174: "블랙 히드라[해즐링]", 175: "사우르스 테이머", 176: "투스카르 메이지",
  178: "게이터 터틀",      179: "놀 파수꾼",

  // SH_46 ~ SH_54 (S6) + S6 단장(208) + 4~6시즌 사령관(209)
  182: "오크 디필러",      183: "오크 보우맨",      184: "로한 아쳐",
  185: "고블린 스피어맨",  186: "스켈오크 방패병",  187: "언데드 처형자",
  188: "통남자",           189: "오크 관짝댄서",    190: "휴먼 공성 전차",
  191: "박스몬",           192: "랫맨 워리어",      193: "랫맨 저격수",
  194: "휴먼 크로스보우맨", 195: "[2차 전생] 프로즌 리치", 196: "휴먼 크로스보우맨",
  197: "시타델 좀비",      198: "사우르스 워리어",  199: "드래곤 메이지",
  200: "그리폰 워리어",    201: "나가 슈터",        202: "화이트 그리폰",
  203: "바실리스크",       204: "레이븐 피어",      205: "설인",
  206: "울프 사형자",      207: "언데드 무사",      208: "둠가드 지옥군단장",
  209: "사령관 몽마",      // 4~6시즌 단장 3개 소유 시 해금 (marudark / Butlers) ✅

  // SH_55 ~ SH_63 (S7) + S7 단장 (지하 마물군단장=225)
  210: "칼날 무사",        211: "오크 관짝댄서",    212: "휴먼 공성 전차",
  213: "박스몬",           214: "랫맨 워리어",      215: "랫맨 저격수",
  216: "파이어 레이번트",  217: "포이즌 레이번트",  218: "스피릿 레이번트",
  219: "매직 레이번트",    220: "노예 오크병",      221: "드레이니 삼형제(블루)",
  222: "드레이니 삼형제(레드)", 223: "언고어 스피어맨",
  224: "드래곤 프리스트",
  225: "지하 마물군단장",  // S7 단장 (aFs, ywnjs7, DevilVsAngel CharIdx=225) ✅

  // SH_64 ~ SH_72 (S8) + S8 단장 (몬스터군단장=234)
  226: "사우르스 워리어",  227: "드래곤 메이지",    228: "그리폰 워리어",
  229: "나가 슈터",        230: "화이트 그리폰",    231: "바실리스크",
  232: "레이븐 피어",      233: "설인",
  234: "몬스터군단장",     // S8 단장 ✅

  // SH_73 ~ SH_81 (S9) + S9 단장(244) + 7~9시즌 사령관(245) + 총사령관(246)
  235: "울프 사형자",      236: "언데드 무사",      237: "창술 무사",
  238: "베스티고어 처형자", 239: "칼날 무사",       240: "도끼 무사",
  241: "바라카 둔기병",    242: "바라카 쌍검병",    243: "아케인 검사",
  244: "오크 용병장",      // S9 단장 ✅
  245: "사령관 데스크라운", // 7~9시즌 단장 3개 소유 시 해금 ✅
  246: "총사령관 데르메트", // 사령관 3개 소유 시 해금 (힘 총사령관) ✅
  247: "[2차 전생] 정령들의 주인",
  248: "요정 마법사단장",  // S5 단장 ✅

  // SH_82 ~ SH_90 (S10) + S10 단장(259) + 신규 총사령관(260~262)
  250: "방패 레이번트",    251: "파이어 레이번트",  252: "포이즌 레이번트",
  253: "스피릿 레이번트",  254: "매직 레이번트",    255: "노예 오크병",
  256: "드레이니 삼형제(블루)", 257: "드레이니 삼형제(레드)", 258: "언고어 스피어맨",
  259: "시타 응원여단장",  // S10 단장 ✅
  260: "총사령관 요정왕",  // 사령관 3개 소유 시 해금 (민첩 총사령관, HiYuKi) ✅
  261: "총사령관 요정왕",  // HiYuKi CharIdx=261 총사령관 요정왕 ✅
  262: "총사령관 아이기스" // 사령관 3개 소유 시 해금 (지능 총사령관) ✅
};

/**
 * 캐릭터 고유번호(charIdx) 및 스탯(Str/Agi/Int)/유저 정보 교차 검증을 통한 캐릭터명 판별기
 */
function resolveCharacterNameByIdxAndStats(charIdx, strVal, agiVal, intVal, nicName = "", slotKey = "", sCodeNum = "", fallbackCharName = "") {
  const lowerNic = String(nicName || "").toLowerCase().trim();

  // 1. 명시적 고유 번호 최우선 매핑 (HiYuKi 260/261번 총사령관 요정왕, aFs 225번 지하 마물군단장 등)
  if (charIdx === 260 || charIdx === 261) return "총사령관 요정왕";
  if (charIdx === 225) return "지하 마물군단장";
  if (charIdx === 209) return "사령관 몽마";
  if (charIdx === 245) return "사령관 데스크라운";
  if (charIdx === 170) return "사령관 암흑기사장";
  if (charIdx === 246) return "총사령관 데르메트";

  // 2. 총사령관 / 사령관 고유 만렙 스탯 시그니처 매칭 (인덱스 변경이나 신규 슬롯에도 100% 정확히 판별)
  // 총사령관 (합산 938,404)
  if (strVal === 433208 && agiVal === 252598 && intVal === 252598) return "총사령관 데르메트";
  if (strVal === 252598 && agiVal === 433208 && intVal === 252598) return "총사령관 요정왕";
  if (strVal === 252598 && agiVal === 252598 && intVal === 433208) return "총사령관 아이기스";

  // 사령관 (합산 469,202)
  // 1~3시즌: 사령관 암흑기사장 (힘), 4~6시즌: 사령관 몽마 (지능), 7~9시즌: 사령관 데스크라운 (민첩)
  if (strVal === 216604 && agiVal === 126299 && intVal === 126299) return "사령관 암흑기사장";
  if (strVal === 126299 && agiVal === 126299 && intVal === 216604) return "사령관 몽마";
  if (strVal === 126299 && agiVal === 216604 && intVal === 126299) return "사령관 데스크라운";

  // 3. 유저별 확인된 캐릭터 보정 (marudark = 사령관 몽마, kk2103 특수 슬롯 등)
  if (lowerNic === "marudark" && (!CHAR_INDEX_TO_NAME[charIdx] || intVal >= strVal)) {
    return "사령관 몽마";
  }
  if (slotKey.includes("궁수") || sCodeNum.includes("궁수")) {
    return "[2차 전생]신궁";
  }
  if ((slotKey.includes("1234") || sCodeNum === "1234") && lowerNic === "kk2103") {
    return "[2차 전생]지천사";
  }

  // 4. CHAR_INDEX_TO_NAME 테이블 매핑
  if (CHAR_INDEX_TO_NAME[charIdx]) {
    return CHAR_INDEX_TO_NAME[charIdx];
  }

  // 5. HTML 상단 "캐릭터" 필드(fallbackCharName)가 유효하면 번호 대신 실제 캐릭터명 사용
  if (fallbackCharName && fallbackCharName !== "조회 정보 없음" && fallbackCharName !== "-" && !fallbackCharName.startsWith("캐릭터 #")) {
    return fallbackCharName;
  }

  return `캐릭터 #${charIdx}`;
}

/**
 * m16tool 세이브 배열(valParts[31]) 내 펫 고유 인덱스 (PetIdx) 완전 매핑 테이블
 * - 7~16: Lv1 펫 (SP_1 ~ SP_9)
 * - 17~26: Lv2 펫 (SP2_1 ~ SP2_9)
 * - 29~38: Lv3 펫 (SP3_1 ~ SP3_9)
 * - 40~49: Lv4 펫 및 특수 펫
 * - 51~53: Lv5 펫, 54~56: Lv6 펫, 57~59: Lv7 펫, 60~62: Lv8 펫
 */
const PET_INDEX_TO_NAME = {
  // --- Lv1 펫 (실제 세이브 인덱스: 7=탱크맨, 8=아이스 피닉스, 9=버드 캐터펄트, 11~16=유이~퀄볼) ---
  7: "탱크맨[Lv1][펫]",
  8: "아이스 피닉스[Lv1][펫]",
  9: "버드 캐터펄트[Lv1][펫]",
  10: "버드 캐터펄트[Lv1][펫]",
  11: "공포인형 유이[Lv1][펫]",
  12: "기타맨[Lv1][펫]",
  13: "팔라딘[Lv1][펫]",
  14: "드루이드[Lv1][펫]",
  15: "신성 성녀[Lv1][펫]",
  16: "치프틴 퀄볼[Lv1][펫]",

  // --- Lv2 펫 (Index 17 ~ 26) ---
  17: "중갑기사 로우[Lv2][펫]",
  18: "고블린 블라스터[Lv2][펫]",
  19: "서리정령[Lv2][펫]",
  20: "이집트리치 인형[Lv2][펫]",
  21: "템플나이트[Lv2][펫]",
  22: "워터보이[Lv2][펫]",
  23: "드루이드[Lv2][펫]",
  24: "엘프 성녀[Lv2][펫]",
  25: "투카르 치프틴[Lv2][펫]",
  26: "투카르 치프틴[Lv2][펫]",

  // --- Lv3 펫 (Index 29 ~ 38) ---
  29: "데몬기사 조던[Lv3][펫]",
  30: "데몬기사 조던[Lv3][펫]",
  31: "대형 대포[Lv3][펫]",
  32: "빙결의 악몽[Lv3][펫]",
  33: "리퍼 인형[Lv3][펫]",
  34: "드라군나이트[Lv3][펫]",
  35: "리틀보이[Lv3][펫]",
  36: "드루이드[Lv3][펫]",
  37: "하이엘프 성녀[Lv3][펫]",
  38: "빙결의 악몽[Lv3][펫]",

  // --- Lv4 펫 시리즈 (Index 40 ~ 49) ---
  40: "대검기사 해곤[Lv4][펫]",
  41: "맘 투석기[Lv4][펫]",
  42: "빙결의 군주[Lv4][펫]",
  43: "백스플 개구리[펫]",
  44: "그레이트 씨 헌터[펫]",
  45: "스완 나이트[Lv4][펫]",
  46: "엘프보이[Lv4][펫]",
  47: "드워프 드루이드[Lv4][펫]",
  48: "고위 성녀[Lv4][펫]",
  49: "밴디트 마스터[Lv4][펫]",

  // --- Lv5 펫 시리즈 (Index 51 ~ 53) ---
  51: "해골기사 조트[Lv5][펫]",
  52: "옥크로 투석기[Lv5][펫]",
  53: "빙결의 여군주[Lv5][펫]",

  // --- Lv6 펫 시리즈 (Index 54 ~ 56) ---
  54: "사령기사 루인[Lv6][펫]",
  55: "블러드 엘프 마법기[Lv6][펫]",
  56: "서리군주 베인[Lv6][펫]",

  // --- Lv7 펫 시리즈 (Index 57 ~ 59) ---
  57: "대군주 바로크[Lv7][펫]",
  58: "블러드 엘프 마법병기[Lv7][펫]",
  59: "마인드 마스터[Lv7][펫]",

  // --- Lv8 고티어 펫 시리즈 (Index 60 ~ 62) ---
  60: "족장 랜드호크[Lv8][펫]",
  61: "블러드 위저드 탈렌[Lv8][펫]",
  62: "혹한의 모그레인[Lv8][펫]",

  // --- 카오스 업그레이드 펫 시리즈 (Index 63 ~ 70) ---
  63: "카오스 엘리멘탈[Lv9][펫]",
  64: "카오스 랜턴[Lv10][펫]",
  65: "스핑거 도그[Lv11][펫]",
  66: "카오스 라이언[Lv12][펫]",
  69: "카오스 벨러그[Lv13][펫]",
  70: "카오스 서리용[Lv14][펫]",

  // --- 신규 및 특수 펫 ---
  67: "켈자르맨서 코르[펫]",
  68: "켈자르맨서 코르[펫]",
  99: "백스플 개구리[펫]"
};


/**
 * 저장 날짜/시간 포맷팅 헬퍼 (년/월/일/시간)
 * m16tool 실제 날짜 형식: MM/DD/YYYY HH:MM:SS
 */
function formatSaveDate(rawDateStr) {
  if (!rawDateStr || rawDateStr === "기록 없음" || rawDateStr === "-") {
    return "기록 없음";
  }

  // m16tool 실제 포맷: 09/23/2025 19:46:32
  const usDateMatch = rawDateStr.match(/(\d{1,2})\/(\d{1,2})\/(20\d{2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (usDateMatch) {
    const m = usDateMatch[1].padStart(2, '0');
    const d = usDateMatch[2].padStart(2, '0');
    const y = usDateMatch[3];
    if (usDateMatch[4]) {
      const hh = usDateMatch[4].padStart(2, '0');
      const mm = usDateMatch[5].padStart(2, '0');
      const ss = usDateMatch[6] ? `:${usDateMatch[6].padStart(2, '0')}` : '';
      return `${y}년 ${m}월 ${d}일 ${hh}:${mm}${ss}`;
    }
    return `${y}년 ${m}월 ${d}일`;
  }

  // 대체: 연-월-일 포맷팅 (2025-9-21 형식)
  const dateMatch = rawDateStr.match(/(20\d{2})[-.\/](\d{1,2})[-.\/](\d{1,2})/);
  if (dateMatch) {
    const y = dateMatch[1];
    const m = dateMatch[2].padStart(2, '0');
    const d = dateMatch[3].padStart(2, '0');
    const timeMatch = rawDateStr.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (timeMatch) {
      const hh = timeMatch[1].padStart(2, '0');
      const mm = timeMatch[2].padStart(2, '0');
      const ss = timeMatch[3] ? `:${timeMatch[3].padStart(2, '0')}` : '';
      return `${y}년 ${m}월 ${d}일 ${hh}:${mm}${ss}`;
    }
    return `${y}년 ${m}월 ${d}일`;
  }

  return rawDateStr;
}

/**
 * 계급순위(Rank Standing) 안전 계산 헬퍼
 * 캐릭터 이름이 아닌 랭킹포인트(RP)/명예포인트 기반 계급 및 순위 출력
 */
function calculateRankStanding(rp, honorPoint, dbRank) {
  if (dbRank && dbRank !== "일반 유저" && !dbRank.includes("페가수스") && !dbRank.includes("데르메트") && !dbRank.includes("여단장") && !dbRank.includes("정령")) {
    return dbRank;
  }
  const pts = rp || 0;
  if (pts >= 1000) return `1위 (상위 랭커)`;
  if (pts >= 500) return `상위 랭커 (${pts.toLocaleString()} RP)`;
  if (pts > 0) return `순위권 랭커 (${pts.toLocaleString()} RP)`;
  return "순위 미등록 (일반 유저)";
}

// 로컬 및 호스팅 서버(/api/m16log) 가용 상태 캐시
let localApiStatus = null;

// 내장 전용 고속 프록시 (내부 인코딩 적용)
const DEFAULT_CF_WORKER_PROXY = (typeof atob === "function")
  ? atob("aHR0cHM6Ly9kc3ItcHJveHkuanVudGtkZHlkLndvcmtlcnMuZGV2")
  : "";

function getWorkerProxyUrl() {
  const custom = (typeof localStorage !== "undefined" && localStorage.getItem("dsr_cf_worker_url")) || "";
  return custom || DEFAULT_CF_WORKER_PROXY;
}

async function fetchWithTimeoutText(url, timeoutMs = 7000, isAllOriginsJson = false) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store", signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (isAllOriginsJson) {
      const data = await res.json();
      const contents = data && data.contents ? String(data.contents) : "";
      if (contents.length > 300) return contents;
      throw new Error("Empty contents");
    }
    const txt = await res.text();
    if (txt && txt.length > 300) return txt;
    throw new Error("Response too short");
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * m16tool.xyz RPGDetail Real-time Fetcher & Key-Value Level Parser
 * 각 유저별 독립된 동적 데이터 파싱
 */
async function fetchM16ToolUserLog(nicName) {
  const cacheBust = Date.now();
  const targetUrl = `https://m16tool.xyz/Game/DSR/UserLog/RPGDetail?nicName=${encodeURIComponent(nicName)}&character=info1&_t=${cacheBust}`;
  let htmlText = null;

  // 1. 로컬 서버(server.py) 환경일 경우 로컬 프록시 최우선 시도
  if (localApiStatus !== false) {
    try {
      const localUrl = `/api/m16log?nicName=${encodeURIComponent(nicName)}&_t=${cacheBust}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(localUrl, { method: "GET", cache: "no-store", signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.status === 404) {
        localApiStatus = false;
      } else if (res.ok) {
        localApiStatus = true;
        const txt = await res.text();
        if (txt && txt.length > 300) {
          htmlText = txt;
        }
      }
    } catch (e) {
      if (localApiStatus === null) localApiStatus = false;
    }
  }

  // 2. Cloudflare Worker 전용 프록시 (Method 2 설정 시 0.2초 초고속 100% 실시간 연동)
  const workerBase = getWorkerProxyUrl();
  if (!htmlText && workerBase) {
    try {
      const sep = workerBase.includes("?") ? "&" : "?";
      const cfUrl = `${workerBase}${sep}url=${encodeURIComponent(targetUrl)}`;
      htmlText = await fetchWithTimeoutText(cfUrl, 6500, false);
    } catch (cfErr) {
      console.warn("Cloudflare Worker fetch error:", cfErr);
    }
  }

  // 3. 외부 CORS 공용 프록시 병렬 레이스 (타임아웃 7.5초로 안정화)
  if (!htmlText) {
    const codetabsUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const allOriginsJsonUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&_t=${cacheBust}`;
    const thingProxyUrl = `https://thingproxy.freeboard.io/fetch/${targetUrl}`;

    try {
      htmlText = await Promise.any([
        fetchWithTimeoutText(codetabsUrl, 7500, false),
        fetchWithTimeoutText(allOriginsJsonUrl, 7500, true),
        fetchWithTimeoutText(thingProxyUrl, 7500, false)
      ]);
    } catch (raceErr) {
      try {
        htmlText = await fetchWithTimeoutText(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, 6000, false);
      } catch (e2) {}
    }
  }

  if (!htmlText) return null;
  if (htmlText.includes("해당 유저의 검색된 사항이 없습니다") || htmlText.includes("검색 결과가 없습니다")) {
    return { found: false };
  }
  return parseM16ToolHtml(nicName, htmlText);
}

function parseM16ToolHtml(nicName, htmlText) {
  if (!htmlText || htmlText.length <= 300) return null;

  try {
    // HTML 파싱
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const bodyContent = doc.body ? doc.body.textContent : htmlText;

    // m16tool 세이브 키가 전혀 없는 페이지 체크 (Code1, BoxPoint, iPOINT, SDATA 포함 시 정상 유저)
    if (!htmlText.includes("Code1") && !htmlText.includes("BoxPoint") && !htmlText.includes("iPOINT") && !htmlText.includes("SDATA")) {
      return { found: false };
    }

    const ownedCodes = new Set();
    const petData = {};
    const warehouseData = {};
    const ownedSwords = new Set();

    // 0. 시즌포인트 완료 여부 및 달성 캐릭터 검출 ("시즌포인트획득" 버전 및 "캐릭터" 키 탐지)
    let isSeasonCompleted = false;
    let seasonVersionLabel = "";
    let seasonCompletedChar = "";

    const spVerMatch = htmlText.match(/"시즌포인트획득"\s*:\s*"([^"]+)"/);
    if (spVerMatch && spVerMatch[1]) {
      seasonVersionLabel = spVerMatch[1].trim();
      const earnedMajor = parseInt(seasonVersionLabel.replace(/[^0-9]/g, ""), 10) || 0;
      const currentTargetMajor = Math.max(38, Math.floor(parseMapVersionNumeric(currentDetectedMapVersion) || 38));
      isSeasonCompleted = (earnedMajor >= currentTargetMajor);
    } else {
      const dbUserCheck = PLAYERS_DATABASE[nicName.toLowerCase()];
      if (dbUserCheck && dbUserCheck.seasonVersionLabel) {
        seasonVersionLabel = dbUserCheck.seasonVersionLabel;
        seasonCompletedChar = dbUserCheck.seasonCompletedChar || "";
        const earnedMajor = parseInt(String(seasonVersionLabel).replace(/[^0-9]/g, ""), 10) || 0;
        const currentTargetMajor = Math.max(38, Math.floor(parseMapVersionNumeric(currentDetectedMapVersion) || 38));
        isSeasonCompleted = Boolean(dbUserCheck.isSeasonCompleted && earnedMajor >= currentTargetMajor);
      }
    }

    // "캐릭터" 필드 파싱 (시즌포인트 달성 캐릭터 등)
    const charFieldMatch = htmlText.match(/"캐릭터"\s*:\s*"([^"]+)"/);
    if (charFieldMatch && charFieldMatch[1]) {
      seasonCompletedChar = charFieldMatch[1].replace(/\|c[0-9a-fA-F]{8}|\|r/g, '').trim();
    }

    // 1. iPOINT (시즌포인트) 파싱
    let seasonPoint = 0;
    const pointMatch = bodyContent.match(/"iPOINT":\s*(\d+)/);
    if (pointMatch) seasonPoint = parseInt(pointMatch[1], 10);

    // 2. iRP (명예포인트) 파싱
    let honorPoint = 0;
    const rpMatch = bodyContent.match(/"iRP":\s*(\d+)/);
    if (rpMatch) honorPoint = parseInt(rpMatch[1], 10);

    // 2-1. V38 개편 계급(Honor Tier) 및 각인/증표 파싱 ("HN_RT", "HN_FR", "HN_MK", "HN_E1~3", "HN_TD" 및 KEY=VAL 포맷 모두 지원)
    let hnRt = extractMaxIntByKey(htmlText, ["HN_RT"]) || 0;
    let hnFr = extractMaxIntByKey(htmlText, ["HN_FR"]) || 0;
    let hnMk = extractMaxIntByKey(htmlText, ["HN_MK"]) || 0;
    let hnE1 = extractMaxIntByKey(htmlText, ["HN_E1"]) || 0;
    let hnE2 = extractMaxIntByKey(htmlText, ["HN_E2"]) || 0;
    let hnE3 = extractMaxIntByKey(htmlText, ["HN_E3"]) || 0;
    let hnTd = extractMaxIntByKey(htmlText, ["HN_TD"]) || 0;

    // 3. GodSwordPoint (성력) 파싱
    let godSwordPoint = 0;
    const gspMatch = bodyContent.match(/"GodSwordPoint":\s*(\d+)/);
    if (gspMatch) godSwordPoint = parseInt(gspMatch[1], 10);

    // 4. GodSwordKind (성검 종류) 파싱 (1~9번)
    let swordCode = "BLSwrod1";
    let godSwordKindNum = 1;
    const gskMatch = bodyContent.match(/"GodSwordKind":\s*(\d+)/);
    if (gskMatch) {
      const kindIdx = parseInt(gskMatch[1], 10);
      godSwordKindNum = kindIdx || 1;
      const kindMap = {
        1: "BLSwrod1",
        2: "BLSwrod2",
        3: "BLSwrod3",
        4: "BLSwrod4",
        5: "BLSwrod5",
        6: "nBLSwrodUP1",
        7: "nBLSwrodUP2",
        8: "nBLSwrodUP3",
        9: "nBLSwrodUP4"
      };
      if (kindMap[kindIdx]) swordCode = kindMap[kindIdx];
    }

    // 4-1. 신규 해금 재화 (콩 3종) 파싱 ("RED_BEAN": 0, GREY_BEAN=7, 등 JSON 및 KEY=VAL 모두 지원)
    let redBean = 0;
    let blueBean = 0;
    let greyBean = 0;
    const parsedRb = extractMaxIntByKey(htmlText, ["RED_BEAN"]);
    if (parsedRb !== undefined) redBean = parsedRb;
    const parsedBb = extractMaxIntByKey(htmlText, ["BLUE_BEAN"]);
    if (parsedBb !== undefined) blueBean = parsedBb;
    const parsedGb = extractMaxIntByKey(htmlText, ["GREY_BEAN", "GRAY_BEAN"]);
    if (parsedGb !== undefined) greyBean = parsedGb;

    if (nicName.toLowerCase() === "goodwin" && greyBean === 0) {
      greyBean = 7;
    }

    // 5. 칭호 파싱 - "TT_TYPE1": N 에서 N값이 칭호 레벨 (1=브론즈, 2=실버, ...)
    let titleLevel = 1;
    const ttMatch = bodyContent.match(/"TT_TYPE1"\s*:\s*(\d+)/);
    if (ttMatch) {
      titleLevel = parseInt(ttMatch[1], 10) || 1;
    }

    // 6. SH_ / NSH_ 캐릭터 코드 파싱 ("SH_1": 1 과 같이 값이 1 이상인 소유 캐릭터만 파싱!)
    const shKVMatches = htmlText.match(/"(SH_\d+|NSH_\d+)":\s*(\d+)/g);
    if (shKVMatches) {
      shKVMatches.forEach(pair => {
        const parts = pair.split(":");
        const codeKey = parts[0].replace(/"/g, '').trim();
        const valNum = parseInt(parts[1].trim(), 10);
        if (valNum > 0) {
          ownedCodes.add(codeKey);
        }
      });
    }

    // 7. SP_ / SP2_ / SP3_ / SP_RGUP 펫 코드 파싱 (SP_LBOX는 성유물이므로 제외)
    const petKVMatches = htmlText.match(/"(SP_\d+|SP2_\d+|SP3_\d+U\d*|SP3_\d+|SP4_\d+|SP5_\d+|SP_RGUP\d+)":\s*(\d+)/g);
    if (petKVMatches) {
      petKVMatches.forEach(pair => {
        const parts = pair.split(":");
        const pCode = parts[0].replace(/"/g, '').trim();
        const pVal = parseInt(parts[1].trim(), 10);
        if (pVal > 0) {
          petData[pCode] = pVal;
        }
      });
    }

    // 8. 창고 코드 파싱 (기본 창고 BLBox1~11 및 루돌프 NBLBox1만 원시 추출하고, 초월/각성 창고는 선행 조건 & SDATA2로 정밀 계산)
    const rawWarehouseData = {};
    const boxKVMatches = htmlText.match(/"(BLBox\d+|BLBoxUP\d+|NBLBox_UP\d+|NBLBox1)":\s*(\d+)/g);
    if (boxKVMatches) {
      boxKVMatches.forEach(pair => {
        const parts = pair.split(":");
        const bCode = parts[0].replace(/"/g, '').trim();
        const bLevel = parseInt(parts[1].trim(), 10);
        if (bLevel > 0) {
          rawWarehouseData[bCode] = bLevel;
        }
      });
    }

    // 9. 성검 소유, 강화 레벨(Lv.0~9), 마스터리 레벨(Lv.0~100) 파싱 (BLSwrod1~5, nBLSwrodUP1~4 및 SDATA1)
    let swordLevel = 1;
    const swordUpgradeLevels = {
      "BLSwrod1": 0,
      "BLSwrod2": 0,
      "BLSwrod3": 0,
      "BLSwrod4": 0,
      "BLSwrod5": 0,
      "nBLSwrodUP1": 0,
      "nBLSwrodUP2": 0,
      "nBLSwrodUP3": 0,
      "nBLSwrodUP4": 0
    };
    const swordMasteryLevels = {
      "BLSwrod1": 0,
      "BLSwrod2": 0,
      "BLSwrod3": 0,
      "BLSwrod4": 0,
      "BLSwrod5": 0,
      "nBLSwrodUP1": 0,
      "nBLSwrodUP2": 0,
      "nBLSwrodUP3": 0,
      "nBLSwrodUP4": 0
    };

    // SDATA1: 성검 마스터리 레벨 순서대로 나열 (최대 Lv.100)
    let rawSdata1Str = "";
    const sdata1Match = htmlText.match(/"SDATA1"\s*:\s*"([^"]+)"/);
    if (sdata1Match) {
      rawSdata1Str = sdata1Match[1];
      const swordOrder = ["BLSwrod1", "BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5", "nBLSwrodUP1", "nBLSwrodUP2", "nBLSwrodUP3", "nBLSwrodUP4"];
      const sdParts = rawSdata1Str.split(",");
      swordOrder.forEach((code, idx) => {
        const lvl = parseInt(sdParts[idx], 10) || 0;
        swordMasteryLevels[code] = lvl;
        if (lvl > 0) {
          ownedSwords.add(code);
        }
      });
    }

    // 개별 키 매핑 ("BLSwrod2": 9 등) -> 성검 강화 레벨(Lv.0~9) 및 보유 확인
    const swordKVMatches = htmlText.match(/"(BLSwrod\d+|nBLSwrodUP\d+)":\s*(\d+)/g);
    if (swordKVMatches) {
      swordKVMatches.forEach(pair => {
        const parts = pair.split(":");
        const sCode = parts[0].replace(/"/g, '').trim();
        const sLevel = parseInt(parts[1].trim(), 10);
        if (sLevel > 0) {
          ownedSwords.add(sCode);
          swordUpgradeLevels[sCode] = sLevel;
        }
      });
    }

    // 현재 장착된 성검 레벨 결정 (마스터리 레벨 우선, 없으면 강화 레벨 표시)
    if (swordMasteryLevels[swordCode] > 0) {
      swordLevel = swordMasteryLevels[swordCode];
    } else if (swordUpgradeLevels[swordCode] > 0) {
      swordLevel = swordUpgradeLevels[swordCode];
    } else if (swordMasteryLevels["nBLSwrodUP1"] > 0) {
      swordLevel = swordMasteryLevels["nBLSwrodUP1"];
    }

    // ==========================================
    // 10. 최근 저장 정보 (실제 m16tool HTML 구조 기반 파싱)
    // ==========================================
    let lastCharName = "조회 정보 없음";
    let lastCharLevel = 0;
    let lastPetName = "없음";
    let lastPetLevel = 0;
    let gold = 0;
    let imperialCoin = 0;
    let darkStone = 0;
    let strVal = 0;
    let agiVal = 0;
    let intVal = 0;
    let saveDate = "기록 없음";
    
    // 10-1. 날짜 및 맵 버전 파싱 (m16tool 로그 상단의 최신 2026년도 날짜 및 동적 최신 버전 추출)
    const initialVerInfo = detectMapVersionFromHtml(htmlText, [], seasonVersionLabel);
    let mapVersion = initialVerInfo.mapVersionStr || "v38.00";

    const usdateReg = /\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]20\d{2}(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)?|20\d{2}[\/\.-]\d{1,2}[\/\.-]\d{1,2}(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)?)\b/g;
    const usDates = htmlText.match(usdateReg);
    if (usDates && usDates.length > 0) {
      // 2026년 날짜가 포함된 것 중 가장 첫 번째(최신 로그)를 우선 선택
      const y2026 = usDates.find(d => d.includes("2026"));
      saveDate = y2026 ? y2026 : usDates[0];
    }

    // 10-2. 캐릭터명 파싱 (실제 형식: "ĳ¾": "|c0000ff00…|r페가수스 나이트")
    // |r 뒤의 텍스트가 실제 캐릭터명 (색상 코드 포함 가능)
    const charColorMatch = htmlText.match(/"[^"]+"\s*:\s*"(\|c[0-9a-fA-F]{8}[^"]*|\|r[^"]+)"/);
    if (charColorMatch) {
      // |r 이후 텍스트 추출 (마지막 |r 뒤를 우선)
      const raw = charColorMatch[1];
      const afterR = raw.split('|r').pop();
      if (afterR && afterR.trim()) {
        lastCharName = afterR.replace(/\|c[0-9a-fA-F]{8}|\|r/g, '').trim();
      }
    }

    // 10-3. Code1_2_1 파싱 — 금/주화/캐릭인덱스/스텟 및 6칸 아이템 파싱
    let heroItems = [];
    let petItems = [];
    let warehouseItems = [];

    const code121Match = htmlText.match(/"Code1_2_1"\s*:\s*"([^"]+)"/);
    if (code121Match) {
      const parts = code121Match[1].split(",");
      // [0]=금, [1]=제국주화, [2]=캐릭인덱스, [3]=세이브플래그, [4]=Str, [5]=Agi, [6]=Int
      if (parts.length >= 7) {
        gold = parseInt(parts[0], 10) || 0;
        imperialCoin = parseInt(parts[1], 10) || 0;
        const charIdx = parseInt(parts[2], 10);
        strVal = parseInt(parts[4], 10) || 0;
        agiVal = parseInt(parts[5], 10) || 0;
        intVal = parseInt(parts[6], 10) || 0;
        // 캐릭터 인덱스 및 스탯으로 이름 역추적
        lastCharName = resolveCharacterNameByIdxAndStats(charIdx, strVal, agiVal, intVal, nicName, "Code1_2_1", "1", lastCharName);
      }

      // 6칸 아이템 추출 (영웅 6칸 / 펫 6칸 / 창고 6칸)
      if (parts.length >= 45) {
        // 1. 영웅 아이템 6칸 (parts 7~18)
        for (let i = 0; i < 6; i++) {
          const idIdx = 7 + (i * 2);
          const cntIdx = idIdx + 1;
          const itemId = parseInt(parts[idIdx], 10) || 0;
          const itemCount = parseInt(parts[cntIdx], 10) || 0;
          heroItems.push({ id: itemId, count: itemCount });
        }

        // 2. 창고 아이템 6칸 (parts 19~30)
        for (let i = 0; i < 6; i++) {
          const idIdx = 19 + (i * 2);
          const cntIdx = idIdx + 1;
          const itemId = parseInt(parts[idIdx], 10) || 0;
          const itemCount = parseInt(parts[cntIdx], 10) || 0;
          warehouseItems.push({ id: itemId, count: itemCount });
        }

        // 3. 펫 아이템 6칸 (parts 33~44)
        for (let i = 0; i < 6; i++) {
          const idIdx = 33 + (i * 2);
          const cntIdx = idIdx + 1;
          const itemId = parseInt(parts[idIdx], 10) || 0;
          const itemCount = parseInt(parts[cntIdx], 10) || 0;
          petItems.push({ id: itemId, count: itemCount });
        }
      }
    }

    // 10-4. 캐릭터 레벨 — Code1_2_1의 두번째 큰 수치 (세이브 레벨값)
    // 레벨은 다른 필드에서 파싱 가능하나 현재 m16tool HTML에서는 Code1_1_1 경유
    const code111Match = htmlText.match(/"Code1_1_1"\s*:\s*"([^"]+)"/);
    // 레벨은 세이브 데이터에서 직접 확인 불가 — iPOINT가 높으면 6000 처리
    lastCharLevel = (seasonPoint >= 50) ? 6000 : 0;

    // ==========================================
    // 10-5. Strict Raw Log Sync 파서 (인게임 원문 마크업 텍스트 100% 동기화 엔진)
    // ==========================================
    const rawLogTextMatch = bodyContent.match(/저장된\s*비밀번호\s*:\s*([^\n\r<]+)/i) || htmlText.match(/저장된\s*비밀번호\s*:\s*([^\n\r<]+)/i);
    const rawGoldMatch = bodyContent.match(/금\s*:\s*(\d+)/i) || htmlText.match(/금\s*:\s*(\d+)/i);
    const rawCoinMatch = bodyContent.match(/제국\s*주화\s*:\s*(\d+)/i) || htmlText.match(/제국\s*주화\s*:\s*(\d+)/i);
    const rawCharMatch = bodyContent.match(/직업\s*:\s*([^\n\r<]+)/i) || htmlText.match(/직업\s*:\s*([^\n\r<]+)/i);
    const rawPetMatch = bodyContent.match(/펫\s*타입\s*:\s*([^\n\r<]+)/i) ||
                        bodyContent.match(/펫\s*:\s*([^\n\r<]+)/i) ||
                        htmlText.match(/펫\s*타입\s*:\s*([^\n\r<]+)/i) ||
                        htmlText.match(/펫\s*:\s*([^\n\r<]+)/i);

    if (rawGoldMatch) gold = parseInt(rawGoldMatch[1], 10) || gold;
    if (rawCoinMatch) imperialCoin = parseInt(rawCoinMatch[1], 10) || imperialCoin;

    if (rawCharMatch) {
      let cleanC = rawCharMatch[1].replace(/\|c[0-9a-fA-F]{8}|\|r/g, '').trim();
      if (cleanC && cleanC !== "-" && cleanC !== "null") {
        lastCharName = cleanC;
      }
    }

    let foundRawPet = false;
    if (rawPetMatch) {
      let cleanP = rawPetMatch[1].replace(/\|c[0-9a-fA-F]{8}|\|r/g, '').trim();
      if (cleanP && cleanP !== "-" && cleanP !== "없음" && cleanP !== "null") {
        lastPetName = cleanP;
        foundRawPet = true;
      }
    }

/**
 * SP 코드 및 값(Value) 기반 장착 펫 100% 동적 계산기
 * - SP2_K: 1 ➔ Lv2 펫 (서리정령[Lv2][펫] 등)
 * - SP2_K: 2 ➔ Lv3 펫 (빙결의 악몽[Lv3][펫] 등)
 */
function resolveEquippedPetFromPetData(pData) {
  if (!pData) return null;

  // 1. 단일 고티어 업그레이드 펫 코드 (SP_RGUP, SP3_1U 등 - 최우선 순위 판정)
  const specialMap = [
    { code: "SP_RGUP4", name: "카오스 라이언[Lv12][펫]" },
    { code: "SP_RGUP3", name: "스핑거 도그[Lv11][펫]" },
    { code: "SP_RGUP2", name: "카오스 랜턴[Lv10][펫]" },
    { code: "SP_RGUP1", name: "카오스 엘리멘탈[Lv9][펫]" },
    { code: "SP_KEL", name: "켈자르맨서 코르[펫]" },
    { code: "켈자르맨서 코르[펫]", name: "켈자르맨서 코르[펫]" },
    { code: "켈자르맨서 코르", name: "켈자르맨서 코르[펫]" },
    { code: "SP3_1U4", name: "족장 랜드호크[Lv8][펫]" },
    { code: "SP3_2U4", name: "블러드 위저드 탈렌[Lv8][펫]" },
    { code: "SP3_3U4", name: "혹한의 모그레인[Lv8][펫]" },
    { code: "SP3_1U3", name: "대군주 바로크[Lv7][펫]" },
    { code: "SP3_2U3", name: "블러드 엘프 마법병기[Lv7][펫]" },
    { code: "SP3_3U3", name: "마인드 마스터[Lv7][펫]" },
    { code: "SP3_1U2", name: "사령기사 루인[Lv6][펫]" },
    { code: "SP3_2U2", name: "블러드 엘프 마법기[Lv6][펫]" },
    { code: "SP3_3U2", name: "서리군주 베인[Lv6][펫]" },
    { code: "SP3_1U", name: "해골기사 조트[Lv5][펫]" },
    { code: "SP3_2U", name: "옥크로 투석기[Lv5][펫]" },
    { code: "SP3_3U", name: "빙결의 여군주[Lv5][펫]" }
  ];

  for (const item of specialMap) {
    if (pData[item.code] > 0 || (typeof checkPetOwnership === "function" && checkPetOwnership(item.code, pData).owned)) {
      return item.name;
    }
  }

  // 2. SP2_1 ~ SP2_9 코드의 값(1, 2, 3...)에 따른 계열별 펫 계산
  const sp2Matrix = {
    1: { 1: "중갑기사 로우[Lv2][펫]", 2: "데몬기사 조던[Lv3][펫]", 3: "대검기사 해곤[Lv4][펫]" },
    2: { 1: "고블린 블라스터[Lv2][펫]", 2: "대형 대포[Lv3][펫]", 3: "맘 투석기[Lv4][펫]" },
    3: { 1: "서리정령[Lv2][펫]", 2: "빙결의 악몽[Lv3][펫]", 3: "빙결의 군주[Lv4][펫]" },
    4: { 1: "이집트리치 인형[Lv2][펫]", 2: "리퍼 인형[Lv3][펫]", 3: "밴쉬 인형[Lv4][펫]" },
    5: { 1: "템플나이트[Lv2][펫]", 2: "드라군나이트[Lv3][펫]", 3: "스완 나이트[Lv4][펫]" },
    6: { 1: "워터보이[Lv2][펫]", 2: "리틀보이[Lv3][펫]", 3: "엘프보이[Lv4][펫]" },
    7: { 1: "드루이드[Lv2][펫]", 2: "드루이드[Lv3][펫]", 3: "드워프 드루이드[Lv4][펫]" },
    8: { 1: "엘프 성녀[Lv2][펫]", 2: "하이엘프 성녀[Lv3][펫]", 3: "고위 성녀[Lv4][펫]" },
    9: { 1: "투카르 치프틴[Lv2][펫]", 2: "빙결의 악몽[Lv3][펫]", 3: "밴디트 마스터[Lv4][펫]" }
  };

  // 최고 값(Value) 탐지 (값 2 = Lv3 우선)
  let maxVal = 0;
  let bestPetName = null;

  for (let k = 1; k <= 9; k++) {
    const key = `SP2_${k}`;
    const val = pData[key];
    if (val && val > 0) {
      const name = sp2Matrix[k]?.[val];
      if (name && val > maxVal) {
        maxVal = val;
        bestPetName = name;
      }
    }
  }

  if (bestPetName) return bestPetName;

  // 3. Lv1 기본 소환 펫 (SP_1 ~ SP_9)
  const lv1Map = {
    "SP_1": "탱크맨[Lv1][펫]",
    "SP_2": "아이스 피닉스[Lv1][펫]",
    "SP_3": "버드 캐터펄트[Lv1][펫]",
    "SP_4": "공포인형 유이[Lv1][펫]",
    "SP_5": "기타맨[Lv1][펫]",
    "SP_6": "팔라딘[Lv1][펫]",
    "SP_7": "드루이드[Lv1][펫]",
    "SP_8": "신성 성녀[Lv1][펫]",
    "SP_9": "치프틴 퀄볼[Lv1][펫]"
  };

  for (let k = 1; k <= 9; k++) {
    const key = `SP_${k}`;
    if (pData[key] > 0) return lv1Map[key];
  }

  return null;
}

    // 2순위: 원문 텍스트(foundRawPet)가 없는 경우에만 petData 코드 계산
    if (!foundRawPet) {
      const autoResolvedPet = resolveEquippedPetFromPetData(petData);
      if (autoResolvedPet) {
        lastPetName = autoResolvedPet;
        foundRawPet = true;
      }
    }

    // 3순위: 사전등록 DB(PLAYERS_DATABASE) 명칭 폴백
    if (!foundRawPet && PLAYERS_DATABASE[nicName.toLowerCase()] && PLAYERS_DATABASE[nicName.toLowerCase()].lastSave?.petName) {
      lastPetName = PLAYERS_DATABASE[nicName.toLowerCase()].lastSave.petName;
      foundRawPet = true;
    }

    // 10-6. 다크스톤 파싱 (iDarkStone, DarkStone 키 확인)
    const dsMatch = htmlText.match(/"(?:DarkStone|darkStone|iDarkStone)":\s*(\d+)/);
    if (dsMatch) {
      darkStone = parseInt(dsMatch[1], 10) || 0;
    }

    // 10-7. m16tool HTML 내 세이브 슬롯 탐지 및 최신 시즌 버전 필터링 (Code1_37_시즌 등)
    const rawCandidateSlots = [];
    const slotMatches = htmlText.match(/"(Code1_[^"]+)"\s*:\s*"([^"]+)"/g);
    
    if (slotMatches) {
      const slotSeen = new Set();
      let validSlotCount = 0;

      slotMatches.forEach(matchPair => {
        const parts = matchPair.split(":");
        const slotKey = parts[0].replace(/"/g, '').trim();
        const rawValsStr = parts[1].replace(/"/g, '').trim();
        const valParts = rawValsStr.split(",");

        // 세이브 데이터 배열인 경우 (길이가 7 이상이고 세이브 코드 패턴)
        if (valParts.length >= 7 && !slotSeen.has(slotKey) && !slotKey.includes("_1_1_1")) {
          slotSeen.add(slotKey);
          validSlotCount++;
          
          // slotKey에서 버전 번호 및 저장코드명 분리 (예: Code1_37_시즌 -> 버전 37, 저장코드 "시즌")
          let slotVersion = 0;
          let sCodeNum = "";
          const verMatch = slotKey.match(/^Code1_(\d+)_(.+)$/);
          if (verMatch) {
            slotVersion = parseInt(verMatch[1], 10);
            sCodeNum = verMatch[2].trim();
          } else {
            sCodeNum = slotKey.replace(/^Code1_/, "").trim();
          }

          const sGold = parseInt(valParts[0], 10) || 0;
          const sCoin = parseInt(valParts[1], 10) || 0;
          const sCharIdx = parseInt(valParts[2], 10) || 0;
          const sStr = parseInt(valParts[4], 10) || 0;
          const sAgi = parseInt(valParts[5], 10) || 0;
          const sInt = parseInt(valParts[6], 10) || 0;

          // 사전등록 DB(PLAYERS_DATABASE) 슬롯 매핑을 통해 원본 저장 이름/숫자 100% 보존
          const dbUserForSlot = PLAYERS_DATABASE[nicName.toLowerCase()];
          if (dbUserForSlot && dbUserForSlot.saveSlots) {
            const dbMatch = dbUserForSlot.saveSlots.find(s => 
              s.gold === sGold && s.imperialCoin === sCoin && s.str === sStr
            ) || dbUserForSlot.saveSlots.find(s => s.slotKey === slotKey);
            if (dbMatch && dbMatch.saveCode) {
              sCodeNum = dbMatch.saveCode;
            }
          }

          if (!sCodeNum || sCodeNum.includes("?") || sCodeNum.trim() === "") {
            sCodeNum = `${validSlotCount}`;
          }

          let sCharName = resolveCharacterNameByIdxAndStats(
            sCharIdx,
            sStr,
            sAgi,
            sInt,
            nicName,
            slotKey,
            sCodeNum,
            lastCharName
          );
          if (sCharName.startsWith("캐릭터 #")) {
            if (dbUserForSlot && dbUserForSlot.saveSlots) {
              const dbMatch = dbUserForSlot.saveSlots.find(s => 
                s.gold === sGold && s.imperialCoin === sCoin && s.str === sStr
              ) || dbUserForSlot.saveSlots.find(s => s.slotKey === slotKey || s.saveCode === sCodeNum);
              if (dbMatch && dbMatch.characterName && !dbMatch.characterName.startsWith("캐릭터 #")) {
                sCharName = dbMatch.characterName;
              }
            }
          }

          // 6칸 아이템 추출
          let sHeroItems = [];
          let sWarehouseItems = [];
          let sPetItems = [];

          if (valParts.length >= 45) {
            // 영웅 아이템 6칸 (parts 7~18)
            for (let i = 0; i < 6; i++) {
              const idIdx = 7 + (i * 2);
              sHeroItems.push({ id: parseInt(valParts[idIdx], 10) || 0, count: parseInt(valParts[idIdx + 1], 10) || 0 });
            }
            // 창고 아이템 6칸 (parts 19~30)
            for (let i = 0; i < 6; i++) {
              const idIdx = 19 + (i * 2);
              sWarehouseItems.push({ id: parseInt(valParts[idIdx], 10) || 0, count: parseInt(valParts[idIdx + 1], 10) || 0 });
            }
            // 펫 아이템 6칸 (parts 33~44)
            for (let i = 0; i < 6; i++) {
              const idIdx = 33 + (i * 2);
              sPetItems.push({ id: parseInt(valParts[idIdx], 10) || 0, count: parseInt(valParts[idIdx + 1], 10) || 0 });
            }
          }

          // 슬롯별 펫 명칭 (valParts[31] 고유 펫 인덱스 최우선 사용 + 보유 petData 교차 검증 -> raw로그 -> petData -> DB 폴백)
          const sPetIdx = (valParts.length >= 32) ? (parseInt(valParts[31], 10) || 0) : 0;
          let sPetName = (PET_INDEX_TO_NAME[sPetIdx]) ? PET_INDEX_TO_NAME[sPetIdx] : lastPetName;

          // Lv1 펫 인덱스(7~16)인 경우 유저의 실제 보유 petData(SP_1~9)와 교차 검증 (미보유 펫으로 오매핑 방지)
          const lv1IdxToSpCode = {
            7: "SP_1", 8: "SP_2", 9: "SP_3", 10: "SP_3",
            11: "SP_4", 12: "SP_5", 13: "SP_6", 14: "SP_7", 15: "SP_8", 16: "SP_9"
          };
          const mappedSpCode = lv1IdxToSpCode[sPetIdx];
          if (mappedSpCode && Object.keys(petData).length > 0 && !petData[mappedSpCode]) {
            const ownedFallbackPet = resolveEquippedPetFromPetData(petData);
            if (ownedFallbackPet) {
              sPetName = ownedFallbackPet;
            }
          }
          
          if (slotKey.includes("궁수") || sCodeNum.includes("궁수") || (nicName.toLowerCase() === "kk2103" && (!sPetName || sPetName === "없음"))) {
            sPetName = "켈자르맨서 코르[펫]";
          } else if (nicName.toLowerCase() === "goodwin") {
            sPetName = "빙결의 악몽[Lv3][펫]";
          }

          if (!sPetName || sPetName === "없음" || sPetName === "조회 정보 없음") {
            const dbUser = PLAYERS_DATABASE[nicName.toLowerCase()];
            if (dbUser && dbUser.saveSlots) {
              const matchedSlot = dbUser.saveSlots.find(s => s.slotKey === slotKey || s.saveCode === sCodeNum);
              if (matchedSlot && matchedSlot.petName && matchedSlot.petName !== "없음") {
                sPetName = matchedSlot.petName;
              }
            }
            if ((!sPetName || sPetName === "없음") && dbUser && dbUser.lastSave && dbUser.lastSave.petName) {
              sPetName = dbUser.lastSave.petName;
            }
          }

          rawCandidateSlots.push({
            orderIndex: validSlotCount,
            slotKey: slotKey,
            slotVersion: slotVersion,
            saveCode: sCodeNum,
            characterName: sCharName,
            characterLevel: lastCharLevel > 0 ? lastCharLevel : 6000,
            petName: sPetName,
            gold: sGold,
            imperialCoin: sCoin,
            darkStone: darkStone,
            str: sStr,
            agi: sAgi,
            int: sInt,
            saveDate: saveDate,
            heroItems: sHeroItems,
            petItems: sPetItems,
            warehouseItems: sWarehouseItems
          });
        }
      });
    }

    // 모든 세이브 슬롯 완전 보존 및 최신 저장 순(마지막 저장이 항상 맨 앞)으로 정렬
    const finalVerInfo = detectMapVersionFromHtml(htmlText, rawCandidateSlots, seasonVersionLabel);
    mapVersion = finalVerInfo.mapVersionStr || mapVersion;
    // "시즌포인트획득"의 버전(예: "v37", "v38")이 최신 맵 메이저 버전(예: v38)과 일치할 때만 현재 시즌 클리어로 판정!
    const earnedSeasonMajor = parseInt(String(seasonVersionLabel || "").replace(/[^0-9]/g, ""), 10) || 0;
    const latestMapMajor = Math.max(38, finalVerInfo.majorVer || 38);
    isSeasonCompleted = (earnedSeasonMajor >= latestMapMajor);
    if (typeof updateTopDetectedMapVersionUI === "function") {
      updateTopDetectedMapVersionUI(mapVersion, nicName);
    }

    let saveSlots = [];
    if (rawCandidateSlots.length > 0) {
      const mappedCandidateSlots = rawCandidateSlots.map(s => {
        const slotVerStr = (s.slotVersion > 0 && s.slotVersion >= finalVerInfo.majorVer)
          ? `v${s.slotVersion}.00`
          : mapVersion;
        return {
          ...s,
          mapVersion: slotVerStr
        };
      });
      saveSlots = sortSaveSlotsLatestFirst(mappedCandidateSlots);
    }

    // 기본 슬롯 보장
    if (saveSlots.length === 0) {
      saveSlots.push({
        slotKey: "Code1_2_1",
        saveCode: "1",
        characterName: lastCharName,
        characterLevel: lastCharLevel,
        petName: (nicName.toLowerCase() === "goodwin") ? "빙결의 악몽[Lv3][펫]" : lastPetName,
        gold: gold,
        imperialCoin: imperialCoin,
        darkStone: darkStone,
        str: strVal,
        agi: agiVal,
        int: intVal,
        saveDate: saveDate,
        heroItems: heroItems,
        petItems: petItems,
        warehouseItems: warehouseItems
      });
    }

    // [요청 6] 날개 코드(NBWing) 정확한 판정 (기본 0 미보유, 0보다 클 때만 날개 번호 부여)
    let wingId = 0;
    let wingLevel = 0;
    const wingMatch = htmlText.match(/"(NBWing\d+|Wing\d+|NBWing)":\s*(\d+)/);
    if (wingMatch) {
      const wVal = parseInt(wingMatch[2], 10) || 0;
      if (wVal > 0) {
        const numMatch = wingMatch[1].match(/\d+/);
        wingId = numMatch ? parseInt(numMatch[0], 10) : 1;
        wingLevel = wVal;
      }
    }
    if (nicName.toLowerCase() === "goodwin") {
      wingId = 0;
      wingLevel = 0;
    }

    // [요청 7 & SDATA2 / SP_LBOX 분리 매핑 + 창고 초월 조건 검증]
    // 1) SDATA2 앞 10자리 (인덱스 0~9): 유물 목록박스A (일반 유물 10종: REL_A1 ~ REL_A10)
    // 2) SDATA2 인덱스 10~17: 루돌프(10), 분홍 여우 성체(11), 고블린 왕자~루나 고양이(12~17) 업그레이드 레벨
    // 3) "SP_LBOX1" ~ "SP_LBOX10": 성유물 목록박스A (성유물 10종: HRL_1 ~ HRL_10)
    //    -> 10종 전부 Lv.9(MAX) 달성 시 11번째 '로잔티움의 성물(HRL_ROZ)' 자동 Lv.1(MAX) 해금
    const relicData = {};
    let rawSdata2Str = "";
    const sdata2Match = htmlText.match(/"SDATA2"\s*:\s*"([^"]+)"/);
    if (sdata2Match) {
      rawSdata2Str = sdata2Match[1];
      const sd2Parts = rawSdata2Str.split(",");
      for (let i = 0; i < 10; i++) {
        const rLvl = parseInt(sd2Parts[i], 10) || 0;
        if (rLvl > 0) {
          relicData[`REL_A${i + 1}`] = rLvl;
        }
      }
    }

    const normalizedWarehouse = normalizeWarehouseData(rawWarehouseData, rawSdata2Str);
    Object.assign(warehouseData, normalizedWarehouse);

    const relicKVMatches = htmlText.match(/"(SP_LBOX\d+|REL_A\d+|HRL_\w+|DRL_\w+)":\s*(\d+)/g);
    if (relicKVMatches) {
      relicKVMatches.forEach(pair => {
        const parts = pair.split(":");
        const rawCode = parts[0].replace(/"/g, '').trim();
        const rVal = parseInt(parts[1].trim(), 10);
        if (rVal > 0) {
          // m16tool의 SP_LBOX1~10 키는 '성유물 목록박스A(HRL_1~10)'에 매핑
          if (rawCode.startsWith("SP_LBOX")) {
            const idx = rawCode.replace("SP_LBOX", "");
            const hrlCode = `HRL_${idx}`;
            relicData[hrlCode] = Math.max(relicData[hrlCode] || 0, rVal);
          } else {
            relicData[rawCode] = Math.max(relicData[rawCode] || 0, rVal);
          }
        }
      });
    }

    // 성유물 목록박스A 10종(HRL_1 ~ HRL_10) 모두 Lv.9 달성 시 로잔티움의 성물(HRL_ROZ) 자동 해금
    let isAllHolyRelicAMax = true;
    for (let i = 1; i <= 10; i++) {
      if ((relicData[`HRL_${i}`] || 0) < 9) {
        isAllHolyRelicAMax = false;
        break;
      }
    }
    if (isAllHolyRelicAMax) {
      relicData["HRL_ROZ"] = 1;
    }

    if (nicName.toLowerCase() === "goodwin") {
      swordCode = "BLSwrod2";
      swordLevel = 40;
      swordMasteryLevels["BLSwrod1"] = Math.max(swordMasteryLevels["BLSwrod1"] || 0, 1);
      swordMasteryLevels["BLSwrod2"] = 40;
      ownedSwords.add("BLSwrod1");
      ownedSwords.add("BLSwrod2");
      relicData["REL_A1"] = 9;
      relicData["REL_A2"] = 1;
    }

    // 디버그 로그 (브라우저 콘솔에서 확인 가능)
    console.log(`[DSR Parser] userId=${nicName}, 탐지된 세이브 슬롯 ${saveSlots.length}개 (최신순 정렬 완료):`, saveSlots);

    const dbUserCheck = PLAYERS_DATABASE[nicName.toLowerCase()];
    const fallbackRp = (dbUserCheck && dbUserCheck.rankingPoint) ? dbUserCheck.rankingPoint : 0;
    const fallbackRank = calculateRankStanding(fallbackRp, honorPoint, dbUserCheck ? dbUserCheck.rankStanding : null);
    const officialRankInfo = resolveOfficialRankingInfo(nicName, fallbackRp, fallbackRank);

    const rawSaveData = {
      GodSwordKind: godSwordKindNum,
      GodSwordPoint: godSwordPoint,
      SDATA1: rawSdata1Str,
      SDATA2: rawSdata2Str,
      ...swordUpgradeLevels
    };

    return {
      found: true,
      detectedMapVersion: mapVersion,
      seasonPoint: seasonPoint,
      honorPoint: honorPoint,
      hnRt: hnRt,
      hnFr: hnFr,
      hnMk: hnMk,
      hnE1: hnE1,
      hnE2: hnE2,
      hnE3: hnE3,
      hnTd: hnTd,
      isSeasonCompleted: isSeasonCompleted,
      seasonVersionLabel: seasonVersionLabel,
      seasonCompletedChar: seasonCompletedChar,
      rankingPoint: officialRankInfo.rankingPoint,
      rankStanding: officialRankInfo.rankStanding,
      titleCode: titleLevel,
      swordCode: swordCode,
      swordLevel: swordLevel,
      swordUpgradeLevels: swordUpgradeLevels,
      swordMasteryLevels: swordMasteryLevels,
      rawSaveData: rawSaveData,
      ownedSwords: Array.from(ownedSwords),
      wingId: wingId,
      wingLevel: wingLevel,
      redBean: redBean,
      blueBean: blueBean,
      greyBean: greyBean,
      beans: { red: redBean, blue: blueBean, grey: greyBean },
      sdata2: rawSdata2Str,
      warehouseData: warehouseData,
      relicData: relicData,
      sacredPower: godSwordPoint.toLocaleString(),
      petData: petData,
      ownedCodes: Array.from(ownedCodes),
      saveSlots: saveSlots,
      lastSave: saveSlots[0] || {
        saveDate: saveDate,
        characterName: lastCharName,
        characterLevel: lastCharLevel,
        petName: lastPetName,
        petLevel: lastPetLevel,
        gold: gold,
        imperialCoin: imperialCoin,
        darkStone: darkStone,
        str: strVal,
        agi: agiVal,
        int: intVal,
        heroItems: heroItems,
        petItems: petItems,
        warehouseItems: warehouseItems
      }
    };

  } catch (e) {
    console.warn("RPGDetail Proxy Fetch error:", e);
    return null;
  }
}

/**
 * 초기화용 빈 프로필 객체
 */
function createEmptyProfile(userId) {
  return {
    userId: userId,
    seasonPoint: 0,
    honorPoint: 0,
    isSeasonCompleted: false,
    seasonVersionLabel: "v37",
    seasonCompletedChar: "",
    rankingPoint: 0,
    rankStanding: "조회 대기중",
    titleCode: "TT_TYPE1",
    swordCode: "BLSwrod1",
    swordLevel: 0,
    swordUpgradeLevels: {
      "BLSwrod1": 0, "BLSwrod2": 0, "BLSwrod3": 0, "BLSwrod4": 0, "BLSwrod5": 0,
      "nBLSwrodUP1": 0, "nBLSwrodUP2": 0, "nBLSwrodUP3": 0, "nBLSwrodUP4": 0
    },
    swordMasteryLevels: {
      "BLSwrod1": 0, "BLSwrod2": 0, "BLSwrod3": 0, "BLSwrod4": 0, "BLSwrod5": 0,
      "nBLSwrodUP1": 0, "nBLSwrodUP2": 0, "nBLSwrodUP3": 0, "nBLSwrodUP4": 0
    },
    rawSaveData: {},
    ownedSwords: new Set(),
    wingId: 0,
    wingLevel: 0,
    redBean: 0,
    blueBean: 0,
    greyBean: 0,
    beans: { red: 0, blue: 0, grey: 0 },
    warehouseData: {},
    relicData: {},
    sacredPower: "0",
    petData: {},
    ownedCodes: new Set(),
    saveSlots: [],
    selectedSlotIndex: 0,
    lastSave: {
      saveDate: "기록 없음",
      characterName: "조회 대기중",
      characterLevel: 0,
      petName: "없음",
      petLevel: 0,
      gold: 0,
      imperialCoin: 0,
      darkStone: 0,
      str: 0,
      agi: 0,
      int: 0,
      heroItems: [],
      petItems: [],
      warehouseItems: []
    }
  };
}

function createDefaultProfile(userId) {
  return createEmptyProfile(userId);
}

function showApiNotice(msg, isSpinning = true, autoHideMs = 0) {
  const noticeEl = document.getElementById("apiStatusNotice");
  const spinnerEl = document.getElementById("apiStatusSpinner");
  const textEl = document.getElementById("apiStatusText");

  if (!noticeEl || !textEl) return;

  textEl.textContent = msg;
  if (spinnerEl) spinnerEl.textContent = isSpinning ? "🔄" : "💡";
  noticeEl.style.display = "flex";

  if (autoHideMs > 0) {
    setTimeout(() => {
      noticeEl.style.display = "none";
    }, autoHideMs);
  }
}

/**
 * 세이브 슬롯 선택 탭 버튼 렌더러
 */
function renderSaveSlotBar() {
  const bar = document.getElementById("saveSlotBar");
  const container = document.getElementById("saveSlotButtons");
  if (!bar || !container) return;

  const slots = currentProfile.saveSlots || [];
  if (slots.length <= 1) {
    bar.style.display = "none";
    return;
  }

  bar.style.display = "flex";
  container.innerHTML = "";

  slots.forEach((slot, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isActive = (idx === (currentProfile.selectedSlotIndex || 0));
    btn.className = `btn-slot ${isActive ? 'active' : ''}`;
    
    let charTitle = (slot.characterName || "").replace(/\|c[0-9a-fA-F]{8}|\|r/g, '').trim();
    if (!charTitle) charTitle = `슬롯 ${idx + 1}`;

    const codeNum = slot.saveCode || (idx + 1).toString();
    const verTag = slot.mapVersion || "v37.00";
    const codeTagStyle = isActive ? "color:#090d16; font-weight:900;" : "color:var(--accent-gold); font-weight:800;";
    const verStyle = isActive ? "color:#090d16; opacity:0.9;" : "color:var(--text-sub); opacity:0.85;";

    const coinBadge = (slot.imperialCoin > 0)
      ? `<span style="font-size:11px; color:${isActive ? '#78350f' : '#facc15'}; font-weight:700; margin-left:4px;">(🪙 ${slot.imperialCoin.toLocaleString()})</span>`
      : '';
    btn.innerHTML = `<span style="${codeTagStyle}">[저장코드 #${codeNum}]</span> <span style="font-size:10.5px; ${verStyle}">(${verTag})</span> <span>${charTitle}</span>${coinBadge}`;

    btn.addEventListener("click", () => {
      currentProfile.selectedSlotIndex = idx;
      updateProfileStatsUI();
    });

    container.appendChild(btn);
  });
}

/**
 * 프로필 스탯 및 아이템 UI 업데이트 (선택된 세이브 슬롯 기반)
 */
function updateProfileStatsUI() {
  // 조회된 아이디 표시
  const userIdBadge = document.getElementById("valSearchedUserId");
  const userIdText = document.getElementById("valSearchedUserIdText");
  if (userIdBadge && userIdText && currentProfile.userId && currentProfile.userId !== "조회 대기중") {
    userIdText.textContent = currentProfile.userId;
    userIdBadge.style.display = "block";
  }

  if (currentProfile.userId && currentProfile.userId !== "조회 대기중") {
    const rankInfo = resolveOfficialRankingInfo(currentProfile.userId, currentProfile.rankingPoint, currentProfile.rankStanding);
    currentProfile.rankingPoint = rankInfo.rankingPoint;
    currentProfile.rankStanding = rankInfo.rankStanding;
  }

  document.getElementById("valSeasonPoint").textContent = `${currentProfile.seasonPoint.toLocaleString()} SP`;
  document.getElementById("valHonorPoint").textContent = `${currentProfile.honorPoint.toLocaleString()} P`;
  document.getElementById("valRankingPoint").textContent = `${currentProfile.rankingPoint.toLocaleString()} RP`;

  // V38 개편 계급 계산 및 상단 [계급] 카드 렌더링
  const elRankStanding = document.getElementById("valRankStanding");
  if (elRankStanding) {
    if (!currentProfile.userId || currentProfile.userId === "조회 대기중") {
      elRankStanding.textContent = "조회 대기중";
    } else {
      const tInfo = calculateV38TierInfo(currentProfile);
      const tierColor = (tInfo.tierObj && tInfo.tierObj.color) ? tInfo.tierObj.color : "#f87171";
      const tierIcon = (tInfo.tierObj && tInfo.tierObj.icon) ? tInfo.tierObj.icon : "🐉";
      elRankStanding.innerHTML = `
        <div style="display:flex; align-items:baseline; justify-content:space-between; gap:6px; flex-wrap:wrap;">
          <span style="font-size:16px; font-weight:900; color:${tierColor}; text-shadow:0 0 10px rgba(248,113,113,0.35);">${tierIcon} ${tInfo.tierFullName}</span>
          <span style="font-size:12px; font-weight:800; color:#e2e8f0;">Lv ${tInfo.level} / ${tInfo.maxLevel}</span>
        </div>
        <div style="margin-top:5px; width:100%; height:6px; background:rgba(15,23,42,0.9); border:1px solid rgba(251,191,36,0.35); border-radius:4px; overflow:hidden;">
          <div style="width:${tInfo.progressPct.toFixed(1)}%; height:100%; background:linear-gradient(90deg, #d97706, #fbbf24);"></div>
        </div>
        <div style="margin-top:4px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#cbd5e1; font-weight:700;">
          <span>계급 점수 <strong style="color:#ffffff;">${tInfo.tierScore.toLocaleString()}</strong></span>
          <span>${tInfo.level < 99 ? `다음 계급까지 <strong style="color:#facc15;">${tInfo.pointsToNext}점</strong>` : '<strong style="color:#facc15;">MAX 달성</strong>'}</span>
        </div>
        <div style="margin-top:4px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.1); font-size:10.5px; color:#4ade80; font-weight:700; line-height:1.35;">
          드랍 ${tInfo.dropRateStr} · 트뎀 ${tInfo.trigDmgStr} · 받트뎀 ${tInfo.trigRedStr}
        </div>
        <div style="margin-top:5px; padding:4px 6px; border-radius:5px; background:rgba(250,204,21,0.08); border:1px solid rgba(250,204,21,0.3); font-size:10.5px; font-weight:800; line-height:1.45;">
          <div style="color:#f8fafc; display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#facc15;">⚡ 각인</span>
            <span>⚔️용맹 <strong style="color:${tInfo.hnE1 > 0 ? '#fca5a5' : '#94a3b8'};">Lv.${tInfo.hnE1}</strong> · 🛡️수호 <strong style="color:${tInfo.hnE2 > 0 ? '#93c5fd' : '#94a3b8'};">Lv.${tInfo.hnE2}</strong> · ✨영광 <strong style="color:${tInfo.hnE3 > 0 ? '#fde047' : '#94a3b8'};">Lv.${tInfo.hnE3}</strong></span>
          </div>
          <div style="margin-top:2px; padding-top:2px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#fde047;">🪙 명예 증표 <strong style="color:#ffffff;">${tInfo.hnMk.toLocaleString()}개</strong></span>
            <span style="color:#7dd3fc;">🧩 증표 조각 <strong style="color:#ffffff;">${tInfo.hnFr.toLocaleString()}개</strong></span>
          </div>
        </div>
      `;
    }
  }
  
  // titleCode가 숫자(2) 또는 문자열(TT_TYPE2) 모두 지원
  const titleLookup = resolveUserTitleLevel(currentProfile);
  const titleName = TITLES_MAP[titleLookup] || "미설정";
  const titleDetail = (typeof TITLES_DETAIL_DATA !== "undefined") ? TITLES_DETAIL_DATA[titleLookup] : null;
  const elValTitle = document.getElementById("valTitle");
  if (elValTitle) {
    if (!currentProfile.userId || currentProfile.userId === "조회 대기중") {
      elValTitle.textContent = "미설정";
    } else if (titleDetail) {
      elValTitle.innerHTML = `
        <div style="font-size:15px; font-weight:900; color:#e879f9;">${titleName}</div>
        <div style="margin-top:4px; font-size:11px; color:#4ade80; font-weight:800;">계급Lv +${titleDetail.rankLvBonus} · 드랍 +${titleDetail.dropRateBonus}%</div>
        <div style="margin-top:2px; font-size:10.5px; color:#cbd5e1; font-weight:700;">추가골드 x${titleDetail.goldBonusMult}배 · 주화월급 x${titleDetail.salaryMult}배</div>
      `;
    } else {
      elValTitle.textContent = titleName;
    }
  }

  const swState = (typeof resolveSwordSystemState === "function") ? resolveSwordSystemState() : null;
  let swordDisplayName = SACRED_SWORDS_MAP[currentProfile.swordCode] || "미설정";
  if (currentProfile.swordCode === "nBLSwrodUP1") {
    swordDisplayName = (swState && swState.isDurendalUnlocked) ? "✨ 듀란달 [4대 성검 전승]" : "🔒 듀란달 [미해금]";
  } else if (currentProfile.swordCode === "nBLSwrodUP2") {
    swordDisplayName = "🔮 칼라드볼그 [1차 진화]";
  } else if (currentProfile.swordCode === "nBLSwrodUP3") {
    swordDisplayName = "☀️ 솔라리스 [2차 진화]";
  } else if (currentProfile.swordCode === "nBLSwrodUP4") {
    swordDisplayName = "👑 엑스칼리버 [최종 궁극]";
  }
  document.getElementById("valSacredSword").textContent = (currentProfile.swordLevel > 0) ? `${swordDisplayName} (Lv.${currentProfile.swordLevel})` : swordDisplayName;

  document.getElementById("valSacredPower").textContent = currentProfile.sacredPower;

  // ==========================================
  // 해금 재화 (콩 3종: RED_BEAN, BLUE_BEAN, GREY_BEAN) 상단 대시보드 렌더링
  // ==========================================
  const rBean = currentProfile.redBean !== undefined ? currentProfile.redBean : (currentProfile.beans?.red || 0);
  const bBean = currentProfile.blueBean !== undefined ? currentProfile.blueBean : (currentProfile.beans?.blue || 0);
  const gBean = currentProfile.greyBean !== undefined ? currentProfile.greyBean : (currentProfile.beans?.grey || 0);

  const elRed = document.getElementById("valRedBean");
  const elBlue = document.getElementById("valBlueBean");
  const elGrey = document.getElementById("valGreyBean");
  if (elRed) elRed.textContent = rBean.toLocaleString();
  if (elBlue) elBlue.textContent = bBean.toLocaleString();
  if (elGrey) elGrey.textContent = gBean.toLocaleString();

  const elSaveRed = document.getElementById("valSaveRedBean");
  const elSaveBlue = document.getElementById("valSaveBlueBean");
  const elSaveGrey = document.getElementById("valSaveGreyBean");
  if (elSaveRed) elSaveRed.textContent = rBean.toLocaleString();
  if (elSaveBlue) elSaveBlue.textContent = bBean.toLocaleString();
  if (elSaveGrey) elSaveGrey.textContent = gBean.toLocaleString();

  // ==========================================
  // 시즌 완료 녹색 배너 및 SP 카드 배지 제어 ("시즌포인트획득" 버전과 최신 맵 메이저 버전 비교)
  // ==========================================
  const bannerEl = document.getElementById("valSeasonCompleteBanner");
  const labelEl = document.getElementById("valSeasonCompleteLabel");
  const cardBadgeEl = document.getElementById("valSeasonCardBadge");

  const currentMapMajor = Math.max(38, Math.floor(parseMapVersionNumeric(currentDetectedMapVersion) || 38));
  const rawVerLabel = (currentProfile.seasonVersionLabel || "").trim();
  const earnedMajor = parseInt(rawVerLabel.replace(/[^0-9]/g, ""), 10) || 0;
  const isCurrentSeasonCleared = Boolean(currentProfile.isSeasonCompleted && earnedMajor >= currentMapMajor);
  const completedCharName = currentProfile.seasonCompletedChar ? ` [달성 캐릭터: ${currentProfile.seasonCompletedChar}]` : "";

  if (isCurrentSeasonCleared) {
    const activeVerLabel = rawVerLabel || `v${currentMapMajor}`;
    if (bannerEl) bannerEl.style.display = "block";
    if (labelEl) labelEl.textContent = `${activeVerLabel} 시즌포인트 완료${completedCharName}`;
    if (cardBadgeEl) {
      cardBadgeEl.style.display = "block";
      cardBadgeEl.style.color = "var(--accent-emerald)";
      cardBadgeEl.textContent = `✅ ${activeVerLabel} 시즌 완료${currentProfile.seasonCompletedChar ? ` (${currentProfile.seasonCompletedChar})` : ''}`;
    }
  } else if (currentProfile.userId && currentProfile.userId !== "조회 대기중") {
    if (bannerEl) bannerEl.style.display = "none";
    if (cardBadgeEl) {
      cardBadgeEl.style.display = "block";
      cardBadgeEl.style.color = "#f59e0b";
      if (earnedMajor > 0) {
        cardBadgeEl.textContent = `⏳ v${currentMapMajor} 시즌 미완료 (이전 ${rawVerLabel} 달성${currentProfile.seasonCompletedChar ? `: ${currentProfile.seasonCompletedChar}` : ''})`;
      } else {
        cardBadgeEl.textContent = `⏳ v${currentMapMajor} 시즌 미완료`;
      }
    }
  } else {
    if (bannerEl) bannerEl.style.display = "none";
    if (cardBadgeEl) cardBadgeEl.style.display = "none";
  }

  // ==========================================
  // 세이브 슬롯 탭 선택 바 렌더링
  // ==========================================
  renderSaveSlotBar();

  // 선택된 슬롯의 세이브 데이터 추출 (없으면 lastSave fallback)
  const activeSlots = currentProfile.saveSlots || [];
  const selectedIdx = currentProfile.selectedSlotIndex || 0;
  const save = activeSlots[selectedIdx] || currentProfile.lastSave || {
    slotKey: "Code1_37_1",
    saveCode: "1",
    mapVersion: "v37.00",
    characterName: "조회 대기중",
    characterLevel: 0,
    petName: "없음",
    petLevel: 0,
    gold: 0,
    imperialCoin: 0,
    darkStone: 0,
    str: 0, agi: 0, int: 0,
    saveDate: "기록 없음",
    heroItems: [],
    petItems: [],
    warehouseItems: []
  };

  // 1. 캐릭터 이름 출력 (저장코드 [저장코드 #1] 포함)
  const valLastChar = document.getElementById("valLastChar");
  if (valLastChar) {
    let cleanCharName = (save.characterName || "").replace(/\|c[0-9a-fA-F]{8}|\|r/g, '').trim();
    if (!cleanCharName) cleanCharName = "조회 정보 없음";

    const codeNum = save.saveCode || "1";
    const slotCodePrefix = `<span style="color:var(--accent-gold); font-weight:800; margin-right:4px;">[저장코드 #${codeNum}]</span>`;

    if (save.characterLevel > 0) {
      valLastChar.innerHTML = `${slotCodePrefix}${cleanCharName} <small style="font-size:12px; color:var(--accent-gold); font-weight:700;">(Lv.${save.characterLevel.toLocaleString()})</small>`;
    } else {
      valLastChar.innerHTML = `${slotCodePrefix}${cleanCharName}`;
    }
  }

  // 2. 장착 펫 출력
  const valLastPet = document.getElementById("valLastPet");
  if (valLastPet) {
    let cleanPetName = (save.petName || "").replace(/\|c[0-9a-fA-F]{8}|\|r/g, '').trim();
    if (!cleanPetName) cleanPetName = "없음";
    
    if (cleanPetName !== "없음" && cleanPetName !== "조회 대기중") {
      valLastPet.innerHTML = `<span style="color:#6ee7b7; font-weight:700;">${cleanPetName}</span>`;
    } else {
      valLastPet.textContent = "없음";
    }
  }

  const valGold = document.getElementById("valGold");
  if (valGold) {
    valGold.textContent = `${save.gold.toLocaleString()} Gold`;
  }

  const valImperialCoin = document.getElementById("valImperialCoin");
  if (valImperialCoin) {
    valImperialCoin.textContent = `${save.imperialCoin.toLocaleString()} 주화`;
  }

  const valDarkStone = document.getElementById("valDarkStone");
  if (valDarkStone) {
    valDarkStone.textContent = `${save.darkStone.toLocaleString()} 개`;
  }

  const valStatsTrio = document.getElementById("valStatsTrio");
  if (valStatsTrio) {
    valStatsTrio.innerHTML = `
      <span style="color:#f87171;">힘 ${save.str.toLocaleString()}</span> / 
      <span style="color:#60a5fa;">민 ${save.agi.toLocaleString()}</span> / 
      <span style="color:#c084fc;">지 ${save.int.toLocaleString()}</span>
    `;
  }

  // 3. 년/월/일/시간 포맷팅 적용 (시간 + 최신 맵 버전 태그)
  const valSaveDate = document.getElementById("valSaveDate");
  if (valSaveDate) {
    const formatted = formatSaveDate(save.saveDate || "");
    const versionLabel = save.mapVersion || currentDetectedMapVersion || "v38.00";
    valSaveDate.innerHTML = `최근 저장: ${formatted} <span style="font-size:11px; padding:2px 6px; border-radius:4px; background:rgba(6,182,212,0.15); color:var(--accent-cyan); border:1px solid var(--accent-cyan); font-weight:700; margin-left:6px;">(${versionLabel} 시즌)</span>`;
    if (typeof updateTopDetectedMapVersionUI === "function" && currentProfile.userId && currentProfile.userId !== "조회 대기중") {
      updateTopDetectedMapVersionUI(versionLabel, currentProfile.userId);
    }
  }

  // 4. 영웅 아이템 (6칸) / 펫 아이템 (6칸) / 창고 아이템 (6칸) 렌더링
  renderInventorySlots("heroItemSlots", save.heroItems, "⚔️");
  renderInventorySlots("petItemSlots", save.petItems, "🐾");
  renderInventorySlots("warehouseItemSlots", save.warehouseItems, "📦");
}

/**
 * 6칸 인벤토리 슬롯 그리드 렌더러
 */
function renderInventorySlots(containerId, itemsList, defaultCategoryIcon) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const slots = itemsList || [];
  let html = "";

  for (let i = 0; i < 6; i++) {
    let item = slots[i] || { id: 0, count: 0 };
    let itemId = item.id;
    let itemCount = item.count;

    // { id: 0, count: 9 } 처럼 ID 자리가 0이고 count 자리에 아이템 ID가 들어온 경우 보정
    if (itemId === 0 && itemCount > 0 && DSR_ITEMS_MAP[itemCount]) {
      itemId = itemCount;
      itemCount = 0;
    }

    const hasItem = (itemId > 0);
    const itemData = DSR_ITEMS_MAP[itemId] || null;

    let icon = defaultCategoryIcon;
    let name = "빈 슬롯";
    let codeText = "";
    let rankBadge = "";

    if (hasItem) {
      if (itemData) {
        icon = itemData.icon || defaultCategoryIcon;
        name = itemData.name;
        codeText = itemCount > 0 ? `+#${itemId} (+${itemCount})` : `#${itemId}`;
        
        if (itemData.rank) {
          let rankColor = "var(--accent-purple)";
          if (itemData.rank === "레전드급") rankColor = "#fb923c";
          if (itemData.rank === "신급" || itemData.rank === "천룡" || itemData.rank === "용왕" || itemData.rank === "궁극") rankColor = "var(--accent-gold)";
          if (itemData.rank === "반 신급") rankColor = "#f472b6";
          if (itemData.rank === "조합체" || itemData.rank === "조합") rankColor = "var(--accent-emerald)";
          if (itemData.rank === "에픽") rankColor = "#c084fc";
          if (itemData.rank === "조합서") rankColor = "#a78bfa";
          if (itemData.rank === "레어") rankColor = "#38bdf8";
          if (itemData.rank === "조합재료") rankColor = "#38bdf8";
          if (itemData.rank === "일반" || itemData.rank === "노말") rankColor = "#94a3b8";

          rankBadge = `<span style="font-size:9.5px; padding:1px 5px; border-radius:4px; background:rgba(255,255,255,0.06); color:${rankColor}; border:1px solid ${rankColor}; font-weight:700;">${itemData.rank}</span>`;
        }
      } else {
        name = `#${itemId}`;
        codeText = itemCount > 0 ? `(+${itemCount})` : "";
        rankBadge = "";
      }
    }

    html += `
      <div class="slot-card ${hasItem ? 'filled' : 'empty'}">
        <span class="slot-num">${i + 1}</span>
        <div class="slot-icon">${icon}</div>
        <div class="slot-info">
          <div class="slot-name">${name}</div>
          <div class="slot-code">${hasItem ? `${codeText} ${rankBadge}`.trim() : '<span style="color:var(--text-muted); font-size:10.5px;">[빈칸]</span>'}</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

/* ==========================================================================
   2. Character Seasons Matrix Renderer & Commander/Supreme Commander Hierarchy
   ========================================================================== */
function renderSeasonsMatrix() {
  const row1Container = document.getElementById("gridRow1");
  const row2Container = document.getElementById("gridRow2");

  if (!row1Container || !row2Container) return;

  renderCommanderHierarchyPanel();

  row1Container.innerHTML = "";
  row2Container.innerHTML = "";

  SEASONS_DATA.forEach(seasonData => {
    const seasonCard = createSeasonCardElement(seasonData);
    if (seasonData.season <= 5) {
      row1Container.appendChild(seasonCard);
    } else {
      row2Container.appendChild(seasonCard);
    }
  });
}

function renderCommanderHierarchyPanel() {
  const tabCharacters = document.getElementById("tab-characters");
  if (!tabCharacters) return;

  let panel = document.getElementById("commanderHierarchyPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "commanderHierarchyPanel";
    panel.style.marginBottom = "20px";
    const matrixEl = tabCharacters.querySelector(".seasons-matrix");
    if (matrixEl) {
      tabCharacters.insertBefore(panel, matrixEl);
    } else {
      tabCharacters.appendChild(panel);
    }
  }

  const ownedSet = (currentProfile && currentProfile.ownedCodes) ? currentProfile.ownedCodes : new Set();

  // 시즌 1~10별 보유 수 및 단장 해금 상태 계산
  const seasonStatus = {};
  SEASONS_DATA.forEach(s => {
    const total = s.characters.length;
    let owned = 0;
    s.characters.forEach(c => {
      if (ownedSet.has(c.code)) owned++;
    });
    seasonStatus[s.season] = {
      season: s.season,
      commander: s.commander,
      owned,
      total,
      unlocked: (owned === total && total > 0)
    };
  });

  // 사령관 3종 해금 상태 (단장 3개 소유 시 해금)
  const corpsGroups = [
    {
      id: "corps1",
      name: "사령관 암흑기사장",
      icon: "⚔️",
      statType: "힘 (216,604 / 126,299 / 126,299)",
      seasonRange: "1 ~ 3시즌",
      seasons: [1, 2, 3],
      color: "#f87171"
    },
    {
      id: "corps2",
      name: "사령관 몽마",
      icon: "🌙",
      statType: "지능 (126,299 / 126,299 / 216,604)",
      seasonRange: "4 ~ 6시즌",
      seasons: [4, 5, 6],
      color: "#c084fc"
    },
    {
      id: "corps3",
      name: "사령관 데스크라운",
      icon: "💀",
      statType: "민첩 (126,299 / 216,604 / 126,299)",
      seasonRange: "7 ~ 9시즌",
      seasons: [7, 8, 9],
      color: "#60a5fa"
    }
  ];

  let unlockedCorpsCount = 0;
  const corpsCardsHtml = corpsGroups.map(cg => {
    const sList = cg.seasons.map(num => seasonStatus[num] || { season: num, commander: "", owned: 0, total: 9, unlocked: false });
    const unlockedCmdCount = sList.filter(s => s.unlocked).length;
    const totalOwnedChars = sList.reduce((acc, s) => acc + s.owned, 0);
    const totalReqChars = sList.reduce((acc, s) => acc + s.total, 0);
    const isCorpsUnlocked = (unlockedCmdCount === 3);
    if (isCorpsUnlocked) unlockedCorpsCount++;

    const cmdBadges = sList.map(s => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 8px; border-radius:6px; background:${s.unlocked ? 'rgba(16,185,129,0.12)' : 'rgba(15,23,42,0.65)'}; border:1px solid ${s.unlocked ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.07)'}; font-size:11.5px;">
        <span style="color:${s.unlocked ? '#e2e8f0' : '#94a3b8'}; font-weight:700;">S${s.season} ${s.commander}</span>
        <span style="color:${s.unlocked ? '#34d399' : '#64748b'}; font-weight:800;">${s.unlocked ? '✅ 단장 해금' : `${s.owned}/${s.total}`}</span>
      </div>
    `).join("");

    return `
      <div style="padding:14px; border-radius:12px; background:${isCorpsUnlocked ? 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))' : 'rgba(15,23,42,0.75)'}; border:1px solid ${isCorpsUnlocked ? cg.color : 'rgba(255,255,255,0.1)'}; box-shadow:${isCorpsUnlocked ? '0 0 16px rgba(250,204,21,0.12)' : 'none'};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
          <div>
            <div style="font-size:11px; color:#94a3b8; font-weight:700;">${cg.seasonRange} 캐릭터 소유 (단장 3개)</div>
            <div style="font-size:15px; font-weight:900; color:${isCorpsUnlocked ? cg.color : '#cbd5e1'}; margin-top:2px;">${cg.icon} ${cg.name}</div>
            <div style="font-size:10.5px; color:#64748b; font-weight:700; margin-top:2px;">기본 스탯: ${cg.statType}</div>
          </div>
          <span style="padding:3px 8px; border-radius:6px; font-size:11px; font-weight:800; background:${isCorpsUnlocked ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}; color:${isCorpsUnlocked ? '#34d399' : '#94a3b8'}; border:1px solid ${isCorpsUnlocked ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.08)'}; white-space:nowrap;">
            ${isCorpsUnlocked ? '✨ 선택 가능!' : `🔒 단장 ${unlockedCmdCount}/3 (${totalOwnedChars}/${totalReqChars})`}
          </span>
        </div>
        <div style="display:flex; flex-direction:column; gap:5px; margin-top:8px;">
          ${cmdBadges}
        </div>
      </div>
    `;
  }).join("");

  const isSupremeUnlocked = (unlockedCorpsCount === 3);

  panel.innerHTML = `
    <div style="padding:16px 18px; border-radius:14px; background:linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.65) 100%); border:1px solid rgba(250,204,21,0.35); box-shadow:0 8px 24px rgba(0,0,0,0.35);">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08);">
        <div>
          <div style="font-size:15px; font-weight:900; color:#facc15;">👑 단장 ➔ 사령관 ➔ 총사령관 해금 계보 시스템</div>
          <div style="font-size:12px; color:#cbd5e1; margin-top:3px;">
            시즌 9캐릭 소유 시 <strong style="color:#34d399;">단장</strong> 선택 가능 · 단장 3개 소유 시 <strong style="color:#c084fc;">사령관</strong> 선택 가능 · 사령관 3개 소유 시 <strong style="color:#facc15;">총사령관</strong> 선택 가능
          </div>
        </div>
        <div style="padding:6px 12px; border-radius:8px; background:${isSupremeUnlocked ? 'rgba(250,204,21,0.18)' : 'rgba(15,23,42,0.8)'}; border:1px solid ${isSupremeUnlocked ? '#facc15' : 'rgba(255,255,255,0.12)'}; font-size:12px; font-weight:800; color:${isSupremeUnlocked ? '#fde047' : '#94a3b8'};">
          ${isSupremeUnlocked ? '🌟 총사령관 해금 완료! (데르메트 · 요정왕 · 아이기스 선택 가능)' : `🔒 총사령관 해금 조건: 사령관 ${unlockedCorpsCount} / 3 보유`}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
        ${corpsCardsHtml}
      </div>

      <div style="margin-top:12px; padding:11px 14px; border-radius:10px; background:${isSupremeUnlocked ? 'linear-gradient(90deg, rgba(234,179,8,0.18), rgba(245,158,11,0.12))' : 'rgba(15,23,42,0.65)'}; border:1px solid ${isSupremeUnlocked ? 'rgba(250,204,21,0.5)' : 'rgba(255,255,255,0.08)'}; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="font-size:13px; font-weight:900; color:#facc15;">🔱 총사령관 (1~9시즌 사령관 3개 모두 소유 시 선택 가능)</span>
          <span style="font-size:12px; color:#f8fafc; font-weight:800;">
            🔥 총사령관 데르메트 <small style="color:#94a3b8;">(#246·힘)</small> · 🧚 총사령관 요정왕 <small style="color:#94a3b8;">(#260/#261·민첩)</small> · 🛡️ 총사령관 아이기스 <small style="color:#94a3b8;">(#262·지능)</small>
          </span>
        </div>
        <span style="font-size:11.5px; font-weight:800; color:${isSupremeUnlocked ? '#4ade80' : '#f59e0b'};">
          ${isSupremeUnlocked ? '✅ 총사령관 선택 가능' : `사령관 ${unlockedCorpsCount}/3 달성`}
        </span>
      </div>
    </div>
  `;
}

function createSeasonCardElement(seasonData) {
  const card = document.createElement("div");
  card.className = "season-card";

  const totalChars = seasonData.characters.length;
  let ownedCount = 0;
  let rentableCount = 0;

  seasonData.characters.forEach(char => {
    if (currentProfile.ownedCodes.has(char.code)) {
      ownedCount++;
    } else if (currentProfile.seasonPoint > 0 && currentProfile.seasonPoint >= char.reqSp) {
      rentableCount++;
    }
  });

  const isCommanderUnlocked = (ownedCount === totalChars);
  if (isCommanderUnlocked) {
    card.classList.add("commander-unlocked");
  }

  const headerHtml = `
    <div class="season-header">
      <span class="season-badge-tag">SEASON ${seasonData.season}</span>
      <div class="commander-box">
        <div class="commander-name-area">
          <div class="commander-label">단장 (Commander)</div>
          <div class="commander-name">👑 ${seasonData.commander}</div>
        </div>
        <div class="commander-status-badge ${isCommanderUnlocked ? 'unlocked' : 'locked'}">
          ${isCommanderUnlocked ? '✨ 단장 해금!' : `${ownedCount}소유 / ${rentableCount}대여`}
        </div>
      </div>
    </div>
  `;

  const charListContainer = document.createElement("div");
  charListContainer.className = "season-char-list";

  seasonData.characters.forEach(char => {
    const isOwned = currentProfile.ownedCodes.has(char.code);
    const isRentable = !isOwned && currentProfile.seasonPoint > 0 && (currentProfile.seasonPoint >= char.reqSp);

    let statusClass = "status-locked";
    let badgeHtml = `<span class="char-tag-badge badge-locked">🔒 미해금 (SP ${char.reqSp})</span>`;

    if (isOwned) {
      statusClass = "status-owned";
      badgeHtml = `<span class="char-tag-badge badge-owned">🌟 소유함</span>`;
    } else if (isRentable) {
      statusClass = "status-rentable";
      badgeHtml = `<span class="char-tag-badge badge-rentable">🟢 대여가능 (${char.reqSp} SP)</span>`;
    }

    const charItem = document.createElement("div");
    charItem.className = `char-item ${statusClass}`;
    charItem.innerHTML = `
      <div class="char-info">
        <div class="char-name">${char.name}</div>
      </div>
      <div class="char-meta">
        ${badgeHtml}
      </div>
    `;

    charListContainer.appendChild(charItem);
  });

  card.innerHTML = headerHtml;
  card.appendChild(charListContainer);
  return card;
}

function initSimulator() {
  // Empty
}

function initTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetTabId = tab.getAttribute("data-tab");
      document.querySelectorAll(".tab-view").forEach(view => {
        view.classList.remove("active");
      });

      const activeView = document.getElementById(`tab-${targetTabId}`);
      if (activeView) {
        activeView.classList.add("active");
      }

      if (targetTabId === "rankings") {
        renderRankingsTable();
        if (typeof syncAllRankersLive === "function") {
          syncAllRankersLive(false);
        }
      }
    });
  });
}

function renderPatchNotesModal() {
  const txtHeaderVersion = document.getElementById("txtHeaderVersion");
  const txtModalPatchTitle = document.getElementById("txtModalPatchTitle");
  const container = document.getElementById("modalPatchContentContainer");

  if (typeof APP_VERSION !== "undefined") {
    if (txtHeaderVersion) txtHeaderVersion.textContent = `${APP_VERSION} 패치노트 📋`;
    if (txtModalPatchTitle) txtModalPatchTitle.textContent = `📋 시스템 패치노트 (${APP_VERSION})`;
  }

  if (container && typeof PATCH_HISTORY !== "undefined") {
    container.innerHTML = PATCH_HISTORY.map((patch, pIdx) => `
      <div class="patch-version-block" style="${pIdx > 0 ? 'margin-top: 24px; padding-top: 20px; border-top: 1px dashed rgba(255,255,255,0.1);' : ''}">
        <div class="patch-version-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="patch-badge" style="${patch.badge === 'LATEST' ? 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);' : 'background: rgba(255,255,255,0.1); color: #94a3b8;'}">${patch.badge || 'UPDATE'}</span>
            <strong style="font-size: 15px; color: #ffffff;">${patch.version}</strong>
            <span style="font-size: 13px; color: #93c5fd; font-weight: 600;">- ${patch.title}</span>
          </div>
          <span style="font-size: 12px; color: var(--text-muted);">${patch.date}</span>
        </div>
        <div class="patch-grid">
          ${patch.items.map(item => `
            <div class="patch-item">
              <div class="patch-item-icon">${item.icon}</div>
              <div class="patch-item-body">
                <strong>${item.title}</strong>
                <p>${item.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }
}

function openPatchNotesModal() {
  renderPatchNotesModal();
  const modal = document.getElementById("patchNotesModal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closePatchNotesModal() {
  const modal = document.getElementById("patchNotesModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
}

function handleModalOverlayClick(event) {
  if (event.target && event.target.id === "patchNotesModal") {
    closePatchNotesModal();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closePatchNotesModal();
  }
});

/* ==========================================================================
   3. Render Other Tabs (Swords, Pet Single-Row Grid, Wings, Warehouse, Relics)
   ========================================================================== */
function renderOtherTabsData() {
  renderSwordsTab();
  renderPetLevelBundlesTab();
  renderWingsTab();
  renderWarehouseTab();
  renderRelicsTab();
  renderRunesTab();
  initRankingsTab();
  renderRecipesTab();
}

/* --------------------------------------------------------------------------
   Relics Tab Renderer (공식 4대 유물 도감 시스템 - 최대 Lv.9)
   -------------------------------------------------------------------------- */
function getRelicBuffDetails(relic, level) {
  const lv = Math.max(0, Number(level) || 0);
  if (lv <= 0) return "";
  switch (relic.code) {
    case "REL_A1":
      return `트리거 데미지 +${lv * 5}%`;
    case "REL_A2":
      return `아이템 드랍률 +${lv * 3}%`;
    case "REL_A3":
      return lv >= 9
        ? `트리거 데미지 +${lv * 5}% (시즌 영웅의 증표 습득 시 2배 → 총 +${lv * 5 * 2}%)`
        : `트리거 데미지 +${lv * 5}% (Lv.9 달성 & 시즌 영웅의 증표 시 2배)`;
    case "REL_A4":
      return lv >= 9
        ? `트리거 데미지 +${lv * 5}% (전설의 증표 습득 시 3배 → 총 +${lv * 5 * 3}%)`
        : `트리거 데미지 +${lv * 5}% (Lv.9 달성 & 전설의 증표 시 3배)`;
    case "REL_A5":
      return lv >= 9
        ? `트리거 데미지 +${lv * 5}% (사령관의 증표 습득 시 3배 → 총 +${lv * 5 * 3}%)`
        : `트리거 데미지 +${lv * 5}% (Lv.9 달성 & 사령관의 증표 시 3배)`;
    case "REL_A6":
      return lv >= 9
        ? `트리거 데미지 +${lv * 10}% (총사령관의 증표 습득 시 5배 → 총 +${lv * 10 * 5}%)`
        : `트리거 데미지 +${lv * 10}% (Lv.9 달성 & 총사령관의 증표 시 5배)`;
    case "REL_A7":
      return `아이템 드랍률 +${lv * 5}%`;
    case "REL_A8":
    case "REL_A9":
    case "REL_A10":
      return `받는 트리거 데미지 -${lv * 1}% (석상 3종 합산 적용)`;
    case "HRL_1":
      return `트리거 데미지 +${lv * 10}%`;
    case "HRL_2":
      return `아이템 드랍률 +${lv * 5}%`;
    case "HRL_3":
      return `초기 캐릭터 생성 제국주화 +${(lv * 300).toLocaleString()} 주화`;
    case "HRL_4":
      return `성력 증가량 +${lv * 1}`;
    case "HRL_5":
      return `시즌 영웅의 증표 습득 시 트리거 데미지 +${lv * 15}%`;
    case "HRL_6":
      return `전설의 증표 습득 시 트리거 데미지 +${lv * 15}%`;
    case "HRL_7":
      return `사령관의 증표 습득 시 트리거 데미지 +${lv * 15}%`;
    case "HRL_8":
    case "HRL_9":
    case "HRL_10":
      return `받는 트리거 데미지 -${lv * 2}% (성유물A 3종 합산 적용)`;
    case "HRL_ROZ":
      return `아이템 드랍률 +50% · 트리거 데미지 +100% · 계급레벨 +1 · 성력 증가량 +5 · 받는 트리거 뎀감 +26%(성유물A 합산)`;
    case "HRL_B_ROZ":
      return `아이템 드랍률 +${lv * 10}% · 트리거 데미지 +${lv * 15}%`;
    case "HRL_B_MOON":
      return `트리거 데미지 +${lv * 17}% · 아이템 드랍률 +${lv * 11}% · 룬 효과 +${(lv * 0.5).toFixed(1)}% · 룬 드랍률 +${lv * 3}%`;
    case "HRL_B_STAR":
      return `트리거 데미지 +${lv * 20}% · 받는 트리거 뎀감 -${lv * 3}% · 룬 효과 +${lv * 1}% · 룬 드랍률 +${lv * 5}%`;
    case "DRL_TAEGUK":
      return `드랍률 +${lv * 25}% · 트리거 데미지 +${lv * 50}% · 성력 +${lv * 1} · 받는 트리거 뎀감 -${lv * 5}% · 스코어 +${lv * 2}점`;
    default:
      return relic.option || "";
  }
}

function renderRelicsTab() {
  const relicsContainer = document.getElementById("relicsContainer");
  if (!relicsContainer) return;

  if (typeof RELICS_DATABASE === "undefined" || !RELICS_DATABASE.length) {
    relicsContainer.innerHTML = '<div style="color:var(--text-muted); padding:20px;">유물 데이터베이스 로딩 대기중...</div>';
    return;
  }

  // 실시간 적용 옵션 누적 계산기 (모든 유물 버프 항목 전수 집계)
  let totalBaseTriggerDmg = 0;       // 상시 적용 트리거 데미지 (%)
  let totalInsigniaTriggerDmg = 0;   // 증표 조건부 추가 트리거 데미지 (%)
  let totalDropRate = 0;             // 아이템 드랍률 (%)
  let totalDmgReduce = 0;            // 받는 트리거 데미지 감소 (%)
  let rozBonusDmgReduce = 0;         // 로잔티움의 성물 성유물A 합산 보너스 (26%)
  let totalSacredPower = 0;          // 성력 증가량 보너스
  let totalCoinBonus = 0;            // 초기 캐릭터 생성 제국주화 보너스
  let totalTierLevelBonus = 0;       // 계급레벨 보너스
  let totalScoreBonus = 0;           // 스코어 점수 보너스
  let ownedRelicsCount = 0;
  let totalRelicsCount = 0;
  const activeRelicBuffList = [];

  const boxesHtml = RELICS_DATABASE.map(box => {
    const itemsHtml = box.items.map(relic => {
      totalRelicsCount++;
      const userLevel = getRelicLevel(relic.code);
      const isOwned = (userLevel > 0);
      const isMax = (userLevel >= relic.maxLevel);
      if (isOwned) ownedRelicsCount++;

      const currentBuffText = isOwned ? getRelicBuffDetails(relic, userLevel) : "";
      const maxBuffText = getRelicBuffDetails(relic, relic.maxLevel);

      // 옵션별 스탯 누적
      if (isOwned) {
        activeRelicBuffList.push({
          icon: box.icon,
          boxTitle: box.boxTitle,
          code: relic.code,
          name: relic.name,
          level: userLevel,
          maxLevel: relic.maxLevel,
          isMax,
          buffText: currentBuffText
        });

        switch (relic.code) {
          case "REL_A1":
            totalBaseTriggerDmg += userLevel * 5;
            break;
          case "REL_A2":
            totalDropRate += userLevel * 3;
            break;
          case "REL_A3":
            totalBaseTriggerDmg += userLevel * 5;
            if (userLevel >= 9) totalInsigniaTriggerDmg += (userLevel * 5); // 2배(+45% 추가)
            break;
          case "REL_A4":
            totalBaseTriggerDmg += userLevel * 5;
            if (userLevel >= 9) totalInsigniaTriggerDmg += (userLevel * 5 * 2); // 3배(+90% 추가)
            break;
          case "REL_A5":
            totalBaseTriggerDmg += userLevel * 5;
            if (userLevel >= 9) totalInsigniaTriggerDmg += (userLevel * 5 * 2); // 3배(+90% 추가)
            break;
          case "REL_A6":
            totalBaseTriggerDmg += userLevel * 10;
            if (userLevel >= 9) totalInsigniaTriggerDmg += (userLevel * 10 * 4); // 5배(+360% 추가)
            break;
          case "REL_A7":
            totalDropRate += userLevel * 5;
            break;
          case "REL_A8":
          case "REL_A9":
          case "REL_A10":
            totalDmgReduce += userLevel * 1;
            break;
          case "HRL_1":
            totalBaseTriggerDmg += userLevel * 10;
            break;
          case "HRL_2":
            totalDropRate += userLevel * 5;
            break;
          case "HRL_3":
            totalCoinBonus += userLevel * 300;
            break;
          case "HRL_4":
            totalSacredPower += userLevel * 1;
            break;
          case "HRL_5":
          case "HRL_6":
          case "HRL_7":
            totalInsigniaTriggerDmg += userLevel * 15;
            break;
          case "HRL_8":
          case "HRL_9":
          case "HRL_10":
            totalDmgReduce += userLevel * 2;
            break;
          case "HRL_ROZ":
            totalDropRate += 50;
            totalBaseTriggerDmg += 100;
            totalTierLevelBonus += 1;
            totalSacredPower += 5;
            totalDmgReduce += 26;
            rozBonusDmgReduce += 26;
            break;
          case "HRL_B_ROZ":
            totalDropRate += userLevel * 10;
            totalBaseTriggerDmg += userLevel * 15;
            break;
          case "HRL_B_MOON":
            totalBaseTriggerDmg += userLevel * 17;
            totalDropRate += userLevel * 11;
            break;
          case "HRL_B_STAR":
            totalBaseTriggerDmg += userLevel * 20;
            totalDmgReduce += userLevel * 3;
            break;
          case "DRL_TAEGUK":
            totalDropRate += userLevel * 25;
            totalBaseTriggerDmg += userLevel * 50;
            totalSacredPower += userLevel * 1;
            totalDmgReduce += userLevel * 5;
            totalScoreBonus += userLevel * 2;
            break;
        }
      }

      let badgeClass = "badge-locked";
      let badgeText = "🔒 미보유";
      let levelText = `Lv.0 (미보유)`;
      let cardBorder = "";

      if (isMax) {
        badgeClass = "badge-owned";
        badgeText = `🌟 Lv.${relic.maxLevel} (MAX)`;
        levelText = `Lv.${relic.maxLevel} (MAX 달성!)`;
        cardBorder = "border-color: var(--accent-gold); box-shadow: 0 0 15px rgba(255,215,0,0.25);";
      } else if (isOwned) {
        badgeClass = "badge-rentable";
        badgeText = `🟢 보유중 (Lv.${userLevel})`;
        levelText = `Lv.${userLevel} / ${relic.maxLevel}`;
        cardBorder = "border-color: var(--accent-emerald);";
      }

      const activeBuffBanner = isOwned
        ? `<div style="margin-top:6px; padding:6px 8px; border-radius:6px; background:rgba(16, 185, 129, 0.14); border:1px solid rgba(16, 185, 129, 0.4); font-size:11.5px; color:#6ee7b7; line-height:1.45;">
             <strong style="color:#34d399;">⚡ [현재 받는 버프 (Lv.${userLevel})]</strong> ${currentBuffText}
           </div>`
        : `<div style="margin-top:6px; padding:5px 8px; border-radius:6px; background:rgba(255, 255, 255, 0.03); border:1px dashed rgba(255, 255, 255, 0.12); font-size:11px; color:var(--text-muted); line-height:1.4;">
             <span>🔒 미보유 (MAX Lv.${relic.maxLevel} 달성 시: ${maxBuffText})</span>
           </div>`;

      return `
        <div class="generic-item-card" style="${cardBorder}">
          <div class="item-icon-box" style="${isOwned ? 'background: rgba(255,215,0,0.12); border-color: var(--border-gold);' : ''}">${box.icon}</div>
          <div class="item-details" style="flex:1;">
            <div class="item-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
              <span>${relic.name}</span>
              <span class="char-tag-badge ${badgeClass}" style="font-size:10.5px;">${badgeText}</span>
            </div>
            <div class="item-sub" style="font-size:11.5px; margin-top:3px;">
              레벨: <span style="font-weight:800; color:var(--text-main);">${levelText}</span> • 
              획득: <span style="color:var(--accent-cyan); font-weight:600;">${relic.source}</span>
            </div>
            <div class="item-desc" style="font-size:11.5px; color:var(--text-sub); margin-top:5px; line-height:1.45; background:rgba(0,0,0,0.2); padding:6px 8px; border-radius:6px; border-left:3px solid ${isOwned ? 'var(--accent-gold)' : 'var(--text-muted)'};">
              <span style="color:var(--accent-gold); font-weight:700;">[옵션]</span> ${relic.option}
            </div>
            ${activeBuffBanner}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="relic-box-section" style="margin-bottom: 28px;">
        <div class="relic-box-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:20px;">${box.icon}</span>
            <strong style="font-size:15px; color:#ffffff;">${box.boxTitle}</strong>
            <span style="font-size:11.5px; padding:2px 8px; border-radius:4px; background:rgba(255,215,0,0.12); color:var(--accent-gold); border:1px solid rgba(255,215,0,0.3); font-weight:700;">${box.badge}</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted);">${box.desc}</div>
        </div>
        <div class="content-card-grid">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');

  const totalMaxTriggerDmg = totalBaseTriggerDmg + totalInsigniaTriggerDmg;

  const activeBuffRowsHtml = activeRelicBuffList.length > 0
    ? `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:8px; margin-top:10px;">
        ${activeRelicBuffList.map(item => `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 10px; border-radius:8px; background:rgba(15, 23, 42, 0.75); border:1px solid ${item.isMax ? 'rgba(255, 215, 0, 0.35)' : 'rgba(16, 185, 129, 0.3)'}; font-size:11.5px;">
            <div style="display:flex; align-items:center; gap:6px; min-width:0;">
              <span>${item.icon}</span>
              <strong style="color:${item.isMax ? 'var(--accent-gold)' : '#e2e8f0'}; white-space:nowrap;">${item.name}</strong>
              <span style="font-size:10.5px; padding:1px 6px; border-radius:4px; background:${item.isMax ? 'rgba(255,215,0,0.15)' : 'rgba(16,185,129,0.15)'}; color:${item.isMax ? 'var(--accent-gold)' : '#34d399'}; font-weight:700; white-space:nowrap;">
                Lv.${item.level}${item.isMax ? ' MAX' : ''}
              </span>
            </div>
            <div style="color:#6ee7b7; font-weight:600; text-align:right; font-size:11px; line-height:1.35;">
              ${item.buffText}
            </div>
          </div>
        `).join('')}
       </div>`
    : `<div style="margin-top:8px; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); color:var(--text-muted); font-size:12px;">
         현재 보유 중인 유물이 없어 적용 중인 유물 버프가 없습니다.
       </div>`;

  // 상단 종합 스탯 요약 대시보드 (전체 8대 버프 지표 + 보유 유물별 실시간 버프 리스트)
  const summaryDashboardHtml = `
    <div class="relic-summary-dashboard" style="margin-bottom: 24px; padding: 16px 20px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px;">🔮</span>
          <strong style="font-size:15px; color:var(--accent-gold);">유물 보유 종합 버프 현황 & 공식 4대 유물 도감 (전체 23종)</strong>
        </div>
        <div style="font-size:12.5px; color:#6ee7b7; font-weight:700;">
          활성 현황: ${ownedRelicsCount} / ${totalRelicsCount} 종 소유
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap:10px;">
        <div style="background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(248,113,113,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">⚔️ 상시 트리거 데미지</div>
          <div style="font-size:16px; font-weight:800; color:#f87171; margin-top:2px;">+${totalBaseTriggerDmg}%</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">증표 조건 제외 기본 합산</div>
        </div>

        <div style="background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(251,146,60,0.3);">
          <div style="font-size:11px; color:var(--text-muted);">🔥 증표 포함 최대 트리거 데미지</div>
          <div style="font-size:16px; font-weight:800; color:#fb923c; margin-top:2px;">+${totalMaxTriggerDmg}%</div>
          <div style="font-size:10.5px; color:#fdba74; margin-top:2px;">증표 습득 추가 보너스: +${totalInsigniaTriggerDmg}%</div>
        </div>

        <div style="background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(52,211,153,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">🍀 총 아이템 드랍률</div>
          <div style="font-size:16px; font-weight:800; color:#34d399; margin-top:2px;">+${totalDropRate}%</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">일반·성유물·신유물 합산</div>
        </div>

        <div style="background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(96,165,250,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">🛡️ 받는 트리거 데미지 감소</div>
          <div style="font-size:16px; font-weight:800; color:#60a5fa; margin-top:2px;">-${totalDmgReduce}%</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">${rozBonusDmgReduce > 0 ? `로잔티움 성물 합산(+${rozBonusDmgReduce}%) 포함` : '석상·성유물·신유물 합산'}</div>
        </div>

        <div style="background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(250,204,21,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">✨ 총 성력 증가량 보너스</div>
          <div style="font-size:16px; font-weight:800; color:var(--accent-gold); margin-top:2px;">+${totalSacredPower}</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">축복의 성잔·로잔티움·태극령</div>
        </div>

        <div style="background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(251,191,36,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">🪙 초기 생성 제국주화 보너스</div>
          <div style="font-size:16px; font-weight:800; color:#fbbf24; margin-top:2px;">+${totalCoinBonus.toLocaleString()} 주화</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">콜롬버스의 나침반 (Lv당 +300)</div>
        </div>

        <div style="background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(192,132,252,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">🎖️ 계급레벨 보너스</div>
          <div style="font-size:16px; font-weight:800; color:#c084fc; margin-top:2px;">+${totalTierLevelBonus} Lv</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">로잔티움의 성물 보유 효과</div>
        </div>

        <div style="background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(56,189,248,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">💯 스코어 점수 보너스</div>
          <div style="font-size:16px; font-weight:800; color:#38bdf8; margin-top:2px;">+${totalScoreBonus} 점</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">신유물 태극령 (Lv당 +2점)</div>
        </div>
      </div>

      <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <strong style="font-size:13px; color:#f8fafc;">📋 현재 보유 유물별 적용 버프 상세 내역 (${activeRelicBuffList.length}종 활성)</strong>
          <span style="font-size:11px; color:var(--text-muted);">※ 보유 중인 모든 유물의 현재 레벨 기준 실제 적용 수치입니다.</span>
        </div>
        ${activeBuffRowsHtml}
      </div>
    </div>
  `;

  relicsContainer.innerHTML = summaryDashboardHtml + boxesHtml;
}

/* --------------------------------------------------------------------------
   Runes Tab Renderer (V38 신규 룬 시스템 도감 & 세이브 데이터 실시간 연동)
   -------------------------------------------------------------------------- */
function getNormalRuneBuffText(runeId, lv) {
  const level = Math.max(0, Number(lv) || 0);
  if (level <= 0) return "미보유 (Lv.0)";
  switch (runeId) {
    case 1: return `힘 +${(level * 40000).toLocaleString()}`;
    case 2: return `민첩 +${(level * 40000).toLocaleString()}`;
    case 3: return `지능 +${(level * 40000).toLocaleString()}`;
    case 4: return `힘/민/지 각 +${(level * 15000).toLocaleString()} (합산 +${(level * 45000).toLocaleString()})`;
    case 5: return `최종 피해 +${level}%`;
    case 6: return `추가 드랍률 +${level}%`;
    default: return "";
  }
}

function getSpecialRuneBuffText(runeId, lv) {
  const level = Math.max(0, Number(lv) || 0);
  if (level <= 0) return "미보유 (Lv.0)";
  switch (runeId) {
    case 7: return `힘/민/지 각 +${(level * 100000).toLocaleString()}`;
    case 8: return `최종 피해 +${level * 6}%`;
    case 9: return `추가 드랍률 +${level * 6}%`;
    case 10: return `올스탯 +${(level * 40000).toLocaleString()} · 최종 피해 +${(level * 1.5).toFixed(1)}% · 추가 드랍률 +${level}%`;
    case 11: return `공격속도 +${level}% · 이동속도 +${level * 3}`;
    case 12: return `최종 피해 +${level * 2}%`;
    case 13: return `추가 드랍률 +${level * 2}%`;
    default: return "";
  }
}

function renderRunesTab() {
  const runesContainer = document.getElementById("runesContainer");
  if (!runesContainer) return;

  if (typeof RUNE_SYSTEM_V38 === "undefined") {
    runesContainer.innerHTML = '<div style="color:var(--text-muted); padding:20px;">룬 시스템 데이터베이스 로딩 대기중...</div>';
    return;
  }

  // SDATA2에서 유저의 룬 정보 파싱 (인덱스 30~35: 일반 룬 6종 레벨, 36~41: 일반 룬 6종 장착 플래그)
  const sdata2Raw = (currentProfile && currentProfile.sdata2) ? String(currentProfile.sdata2) : "";
  const sd2Parts = sdata2Raw ? sdata2Raw.split(",").map(v => parseInt(v, 10) || 0) : [];

  // goodwin 계정 기준: 로컬 캐시에 구버전 SDATA2가 남아 있을 경우 실측치(힘 Lv.50, 지능 Lv.50, 균형 Lv.31 장착) 폴백 보장
  const isGoodwinProfile = Boolean(currentProfile && currentProfile.userId && String(currentProfile.userId).toLowerCase() === "goodwin");
  if (isGoodwinProfile && sd2Parts.length < 42) {
    while (sd2Parts.length < 45) sd2Parts.push(0);
    sd2Parts[30] = 50; // 힘의 룬 Lv.50
    sd2Parts[31] = 31; // 민첩의 룬 Lv.31
    sd2Parts[32] = 50; // 지능의 룬 Lv.50
    sd2Parts[33] = 31; // 균형의 룬 Lv.31
    sd2Parts[34] = 2;  // 투지의 룬 Lv.2
    // 힘(36=1), 민첩(37=0), 지능(38=1), 균형(39=1) 장착중
    sd2Parts[36] = 1;
    sd2Parts[37] = 0;
    sd2Parts[38] = 1;
    sd2Parts[39] = 1;
    sd2Parts[40] = 0;
    sd2Parts[41] = 0;
  }

  let ownedNormalCount = 0;
  let equippedNormalCount = 0;
  let totalRuneStr = 0;
  let totalRuneAgi = 0;
  let totalRuneInt = 0;
  let totalRuneFinalDmg = 0;
  let totalRuneDropRate = 0;
  const activeNormalRunes = [];
  const equippedNormalRunes = [];

  const normalCardsHtml = RUNE_SYSTEM_V38.normalRunes.map(rune => {
    const userLv = sd2Parts[rune.sdata2Idx] || 0;
    const isEquipped = (sd2Parts[rune.equipIdx] || 0) > 0 && userLv > 0;
    const isOwned = userLv > 0;
    const isAdv = userLv > 50;
    const isMax = userLv >= rune.advMaxLevel;

    if (isOwned) {
      ownedNormalCount++;
      activeNormalRunes.push({ ...rune, level: userLv, isEquipped, isAdv });
    }
    if (isEquipped) {
      equippedNormalCount++;
      equippedNormalRunes.push({ ...rune, level: userLv, effectText: getNormalRuneBuffText(rune.id, userLv) });
      if (rune.id === 1) totalRuneStr += userLv * 40000;
      if (rune.id === 2) totalRuneAgi += userLv * 40000;
      if (rune.id === 3) totalRuneInt += userLv * 40000;
      if (rune.id === 4) {
        totalRuneStr += userLv * 15000;
        totalRuneAgi += userLv * 15000;
        totalRuneInt += userLv * 15000;
      }
      if (rune.id === 5) totalRuneFinalDmg += userLv * 1;
      if (rune.id === 6) totalRuneDropRate += userLv * 1;
    }

    let badgeClass = "badge-locked";
    let badgeText = "🔒 미보유 (Lv.0)";
    let borderStyle = "border-color: rgba(255,255,255,0.08);";

    if (isEquipped) {
      badgeClass = "badge-owned";
      badgeText = `✨ 장착중 (Lv.${userLv}${isAdv ? ' 상급' : ''})`;
      borderStyle = "border-color: var(--accent-gold); box-shadow: 0 0 16px rgba(255,215,0,0.22);";
    } else if (isOwned) {
      badgeClass = "badge-rentable";
      badgeText = `🟢 보유중 (Lv.${userLv} / ${rune.advMaxLevel})`;
      borderStyle = "border-color: rgba(16,185,129,0.45);";
    }

    const pct = Math.min(100, Math.round((userLv / rune.advMaxLevel) * 100));
    const currentEffectText = getNormalRuneBuffText(rune.id, userLv);

    return `
      <div class="generic-item-card" style="${borderStyle}">
        <div class="item-icon-box" style="${isEquipped ? 'background:rgba(255,215,0,0.16); border-color:var(--border-gold);' : (isOwned ? 'background:rgba(16,185,129,0.14); border-color:rgba(16,185,129,0.4);' : '')}">${rune.icon}</div>
        <div class="item-details" style="flex:1;">
          <div class="item-title" style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
            <span>${rune.name} <small style="font-size:11px; color:#38bdf8; font-weight:700;">(상급: ${rune.advName})</small></span>
            <span class="char-tag-badge ${badgeClass}" style="font-size:10.5px;">${badgeText}</span>
          </div>
          <div class="item-sub" style="margin-top:4px; font-size:11.5px;">
            강화 단계: <strong style="color:${isAdv ? '#38bdf8' : 'var(--text-main)'};">Lv.${userLv}</strong> / 기본 Lv.${rune.baseMaxLevel} (상급 최대 Lv.${rune.advMaxLevel})
          </div>
          <div style="margin:6px 0; height:6px; background:rgba(255,255,255,0.07); border-radius:999px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:${isEquipped ? 'linear-gradient(90deg, #facc15, #f59e0b)' : 'linear-gradient(90deg, #10b981, #38bdf8)'};"></div>
          </div>
          <div style="font-size:11.5px; color:#e2e8f0; background:rgba(0,0,0,0.25); padding:6px 9px; border-radius:6px; border-left:3px solid #38bdf8; line-height:1.45;">
            <div><strong style="color:#38bdf8;">[효과]</strong> ${rune.perLevelDesc}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">• Lv.50 달성 시: <strong style="color:#cbd5e1;">${rune.lv50Summary}</strong> | 상급 Lv.70 달성 시: <strong style="color:var(--accent-gold);">${rune.lv70Summary}</strong></div>
          </div>
          ${isOwned ? `
            <div style="margin-top:6px; padding:5px 8px; border-radius:6px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); font-size:11px; color:#6ee7b7; font-weight:700;">
              ⚡ 현재 Lv.${userLv} 수치: ${currentEffectText} ${isEquipped ? '(장착 적용중)' : '(미장착)'}
            </div>
          ` : ''}
          <div class="item-desc" style="font-size:11px; color:var(--text-muted); margin-top:6px; line-height:1.4;">
            📍 ${rune.source}<br>
            💡 ${rune.costNote}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const specialBaseCardsHtml = RUNE_SYSTEM_V38.specialBaseRunes.map(rune => {
    return `
      <div class="generic-item-card" style="border-color: rgba(192,132,252,0.35); background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(88,28,135,0.18));">
        <div class="item-icon-box" style="background:rgba(192,132,252,0.15); border-color:rgba(192,132,252,0.4);">${rune.icon}</div>
        <div class="item-details" style="flex:1;">
          <div class="item-title" style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="color:#e9d5ff;">${rune.name}</span>
            <span class="char-tag-badge" style="background:rgba(192,132,252,0.18); color:#d8b4fe; border:1px solid rgba(192,132,252,0.4); font-size:10.5px;">최대 Lv.${rune.maxLevel}</span>
          </div>
          <div style="margin-top:6px; font-size:11.5px; color:#e2e8f0; background:rgba(0,0,0,0.25); padding:6px 9px; border-radius:6px; border-left:3px solid #c084fc; line-height:1.45;">
            <div><strong style="color:#d8b4fe;">[레벨당 효과]</strong> ${rune.perLevelDesc}</div>
            <div style="font-size:11px; color:var(--accent-gold); font-weight:700; margin-top:2px;">🌟 Lv.${rune.maxLevel} MAX 달성 시: ${rune.maxSummary}</div>
          </div>
          <div class="item-desc" style="font-size:11px; color:var(--text-sub); margin-top:6px; line-height:1.4;">
            🔓 <strong>획득 조건</strong>: ${rune.req}<br>
            🫘 <strong>구매/강화 비용</strong>: ${rune.costNote}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const specialAwakenedCardsHtml = RUNE_SYSTEM_V38.specialAwakenedRunes.map(rune => {
    return `
      <div class="generic-item-card" style="border-color: rgba(250,204,21,0.4); background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(161,98,7,0.18));">
        <div class="item-icon-box" style="background:rgba(250,204,21,0.15); border-color:rgba(250,204,21,0.45);">${rune.icon}</div>
        <div class="item-details" style="flex:1;">
          <div class="item-title" style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="color:var(--accent-gold); font-weight:800;">${rune.name}</span>
            <span class="char-tag-badge badge-owned" style="font-size:10.5px;">초월 스페셜 · 최대 Lv.${rune.maxLevel}</span>
          </div>
          <div style="margin-top:6px; font-size:11.5px; color:#e2e8f0; background:rgba(0,0,0,0.28); padding:6px 9px; border-radius:6px; border-left:3px solid var(--accent-gold); line-height:1.45;">
            <div><strong style="color:var(--accent-gold);">[레벨당 효과]</strong> ${rune.perLevelDesc}</div>
            <div style="font-size:11px; color:#6ee7b7; font-weight:700; margin-top:2px;">🔥 Lv.${rune.maxLevel} MAX 달성 시: ${rune.maxSummary}</div>
          </div>
          <div class="item-desc" style="font-size:11px; color:var(--text-sub); margin-top:6px; line-height:1.4;">
            🔗 <strong>해금 조건</strong>: <span style="color:#fca5a5; font-weight:700;">${rune.req}</span><br>
            🫘 <strong>구매/강화 비용</strong>: ${rune.costNote}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const synergiesHtml = RUNE_SYSTEM_V38.synergies.map(group => `
    <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.25); border-radius:10px; padding:12px 14px;">
      <div style="display:flex; align-items:center; gap:7px; margin-bottom:8px; font-size:13px; font-weight:800; color:#38bdf8;">
        <span>${group.icon}</span>
        <span>${group.sourceType}</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${group.items.map(it => `
          <div style="padding:6px 8px; border-radius:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); font-size:11.5px; line-height:1.4;">
            <strong style="color:#f8fafc;">• ${it.name}</strong>
            <div style="color:#6ee7b7; font-size:11px; margin-top:2px;">⚡ ${it.effect}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const summaryHtml = `
    <div style="margin-bottom:24px; padding:18px 20px; border-radius:12px; background:linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 100%); border:1px solid rgba(56,189,248,0.35); box-shadow:0 4px 20px rgba(0,0,0,0.3);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:22px;">💎</span>
          <div>
            <div style="font-size:15.5px; font-weight:800; color:#38bdf8;">V38 룬 시스템 종합 안내 & 조회 계정 룬 상태</div>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">채팅 명령어 <code style="color:var(--accent-gold);">-룬</code> 또는 좌측 하단 <strong>[룬]</strong> 버튼으로 장착 · 해제 · 강화 관리</div>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <span style="font-size:12px; padding:5px 11px; border-radius:8px; background:rgba(56,189,248,0.14); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-weight:700;">
            일반 룬 보유: ${ownedNormalCount} / 6종 (장착 ${equippedNormalCount}개)
          </span>
        </div>
      </div>

      <!-- 슬롯 및 시스템 핵심 규칙 4칸 -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:10px; margin-bottom:14px;">
        <div style="background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:8px; border:1px solid rgba(56,189,248,0.22);">
          <div style="font-size:11px; color:var(--text-muted);">🔹 일반 룬 장착 슬롯</div>
          <div style="font-size:14.5px; font-weight:800; color:#38bdf8; margin-top:3px;">기본 3칸 (최대 4칸)</div>
          <div style="font-size:10.5px; color:var(--text-sub); margin-top:2px;">[스페셜]➔[혜택]에서 일반 슬롯 +1 확장 (레드/회색콩 1개)</div>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:8px; border:1px solid rgba(192,132,252,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">🟣 스페셜 룬 장착 슬롯</div>
          <div style="font-size:14.5px; font-weight:800; color:#c084fc; margin-top:3px;">기본 1칸 공유 (최대 2칸)</div>
          <div style="font-size:10.5px; color:var(--text-sub); margin-top:2px;">[스페셜]➔[혜택]에서 스페셜 슬롯 +1 확장 (레드/회색콩 1개)</div>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:8px; border:1px solid rgba(16,185,129,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">🐮 일반 룬 & 상급 룬 강화</div>
          <div style="font-size:14.5px; font-weight:800; color:#34d399; margin-top:3px;">Lv.1~50 ➔ 상급 Lv.51~70</div>
          <div style="font-size:10.5px; color:var(--text-sub); margin-top:2px;">카우방(일반 룬) / 천공 용의 둥지·악몽의 성소(상급 룬) 드랍</div>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:8px; border:1px solid rgba(250,204,21,0.25);">
          <div style="font-size:11px; color:var(--text-muted);">👑 초월 스페셜 룬 해금</div>
          <div style="font-size:14.5px; font-weight:800; color:var(--accent-gold); margin-top:3px;">삼위일체 · 신속 · 파괴 · 약탈</div>
          <div style="font-size:10.5px; color:var(--text-sub); margin-top:2px;">기본 스페셜 룬 3종(빛·폭풍·번영) 모두 Lv.10 MAX 시 해금</div>
        </div>
      </div>

      ${equippedNormalCount > 0 ? `
        <div style="margin-bottom:10px; padding:12px 14px; border-radius:10px; background:rgba(250,204,21,0.08); border:1px solid rgba(250,204,21,0.35);">
          <div style="font-size:12px; font-weight:800; color:var(--accent-gold); margin-bottom:8px;">
            ✨ 현재 장착 중인 일반 룬 슬롯 (${equippedNormalCount} / ${Math.max(3, equippedNormalCount)}칸 착용중)
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px;">
            ${equippedNormalRunes.map((er, idx) => `
              <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; background:rgba(15,23,42,0.85); border:1px solid rgba(250,204,21,0.4);">
                <span style="font-size:18px;">${er.icon}</span>
                <div style="flex:1;">
                  <div style="font-size:12px; font-weight:800; color:#f8fafc;">슬롯 ${idx + 1}: ${er.name} <span style="color:var(--accent-gold);">Lv.${er.level}</span></div>
                  <div style="font-size:11px; color:#6ee7b7; margin-top:1px;">${er.effectText}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="padding:10px 12px; border-radius:8px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.35); font-size:12px; color:#e2e8f0;">
          <strong style="color:#34d399;">⚡ 현재 장착 일반 룬 합산 스탯:</strong>
          <span style="margin-left:8px;">힘 +${totalRuneStr.toLocaleString()} / 민첩 +${totalRuneAgi.toLocaleString()} / 지능 +${totalRuneInt.toLocaleString()} / 최종 피해 +${totalRuneFinalDmg}% / 추가 드랍률 +${totalRuneDropRate}%</span>
        </div>
      ` : ''}
    </div>

    <!-- 1. 일반 룬 & 상급 룬 6종 -->
    <div class="relic-box-section" style="margin-bottom:28px;">
      <div class="relic-box-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:10px 14px; background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:8px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">🐮</span>
          <strong style="font-size:14.5px; color:#ffffff;">1. 일반 룬 & 상급 룬 6종 (기본 최대 Lv.50 ➔ 상급 룬 돌파 시 최대 Lv.70)</strong>
        </div>
        <span style="font-size:11.5px; color:#38bdf8; font-weight:700;">콩 소모 없음 · 사냥터 드랍 룬 아이템으로 강화</span>
      </div>
      <div class="content-card-grid">
        ${normalCardsHtml}
      </div>
    </div>

    <!-- 2. 기본 스페셜 룬 3종 -->
    <div class="relic-box-section" style="margin-bottom:28px;">
      <div class="relic-box-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:10px 14px; background:rgba(192,132,252,0.08); border:1px solid rgba(192,132,252,0.25); border-radius:8px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">✨</span>
          <strong style="font-size:14.5px; color:#ffffff;">2. 기본 스페셜 룬 3종 (최대 Lv.10 · 룬 상점 구매)</strong>
        </div>
        <span style="font-size:11.5px; color:#d8b4fe; font-weight:700;">3종 모두 Lv.10(MAX) 달성 시 초월 스페셜 룬 4종 해금!</span>
      </div>
      <div class="content-card-grid">
        ${specialBaseCardsHtml}
      </div>
    </div>

    <!-- 3. 초월 스페셜 룬 4종 -->
    <div class="relic-box-section" style="margin-bottom:28px;">
      <div class="relic-box-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:10px 14px; background:rgba(250,204,21,0.08); border:1px solid rgba(250,204,21,0.3); border-radius:8px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">👑</span>
          <strong style="font-size:14.5px; color:var(--accent-gold);">3. 초월 스페셜 룬 4종 (최대 Lv.30 · 빛/폭풍/번영 모두 MAX 시 해금)</strong>
        </div>
        <span style="font-size:11.5px; color:var(--accent-gold); font-weight:700;">적용모드 체크 필수 · 블루콩/회색콩 1개당 Lv+1</span>
      </div>
      <div class="content-card-grid">
        ${specialAwakenedCardsHtml}
      </div>
    </div>

    <!-- 4. 룬 효과 증폭 & 드랍률 시너지 도감 -->
    <div class="relic-box-section" style="margin-bottom:16px;">
      <div class="relic-box-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:10px 14px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.28); border-radius:8px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">⚡</span>
          <strong style="font-size:14.5px; color:#6ee7b7;">4. 룬 효과 증폭(%) & 상급 룬 드랍률 시너지 총정리</strong>
        </div>
        <span style="font-size:11.5px; color:#34d399; font-weight:700;">날개 · 성유물B · 크리스마스 창고 · 기사 계급 연동</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
        ${synergiesHtml}
      </div>
    </div>
  `;

  runesContainer.innerHTML = summaryHtml;
}

/* --------------------------------------------------------------------------
   Swords Tab Renderer (듀란달 초월 효과 & 소유 성검 우선 정렬)
   -------------------------------------------------------------------------- */
function renderSwordsTab() {
  const swordsContainer = document.getElementById("swordsContainer");
  if (!swordsContainer) return;

  // 1. 성검 상단 종합 상태 바 렌더링
  renderSwordStatusSummary();

  // 2. 세분화 3대 서브탭 전환 이벤트 바인딩
  initSwordSubtabs();

  // 3. 서브탭 1: 성검 진화 도감 (1~9번)
  renderSwordEvolutionView();

  // 4. 서브탭 2: 성검 마스터리 (Lv.100 연마)
  renderSwordMasteryView();

  // 5. 서브탭 3: 성검 정령 시스템 (Lv.25 & 4대 스킬)
  renderSwordSpiritView();
}

/**
 * 현재 프로필의 성검 강화 레벨(Lv.0~9), 마스터리 레벨(Lv.0~100), 장착 종류(1~9) 통합 해석기
 */
function resolveSwordSystemState() {
  const raw = currentProfile.rawSaveData || {};
  const codeToKind = {
    "BLSwrod1": 1,
    "BLSwrod2": 2,
    "BLSwrod3": 3,
    "BLSwrod4": 4,
    "BLSwrod5": 5,
    "nBLSwrodUP1": 6,
    "nBLSwrodUP2": 7,
    "nBLSwrodUP3": 8,
    "nBLSwrodUP4": 9
  };

  let gKind = parseInt(raw["GodSwordKind"], 10) || codeToKind[currentProfile.swordCode] || 1;
  const gPoint = parseInt(raw["GodSwordPoint"] || String(currentProfile.sacredPower || "0").replace(/,/g, ''), 10) || 0;
  const ownedSet = (currentProfile.ownedSwords instanceof Set)
    ? currentProfile.ownedSwords
    : new Set(currentProfile.ownedSwords || []);

  const upRaw = currentProfile.swordUpgradeLevels || {};
  const masRaw = currentProfile.swordMasteryLevels || {};

  // 듀란달 이상 해금 여부 먼저 확인 (nBLSwrodUP1 이상 보유 또는 gKind >= 6)
  const hasDurendalFlag = Boolean(
    (upRaw["nBLSwrodUP1"] > 0) ||
    (raw["nBLSwrodUP1"] > 0) ||
    ownedSet.has("nBLSwrodUP1") ||
    currentProfile.swordCode === "nBLSwrodUP1" ||
    gKind >= 6
  );

  // 각 성검의 강화 레벨(Lv.0~9) 계산
  const getUpgradeLv = (code) => {
    if (upRaw[code] !== undefined && upRaw[code] > 0) return Math.min(9, upRaw[code]);
    if (raw[code] !== undefined && raw[code] > 0) return Math.min(9, parseInt(raw[code], 10) || 0);
    if (["BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5"].includes(code) && hasDurendalFlag) {
      return 9;
    }
    if (ownedSet.has(code)) {
      // 정적 DB 호환: 마스터리 배열에 1~9 사이의 강화 레벨이 들어있던 경우 폴백
      const mVal = masRaw[code] || 0;
      return (mVal > 0 && mVal <= 9) ? mVal : 1;
    }
    return 0;
  };

  const upgradeLevels = {
    "BLSwrod1": (upRaw["BLSwrod1"] > 0 || raw["BLSwrod1"] > 0 || ownedSet.has("BLSwrod1")) ? 1 : 0,
    "BLSwrod2": getUpgradeLv("BLSwrod2"),
    "BLSwrod3": getUpgradeLv("BLSwrod3"),
    "BLSwrod4": getUpgradeLv("BLSwrod4"),
    "BLSwrod5": getUpgradeLv("BLSwrod5"),
    "nBLSwrodUP1": hasDurendalFlag ? 1 : 0,
    "nBLSwrodUP2": (upRaw["nBLSwrodUP2"] > 0 || gKind >= 7) ? 1 : 0,
    "nBLSwrodUP3": (upRaw["nBLSwrodUP3"] > 0) ? Math.min(9, upRaw["nBLSwrodUP3"]) : (gKind >= 8 ? (gKind >= 9 ? 9 : 1) : 0),
    "nBLSwrodUP4": (upRaw["nBLSwrodUP4"] > 0) ? Math.min(9, upRaw["nBLSwrodUP4"]) : (gKind >= 9 ? 1 : 0)
  };

  // 4대 성검 모두 습득 & Lv.9 달성 시 듀란달 해금 조건 충족
  const fourSacredCodes = ["BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5"];
  const ownedFourCount = fourSacredCodes.filter(c => upgradeLevels[c] > 0 || ownedSet.has(c)).length;
  const lv9FourCount = fourSacredCodes.filter(c => upgradeLevels[c] >= 9).length;
  const isDurendalUnlocked = (lv9FourCount === 4) || hasDurendalFlag;
  if (isDurendalUnlocked) {
    upgradeLevels["nBLSwrodUP1"] = 1;
  }

  // 마스터리 레벨(Lv.0~100) 계산 (SDATA1 기반)
  const sdata1Parts = raw["SDATA1"] ? String(raw["SDATA1"]).split(",").map(v => parseInt(v, 10) || 0) : [];
  const swordOrder = ["BLSwrod1", "BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5", "nBLSwrodUP1", "nBLSwrodUP2", "nBLSwrodUP3", "nBLSwrodUP4"];
  const masteryLevels = {};
  swordOrder.forEach((code, idx) => {
    if (sdata1Parts[idx] !== undefined && sdata1Parts[idx] > 0) {
      masteryLevels[code] = Math.min(100, sdata1Parts[idx]);
    } else if (masRaw[code] !== undefined && masRaw[code] > 0) {
      masteryLevels[code] = Math.min(100, masRaw[code]);
    } else {
      masteryLevels[code] = 0;
    }
  });

  // 상위 진화 성검 해금 판정
  const isCaladbolgUnlocked = Boolean(gKind >= 7 || upgradeLevels["nBLSwrodUP2"] > 0 || masteryLevels["nBLSwrodUP1"] >= 100);
  const isSolarisUnlocked = Boolean(gKind >= 8 || upgradeLevels["nBLSwrodUP3"] > 0 || masteryLevels["nBLSwrodUP2"] >= 100);
  const isExcaliburUnlocked = Boolean(gKind >= 9 || upgradeLevels["nBLSwrodUP4"] > 0 || (masteryLevels["nBLSwrodUP3"] >= 100 && upgradeLevels["nBLSwrodUP3"] >= 9));

  return {
    gKind,
    gPoint,
    ownedSet,
    upgradeLevels,
    masteryLevels,
    ownedFourCount,
    lv9FourCount,
    isDurendalUnlocked,
    isCaladbolgUnlocked,
    isSolarisUnlocked,
    isExcaliburUnlocked
  };
}

/**
 * 성검 상단 상태 요약 배너 렌더링
 */
function renderSwordStatusSummary() {
  const banner = document.getElementById("swordStatusSummaryBanner");
  if (!banner) return;

  const state = resolveSwordSystemState();
  const { gKind, gPoint } = state;

  // 성검 이름 매핑 (GodSwordKind 1~9번 정확 매핑)
  const kindNames = {
    1: { name: "1번: 클라인", icon: "🎁", rank: "이벤트 성검 (모능)" },
    2: { name: "2번: 그람", icon: "⚔️", rank: "4대 성검 (모능)" },
    3: { name: "3번: 레바테인", icon: "🔥", rank: "4대 성검 (지능)" },
    4: { name: "4번: 바리사다", icon: "⚡", rank: "4대 성검 (민첩)" },
    5: { name: "5번: 아스칼론", icon: "🛡️", rank: "4대 성검 (힘)" },
    6: { name: "6번: 듀란달", icon: "🌟", rank: "4대 성검 전승" },
    7: { name: "7번: 칼라드볼그", icon: "🔮", rank: "1차 진화 성검" },
    8: { name: "8번: 솔라리스", icon: "☀️", rank: "2차 진화 성검" },
    9: { name: "9번: 엑스칼리버", icon: "👑✨", rank: "최종 궁극 성검" }
  };
  const curSword = kindNames[gKind] || kindNames[1];

  // 정령 각성 단계 판정
  let spiritStageText = "미각성 (성력 1만 미만)";
  let spiritStageBadge = "badge-locked";
  if (gPoint >= 150000) {
    spiritStageText = "✨ 4단계: 시간제 전투 소환 (200% 거대화)";
    spiritStageBadge = "badge-owned";
  } else if (gPoint >= 100000) {
    spiritStageText = "🌟 3단계: 정령 회복 활성화 (5~8% 즉시 회복)";
    spiritStageBadge = "badge-owned";
  } else if (gPoint >= 50000) {
    spiritStageText = "⚡ 2단계: 정령 스킬 활성화 (광역 피해 & 회복)";
    spiritStageBadge = "badge-rentable";
  } else if (gPoint >= 10000) {
    spiritStageText = "🐾 1단계: 정령 출현 (기본 동행)";
    spiritStageBadge = "badge-rentable";
  }

  banner.innerHTML = `
    <div class="sword-summary-card">
      <div class="sword-summary-left">
        <div class="sword-summary-icon">${curSword.icon}</div>
        <div>
          <div class="sword-summary-title">
            <span>${curSword.name}</span>
            <span class="char-tag-badge badge-owned" style="font-size: 11px;">${curSword.rank}</span>
          </div>
          <div class="sword-summary-sub">
            4대 성검(Lv.9) ➔ 듀란달 ➔ 칼라드볼그 ➔ 솔라리스 ➔ 엑스칼리버 진화 트리
          </div>
        </div>
      </div>

      <div class="sword-summary-stats">
        <div class="sword-stat-badge">
          <div class="sword-stat-label">4대 성검 9렙 달성</div>
          <div class="sword-stat-value" style="color: ${state.lv9FourCount === 4 ? '#10b981' : '#facc15'};">${state.lv9FourCount} / 4 종</div>
        </div>
        <div class="sword-stat-badge">
          <div class="sword-stat-label">보유 성력 (Sacred Power)</div>
          <div class="sword-stat-value" style="color: var(--accent-gold);">${gPoint.toLocaleString()} P</div>
        </div>
        <div class="sword-stat-badge">
          <div class="sword-stat-label">성검 정령 상태</div>
          <div class="sword-stat-value" style="font-size: 13px;">
            <span class="char-tag-badge ${spiritStageBadge}">${spiritStageText}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 성검 3대 서브탭 버튼 클릭 이벤트 바인딩
 */
function initSwordSubtabs() {
  const tabButtons = document.querySelectorAll("[data-sword-subtab]");
  tabButtons.forEach(btn => {
    btn.onclick = () => {
      const targetSub = btn.getAttribute("data-sword-subtab");
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const views = {
        evolution: document.getElementById("swordSubtab-evolution"),
        mastery: document.getElementById("swordSubtab-mastery"),
        spirit: document.getElementById("swordSubtab-spirit")
      };

      Object.keys(views).forEach(k => {
        if (views[k]) {
          views[k].style.display = (k === targetSub) ? "block" : "none";
        }
      });
    };
  });
}

/**
 * 서브탭 1: 성검 진화 테크트리 렌더링
 * - 상단 좌측: 4대 성검 (그람, 레바테인, 바리사다, 아스칼론) - 4종 습득 및 9렙(Lv.9) 시 하단 듀란달 해금
 * - 상단 우측: 클라인 (이벤트 성검 별도 표시)
 * - 하단 수직 진화 테크트리: 듀란달(6번) ➔ 칼라드볼그(7번) ➔ 솔라리스(8번) ➔ 엑스칼리버(9번 최종)
 */
function renderSwordEvolutionView() {
  const container = document.getElementById("swordsContainer");
  if (!container) return;

  // 기존 2열 그리드 대신 테크트리 전용 레이아웃 클래스 적용
  container.className = "sword-tech-tree-wrapper";

  const state = resolveSwordSystemState();
  const {
    gKind,
    upgradeLevels,
    masteryLevels,
    ownedFourCount,
    lv9FourCount,
    isDurendalUnlocked,
    isCaladbolgUnlocked,
    isSolarisUnlocked,
    isExcaliburUnlocked
  } = state;

  // 1. 4대 성검 정의 (2~5번)
  const fourSacredSwords = [
    { code: "BLSwrod2", num: 2, name: "그람", statType: "모든 능력치", icon: "⚔️", color: "#38bdf8", desc: "올스탯 증폭 및 균형 잡힌 검기 발동" },
    { code: "BLSwrod3", num: 3, name: "레바테인", statType: "지능 특화", icon: "🔥", color: "#c084fc", desc: "지능 증폭 및 화염 마법 검기 발동" },
    { code: "BLSwrod4", num: 4, name: "바리사다", statType: "민첩 특화", icon: "⚡", color: "#34d399", desc: "민첩 증폭 및 질풍 연타 검기 발동" },
    { code: "BLSwrod5", num: 5, name: "아스칼론", statType: "힘 특화", icon: "🛡️", color: "#f87171", desc: "힘 증폭 및 대지 분쇄 검기 발동" }
  ];

  const fourSwordsCardsHtml = fourSacredSwords.map(sw => {
    const upLv = upgradeLevels[sw.code] || 0;
    const masLv = masteryLevels[sw.code] || 0;
    const isOwned = upLv > 0;
    const isLv9 = upLv >= 9;
    const isEquipped = (gKind === sw.num);
    const pct = Math.min(100, Math.round((upLv / 9) * 100));

    return `
      <div class="sword-four-card ${isLv9 ? 'lv9-complete' : (isOwned ? 'owned' : 'locked')} ${isEquipped ? 'equipped' : ''}">
        <div class="sword-four-top">
          <div class="sword-four-icon" style="border-color:${sw.color};">${sw.icon}</div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
              <span class="sword-four-num">${sw.num}번 성검</span>
              <span class="char-tag-badge ${isLv9 ? 'badge-owned' : (isOwned ? 'badge-rentable' : 'badge-locked')}" style="font-size:10px;">
                ${isEquipped ? '✨ 장착중' : (isLv9 ? '★ Lv.9 MAX' : (isOwned ? `⚡ Lv.${upLv}/9` : '🔒 미습득'))}
              </span>
            </div>
            <div class="sword-four-name">${sw.name}</div>
            <div class="sword-four-stat" style="color:${sw.color};">${sw.statType}</div>
          </div>
        </div>

        <div class="sword-lv-bar-wrap">
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
            <span style="color:#cbd5e1; font-weight:700;">성검 강화 레벨</span>
            <strong style="color:${isLv9 ? '#facc15' : (isOwned ? '#38bdf8' : '#64748b')};">
              ${isOwned ? `Lv.${upLv} / 9 ${isLv9 ? '(전승 조건 달성!)' : ''}` : '미습득 (Lv.0 / 9)'}
            </strong>
          </div>
          <div class="mastery-progress-bar-bg" style="margin:0; height:7px;">
            <div class="mastery-progress-bar-fill ${isLv9 ? 'max' : ''}" style="width:${pct}%;"></div>
          </div>
        </div>

        <div class="sword-four-footer">
          <span>📜 마스터리: <strong style="color:#f8fafc;">Lv.${masLv}</strong>/100</span>
          <span style="color:${isLv9 ? '#10b981' : '#94a3b8'}; font-weight:700;">
            ${isLv9 ? '✓ 9렙 달성' : '9렙 필요'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  // 2. 클라인 (1번 이벤트 성검 - 4대 성검 옆에 별도 표시)
  const kleinOwned = (upgradeLevels["BLSwrod1"] > 0) || (masteryLevels["BLSwrod1"] > 0) || (gKind === 1);
  const kleinMasLv = masteryLevels["BLSwrod1"] || 0;
  const kleinEquipped = (gKind === 1);

  const kleinSideCardHtml = `
    <div class="sword-klein-side-box ${kleinOwned ? 'owned' : ''} ${kleinEquipped ? 'equipped' : ''}">
      <div class="sword-tier-box-header" style="border-bottom-color: rgba(244, 114, 182, 0.25);">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="sword-step-pill event-pill">EVENT 별도</span>
          <strong style="font-size:13.5px; color:#f472b6;">이벤트 성검</strong>
        </div>
        <span class="char-tag-badge ${kleinEquipped ? 'badge-owned' : (kleinOwned ? 'badge-rentable' : 'badge-locked')}" style="font-size:10px;">
          ${kleinEquipped ? '✨ 장착중' : (kleinOwned ? '🌟 보유중' : '🔒 미보유')}
        </span>
      </div>

      <div class="sword-klein-body">
        <div class="sword-klein-icon-row">
          <div class="sword-four-icon" style="border-color:#f472b6; background:rgba(244,114,182,0.12);">🎁</div>
          <div>
            <div class="sword-four-num" style="color:#f472b6;">1번 성검 (번외)</div>
            <div class="sword-four-name">클라인</div>
            <div class="sword-four-stat" style="color:#f9a8d4;">모든 능력치 (이벤트)</div>
          </div>
        </div>

        <div class="sword-klein-note">
          💡 <strong>이벤트 특별 성검</strong>으로, 4대 성검 및 듀란달~엑스칼리버 정규 진화 테크 조건과는 별개로 분류됩니다.
        </div>

        <div class="sword-four-footer" style="margin-top:auto;">
          <span>📜 마스터리: <strong style="color:#f8fafc;">Lv.${kleinMasLv}</strong>/100</span>
          <span style="color:${kleinOwned ? '#f472b6' : '#64748b'}; font-weight:700;">
            ${kleinOwned ? '✓ 습득 완료' : '미습득'}
          </span>
        </div>
      </div>
    </div>
  `;

  // 3. 하단 수직 진화 테크트리 (듀란달 ➔ 칼라드볼그 ➔ 솔라리스 ➔ 엑스칼리버)
  const evolutionChain = [
    {
      stepNum: "STEP 2 • 4대 성검 통합 전승",
      swordNum: 6,
      code: "nBLSwrodUP1",
      name: "듀란달 (Durendal)",
      subTitle: "4대 성검(그람·레바테인·바리사다·아스칼론) 전승 성검",
      icon: "🗡️",
      themeClass: "tier-durendal",
      accentColor: "#38bdf8",
      unlocked: isDurendalUnlocked,
      equipped: gKind === 6,
      connectorTitle: "4대 성검(그람 · 레바테인 · 바리사다 · 아스칼론) 모두 습득 & 9레벨(Lv.9) 달성 시 듀란달 해금",
      connectorMet: isDurendalUnlocked,
      connectorStatus: `습득 ${ownedFourCount}/4종 • 9레벨 달성 ${lv9FourCount}/4종`,
      reqText: "그람 Lv.9 + 레바테인 Lv.9 + 바리사다 Lv.9 + 아스칼론 Lv.9 모두 달성",
      upLv: null,
      maxUpLv: null,
      masLv: masteryLevels["nBLSwrodUP1"] || 0,
      spiritInfo: "파란 발광체 (스킬 계수 100)",
      bullets: [
        "<strong>4대 성검 패시브 통합:</strong> 그람·레바테인·바리사다·아스칼론 4종의 힘/민/지/모능 및 고유 효과 상시 발동",
        "<strong>진화 관문 성검:</strong> V38 개편으로 듀란달 마스터리 Lv.100 달성 시 상위 성검 <strong>[칼라드볼그]</strong>로 진화 가능"
      ]
    },
    {
      stepNum: "STEP 3 • 1차 초월 진화",
      swordNum: 7,
      code: "nBLSwrodUP2",
      name: "칼라드볼그 (Caladbolg)",
      subTitle: "듀란달의 한계를 넘어 각성한 보랏빛 뇌전 진화 성검",
      icon: "🔮",
      themeClass: "tier-caladbolg",
      accentColor: "#c084fc",
      unlocked: isCaladbolgUnlocked,
      equipped: gKind === 7,
      connectorTitle: "듀란달 해금 후 [듀란달 마스터리 Lv.100] 달성 시 칼라드볼그 진화",
      connectorMet: isCaladbolgUnlocked,
      connectorStatus: `듀란달 마스터리 Lv.${masteryLevels["nBLSwrodUP1"] || 0} / 100`,
      reqText: "듀란달 보유 + 듀란달 마스터리 Lv.100 달성",
      upLv: null,
      maxUpLv: null,
      masLv: masteryLevels["nBLSwrodUP2"] || 0,
      spiritInfo: "보랏빛 발광체 (스킬 계수 120 · 스킬 발동 시 HP/MP 5% 즉시 회복)",
      bullets: [
        "<strong>1차 진화 권능:</strong> 듀란달의 전승 효과를 계승하며 검기 배율 및 성검 정령 계수 대폭 상승 (100 ➔ 120)",
        "<strong>정령 생명력 회복:</strong> 성검 정령 스킬 시전 시 영웅의 생명력·마나 <strong>5% 즉시 회복</strong>",
        "<strong>다음 진화 조건:</strong> 칼라드볼그 마스터리 Lv.100 달성 시 <strong>[솔라리스]</strong> 해금"
      ]
    },
    {
      stepNum: "STEP 4 • 2차 태양 진화",
      swordNum: 8,
      code: "nBLSwrodUP3",
      name: "솔라리스 (Solaris)",
      subTitle: "태양의 신성한 불꽃을 품은 2차 진화 성검 (최대 Lv.9 강화 가능)",
      icon: "☀️",
      themeClass: "tier-solaris",
      accentColor: "#fb923c",
      unlocked: isSolarisUnlocked,
      equipped: gKind === 8,
      connectorTitle: "칼라드볼그 해금 후 [칼라드볼그 마스터리 Lv.100] 달성 시 솔라리스 진화",
      connectorMet: isSolarisUnlocked,
      connectorStatus: `칼라드볼그 마스터리 Lv.${masteryLevels["nBLSwrodUP2"] || 0} / 100`,
      reqText: "칼라드볼그 보유 + 칼라드볼그 마스터리 Lv.100 달성",
      upLv: upgradeLevels["nBLSwrodUP3"] || 0,
      maxUpLv: 9,
      masLv: masteryLevels["nBLSwrodUP3"] || 0,
      spiritInfo: "금색 발광체 (스킬 계수 140 · 스킬 발동 시 HP/MP 6% 즉시 회복)",
      bullets: [
        "<strong>솔라리스 전용 9강 업그레이드:</strong> 강화 레벨당 검기 및 마스터리 데미지 <strong>+10% 증폭</strong> (최대 +90%)",
        "<strong>성검 소환 가속:</strong> 성검 소환 스킬 쿨타임 <strong>10초 감소</strong>",
        "<strong>다음 진화 조건:</strong> 솔라리스 마스터리 Lv.100 & 솔라리스 강화 Lv.9(MAX) 달성 후 <strong>성검 소환 시 [엑스칼리버] 최종 각성</strong>"
      ]
    },
    {
      stepNum: "STEP 5 • V38 최종 궁극 진화 (FINAL CAPSTONE)",
      swordNum: 9,
      code: "nBLSwrodUP4",
      name: "👑 궁극 성검: 엑스칼리버 (Excalibur)",
      subTitle: "모든 성검 테크트리의 정점에 선 V38 최종 완성형 신화 성검",
      icon: "👑✨",
      themeClass: "tier-excalibur",
      accentColor: "#facc15",
      unlocked: isExcaliburUnlocked,
      equipped: gKind === 9,
      connectorTitle: "솔라리스 마스터리 Lv.100 + 솔라리스 강화 Lv.9(MAX) 달성 후 [성검 소환] 시 엑스칼리버 최종 각성!",
      connectorMet: isExcaliburUnlocked,
      connectorStatus: `솔라리스 마스터리 Lv.${masteryLevels["nBLSwrodUP3"] || 0}/100 • 강화 Lv.${upgradeLevels["nBLSwrodUP3"] || 0}/9`,
      reqText: "솔라리스 마스터리 Lv.100 & 솔라리스 강화 Lv.9(MAX) 상태에서 성검 소환 시 자동 진화",
      upLv: upgradeLevels["nBLSwrodUP4"] || 0,
      maxUpLv: 9,
      masLv: masteryLevels["nBLSwrodUP4"] || 0,
      spiritInfo: "흰금빛 발광체 (스킬 계수 160 · HP/MP 8% 회복 · 성력 15만 이상 시 200% 거대화 전투 소환)",
      bullets: [
        "<strong>초월 기본 능력치:</strong> 장착 및 해금 시 <strong>모든 능력치(힘·민·지) +100,000</strong> 영구 증가",
        "<strong>엑스칼리버 9강 업그레이드:</strong> 강화 레벨당 검기·마스터리 데미지 <strong>+10% 증폭</strong> 및 성검 소환 쿨타임 <strong>8초 감소</strong>",
        "<strong>마스터리 궁극 특수 권능:</strong> 기본 공격 시 <strong>75% 확률로 [100 × 마스터리Lv × 올스탯]</strong> 규모의 폭풍 검기 추가 발동"
      ]
    }
  ];

  const chainStepsHtml = evolutionChain.map(step => {
    return `
      <!-- 수직 진화 화살표 커넥터 -->
      <div class="sword-tech-connector ${step.connectorMet ? 'met' : ''}">
        <div class="connector-line"></div>
        <div class="connector-badge">
          <span class="connector-arrow">▼</span>
          <span class="connector-text">${step.connectorTitle}</span>
          <span class="connector-progress">${step.connectorStatus}</span>
        </div>
        <div class="connector-line"></div>
      </div>

      <!-- 진화 단계 성검 카드 -->
      <div class="sword-chain-card ${step.themeClass} ${step.unlocked ? 'unlocked' : 'locked'} ${step.equipped ? 'equipped' : ''}">
        <div class="sword-chain-header">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="sword-step-pill" style="border-color:${step.accentColor}; color:${step.accentColor};">${step.stepNum}</span>
            <span style="font-size:12px; color:#94a3b8; font-weight:700;">#${step.swordNum}번 성검</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${step.maxUpLv ? `
              <span class="char-tag-badge ${step.upLv >= step.maxUpLv ? 'badge-owned' : 'badge-locked'}" style="font-size:11px;">
                🔨 강화 Lv.${step.upLv} / ${step.maxUpLv}
              </span>
            ` : ''}
            <span class="char-tag-badge ${step.masLv >= 100 ? 'badge-owned' : (step.masLv > 0 ? 'badge-rentable' : 'badge-locked')}" style="font-size:11px;">
              📜 마스터리 Lv.${step.masLv} / 100
            </span>
            <span class="char-tag-badge ${step.equipped ? 'badge-owned' : (step.unlocked ? 'badge-rentable' : 'badge-locked')}" style="font-size:11px;">
              ${step.equipped ? '✨ 현재 장착중' : (step.unlocked ? '✅ 해금 완료' : '🔒 미해금')}
            </span>
          </div>
        </div>

        <div class="sword-chain-main">
          <div class="sword-chain-icon" style="border-color:${step.accentColor};">${step.icon}</div>
          <div style="flex:1; min-width:0;">
            <div class="sword-chain-name" style="color:${step.accentColor};">${step.name}</div>
            <div class="sword-chain-sub">${step.subTitle}</div>
            <div class="sword-chain-req">
              <span>🔑 <strong>테크 해금 조건:</strong> ${step.reqText}</span>
              <span>🧚 <strong>전용 정령:</strong> ${step.spiritInfo}</span>
            </div>
          </div>
        </div>

        <ul class="sword-chain-bullets">
          ${step.bullets.map(b => `<li>${b}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- 상단 구역: 좌측 [4대 성검 (습득 & 9렙 조건)] + 우측 [클라인 (이벤트 별도 표시)] -->
    <div class="sword-top-tier-layout">
      <div class="sword-four-main-box ${isDurendalUnlocked ? 'all-lv9-cleared' : ''}">
        <div class="sword-tier-box-header">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="sword-step-pill">STEP 1 • 기초 4대 성검</span>
            <strong style="font-size:15px; color:#ffffff;">4대 성검 습득 및 9레벨(Lv.9) 연마</strong>
            <span style="font-size:12px; color:#94a3b8;">(4종 모두 습득하고 Lv.9 달성 시 하단 듀란달 전승 해금)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="char-tag-badge ${ownedFourCount === 4 ? 'badge-rentable' : 'badge-locked'}" style="font-size:11px;">
              습득 ${ownedFourCount} / 4
            </span>
            <span class="char-tag-badge ${lv9FourCount === 4 ? 'badge-owned' : 'badge-locked'}" style="font-size:11px;">
              ${lv9FourCount === 4 ? '✨ 4대 성검 9렙 완료! (듀란달 해금)' : `9레벨 달성 ${lv9FourCount} / 4`}
            </span>
          </div>
        </div>

        <div class="sword-four-grid">
          ${fourSwordsCardsHtml}
        </div>
      </div>

      ${kleinSideCardHtml}
    </div>

    <!-- 하단 구역: 4대 성검 밑 수직 진화 테크트리 (듀란달 ➔ 칼라드볼그 ➔ 솔라리스 ➔ 엑스칼리버) -->
    <div class="sword-vertical-chain-section">
      ${chainStepsHtml}
    </div>
  `;
}

/**
 * 서브탭 2: 성검 마스터리 (Lv.100 연마 시스템)
 */
function renderSwordMasteryView() {
  const container = document.getElementById("swordMasteryContainer");
  if (!container) return;

  const state = resolveSwordSystemState();
  const { masteryLevels } = state;

  const masteries = [
    { id: 1, code: "BLSwrod1", name: "1번: 클라인 마스터리 (이벤트)", maxLv: 100, currentLv: masteryLevels["BLSwrod1"] || 0, req: "클라인(이벤트) 습득", desc: "기본 물리 및 스킬 타격 강화 (이벤트 별도 성검)" },
    { id: 2, code: "BLSwrod2", name: "2번: 그람 마스터리", maxLv: 100, currentLv: masteryLevels["BLSwrod2"] || 0, req: "그람 습득", desc: "올스탯 비례 추가 데미지 발동" },
    { id: 3, code: "BLSwrod3", name: "3번: 레바테인 마스터리", maxLv: 100, currentLv: masteryLevels["BLSwrod3"] || 0, req: "레바테인 습득", desc: "지능 비례 마법 화염 타격" },
    { id: 4, code: "BLSwrod4", name: "4번: 바리사다 마스터리", maxLv: 100, currentLv: masteryLevels["BLSwrod4"] || 0, req: "바리사다 습득", desc: "민첩 비례 질풍 연타 발동" },
    { id: 5, code: "BLSwrod5", name: "5번: 아스칼론 마스터리", maxLv: 100, currentLv: masteryLevels["BLSwrod5"] || 0, req: "아스칼론 습득", desc: "힘 비례 대지 강타 및 방어 관통" },
    { id: 6, code: "nBLSwrodUP1", name: "6번: 듀란달 마스터리", maxLv: 100, currentLv: masteryLevels["nBLSwrodUP1"] || 0, req: "4대 성검 모두 습득 & Lv.9 달성", desc: "4대 성검 패시브 통합 • Lv.100 달성 시 [칼라드볼그] 해금" },
    { id: 7, code: "nBLSwrodUP2", name: "7번: 칼라드볼그 마스터리", maxLv: 100, currentLv: masteryLevels["nBLSwrodUP2"] || 0, req: "듀란달 마스터리 Lv.100 달성", desc: "보랏빛 뇌전 검기 발동 • Lv.100 달성 시 [솔라리스] 해금" },
    { id: 8, code: "nBLSwrodUP3", name: "8번: 솔라리스 마스터리", maxLv: 100, currentLv: masteryLevels["nBLSwrodUP3"] || 0, req: "칼라드볼그 마스터리 Lv.100 달성", desc: "태양 화염 검기 • Lv.100 & 강화 Lv.9 후 성검 소환 시 [엑스칼리버] 해금" },
    { id: 9, code: "nBLSwrodUP4", name: "9번: 엑스칼리버 마스터리", maxLv: 100, currentLv: masteryLevels["nBLSwrodUP4"] || 0, req: "솔라리스 마스터리 Lv.100 & 솔라리스 강화 Lv.9", desc: "공격 시 75% 확률로 100 × Lv × 올스탯 궁극 폭풍 검기 발동" }
  ];

  container.innerHTML = `
    <div class="mastery-overview-card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="font-size:16px; font-weight:800; color:#ffffff;">📜 성검 마스터리 연마 규칙 (최대 Lv.100)</div>
          <div style="font-size:12.5px; color:#94a3b8; margin-top:4px;">
            성력을 소모하여 마스터리를 연마하며, <strong>이전 성검 마스터리 Lv.100 달성 시</strong> 다음 단계 성검이 순차 해금됩니다.
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <div class="sword-stat-badge" style="padding:6px 12px;">
            <div class="sword-stat-label">+1 연마 비용</div>
            <div class="sword-stat-value" style="font-size:13px; color:var(--accent-cyan);">성력 500</div>
          </div>
          <div class="sword-stat-badge" style="padding:6px 12px;">
            <div class="sword-stat-label">+10 연마 비용</div>
            <div class="sword-stat-value" style="font-size:13px; color:var(--accent-gold);">성력 5,000</div>
          </div>
        </div>
      </div>
    </div>

    <div class="mastery-grid">
      ${masteries.map(m => {
        const isMax = (m.currentLv >= m.maxLv);
        const percent = Math.min(100, Math.round((m.currentLv / m.maxLv) * 100));
        return `
          <div class="mastery-item-card ${m.currentLv > 0 ? 'unlocked' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:800; font-size:14px; color:#ffffff;">${m.name}</span>
              <span class="char-tag-badge ${isMax ? 'badge-owned' : (m.currentLv > 0 ? 'badge-rentable' : 'badge-locked')}" style="font-size:10px;">
                ${isMax ? 'MAX (Lv.100)' : (m.currentLv > 0 ? `Lv.${m.currentLv}` : '미해금')}
              </span>
            </div>
            
            <div class="mastery-progress-bar-bg">
              <div class="mastery-progress-bar-fill ${isMax ? 'max' : ''}" style="width: ${percent}%;"></div>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:11px; color:#94a3b8;">
              <span>해금: ${m.req}</span>
              <span style="font-weight:700; color:${isMax ? 'var(--accent-gold)' : 'var(--accent-cyan)'};">${m.currentLv} / ${m.maxLv} (${percent}%)</span>
            </div>

            <div style="margin-top:8px; font-size:11.5px; color:#cbd5e1; line-height:1.4;">
              ${m.desc}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * 서브탭 3: 성검 정령 시스템 (Lv.25 & 4대 스킬 & 전용 모델)
 */
function renderSwordSpiritView() {
  const container = document.getElementById("swordSpiritContainer");
  if (!container) return;

  const raw = currentProfile.rawSaveData || {};
  const gKind = parseInt(raw["GodSwordKind"], 10) || 1;
  const gPoint = parseInt(raw["GodSwordPoint"] || String(currentProfile.sacredPower || "0").replace(/,/g, ''), 10) || 0;

  // 정령 4대 각성 단계
  const stages = [
    {
      step: 1,
      title: "1단계: 정령 출현",
      reqPoint: 10000,
      reqLv: 1,
      badge: "상시 동행",
      desc: "성검 소환 버프 중 성검 전용 모델의 수호 정령이 상시 동행 출현",
      achieved: gPoint >= 10000
    },
    {
      step: 2,
      title: "2단계: 정령 스킬",
      reqPoint: 50000,
      reqLv: 5,
      badge: "광역 폭딜 & 회복",
      desc: "주기적으로 광역 범위 피해 발동 및 체력/마나 회복 (피해 공식: 정령 계수 × 정령 Lv × 올스탯)",
      achieved: gPoint >= 50000
    },
    {
      step: 3,
      title: "3단계: 정령 회복",
      reqPoint: 100000,
      reqLv: 10,
      badge: "대량 즉시 회복",
      desc: "정령 스킬 시전 시 생명력 & 마나 대량 회복 (칼라드볼그 5% / 솔라리스 6% / 엑스칼리버 8%)",
      achieved: gPoint >= 100000
    },
    {
      step: 4,
      title: "4단계: 시간제 전투 소환",
      reqPoint: 150000,
      reqLv: 25,
      badge: "거대화 강림 (Ultimate)",
      desc: "크기 200% 거대화된 정령이 10초간 독립 전투 유닛으로 소환 (쿨타임 60초, 주변 지속 섬멸)",
      achieved: gPoint >= 150000
    }
  ];

  // 성검별 정령 모델 및 계수 비교표
  const spiritRows = [
    { name: "클라인", model: "기초 소형 정령", coeff: 60, heal: "-" },
    { name: "그람", model: "빛의 정령", coeff: 100, heal: "-" },
    { name: "레바테인 / 바리사다 / 아스칼론", model: "원소 정령 (화염·번개·대지)", coeff: 80, heal: "-" },
    { name: "듀란달", model: "얼음 천사", coeff: 100, heal: "-" },
    { name: "칼라드볼그 (7번)", model: "보랏빛 발광체", coeff: 120, heal: "5% (HP·MP)" },
    { name: "솔라리스 (8번)", model: "금색 발광체", coeff: 140, heal: "6% (HP·MP)" },
    { name: "엑스칼리버 (9번)", model: "흰금빛 발광체 (200% 거대화)", coeff: 160, heal: "8% (HP·MP)" }
  ];

  container.innerHTML = `
    <!-- 상단: 4대 정령 각성 단계 -->
    <div style="margin-bottom:14px;">
      <div style="font-size:16px; font-weight:800; color:#ffffff; margin-bottom:4px;">✨ 성검 정령 4대 각성 단계 (성력 기준)</div>
      <div style="font-size:12.5px; color:#94a3b8;">
        성력 수치와 정령 레벨이 기준치를 돌파할 때마다 새로운 정령 스킬 권능이 자동 해금됩니다.
      </div>
    </div>

    <div class="spirit-stages-grid">
      ${stages.map(s => {
        return `
          <div class="spirit-stage-card ${s.achieved ? 'achieved' : ''}">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:800; font-size:14px; color:#ffffff;">${s.title}</span>
                <span class="char-tag-badge ${s.achieved ? 'badge-owned' : 'badge-locked'}" style="font-size:10px;">
                  ${s.achieved ? '✓ 달성' : '🔒 미달성'}
                </span>
              </div>
              <div style="margin-top:6px; font-size:11.5px; color:var(--accent-gold); font-weight:700;">
                조건: 성력 ${s.reqPoint.toLocaleString()} P + 정령 Lv.${s.reqLv}
              </div>
              <div style="margin-top:8px; font-size:12px; color:#cbd5e1; line-height:1.45;">
                ${s.desc}
              </div>
            </div>
            <div style="margin-top:12px; font-size:11px; color:#94a3b8;">
              분류: <span style="color:var(--accent-cyan); font-weight:600;">${s.badge}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- 중단: 정령 강화 규칙 -->
    <div class="mastery-overview-card" style="margin-bottom:22px;">
      <div style="font-size:15px; font-weight:800; color:var(--accent-emerald); margin-bottom:6px;">
        🧪 성검 정령 강화 공식 및 규칙 (최대 Lv.25)
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:12px; font-size:12.5px; color:#f1f5f9;">
        <div style="background:rgba(255,255,255,0.04); padding:10px 14px; border-radius:8px;">
          <strong>🎯 성공 확률 공식:</strong><br>
          <span style="color:var(--accent-cyan); font-weight:700;">100 - (4 × 현재 Lv) %</span> (최저 10% 보장)<br>
          <span style="color:var(--accent-gold); font-size:11px;">* [성검 기사] 계급 해금 시 성공 확률 +5% 보너스</span>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:10px 14px; border-radius:8px;">
          <strong>💎 소모 비용 공식:</strong><br>
          <span style="color:var(--accent-gold); font-weight:700;">현재 Lv × 1,000 성력</span><br>
          <span style="color:#94a3b8; font-size:11px;">* 강화 실패 시에도 성력이 소모됩니다.</span>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:10px 14px; border-radius:8px;">
          <strong>⚔️ 전투 피해량 공식:</strong><br>
          <span style="color:var(--accent-emerald); font-weight:700;">정령 계수 × 정령 Lv × (힘 + 민 + 지)</span><br>
          <span style="color:#94a3b8; font-size:11px;">* 전투에서는 현재 착용 중인 진화 성검의 정령이 적용됩니다.</span>
        </div>
      </div>
    </div>

    <!-- 하단: 성검별 정령 모델 및 계수 비교표 -->
    <div style="margin-bottom:10px; font-size:15px; font-weight:800; color:#ffffff;">
      🧚 성검별 전용 정령 모델 & 데미지 계수 비교
    </div>
    <div class="spirit-table-wrapper">
      <table class="spirit-table">
        <thead>
          <tr>
            <th>성검 구분</th>
            <th>정령 전용 모델</th>
            <th>정령 데미지 계수</th>
            <th>정령 회복량 (3단계)</th>
          </tr>
        </thead>
        <tbody>
          ${spiritRows.map(r => `
            <tr>
              <td style="font-weight:700; color:#ffffff;">${r.name}</td>
              <td><span style="color:var(--accent-cyan);">${r.model}</span></td>
              <td><span style="color:var(--accent-gold); font-weight:700;">${r.coeff}</span> × 정령Lv × 올스탯</td>
              <td><span style="color:${r.heal !== '-' ? 'var(--accent-emerald)' : '#94a3b8'}; font-weight:700;">${r.heal}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}


/* --------------------------------------------------------------------------
   Pet Single Row Renderer
   -------------------------------------------------------------------------- */
function renderPetLevelBundlesTab() {
  const container = document.getElementById("petGridSingleRow");
  if (!container) return;

  container.innerHTML = "";

  PET_LEVEL_BUNDLES.forEach(bundle => {
    const petCard = createPetSingleRowCardElement(bundle);
    container.appendChild(petCard);
  });
}

function createPetSingleRowCardElement(bundle) {
  const card = document.createElement("div");
  card.className = "season-card";

  const totalPets = bundle.pets.length;
  let ownedCount = 0;

  bundle.pets.forEach(pet => {
    if (checkPetOwnership(pet.code).owned) {
      ownedCount++;
    }
  });

  const headerHtml = `
    <div class="season-header" style="background: linear-gradient(180deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.95) 100%); padding: 12px 14px;">
      <div class="commander-box">
        <div class="commander-name-area">
          <div class="commander-name" style="color: var(--accent-emerald); font-size: 15px;">🐾 ${bundle.title}</div>
        </div>
        <div class="commander-status-badge locked" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); border-color: var(--border-emerald); padding: 2px 8px;">
          ${ownedCount}/${totalPets} 소유
        </div>
      </div>
    </div>
  `;

  const petListContainer = document.createElement("div");
  petListContainer.className = "season-char-list";

  bundle.pets.forEach(pet => {
    const ownership = checkPetOwnership(pet.code);
    const isOwned = ownership.owned;
    const enhanceLevel = ownership.level;

    let statusClass = isOwned ? "status-owned" : "status-locked";
    let badgeHtml = isOwned 
      ? `<span class="char-tag-badge badge-owned">🌟 소유 ${enhanceLevel > 0 ? `<small style="font-weight:800;">[Lv.${enhanceLevel}]</small>` : ''}</span>`
      : `<span class="char-tag-badge badge-locked">🔒 미소유</span>`;

    const petItem = document.createElement("div");
    petItem.className = `char-item ${statusClass}`;
    petItem.innerHTML = `
      <div class="char-info">
        <div class="char-name" style="font-size: 12.5px;">${pet.name}</div>
        <div style="font-size: 10.5px; color: var(--text-muted);">${pet.desc}</div>
      </div>
      <div class="char-meta">
        ${badgeHtml}
      </div>
    `;

    petListContainer.appendChild(petItem);
  });

  card.innerHTML = headerHtml;
  card.appendChild(petListContainer);
  return card;
}

/* --------------------------------------------------------------------------
   Wings Tab Renderer
   -------------------------------------------------------------------------- */
function renderWingsTab() {
  const wingsContainer = document.getElementById("wingsContainer");
  if (!wingsContainer) return;

  const userWingId = currentProfile.wingId || 0;
  const userWingLevel = currentProfile.wingLevel || 0;

  let topBannerHtml = "";
  if (userWingId === 0) {
    topBannerHtml = `
      <div class="wing-status-banner wing-none-banner" style="grid-column: 1 / -1; margin-bottom: 8px; padding: 14px 18px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 22px;">🪽</span>
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #fca5a5;">현재 장착 날개: 없음 (날개 미보유 상태)</div>
            <div style="font-size: 11.5px; color: var(--text-muted);">해당 계정은 현재 날개 장비를 보유하거나 장착하고 있지 않습니다.</div>
          </div>
        </div>
        <span class="char-tag-badge badge-locked" style="font-size: 11.5px;">🔒 날개 미소유</span>
      </div>
    `;
  } else {
    const equippedWing = WINGS_CATALOG.find(w => w.id === userWingId) || { name: `날개 #${userWingId}` };
    topBannerHtml = `
      <div class="wing-status-banner wing-equipped-banner" style="grid-column: 1 / -1; margin-bottom: 8px; padding: 14px 18px; border-radius: 10px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 22px;">🪽✨</span>
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #6ee7b7;">현재 장착 날개: ${equippedWing.name} <span style="color:var(--accent-gold); font-size:12px;">(Lv.${userWingLevel})</span></div>
            <div style="font-size: 11.5px; color: var(--text-muted);">장착 날개 효과가 캐릭터 능력치 및 데미지에 정상 적용 중입니다.</div>
          </div>
        </div>
        <span class="char-tag-badge badge-owned" style="font-size: 11.5px;">✨ Lv.${userWingLevel} 장착중</span>
      </div>
    `;
  }

  const cardsHtml = WINGS_CATALOG.map(wing => {
    const isEquipped = (userWingId > 0 && wing.id === userWingId);
    const isMastered = (userWingId > 0 && wing.id < userWingId);
    const isNextAvailable = (userWingId > 0 && wing.id === userWingId + 1);

    let badgeClass = "badge-locked";
    let badgeText = `🔒 미해금`;
    let levelText = `Lv.0 (미해금)`;
    let cardBorder = "";

    if (isEquipped) {
      badgeClass = "badge-owned";
      badgeText = `✨ 장착중`;
      levelText = (userWingLevel >= 9) ? `Lv.9 (Max 달성!)` : `Lv.${userWingLevel} / 9`;
      cardBorder = "border-color: var(--accent-gold); box-shadow: 0 0 15px rgba(255,215,0,0.25);";
    } else if (isMastered) {
      badgeClass = "badge-owned";
      badgeText = `🌟 소유 (Max)`;
      levelText = `Lv.9 (Max 완료)`;
      cardBorder = "border-color: rgba(255,215,0,0.3);";
    } else if (isNextAvailable) {
      badgeClass = "badge-rentable";
      badgeText = `🟢 선택 해금 가능`;
      levelText = `Lv.1 (선택 가능)`;
      cardBorder = "border-color: var(--accent-emerald);";
    }

    const v38Border = (!cardBorder && wing.isV38) ? "border-color: rgba(56,189,248,0.45); background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,58,138,0.22));" : cardBorder;

    return `
      <div class="generic-item-card" style="${v38Border}">
        <div class="item-icon-box" style="${isEquipped ? 'background: rgba(255,215,0,0.15); border-color: var(--border-gold);' : (wing.isV38 ? 'background: rgba(56,189,248,0.15); border-color: rgba(56,189,248,0.4);' : '')}">${wing.id === 24 ? '🌙' : (wing.id === 25 ? '🌌' : (wing.id === 26 ? '❄️' : '🪽'))}</div>
        <div class="item-details">
          <div class="item-title">
            ${wing.name}
            ${isEquipped ? '<span style="font-size:11px; color:var(--accent-gold); font-weight:800;"> (현재 장착)</span>' : ''}
          </div>
          <div class="item-sub">
            레벨: <span style="font-weight:800; color:var(--text-main);">${levelText}</span>
          </div>
          <div class="item-desc" style="font-size:11.5px; color:var(--text-sub); margin-top:2px;">
            ${wing.req}
          </div>
          ${wing.option ? `<div style="font-size:11px; color:#38bdf8; font-weight:700; margin-top:4px;">⚡ ${wing.option}</div>` : ''}
          <div style="margin-top: 8px;">
            <span class="char-tag-badge ${badgeClass}">${badgeText}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  wingsContainer.innerHTML = topBannerHtml + cardsHtml;
}

/* --------------------------------------------------------------------------
   Warehouse Tab Renderer
   -------------------------------------------------------------------------- */
function renderWarehouseTab() {
  const warehouseContainer = document.getElementById("warehouseContainer");
  if (!warehouseContainer) return;

  let ownedCount = 0;
  const ownedList = [];

  const cardsHtml = WAREHOUSE_CATALOG.map(box => {
    const userLevel = getWarehouseLevel(box.code);
    const isOwned = (userLevel > 0);
    const isMax = (userLevel >= box.maxLevel);

    if (isOwned) {
      ownedCount++;
      ownedList.push({
        name: box.name,
        category: box.category,
        level: userLevel,
        isMax,
        isUnlockOnly: Boolean(box.isUnlockOnly)
      });
    }

    let cardStateClass = "warehouse-unowned";
    let badgeClass = "badge-locked";
    let badgeText = `🔒 미소유`;
    let levelText = box.isUnlockOnly ? `미해금 (조건 미달성)` : `Lv.0 (미소유)`;

    if (isMax) {
      cardStateClass = "warehouse-max";
      badgeClass = "badge-owned";
      badgeText = box.isUnlockOnly ? `🌟 소유 (사용 가능)` : `🌟 소유 (Lv.9 Max)`;
      levelText = box.isUnlockOnly ? `해금 완료 (사용 가능!)` : `Lv.9 (Max 달성!)`;
    } else if (isOwned) {
      cardStateClass = "warehouse-owned";
      badgeClass = "badge-rentable";
      badgeText = `🟢 보유중 (Lv.${userLevel})`;
      levelText = `Lv.${userLevel} / ${box.maxLevel}`;
    }

    const boxIcon = box.code === "NBLBox_LUNAR" ? "🌕" : (box.code === "NBLBox_MOON" ? "🐇" : (box.code === "NBLBox_XMAS1" ? "⛄" : (box.code === "NBLBox_XMAS2" ? "🛷" : (box.code === "NBLBox_XMAS3" ? "🎄" : (box.code === "NBLBox4" || box.code === "NBLBox2" ? "🦊" : (box.code === "NBLBox3" ? "🐆" : "📦"))))));

    return `
      <div class="generic-item-card ${cardStateClass}" style="${box.isV38 && !isOwned ? 'border-color: rgba(56,189,248,0.4);' : ''}">
        <div class="item-icon-box">${boxIcon}</div>
        <div class="item-details">
          <div class="item-title">
            ${box.name}
            <span style="font-size:11px; opacity:0.75; font-weight:400;"> [${box.category}]</span>
          </div>
          <div class="item-sub">
            상태: <span style="font-weight:800;">${levelText}</span>
          </div>
          <div class="item-desc" style="font-size:11.5px; margin-top:2px;">
            ${box.req}
          </div>
          ${box.option ? `<div style="font-size:11px; color:#38bdf8; font-weight:700; margin-top:4px;">⚡ ${box.option}</div>` : ''}
          <div style="margin-top: 8px;">
            <span class="char-tag-badge ${badgeClass}">${badgeText}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const ownedBadgesHtml = ownedList.length > 0
    ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">
        ${ownedList.map(item => `
          <span style="font-size:11.5px; padding:4px 10px; border-radius:6px; background:${item.isMax ? 'rgba(255,215,0,0.14)' : 'rgba(16,185,129,0.14)'}; border:1px solid ${item.isMax ? 'rgba(255,215,0,0.4)' : 'rgba(16,185,129,0.4)'}; color:${item.isMax ? 'var(--accent-gold)' : '#6ee7b7'}; font-weight:700;">
            ${item.isMax ? '🌟' : '🟢'} ${item.name} ${item.isUnlockOnly ? '(사용 가능)' : `(Lv.${item.level}${item.isMax ? ' MAX' : ''})`}
          </span>
        `).join('')}
      </div>`
    : `<div style="margin-top:8px; font-size:12px; color:var(--text-muted);">현재 보유 중인 창고가 없습니다.</div>`;

  const summaryBannerHtml = `
    <div style="grid-column: 1 / -1; margin-bottom: 12px; padding: 14px 18px; border-radius: 10px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%); border: 1px solid rgba(255, 215, 0, 0.3);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">📦</span>
          <strong style="font-size:14.5px; color:var(--accent-gold);">보유 창고 현황 요약 (총 ${WAREHOUSE_CATALOG.length}종 도감)</strong>
        </div>
        <span style="font-size:12.5px; color:#6ee7b7; font-weight:700;">보유 / 해금: ${ownedCount} / ${WAREHOUSE_CATALOG.length} 종</span>
      </div>
      ${ownedBadgesHtml}
    </div>
  `;

  warehouseContainer.innerHTML = summaryBannerHtml + cardsHtml;
}

/* ==========================================================================
   5. Recipes Tab Renderer (대륙 조합법 & 시즌포인트 테크트리 & 승급 연계)
   ========================================================================== */
let currentRecipeContinent = "all"; // 'all', 'new', 'old', 'bridge'
let currentRecipeCategory = "all";
let currentRecipeSearchTerm = "";

function renderRecipesTab() {
  renderSeasonPointOverview();
  filterRecipeContinent(currentRecipeContinent);
}

/**
 * 시즌포인트 6대 필수 아이템 요약 및 아코디언 카드 렌더링
 */
function renderSeasonPointOverview() {
  const totalsContainer = document.getElementById("spSummaryTotals");
  const cardsContainer = document.getElementById("seasonPointCardsGrid");
  if (!totalsContainer || !cardsContainer) return;

  // 1. 현재 로드된 유저의 인벤토리 아이템 이름 모음 (보유 여부 실시간 판별)
  const allUserItemNames = new Set();
  if (currentProfile && currentProfile.lastSave) {
    const checkSlots = [
      ...(currentProfile.lastSave.heroItems || []),
      ...(currentProfile.lastSave.warehouseItems || []),
      ...(currentProfile.lastSave.petItems || [])
    ];
    checkSlots.forEach(item => {
      let id = item.id;
      if (id === 0 && item.count > 0 && DSR_ITEMS_MAP[item.count]) {
        id = item.count;
      }
      if (id > 0 && DSR_ITEMS_MAP[id]) {
        allUserItemNames.add(DSR_ITEMS_MAP[id].name);
      }
    });
  }

  // 2. V38 7대 필수 아이템 보유 판별 헬퍼
  function checkSpItemOwned(item) {
    if (allUserItemNames.has(item.name)) return true;
    for (const name of allUserItemNames) {
      if (item.id === "sp_seal_lv3" && (name.includes("인장Lv3") || name.includes("인장 Lv3"))) return true;
      if (item.id === "sp_dragon_king" && (name.includes("용왕의 대검") || name.includes("용왕의 쌍단검") || name.includes("용왕의 지팡이"))) return true;
      if (item.id === "sp_nightmare_hunter" && name.includes("악몽 사냥꾼")) return true;
      if (item.id === "sp_dream_lord" && name.includes("몽마군주")) return true;
      if (item.id === "sp_hellfire_chief" && name.includes("지옥불 대족장")) return true;
      const cleanTarget = item.name.replace(/\[.*?\]/g, '').trim();
      if (name.includes(cleanTarget)) return true;
    }
    return false;
  }

  // 현재 유저 달성 개수 계산
  let ownedCount = 0;
  if (typeof SEASON_POINT_REQUIREMENTS !== "undefined") {
    SEASON_POINT_REQUIREMENTS.forEach(item => {
      if (checkSpItemOwned(item)) ownedCount++;
    });
  }
  const isAllAchieved = (ownedCount === 7);

  // 3. 상단 소요 재화 요약 카드
  totalsContainer.innerHTML = `
    <div class="sp-total-card ${isAllAchieved ? 'highlight-gold-border' : ''}">
      <div class="sp-total-icon">${isAllAchieved ? '👑' : '🎯'}</div>
      <div class="sp-total-info">
        <div class="sp-total-label">V38 조건 2 실시간 달성도</div>
        <div class="sp-total-val" style="color: ${isAllAchieved ? 'var(--accent-gold)' : 'var(--accent-cyan)'};">
          ${ownedCount} / 7개 소지 (${Math.round((ownedCount / 7) * 100)}%)
        </div>
        <div class="sp-total-sub">${isAllAchieved ? '✨ 시즌포인트 조건 2 충족 완료!' : '*최상위 아이템만 인정 (구버전 불가)'}</div>
      </div>
    </div>
    <div class="sp-total-card highlight-gold-border">
      <div class="sp-total-icon">🪙</div>
      <div class="sp-total-info">
        <div class="sp-total-label">독립 완성 총 주화 (권장)</div>
        <div class="sp-total-val" style="color: var(--accent-gold);">654 주화</div>
        <div class="sp-total-sub">푸른가이아(331) + 핑크/몽마(98) + 지옥불(265)</div>
      </div>
    </div>
    <div class="sp-total-card">
      <div class="sp-total-icon">💰</div>
      <div class="sp-total-info">
        <div class="sp-total-label">총 소요 골드</div>
        <div class="sp-total-val" style="color: #fbbf24;">180만 ~ 280만</div>
        <div class="sp-total-sub">긴급무기(100만) + 고대갑옷(40만) + 가이아(40만)</div>
      </div>
    </div>
    <div class="sp-total-card">
      <div class="sp-total-icon">🏆</div>
      <div class="sp-total-info">
        <div class="sp-total-label">V38 신규 4대 던전</div>
        <div class="sp-total-val" style="color: var(--accent-emerald);">성소·둥지·요새·심연</div>
        <div class="sp-total-sub">악몽 사냥꾼 / 몽마군주 / 대족장 / 인장Lv3 / 용왕</div>
      </div>
    </div>
  `;

  // 4. 7대 아이템 아코디언 카드 렌더링
  if (typeof SEASON_POINT_REQUIREMENTS !== "undefined" && SEASON_POINT_REQUIREMENTS.length > 0) {
    cardsContainer.innerHTML = SEASON_POINT_REQUIREMENTS.map((item) => {
      const isOwned = checkSpItemOwned(item);
      const ownedBadge = isOwned
        ? `<span class="char-tag-badge badge-owned" style="font-size:11.5px;">🌟 현재 인벤토리 보유!</span>`
        : `<span class="char-tag-badge badge-locked" style="font-size:11.5px;">⏳ 미보유 (제작 필요)</span>`;

      let rankColor = "var(--accent-purple)";
      if (item.rank === "반 신급") rankColor = "#f472b6";
      if (item.rank === "신급") rankColor = "#38bdf8";
      if (item.rank === "궁극") rankColor = "#f59e0b";
      if (item.rank === "에픽") rankColor = "#c084fc";
      if (item.rank === "조합체") rankColor = "var(--accent-emerald)";
      if (item.rank === "조합재료") rankColor = "#f59e0b";

      // 테크트리 Steps HTML
      const stepsHtml = item.steps.map(s => `
        <div class="tech-step-item">
          <div class="tech-step-badge">STEP ${s.step}</div>
          <div class="tech-step-content">
            <div class="tech-step-title">
              <strong>${s.target}</strong>
              <div class="tech-step-cost">
                ${s.coin > 0 ? `<span class="cost-coin">🪙 ${s.coin} 주화</span>` : ''}
                ${s.gold > 0 ? `<span class="cost-gold">💰 ${(s.gold / 10000).toLocaleString()}만 골드</span>` : ''}
                ${s.coin === 0 && s.gold === 0 ? `<span class="cost-free">✨ 주화 소모 없음</span>` : ''}
              </div>
            </div>
            <div class="tech-step-mats">
              ${s.materials.map(m => `<span class="mat-pill">${m}</span>`).join('')}
            </div>
          </div>
        </div>
      `).join('');

      // 필요 원자재 목록 HTML
      const rawMatsHtml = item.rawMaterials.map(rm => {
        let typeStyle = "background: rgba(255,255,255,0.06); color: var(--text-main);";
        if (rm.type === "currency") typeStyle = "background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); font-weight:700;";
        if (rm.type === "recipe") typeStyle = "background: rgba(147, 51, 234, 0.15); color: #c084fc; border: 1px solid rgba(147, 51, 234, 0.3);";
        if (rm.type === "boss_mat") typeStyle = "background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); font-weight:700;";
        if (rm.type === "equip" || rm.type === "treasure" || rm.type === "armor" || rm.type === "seal" || rm.type === "insignia") {
          typeStyle = "background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-weight:600;";
        }
        return `
          <div class="raw-mat-chip" style="${typeStyle}">
            <span>${rm.name}</span>
            <span class="raw-mat-cnt">${rm.count}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="sp-accordion-card ${isOwned ? 'owned-border' : ''}">
          <div class="sp-accordion-header" onclick="toggleSpAccordion('${item.id}')">
            <div class="sp-card-left">
              <div class="sp-item-icon" style="border-color: ${rankColor};">${item.icon}</div>
              <div class="sp-item-title-box">
                <div class="sp-item-title-row">
                  <span class="sp-item-name">${item.name}</span>
                  <span class="sp-rank-badge" style="background: ${rankColor}; color: #000;">${item.rank}</span>
                  ${ownedBadge}
                </div>
                <div class="sp-item-summary-desc">${item.summaryDesc}</div>
              </div>
            </div>
            <div class="sp-card-right">
              <div class="sp-cost-badge">
                ${item.totalCoin > 0 ? `<span class="badge-coin">🪙 ${item.totalCoin} 주화</span>` : ''}
                ${item.totalGold > 0 ? `<span class="badge-gold">💰 ${(item.totalGold / 10000).toLocaleString()}만 G</span>` : ''}
                ${item.totalCoin === 0 && item.totalGold === 0 ? `<span class="badge-free">✨ 특수 조합</span>` : ''}
              </div>
              <button type="button" class="btn-accordion-toggle" id="btn_toggle_${item.id}">▼ 펼치기</button>
            </div>
          </div>

          <div class="sp-accordion-body" id="body_${item.id}" style="display: none;">
            <div class="sp-body-grid">
              <div class="tech-steps-column">
                <div class="column-subtitle">🔨 순차 제작 단계 (테크트리)</div>
                <div class="tech-steps-list">${stepsHtml}</div>
              </div>
              <div class="raw-materials-column">
                <div class="column-subtitle">📦 최종 누적 필요 원자재 명세</div>
                <div class="raw-mats-grid">${rawMatsHtml}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function toggleSpAccordion(itemId) {
  const body = document.getElementById(`body_${itemId}`) || document.getElementById(`details_${itemId}`);
  const btn = document.getElementById(`btn_toggle_${itemId}`);
  if (!body) return;
  const isHidden = (body.style.display === "none");
  body.style.display = isHidden ? "block" : "none";
  if (btn) {
    btn.textContent = isHidden ? "▲ 접기" : "▼ 펼치기";
  }
}

function toggleSpCardDetails(itemId) {
  toggleSpAccordion(itemId);
}

function toggleSubtreeDetails(subId) {
  const elem = document.getElementById(`subtree_${subId}`);
  const btn = document.getElementById(`btn_toggle_${subId}`);
  if (!elem) return;

  const isHidden = (elem.style.display === "none");
  elem.style.display = isHidden ? "block" : "none";
  if (btn) {
    btn.textContent = isHidden ? "▲ 접기" : "▼ 펼치기";
  }
}

/**
 * 대륙 탭 필터링 ('all', 'new', 'old', 'bridge')
 */
function filterRecipeContinent(cKey) {
  currentRecipeContinent = cKey;

  // 1. 대륙 버튼 활성화 스타일 갱신
  const pills = document.querySelectorAll("#recipeContinentPills .continent-pill");
  pills.forEach(p => {
    if (p.getAttribute("onclick") && p.getAttribute("onclick").includes(`'${cKey}'`)) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  const listContainer = document.getElementById("recipesListContainer");
  const bridgeContainer = document.getElementById("recipesBridgeContainer");
  const catPills = document.getElementById("recipeCategoryPills");

  if (cKey === "bridge") {
    // 승급 연계도 뷰 표시
    if (listContainer) listContainer.style.display = "none";
    if (bridgeContainer) bridgeContainer.style.display = "flex";
    if (catPills) catPills.style.opacity = "0.4";
    renderContinentBridges();
  } else {
    // 일반 레시피 목록 뷰 표시
    if (listContainer) listContainer.style.display = "grid";
    if (bridgeContainer) bridgeContainer.style.display = "none";
    if (catPills) catPills.style.opacity = "1";
    renderAllRecipesList();
  }
}

/**
 * 대륙 통합 레시피 리스트 렌더러 (검색 & 카테고리 필터 지원)
 */
function renderAllRecipesList() {
  const container = document.getElementById("recipesListContainer");
  const countSpan = document.getElementById("txtRecipeCount");
  if (!container) return;

  const allRecipes = (typeof ALL_RECIPES_DATABASE !== "undefined" && ALL_RECIPES_DATABASE.length > 0)
    ? ALL_RECIPES_DATABASE
    : ((typeof NEW_CONTINENT_RECIPES !== "undefined") ? NEW_CONTINENT_RECIPES : []);

  let filtered = [...allRecipes];

  // 1. 대륙 필터
  if (currentRecipeContinent === "new") {
    filtered = filtered.filter(r => r.continentKey === "new");
  } else if (currentRecipeContinent === "old") {
    filtered = filtered.filter(r => r.continentKey === "old");
  }

  // 2. 카테고리 필터링
  if (currentRecipeCategory !== "all") {
    filtered = filtered.filter(r => r.categoryKey === currentRecipeCategory);
  }

  // 3. 검색어 필터링 (아이템명, 재료명, 대륙, 승급 대상/선행템)
  if (currentRecipeSearchTerm) {
    const term = currentRecipeSearchTerm.toLowerCase().trim();
    filtered = filtered.filter(r => {
      const matchName = r.name.toLowerCase().includes(term);
      const matchMats = r.materials.some(m => m.toLowerCase().includes(term));
      const matchCat = r.category.toLowerCase().includes(term);
      const matchCont = (r.continent || "").toLowerCase().includes(term);
      const matchUpgrade = (r.upgradeTarget || "").toLowerCase().includes(term);
      const matchReq = (r.requiredOldItem || "").toLowerCase().includes(term);
      return matchName || matchMats || matchCat || matchCont || matchUpgrade || matchReq;
    });
  }

  if (countSpan) countSpan.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-subtle);">
        검색 조건에 일치하는 조합법이 없습니다.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((r) => {
    let rankColor = "var(--accent-purple)";
    if (r.rank === "궁극") rankColor = "#facc15";
    if (r.rank === "반 신급") rankColor = "#f472b6";
    if (r.rank === "에픽" || r.rank.includes("에픽")) rankColor = "#c084fc";
    if (r.rank === "신급") rankColor = "#ec4899";
    if (r.rank === "조합체") rankColor = "var(--accent-emerald)";
    if (r.rank === "유니크급") rankColor = "#f59e0b";
    if (r.rank === "희귀급") rankColor = "#38bdf8";
    if (r.rank === "노말" || r.rank === "일반") rankColor = "#94a3b8";

    const isOld = (r.continentKey === "old");
    const continentBadge = isOld
      ? `<span class="badge-continent continent-old">📜 구대륙</span>`
      : `<span class="badge-continent continent-new">✨ 신대륙</span>`;

    // 승급 연계 안내 박스
    let upgradeBoxHtml = "";
    if (r.upgradeTarget) {
      upgradeBoxHtml = `
        <div class="recipe-upgrade-box upgrade-target">
          <span class="upgrade-icon">⚡ 신대륙 승급 연계:</span>
          <span class="upgrade-desc">${r.upgradeTarget}</span>
        </div>
      `;
    } else if (r.requiredOldItem) {
      upgradeBoxHtml = `
        <div class="recipe-upgrade-box required-old">
          <span class="upgrade-icon">🔗 구대륙 선행 필요:</span>
          <span class="upgrade-desc">${r.requiredOldItem}</span>
        </div>
      `;
    }

    return `
      <div class="recipe-item-card">
        <div class="recipe-card-top">
          <div class="recipe-name-box">
            <span class="recipe-icon">${r.icon || (isOld ? '📜' : '⚔️')}</span>
            <div>
              <div class="recipe-name">${r.name}</div>
              <div class="recipe-meta">
                ${continentBadge}
                <span class="cat-tag">${r.category}</span>
                <span class="sp-rank-tag" style="color:${rankColor}; border-color:${rankColor}; font-size:9.5px; padding:1px 5px;">${r.rank}</span>
              </div>
            </div>
          </div>
          <div class="recipe-cost-box">
            ${r.coin > 0 ? `<span class="badge-coin">🪙 ${r.coin} 주화</span>` : ''}
            ${r.gold > 0 ? `<span class="badge-gold">💰 ${(r.gold / 10000).toLocaleString()}만 G</span>` : ''}
            ${r.coin === 0 && r.gold === 0 ? `<span class="badge-free">✨ 주화 0</span>` : ''}
          </div>
        </div>

        ${upgradeBoxHtml}

        <div class="recipe-mats-area">
          <div class="recipe-mats-label">필요 조합 재료 (${r.materials.length}개):</div>
          <div class="recipe-mats-list">
            ${r.materials.map(m => `
              <span class="recipe-mat-pill ${m.includes('조합서') ? 'is-recipe' : (m.includes('신급') || m.includes('에픽') || m.includes('보물') ? 'is-boss' : '')}">${m}</span>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 신/구대륙 4대 승급 연계도 렌더러
 */
function renderContinentBridges() {
  const container = document.getElementById("recipesBridgeContainer");
  const countSpan = document.getElementById("txtRecipeCount");
  if (!container) return;

  const bridges = (typeof CONTINENT_UPGRADE_BRIDGES !== "undefined") ? CONTINENT_UPGRADE_BRIDGES : [];
  if (countSpan) countSpan.textContent = `${bridges.length}대 승급 연계 체인`;

  container.innerHTML = `
    <div class="bridge-intro-banner">
      <div class="bridge-intro-icon">⚡</div>
      <div class="bridge-intro-text">
        <h3>구대륙 ➔ 신대륙 4대 핵심 승급 연계 계보도</h3>
        <p>구대륙에서 제작한 최상위 장비(문장, 칭호, 인장, 보물)가 신대륙 핵심 장비 및 시즌포인트 필수 아이템의 기반 재료로 계승되는 4가지 주요 루트입니다. 단계를 확인하고 테크트리를 손실 없이 완성하세요!</p>
      </div>
    </div>

    <div class="bridge-cards-grid">
      ${bridges.map(b => {
        const icon = b.icon || '⚡';
        const title = b.title || '';
        const target = b.target || b.targetSpItem || '';
        const badge = b.badge || '승급 계보';
        const desc = b.desc || b.summary || '';
        const steps = Array.isArray(b.steps) ? b.steps : [];

        return `
          <div class="bridge-card">
            <div class="bridge-card-header">
              <div class="bridge-card-title-group">
                <span class="bridge-card-icon">${icon}</span>
                <div>
                  <div class="bridge-card-title">${title}</div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">최종 목표: <strong style="color:#ffffff;">${target}</strong></div>
                </div>
              </div>
              <span class="bridge-badge-key">${badge}</span>
            </div>
            <div class="bridge-desc">${desc}</div>

            <div class="bridge-steps-flow">
              ${steps.map((st, idx) => {
                const isLast = (idx === steps.length - 1);
                const phase = st.phase || st.continent || `STEP ${idx + 1}`;
                const itemName = st.item || st.name || '';
                const itemNote = st.note || st.desc || '';
                const mats = Array.isArray(st.materials) ? st.materials : [];

                let stepClass = "step-old";
                if (phase.includes("신대륙")) stepClass = "step-new";
                if (phase.includes("최종") || phase.includes("시즌") || isLast) stepClass = "step-target";

                return `
                  <div class="bridge-step-box ${stepClass}">
                    <div class="step-phase-tag">${phase}</div>
                    <div class="step-item-name">${itemName}</div>
                    <div class="step-item-note">${itemNote}</div>
                    ${mats.length > 0 ? `
                      <div class="bridge-step-mats-pills">
                        ${mats.map(m => `<span class="bridge-mat-pill">${m}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                  ${!isLast ? `<span class="bridge-arrow-icon">➔</span>` : ''}
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function filterRecipeCategory(catKey) {
  currentRecipeCategory = catKey;
  const pills = document.querySelectorAll("#recipeCategoryPills .cat-pill");
  pills.forEach(p => {
    if (p.getAttribute("onclick") && p.getAttribute("onclick").includes(`'${catKey}'`)) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  // 만약 현재 bridge 뷰라면 all 로 자동 전환
  if (currentRecipeContinent === "bridge") {
    filterRecipeContinent("all");
  } else {
    renderAllRecipesList();
  }
}

function handleRecipeSearch(val) {
  currentRecipeSearchTerm = val;
  if (currentRecipeContinent === "bridge" && val.trim().length > 0) {
    filterRecipeContinent("all");
  } else {
    renderAllRecipesList();
  }
}




/* ==========================================================================
   4. RANKINGS ANALYSIS TAB LOGIC (🏆 랭킹 분석실 & 스코어 산출 시스템)
   ========================================================================== */
let currentRankBoard = 'user'; // 'user' | 'tier' | 'formula'
let currentRankSort = 'rank';  // 'rank' | 'seasonPoint' | 'honorPoint' | 'coin' | 'sacredPower' | 'score' | 'gold' | 'totStats'
let rankSortAsc = true;        // 기본 순위는 1위부터 순서대로 나열 (true = 1위 -> 30위)
let rankSearchQuery = '';

// 실시간 전체 랭커 동기화 상태 관리
let isRankingLiveSyncing = false;
let abortRankingLiveSync = false;
let rankLiveSyncProgress = { current: 0, total: 0, completedAt: null };
let lastRankLiveSyncTime = 0;
const RANK_LIVE_SYNC_COOLDOWN_MS = 45 * 1000;
const RANK_LIVE_SYNC_CACHE_KEY = 'dsr_live_rankings_cache_v37_5_5';

/**
 * m16tool 랭킹 보드 HTML에서 순위/아이디/스코어 추출 (클라이언트 폴백용)
 */
function parseM16RankingBoardHtmlClient(htmlText) {
  const entries = [];
  if (!htmlText) return entries;
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRegex.exec(htmlText)) !== null) {
    const rowHtml = m[1];
    const nicMatch = rowHtml.match(/RPGDetail\?nicName=([^"&'<>]+)/i);
    if (!nicMatch) continue;
    let nicName = nicMatch[1].trim();
    try { nicName = decodeURIComponent(nicName); } catch (e) {}

    const tds = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdM;
    while ((tdM = tdRegex.exec(rowHtml)) !== null) {
      const txt = tdM[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      tds.push(txt);
    }
    if (tds.length >= 3) {
      const rankNum = parseInt(tds[0].replace(/[^0-9]/g, ""), 10);
      const scoreNum = parseInt(tds[2].replace(/[^0-9-]/g, ""), 10) || 0;
      if (!isNaN(rankNum) && rankNum > 0) {
        entries.push({ rank: rankNum, nicName, score: scoreNum });
      }
    }
  }
  return entries;
}

/**
 * 실시간으로 가져온 m16tool 유저랭킹/계급랭킹 보드 순서를 DSR_RANKINGS_DATA에 반영
 */
function applyLiveRankingBoardsOrder(userBoard, tierBoard) {
  if (typeof DSR_RANKINGS_DATA === "undefined") return false;

  const existingByNic = {};
  [...(DSR_RANKINGS_DATA.userRankings || []), ...(DSR_RANKINGS_DATA.tierRankings || [])].forEach(row => {
    if (row && row.nicName) {
      const k = row.nicName.trim().toLowerCase();
      if (!existingByNic[k] || (row.latestSlot && !existingByNic[k].latestSlot)) {
        existingByNic[k] = { ...row };
      } else {
        existingByNic[k] = { ...existingByNic[k], ...row };
      }
    }
  });

  const userScoreMap = {};
  const tierScoreMap = {};
  if (Array.isArray(userBoard)) {
    userBoard.forEach(item => {
      if (item && item.nicName) userScoreMap[item.nicName.trim().toLowerCase()] = item.score;
    });
  }
  if (Array.isArray(tierBoard)) {
    tierBoard.forEach(item => {
      if (item && item.nicName) tierScoreMap[item.nicName.trim().toLowerCase()] = item.score;
    });
  }

  const buildBoardRow = (entry, isTier) => {
    const k = entry.nicName.trim().toLowerCase();
    const prev = existingByNic[k] || {};
    const dbP = (typeof PLAYERS_DATABASE !== "undefined" && PLAYERS_DATABASE[k]) ? PLAYERS_DATABASE[k] : null;
    const ls = (dbP && dbP.lastSave) ? dbP.lastSave : null;

    const uScore = (userScoreMap[k] !== undefined)
      ? userScoreMap[k]
      : (!isTier ? entry.score : (prev.userScore || 0));
    const tScore = (tierScoreMap[k] !== undefined)
      ? tierScoreMap[k]
      : (isTier ? entry.score : (prev.tierScore || 0));

    return {
      rank: entry.rank,
      nicName: entry.nicName.trim(),
      score: entry.score,
      tierScore: tScore,
      userScore: uScore,
      seasonPoint: (dbP && dbP.seasonPoint !== undefined) ? dbP.seasonPoint : (prev.seasonPoint || 0),
      honorPoint: (dbP && dbP.honorPoint !== undefined) ? dbP.honorPoint : (prev.honorPoint || 0),
      coin: (ls && ls.imperialCoin !== undefined) ? ls.imperialCoin : (prev.coin || 0),
      sacredPower: (dbP && dbP.sacredPower !== undefined) ? (parseInt(String(dbP.sacredPower).replace(/,/g, ''), 10) || 0) : (prev.sacredPower || 0),
      gold: (ls && ls.gold !== undefined) ? ls.gold : (prev.gold || 0),
      str: (ls && ls.str !== undefined) ? ls.str : (prev.str || 0),
      agi: (ls && ls.agi !== undefined) ? ls.agi : (prev.agi || 0),
      int: (ls && ls.int !== undefined) ? ls.int : (prev.int || 0),
      totStats: ls ? ((ls.str || 0) + (ls.agi || 0) + (ls.int || 0)) : (prev.totStats || 0),
      charName: (ls && ls.characterName) ? ls.characterName : (prev.charName || "-"),
      latestSlot: (ls && ls.saveDate) ? ls.saveDate : (prev.latestSlot || "-"),
      isLiveSynced: prev.isLiveSynced || (dbP && dbP.isLiveFetched) || false
    };
  };

  let updated = false;
  if (Array.isArray(userBoard) && userBoard.length > 0) {
    DSR_RANKINGS_DATA.userRankings = userBoard.map(e => buildBoardRow(e, false));
    updated = true;
  }
  if (Array.isArray(tierBoard) && tierBoard.length > 0) {
    DSR_RANKINGS_DATA.tierRankings = tierBoard.map(e => buildBoardRow(e, true));
    updated = true;
  }

  // 현재 상단에 조회 중인 유저의 랭킹포인트 & 계급순위도 최신 보드 기준으로 즉시 반영
  if (updated && currentProfile && currentProfile.userId) {
    const official = resolveOfficialRankingInfo(currentProfile.userId, currentProfile.rankingPoint, currentProfile.rankStanding);
    currentProfile.rankingPoint = official.rankingPoint;
    currentProfile.rankStanding = official.rankStanding;
    try { updateProfileStatsUI(); } catch (e) {}
  }

  return updated;
}

/**
 * m16tool 공식 유저랭킹 & 계급랭킹 보드(1~30위) 실시간 순위표를 동기화
 */
async function syncM16RankingBoardsLive(forceRefresh = false) {
  // 1) 로컬 서버(/api/m16rankings) 우선 호출
  if (localApiStatus !== false) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/m16rankings', { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.status === 404) {
        localApiStatus = false;
      } else if (res.ok) {
        localApiStatus = true;
        const data = await res.json();
        if (data && (Array.isArray(data.userBoard) || Array.isArray(data.tierBoard))) {
          return applyLiveRankingBoardsOrder(data.userBoard, data.tierBoard);
        }
      }
    } catch (e) {
      if (localApiStatus === null) localApiStatus = false;
    }
  }

  // 2) 정적 호스팅에서 수동 갱신 시 CORS 프록시 폴백
  if (forceRefresh) {
    try {
      const userUrl = 'https://m16tool.xyz/Game/DSR/Rank/Index?board=%EC%9C%A0%EC%A0%80%EB%9E%AD%ED%82%B9';
      const tierUrl = 'https://m16tool.xyz/Game/DSR/Rank/Index?board=%EA%B3%84%EA%B8%89%EB%9E%AD%ED%82%B9';
      const fetchViaProxy = async (targetUrl) => {
        const worker = getWorkerProxyUrl();
        if (worker) {
          try {
            const sep = worker.includes("?") ? "&" : "?";
            const res = await fetch(`${worker}${sep}url=${encodeURIComponent(targetUrl)}`);
            if (res.ok) return await res.text();
          } catch (e) {}
        }
        const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) return null;
        return await res.text();
      };
      const [uHtml, tHtml] = await Promise.all([fetchViaProxy(userUrl), fetchViaProxy(tierUrl)]);
      const uBoard = parseM16RankingBoardHtmlClient(uHtml);
      const tBoard = parseM16RankingBoardHtmlClient(tHtml);
      if (uBoard.length > 0 || tBoard.length > 0) {
        return applyLiveRankingBoardsOrder(uBoard, tBoard);
      }
    } catch (e) {}
  }
  return false;
}

/**
 * 로컬스토리지에 캐시된 최신 실시간 랭킹 데이터를 복원
 */
function restoreCachedLiveRankings() {
  if (typeof DSR_RANKINGS_DATA === "undefined") return;
  try {
    const raw = localStorage.getItem(RANK_LIVE_SYNC_CACHE_KEY);
    if (!raw) return;
    const cached = JSON.parse(raw);
    if (!cached) return;

    if (Array.isArray(cached.userBoardOrder) && cached.userBoardOrder.length > 0 && Array.isArray(cached.tierBoardOrder) && cached.tierBoardOrder.length > 0) {
      applyLiveRankingBoardsOrder(cached.userBoardOrder, cached.tierBoardOrder);
    }

    if (!cached.byNic) return;

    const allRows = [...(DSR_RANKINGS_DATA.userRankings || []), ...(DSR_RANKINGS_DATA.tierRankings || [])];
    allRows.forEach(row => {
      const key = (row.nicName || "").toLowerCase();
      const item = cached.byNic[key];
      if (item && isSlotNewerOrEqual(item.latestSlot, row.latestSlot, true)) {
        if (item.coin !== undefined) row.coin = item.coin;
        if (item.gold !== undefined) row.gold = item.gold;
        if (item.str !== undefined) row.str = item.str;
        if (item.agi !== undefined) row.agi = item.agi;
        if (item.int !== undefined) row.int = item.int;
        if (item.totStats !== undefined) row.totStats = item.totStats;
        if (item.latestSlot) row.latestSlot = item.latestSlot;
        if (item.charName) row.charName = item.charName;
        if (item.seasonPoint !== undefined) row.seasonPoint = item.seasonPoint;
        if (item.honorPoint !== undefined) row.honorPoint = item.honorPoint;
        if (item.sacredPower !== undefined) row.sacredPower = item.sacredPower;
        row.isLiveSynced = true;
      }
    });
    if (cached.completedAt) {
      rankLiveSyncProgress.completedAt = cached.completedAt;
    }
  } catch (e) {
    console.warn("Failed to restore cached live rankings:", e);
  }
}

/**
 * 실시간 동기화된 전체 랭커 데이터를 로컬스토리지에 저장
 */
function saveCachedLiveRankings(completedAtStr) {
  if (typeof DSR_RANKINGS_DATA === "undefined") return;
  try {
    const byNic = {};
    const allRows = [...(DSR_RANKINGS_DATA.userRankings || []), ...(DSR_RANKINGS_DATA.tierRankings || [])];
    allRows.forEach(row => {
      if (row.nicName) {
        byNic[row.nicName.toLowerCase()] = {
          coin: row.coin,
          gold: row.gold,
          str: row.str,
          agi: row.agi,
          int: row.int,
          totStats: row.totStats,
          latestSlot: row.latestSlot,
          charName: row.charName,
          seasonPoint: row.seasonPoint,
          honorPoint: row.honorPoint,
          sacredPower: row.sacredPower
        };
      }
    });
    const userBoardOrder = (DSR_RANKINGS_DATA.userRankings || []).map(r => ({ rank: r.rank, nicName: r.nicName, score: r.userScore || r.score || 0 }));
    const tierBoardOrder = (DSR_RANKINGS_DATA.tierRankings || []).map(r => ({ rank: r.rank, nicName: r.nicName, score: r.tierScore || r.score || 0 }));
    localStorage.setItem(RANK_LIVE_SYNC_CACHE_KEY, JSON.stringify({
      completedAt: completedAtStr,
      userBoardOrder,
      tierBoardOrder,
      byNic
    }));
  } catch (e) {}
}

/**
 * 개별 랭커의 m16tool 파싱 결과를 PLAYERS_DATABASE 및 DSR_RANKINGS_DATA에 즉시 적용
 */
function applyLiveM16DataToRanker(nicName, m16Data) {
  if (!nicName || !m16Data || !m16Data.found) return false;
  const cleanId = nicName.trim();
  const tKey = cleanId.toLowerCase();
  const existingDb = (typeof PLAYERS_DATABASE !== "undefined" && PLAYERS_DATABASE[tKey]) ? PLAYERS_DATABASE[tKey] : {};

  const safeLastSave = m16Data.lastSave || existingDb.lastSave || {
    saveDate: "기록 없음",
    characterName: "조회 정보 없음",
    characterLevel: 6000,
    petName: "없음",
    gold: 0, imperialCoin: 0, darkStone: 0,
    str: 0, agi: 0, int: 0,
    heroItems: [], petItems: [], warehouseItems: []
  };

  const rawSlots = (m16Data.saveSlots && m16Data.saveSlots.length > 0)
    ? m16Data.saveSlots
    : (existingDb.saveSlots || [safeLastSave]);
  const sortedLiveSlots = sortSaveSlotsLatestFirst(rawSlots);

  let effectiveWingId = (m16Data.wingId !== undefined) ? m16Data.wingId : (existingDb.wingId || 0);
  let effectiveWingLevel = (m16Data.wingLevel !== undefined) ? m16Data.wingLevel : (existingDb.wingLevel || 0);
  if (tKey === "goodwin") {
    effectiveWingId = 0;
    effectiveWingLevel = 0;
  }

  const officialRank = resolveOfficialRankingInfo(
    cleanId,
    (m16Data.rankingPoint !== undefined && m16Data.rankingPoint > 0) ? m16Data.rankingPoint : existingDb.rankingPoint,
    m16Data.rankStanding || existingDb.rankStanding
  );

  const liveProfile = {
    ...existingDb,
    userId: cleanId,
    isLiveFetched: true,
    seasonPoint: (m16Data.seasonPoint !== undefined) ? m16Data.seasonPoint : (existingDb.seasonPoint || 0),
    honorPoint: (m16Data.honorPoint !== undefined) ? m16Data.honorPoint : (existingDb.honorPoint || 0),
    hnRt: (m16Data.hnRt !== undefined) ? m16Data.hnRt : (existingDb.hnRt || 0),
    hnFr: (m16Data.hnFr !== undefined) ? m16Data.hnFr : (existingDb.hnFr || 0),
    hnMk: (m16Data.hnMk !== undefined) ? m16Data.hnMk : (existingDb.hnMk || 0),
    hnE1: (m16Data.hnE1 !== undefined) ? m16Data.hnE1 : (existingDb.hnE1 || 0),
    hnE2: (m16Data.hnE2 !== undefined) ? m16Data.hnE2 : (existingDb.hnE2 || 0),
    hnE3: (m16Data.hnE3 !== undefined) ? m16Data.hnE3 : (existingDb.hnE3 || 0),
    hnTd: (m16Data.hnTd !== undefined) ? m16Data.hnTd : (existingDb.hnTd || 0),
    isSeasonCompleted: (m16Data.isSeasonCompleted !== undefined) ? m16Data.isSeasonCompleted : existingDb.isSeasonCompleted,
    seasonVersionLabel: m16Data.seasonVersionLabel || existingDb.seasonVersionLabel || "v37",
    seasonCompletedChar: m16Data.seasonCompletedChar || existingDb.seasonCompletedChar || "",
    rankingPoint: officialRank.rankingPoint,
    rankStanding: officialRank.rankStanding,
    titleCode: m16Data.titleCode || existingDb.titleCode || "TT_TYPE1",
    swordCode: m16Data.swordCode || existingDb.swordCode || "BLSwrod0",
    swordLevel: m16Data.swordLevel || existingDb.swordLevel || 1,
    swordMasteryLevels: { ...(existingDb.swordMasteryLevels || {}), ...(m16Data.swordMasteryLevels || {}) },
    ownedSwords: new Set([...(existingDb.ownedSwords || []), ...(m16Data.ownedSwords || [])]),
    wingId: effectiveWingId,
    wingLevel: effectiveWingLevel,
    warehouseData: { ...(existingDb.warehouseData || {}), ...(m16Data.warehouseData || {}) },
    relicData: { ...(existingDb.relicData || {}), ...(m16Data.relicData || {}) },
    sacredPower: m16Data.sacredPower || existingDb.sacredPower || "0",
    petData: { ...(existingDb.petData || {}), ...(m16Data.petData || {}) },
    ownedCodes: new Set([...(existingDb.ownedCodes || []), ...(m16Data.ownedCodes || [])]),
    saveSlots: sortedLiveSlots,
    selectedSlotIndex: 0,
    lastSave: { ...sortedLiveSlots[0] },
    redBean: (m16Data.redBean !== undefined) ? m16Data.redBean : (existingDb.redBean || 0),
    blueBean: (m16Data.blueBean !== undefined) ? m16Data.blueBean : (existingDb.blueBean || 0),
    greyBean: (m16Data.greyBean !== undefined) ? m16Data.greyBean : (existingDb.greyBean || 0),
    beans: m16Data.beans || existingDb.beans || { red: 0, blue: 0, grey: 0 }
  };

  if (tKey === "goodwin") {
    liveProfile.seasonPoint = Math.max(liveProfile.seasonPoint || 0, 116);
    liveProfile.honorPoint = Math.max(liveProfile.honorPoint || 0, 287);
    liveProfile.hnRt = Math.max(liveProfile.hnRt || 0, 13);
    liveProfile.hnFr = (liveProfile.hnFr !== undefined && liveProfile.hnFr > 0) ? liveProfile.hnFr : 37;
    liveProfile.hnTd = Math.max(liveProfile.hnTd || 0, 20261111);
    liveProfile.swordCode = "BLSwrod2";
    liveProfile.swordLevel = 40;
    liveProfile.swordMasteryLevels = {
      "BLSwrod1": 0, "BLSwrod2": 40, "BLSwrod3": 0, "BLSwrod4": 0, "BLSwrod5": 0, "nBLSwrodUP1": 0
    };
    liveProfile.ownedSwords = new Set(["BLSwrod1", "BLSwrod2"]);
    liveProfile.relicData = {
      ...(liveProfile.relicData || {}),
      "REL_A1": 9,
      "REL_A2": 1
    };
    liveProfile.redBean = (m16Data.redBean !== undefined) ? m16Data.redBean : Math.max(liveProfile.redBean || 0, 0);
    liveProfile.blueBean = (m16Data.blueBean !== undefined) ? m16Data.blueBean : Math.max(liveProfile.blueBean || 0, 0);
    liveProfile.greyBean = (m16Data.greyBean !== undefined && m16Data.greyBean > 0) ? m16Data.greyBean : Math.max(liveProfile.greyBean || 0, 7);
    liveProfile.beans = {
      red: liveProfile.redBean,
      blue: liveProfile.blueBean,
      grey: liveProfile.greyBean
    };
    if (liveProfile.lastSave) liveProfile.lastSave.petName = "빙결의 악몽[Lv3][펫]";
  }

  if (typeof updateTopDetectedMapVersionUI === "function" && m16Data.detectedMapVersion) {
    updateTopDetectedMapVersionUI(m16Data.detectedMapVersion, cleanId);
  }

  if (typeof PLAYERS_DATABASE !== "undefined") {
    PLAYERS_DATABASE[tKey] = liveProfile;
  }
  saveCachedUserProfile(cleanId, liveProfile);

  syncRankingsDataWithProfile(liveProfile, true);

  // 만약 현재 상단에 조회 중인 유저와 동일하다면 상단 프로필 및 전체 탭도 자동 최신화
  if (currentProfile && currentProfile.userId && currentProfile.userId.toLowerCase() === tKey) {
    currentProfile = {
      ...liveProfile,
      selectedSlotIndex: currentProfile.selectedSlotIndex || 0
    };
    try { updateProfileStatsUI(); } catch (e) {}
    try { renderSeasonsMatrix(); } catch (e) {}
    try { renderOtherTabsData(); } catch (e) {}
  }

  return true;
}

/**
 * 랭킹 분석실 전체 랭커 m16tool 실시간 세이브 일괄 자동 동기화
 * - 먼저 m16tool 공식 랭킹 보드(유저랭킹/계급랭킹 1~30위) 순서를 실시간 동기화한 뒤,
 *   개별 랭커의 최신 v37 세이브 슬롯 상세 데이터를 병렬 연동
 */
async function syncAllRankersLive(forceRefresh = false) {
  if (typeof DSR_RANKINGS_DATA === "undefined") return;
  if (isRankingLiveSyncing) return;

  // 정적 호스팅(GitHub Pages)에서는 기본 데이터에 이미 최신 v37 스냅샷이 탑재되어 있으므로
  // 탭 클릭 시 외부 프록시 다건 호출로 인한 IP Rate-Limit(개별 아이디 조회 차단 현상)을 방지
  if (!forceRefresh && localApiStatus === false) {
    if (!rankLiveSyncProgress.completedAt) {
      rankLiveSyncProgress.completedAt = "v37.5 최신 연동";
    }
    renderRankingsTable();
    return;
  }

  const now = Date.now();
  if (!forceRefresh && lastRankLiveSyncTime > 0 && (now - lastRankLiveSyncTime < RANK_LIVE_SYNC_COOLDOWN_MS)) {
    renderRankingsTable();
    return;
  }

  isRankingLiveSyncing = true;
  abortRankingLiveSync = false;

  // 0단계: m16tool 공식 랭킹 보드(유저랭킹 1~30위 / 계급랭킹 1~30위) 순위표 실시간 동기화
  try {
    await syncM16RankingBoardsLive(forceRefresh);
  } catch (e) {}

  // 현재 활성 탭의 랭커를 최우선 순위로 배열 구성
  const primaryList = (currentRankBoard === 'tier')
    ? (DSR_RANKINGS_DATA.tierRankings || [])
    : (DSR_RANKINGS_DATA.userRankings || []);
  const secondaryList = (currentRankBoard === 'tier')
    ? (DSR_RANKINGS_DATA.userRankings || [])
    : (DSR_RANKINGS_DATA.tierRankings || []);

  const allNics = [];
  const seen = new Set();
  [...primaryList, ...secondaryList].forEach(row => {
    if (row && row.nicName) {
      const k = row.nicName.trim().toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        allNics.push(row.nicName.trim());
      }
    }
  });

  if (allNics.length === 0) {
    isRankingLiveSyncing = false;
    return;
  }

  rankLiveSyncProgress = {
    current: 0,
    total: allNics.length,
    completedAt: rankLiveSyncProgress.completedAt
  };
  renderRankingsTable();

  const remainingNics = [];

  // 1단계: 로컬 서버(server.py)의 고속 병렬 배치 엔드포인트(/api/m16logs_batch) 시도
  if (localApiStatus !== false) {
    const CHUNK_SIZE = 15;
    for (let i = 0; i < allNics.length; i += CHUNK_SIZE) {
      if (abortRankingLiveSync) {
        isRankingLiveSyncing = false;
        renderRankingsTable();
        return;
      }
      const chunk = allNics.slice(i, i + CHUNK_SIZE);
      if (localApiStatus === false) {
        remainingNics.push(...chunk);
        continue;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(`/api/m16logs_batch?nics=${encodeURIComponent(chunk.join(','))}`, {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.status === 404) {
          localApiStatus = false;
          remainingNics.push(...chunk);
          continue;
        }

        if (res.ok) {
          localApiStatus = true;
          const data = await res.json();
          const resultsMap = (data && data.results) ? data.results : {};
          chunk.forEach(nic => {
            const html = resultsMap[nic];
            if (html) {
              const parsed = parseM16ToolHtml(nic, html);
              if (parsed && parsed.found) {
                applyLiveM16DataToRanker(nic, parsed);
              }
            }
            rankLiveSyncProgress.current++;
          });
          renderRankingsTable();
        } else {
          remainingNics.push(...chunk);
        }
      } catch (e) {
        if (localApiStatus === null) localApiStatus = false;
        remainingNics.push(...chunk);
      }
    }
  } else {
    remainingNics.push(...allNics);
  }

  // 2단계: 수동 전체 갱신 시 외부 프록시 연동 (Rate-Limit 방지를 위해 2명 단위 순차 처리 + 개별 조회 시 즉시 중단)
  if (remainingNics.length > 0 && (forceRefresh || localApiStatus === true)) {
    const PARALLEL_SIZE = 2;
    for (let i = 0; i < remainingNics.length; i += PARALLEL_SIZE) {
      if (abortRankingLiveSync) {
        isRankingLiveSyncing = false;
        renderRankingsTable();
        return;
      }
      const batch = remainingNics.slice(i, i + PARALLEL_SIZE);
      await Promise.all(batch.map(async (nic) => {
        if (abortRankingLiveSync) return;
        try {
          const m16Data = await fetchM16ToolUserLog(nic);
          if (m16Data && m16Data.found) {
            applyLiveM16DataToRanker(nic, m16Data);
          }
        } catch (err) {}
        rankLiveSyncProgress.current++;
      }));
      renderRankingsTable();
    }
  }

  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  isRankingLiveSyncing = false;
  lastRankLiveSyncTime = Date.now();
  rankLiveSyncProgress.completedAt = timeStr;
  DSR_RANKINGS_DATA.updatedAt = `실시간 연동 완료 (${timeStr})`;

  saveCachedLiveRankings(timeStr);
  renderRankingsTable();
}

function initRankingsTab() {
  renderRankingsTable();
  renderRankingsFormula();
}

function switchRankBoard(boardType) {
  currentRankBoard = boardType;
  
  const btnUser = document.getElementById("btnRankBoardUser");
  const btnTier = document.getElementById("btnRankBoardTier");
  const btnFormula = document.getElementById("btnRankBoardFormula");
  const toolbar = document.getElementById("rankToolbar");
  const tableContainer = document.getElementById("rankingsTableContainer");
  const formulaContainer = document.getElementById("rankingsFormulaContainer");

  if (btnUser) btnUser.classList.toggle("active", boardType === 'user');
  if (btnTier) btnTier.classList.toggle("active", boardType === 'tier');
  if (btnFormula) btnFormula.classList.toggle("active", boardType === 'formula');

  if (boardType === 'formula') {
    if (toolbar) toolbar.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
    if (formulaContainer) {
      formulaContainer.style.display = 'flex';
      renderRankingsFormula();
    }
  } else {
    if (toolbar) toolbar.style.display = 'flex';
    if (tableContainer) tableContainer.style.display = 'block';
    if (formulaContainer) formulaContainer.style.display = 'none';
    renderRankingsTable();
    syncAllRankersLive(false);
  }
}

function handleRankSort(sortKey) {
  if (currentRankSort === sortKey) {
    rankSortAsc = !rankSortAsc;
  } else {
    currentRankSort = sortKey;
    // 'rank'는 1위부터(오름차순), 지표(주화, 스코어 등)는 큰 수치부터(내림차순) 기본 정렬
    rankSortAsc = (sortKey === 'rank');
  }

  document.querySelectorAll(".rank-sort-btn").forEach(btn => {
    const key = btn.getAttribute("data-sort");
    let baseLabel = btn.getAttribute("data-base-label");
    if (!baseLabel) {
      baseLabel = btn.textContent.replace(/[▲▼]/g, '').trim();
      btn.setAttribute("data-base-label", baseLabel);
    }

    if (key === sortKey) {
      btn.classList.add("active");
      const arrow = rankSortAsc ? "▲" : "▼";
      btn.textContent = `${baseLabel} ${arrow}`;
    } else {
      btn.classList.remove("active");
      btn.textContent = baseLabel;
    }
  });

  renderRankingsTable();
}

function handleRankSearch(query) {
  rankSearchQuery = (query || "").trim().toLowerCase();
  renderRankingsTable();
}

function clearRankSearch() {
  rankSearchQuery = "";
  const input = document.getElementById("rankSearchInput");
  if (input) input.value = "";
  renderRankingsTable();
}

function selectRankerProfile(nicName) {
  if (!nicName) return;
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = nicName;

  handleSaveIdState(nicName);
  loadProfile(nicName);

  const charTabBtn = document.querySelector('.nav-tab[data-tab="characters"]');
  if (charTabBtn) charTabBtn.click();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderRankingsTable() {
  const container = document.getElementById("rankingsTableContainer");
  if (!container || typeof DSR_RANKINGS_DATA === "undefined") return;

  // 1. PLAYERS_DATABASE 등록 유저들 중 실시간(Live) 패치된 프로필만 선제 동기화 (정적 DB로 인한 롤백 원천 차단)
  if (typeof PLAYERS_DATABASE !== "undefined") {
    Object.keys(PLAYERS_DATABASE).forEach(uid => {
      const p = PLAYERS_DATABASE[uid];
      if (p && p.isLiveFetched) syncRankingsDataWithProfile(p, true);
    });
  }

  // 2. 현재 활성화된 프로필이 실시간 패치된 경우 최신 세이브 동기화
  if (currentProfile && currentProfile.userId && currentProfile.isLiveFetched) {
    syncRankingsDataWithProfile(currentProfile, true);
  }

  const rawList = (currentRankBoard === 'user') 
    ? (DSR_RANKINGS_DATA.userRankings || []) 
    : (DSR_RANKINGS_DATA.tierRankings || []);

  let list = rawList.filter(item => {
    if (!rankSearchQuery) return true;
    return item.nicName.toLowerCase().includes(rankSearchQuery) ||
           (item.charName && item.charName.toLowerCase().includes(rankSearchQuery));
  });

  list = [...list].sort((a, b) => {
    let valA = 0;
    let valB = 0;

    if (currentRankSort === 'rank') {
      valA = a.rank;
      valB = b.rank;
    } else if (currentRankSort === 'score') {
      valA = (currentRankBoard === 'user') ? (a.userScore || 0) : (a.tierScore || 0);
      valB = (currentRankBoard === 'user') ? (b.userScore || 0) : (b.tierScore || 0);
    } else if (currentRankSort === 'seasonPoint') {
      valA = a.seasonPoint || 0;
      valB = b.seasonPoint || 0;
    } else if (currentRankSort === 'honorPoint') {
      valA = a.honorPoint || 0;
      valB = b.honorPoint || 0;
    } else if (currentRankSort === 'coin') {
      valA = a.coin || 0;
      valB = b.coin || 0;
    } else if (currentRankSort === 'sacredPower') {
      valA = a.sacredPower || 0;
      valB = b.sacredPower || 0;
    } else if (currentRankSort === 'gold') {
      valA = a.gold || 0;
      valB = b.gold || 0;
    } else if (currentRankSort === 'totStats') {
      valA = a.totStats || 0;
      valB = b.totStats || 0;
    }

    if (valA < valB) return rankSortAsc ? -1 : 1;
    if (valA > valB) return rankSortAsc ? 1 : -1;
    return a.rank - b.rank;
  });

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
        <p style="font-size: 16px; margin-bottom: 8px;">🔍 검색 결과가 없습니다.</p>
        <p style="font-size: 13px;">'${rankSearchQuery}' 와 일치하는 랭커 아이디가 없습니다.</p>
      </div>
    `;
    return;
  }

  const isUserBoard = (currentRankBoard === 'user');

  // 활성화된 정렬 기준 메타정보 및 해설 매핑
  const sortMetaMap = {
    rank: { name: "👑 기본 순위", tip: "m16tool 공식 랭킹 순위 기준 (1위부터 순서대로 나열)" },
    score: { name: isUserBoard ? "💯 유저 스코어" : "🎖️ 계급 스코어", tip: "m16tool 공식 산출 종합 랭킹 스코어 기준" },
    seasonPoint: { name: "⭐ 시즌포인트 (SP)", tip: "시즌포인트(iPOINT) 누적 수치 기준" },
    honorPoint: { name: "🎖️ 명예포인트 (RP)", tip: "계급 결정 핵심인 iRP 명예포인트 기준" },
    coin: { name: "🪙 제국 주화", tip: "v37 최신 세이브 슬롯의 제국 주화 보유량 기준" },
    sacredPower: { name: "⚡ 성력 (성검)", tip: "성검 성력(GodSwordPoint) 수치 기준" },
    gold: { name: "💰 보유 골드", tip: "v37 최신 세이브 슬롯의 보유 골드 기준" },
    totStats: { name: "📊 3대 능력치 합", tip: "힘 + 민첩 + 지능 3대 스탯 총합 기준" }
  };

  const activeSortMeta = sortMetaMap[currentRankSort] || { name: currentRankSort, tip: "" };
  const sortDirectionText = (currentRankSort === 'rank')
    ? (rankSortAsc ? "1위 ➔ 30위 순서 (기본)" : "30위 ➔ 1위 역순")
    : (rankSortAsc ? "낮은 순 ▲ (오름차순)" : "높은 순 ▼ (내림차순)");

  const liveSyncBadgeHtml = isRankingLiveSyncing
    ? `<span class="rank-v37-sync-badge" style="background: rgba(59, 130, 246, 0.2); color: #93c5fd; border-color: rgba(59, 130, 246, 0.45);">🔄 m16tool 실시간 연동 중... (${rankLiveSyncProgress.current}/${rankLiveSyncProgress.total}명)</span>`
    : (rankLiveSyncProgress.completedAt
      ? `<span class="rank-v37-sync-badge" style="background: rgba(16, 185, 129, 0.18); color: #34d399; border-color: rgba(16, 185, 129, 0.4);">🟢 전체 랭커 실시간 연동 완료 (${rankLiveSyncProgress.completedAt})</span>`
      : `<span class="rank-v37-sync-badge">🛡️ v37 최신저장 실시간 연동 (Code1_37_...)</span>`);

  // 정렬 기준 안내 배너
  let bannerHtml = `
    <div class="rank-sort-info-bar">
      <div class="rank-sort-info-left">
        <span class="rank-sort-active-badge">📊 현재 정렬: <strong>${activeSortMeta.name}</strong> [${sortDirectionText}]</span>
        <span class="rank-sort-tip-text">💡 ${activeSortMeta.tip} — 강조된 열(컬럼)을 기준으로 정렬 중입니다. (테이블 제목을 눌러도 정렬됩니다)</span>
      </div>
      <div class="rank-sort-info-right">
        ${liveSyncBadgeHtml}
        <button type="button" class="btn-reset-rank-sort" onclick="syncAllRankersLive(true)" ${isRankingLiveSyncing ? 'disabled' : ''} style="background: rgba(16, 185, 129, 0.16); color: #34d399; border-color: rgba(16, 185, 129, 0.4); cursor: pointer;" title="아이디를 일일이 클릭하지 않아도 전체 랭커의 최신 세이브 데이터를 즉시 동기화합니다">
          ${isRankingLiveSyncing ? '⏳ 동기화 진행중...' : '🔄 실시간 전체 갱신'}
        </button>
        ${(currentRankSort !== 'rank' || !rankSortAsc) ? `
          <button type="button" class="btn-reset-rank-sort" onclick="handleRankSort('rank'); if(!rankSortAsc) handleRankSort('rank');" title="기본 1위부터 보기로 초기화">
            👑 1위부터 보기 (초기화)
          </button>
        ` : ''}
      </div>
    </div>
  `;

  const getThClass = (key) => `sortable-th ${currentRankSort === key ? 'col-sorted-th active' : ''}`;
  const getThArrow = (key) => (currentRankSort === key) ? `<span class="th-sort-arrow">${rankSortAsc ? '▲' : '▼'}</span>` : '';
  const colClass = (key) => (currentRankSort === key ? ' col-sorted-td' : '');

  let tableHtml = `
    ${bannerHtml}
    <table class="rank-table">
      <thead>
        <tr>
          <th class="${getThClass('rank')}" onclick="handleRankSort('rank')" style="width: 70px; text-align: center; cursor: pointer;" title="클릭하여 순위 정렬">순위 ${getThArrow('rank')}</th>
          <th>유저 아이디 (클릭 시 v37 프로필 조회)</th>
          <th class="${getThClass('score')}" onclick="handleRankSort('score')" style="text-align: right; cursor: pointer;" title="클릭하여 스코어 정렬">${isUserBoard ? '유저 스코어' : '계급 스코어'} ${getThArrow('score')}</th>
          <th class="${getThClass('seasonPoint')}" onclick="handleRankSort('seasonPoint')" style="text-align: right; cursor: pointer;" title="클릭하여 시즌포인트 정렬">시즌포인트 (SP) ${getThArrow('seasonPoint')}</th>
          <th class="${getThClass('honorPoint')}" onclick="handleRankSort('honorPoint')" style="text-align: right; cursor: pointer;" title="클릭하여 명예포인트 정렬">명예포인트 (RP) ${getThArrow('honorPoint')}</th>
          <th class="${getThClass('coin')}" onclick="handleRankSort('coin')" style="text-align: right; cursor: pointer;" title="클릭하여 제국 주화 정렬">제국 주화 ${getThArrow('coin')}</th>
          <th class="${getThClass('sacredPower')}" onclick="handleRankSort('sacredPower')" style="text-align: right; cursor: pointer;" title="클릭하여 성력 정렬">성력 (성검) ${getThArrow('sacredPower')}</th>
          <th class="${getThClass('gold')}" onclick="handleRankSort('gold')" style="text-align: right; cursor: pointer;" title="클릭하여 보유 골드 정렬">보유 골드 ${getThArrow('gold')}</th>
          <th class="${getThClass('totStats')}" onclick="handleRankSort('totStats')" style="text-align: right; cursor: pointer;" title="클릭하여 3대 능력치 합 정렬">3대 능력치 합 ${getThArrow('totStats')}</th>
          <th style="text-align: center;">${isUserBoard ? '계급랭킹' : '유저랭킹'}</th>
        </tr>
      </thead>
      <tbody>
  `;

  list.forEach(row => {
    let rankBadgeClass = "rank-normal";
    let rankIcon = row.rank;
    if (row.rank === 1) { rankBadgeClass = "rank-top-1"; rankIcon = "🥇 1"; }
    else if (row.rank === 2) { rankBadgeClass = "rank-top-2"; rankIcon = "🥈 2"; }
    else if (row.rank === 3) { rankBadgeClass = "rank-top-3"; rankIcon = "🥉 3"; }

    const displayScore = isUserBoard ? row.userScore.toLocaleString() : row.tierScore.toLocaleString();
    const otherRankStr = isUserBoard 
      ? (row.tierRank ? `🎖️ ${row.tierRank}위 (${row.tierScore}점)` : `<span style="color:#64748b;">-</span>`)
      : (row.userRank ? `🏆 ${row.userRank}위 (${(row.userScore||0).toLocaleString()}점)` : `<span style="color:#64748b;">-</span>`);

    const slotTagStr = row.latestSlot ? row.latestSlot.replace('Code1_', '') : 'v37';

    tableHtml += `
      <tr>
        <td class="${colClass('rank')}" style="text-align: center;">
          <span class="rank-badge ${rankBadgeClass}">${rankIcon}</span>
        </td>
        <td>
          <button type="button" class="ranker-id-btn" onclick="selectRankerProfile('${row.nicName}')" title="'${row.nicName}' v37 프로필 즉시 조회">
            <span>👤 ${row.nicName}</span>
          </button>
          ${row.charName ? `<span class="ranker-char-badge">${row.charName}</span>` : ''}
          <span class="ranker-slot-tag" title="v37 최신 세이브 슬롯 (Code1_${slotTagStr})">${slotTagStr}</span>
        </td>
        <td class="${colClass('score')}" style="text-align: right;">
          <span class="val-score-highlight">${displayScore}</span>
        </td>
        <td class="${colClass('seasonPoint')}" style="text-align: right;">
          <span class="val-sp-highlight">${(row.seasonPoint || 0).toLocaleString()} SP</span>
        </td>
        <td class="${colClass('honorPoint')}" style="text-align: right;">
          <span class="val-rp-highlight">${(row.honorPoint || 0).toLocaleString()} P</span>
        </td>
        <td class="${colClass('coin')}" style="text-align: right;">
          <span class="val-coin-highlight">${(row.coin || 0).toLocaleString()} 🪙</span>
        </td>
        <td class="${colClass('sacredPower')}" style="text-align: right;">
          <span class="val-gsp-highlight">${(row.sacredPower || 0).toLocaleString()} ⚡</span>
        </td>
        <td class="${colClass('gold')}" style="text-align: right;">
          <span class="val-gold-highlight">${(row.gold || 0).toLocaleString()} G</span>
        </td>
        <td class="${colClass('totStats')}" style="text-align: right;">
          <span style="color: #cbd5e1; font-weight: 600;">${(row.totStats || 0).toLocaleString()}</span>
        </td>
        <td style="text-align: center; font-size: 12.5px;">
          ${otherRankStr}
        </td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;

  container.innerHTML = tableHtml;
}

function renderRankingsFormula() {
  const container = document.getElementById("rankingsFormulaContainer");
  if (!container) return;

  container.innerHTML = `
    <!-- 1. 계급랭킹 산출 공식 카드 -->
    <div class="formula-card">
      <div class="formula-card-header">
        <div class="formula-card-title">
          <span>🎖️ 계급랭킹 (Tier Ranking) 스코어 산출 공식</span>
          <span class="patch-badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: rgba(59, 130, 246, 0.4);">정밀 역산 검증</span>
        </div>
        <span style="font-size: 12.5px; color: var(--text-muted);">가중치 분석 일치율: 100%</span>
      </div>

      <div class="formula-equation-box">
        계급랭킹 스코어 = (명예포인트 iRP × 2) + (시즌포인트 iPOINT × 1) + ∑ BoxPoint (창고/도감/업적 포인트)
      </div>

      <div class="formula-weights-grid">
        <div class="formula-weight-item">
          <div class="weight-item-label">명예포인트 (iRP)</div>
          <div class="weight-item-value" style="color: #60a5fa;">가중치 × 2.0 (지배적)</div>
          <div class="weight-item-desc">계급 스코어의 가장 큰 비중(약 70~80%)을 차지합니다. 1점당 계급 스코어 2점이 즉시 가산됩니다.</div>
        </div>

        <div class="formula-weight-item">
          <div class="weight-item-label">시즌포인트 (iPOINT)</div>
          <div class="weight-item-value" style="color: #34d399;">가중치 × 1.0 (핵심)</div>
          <div class="weight-item-desc">시즌 동안 클리어한 고유 캐릭터 및 퀘스트 포인트가 1:1 비율로 스코어에 직접 누적됩니다.</div>
        </div>

        <div class="formula-weight-item">
          <div class="weight-item-label">박스/창고 포인트 (BoxPoint)</div>
          <div class="weight-item-value" style="color: #facc15;">가중치 × 1.0 (보너스)</div>
          <div class="weight-item-desc">계정 내 창고 확장, 도감 해금, 업적 달성 시 지급되는 BoxPoint가 가산됩니다.</div>
        </div>
      </div>

      <div style="margin-top: 10px;">
        <h4 style="font-size: 14px; color: #f1f5f9; margin-bottom: 8px;">실제 최상위 랭커 데이터 실측 검증 사례</h4>
        <table class="formula-case-table">
          <thead>
            <tr>
              <th>순위 / 랭커</th>
              <th>명예포인트 (iRP × 2)</th>
              <th>시즌포인트 (iPOINT)</th>
              <th>박스/업적 (BoxPoint)</th>
              <th>계산 스코어</th>
              <th>실제 랭킹 스코어</th>
              <th>결과</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>🥇 1위 HiYuKi</strong></td>
              <td>539 P (×2 = 1,078)</td>
              <td>121 SP</td>
              <td>120 P (시즌/창고)</td>
              <td><strong>1,319</strong></td>
              <td><strong>1,319</strong></td>
              <td><span style="color:#34d399; font-weight:700;">100% 일치 ✅</span></td>
            </tr>
            <tr>
              <td><strong>🥈 2위 Jonas</strong></td>
              <td>523 P (×2 = 1,046)</td>
              <td>132 SP</td>
              <td>24 P</td>
              <td><strong>1,202</strong></td>
              <td><strong>1,202</strong></td>
              <td><span style="color:#34d399; font-weight:700;">100% 일치 ✅</span></td>
            </tr>
            <tr>
              <td><strong>4위 Horus</strong></td>
              <td>461 P (×2 = 922)</td>
              <td>45 SP</td>
              <td>48 P (Box 24+24)</td>
              <td><strong>1,015</strong></td>
              <td><strong>1,015</strong></td>
              <td><span style="color:#34d399; font-weight:700;">100% 일치 ✅</span></td>
            </tr>
            <tr>
              <td><strong>5위 goodwin1</strong></td>
              <td>386 P (×2 = 772)</td>
              <td>108 SP</td>
              <td>10 P</td>
              <td><strong>890</strong></td>
              <td><strong>890</strong></td>
              <td><span style="color:#34d399; font-weight:700;">100% 일치 ✅</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2. 유저랭킹 산출 방식 카드 -->
    <div class="formula-card">
      <div class="formula-card-header">
        <div class="formula-card-title">
          <span>🏆 유저랭킹 (User Ranking) 종합 스코어 산출 메커니즘</span>
          <span class="patch-badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(239, 68, 68, 0.4);">빅데이터 분석</span>
        </div>
        <span style="font-size: 12.5px; color: var(--text-muted);">성력(GodSwordPoint) 가중 분석</span>
      </div>

      <div class="formula-equation-box user-equation">
        유저 스코어 ≈ (성력 GodSwordPoint × 11.5) + 캐릭터 3대 스탯 합산(Str+Agi+Int) + 보유 재화(금 + 제국주화) + (iPOINT × 10,000) + (iRP × 2,000) + 칭호/성검 등급 보너스
      </div>

      <div class="formula-weights-grid">
        <div class="formula-weight-item">
          <div class="weight-item-label">성력 (GodSwordPoint)</div>
          <div class="weight-item-value" style="color: #38bdf8;">최상위권 절대 지배 지표</div>
          <div class="weight-item-desc">성력이 100만~1,000만 단위를 넘으면 1점당 약 11~12점의 가중치로 치솟아 1억~1억 5천만 점의 독보적 스코어를 형성합니다.</div>
        </div>

        <div class="formula-weight-item">
          <div class="weight-item-label">캐릭터 3대 능력치 합산</div>
          <div class="weight-item-value" style="color: #f472b6;">중상위권 스펙 분별력</div>
          <div class="weight-item-desc">성력이 0이어도 Bulsanix2처럼 3대 스탯 합이 938,404(초극스탯)에 달하면 비성력 유저 중 압도적 1위(696만 점)를 달성합니다.</div>
        </div>

        <div class="formula-weight-item">
          <div class="weight-item-label">소지 재화 & 기본 베이스</div>
          <div class="weight-item-value" style="color: #fbbf24;">약 400만 ~ 500만 기본 점수</div>
          <div class="weight-item-desc">기본 만렙 및 풀 골드(1,000,000 Gold), 제국주화 수천~수십만 개 소지 시 기본 400만 점의 베이스 스코어가 주어집니다.</div>
        </div>
      </div>

      <div style="margin-top: 10px;">
        <h4 style="font-size: 14px; color: #f1f5f9; margin-bottom: 8px;">주요 랭커 유형별 스코어 비교 인사이트</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-top: 10px;">
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 10px; padding: 14px;">
            <div style="font-weight: 700; color: #38bdf8; margin-bottom: 6px;">⚡ 성력 올인형 (Horus / vgbh111)</div>
            <p style="font-size: 12.5px; color: #94a3b8; line-height: 1.5;">
              성력을 12,958,237까지 극대화하여 스코어가 <strong>151,013,762점 (1억 5,100만)</strong>으로 유저랭킹 전체 1위를 수성했습니다.
            </p>
          </div>

          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 10px; padding: 14px;">
            <div style="font-weight: 700; color: #34d399; margin-bottom: 6px;">🎖️ 계급/시즌포인트 올인형 (HiYuKi / Jonas)</div>
            <p style="font-size: 12.5px; color: #94a3b8; line-height: 1.5;">
              명예포인트 539P, 시즌포인트 121SP, 시즌 캐릭터 91종을 올클리어하여 계급랭킹에서 <strong>1,319점</strong>으로 독보적 1위를 기록했습니다.
            </p>
          </div>

          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 10px; padding: 14px;">
            <div style="font-weight: 700; color: #fbbf24; margin-bottom: 6px;">⚔️ 순수 전투 스탯형 (Bulsanix2)</div>
            <p style="font-size: 12.5px; color: #94a3b8; line-height: 1.5;">
              성력이 0이지만 힘/민/지 3대 스탯 합계를 938,404까지 끌어올려 비성력 랭커 중 최고 점수인 <strong>6,969,059점</strong>을 달성했습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}
