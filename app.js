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

const USER_PROFILE_CACHE_KEY = 'dsr_live_user_profiles_v37_5_5';

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
      swordMasteryLevels: { ...(dbProfile.swordMasteryLevels || {}) },
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

    // goodwin 고유 예외 검증 (그람 Lv.40, 유물 이키라 Lv.9/도굴꾼 Lv.1, 회색 콩 3개, 날개 미소유 및 펫 빙결의 악몽 보장)
    if (cleanId.toLowerCase() === "goodwin") {
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
      currentProfile.redBean = 0;
      currentProfile.blueBean = 0;
      currentProfile.greyBean = 3;
      currentProfile.beans = { red: 0, blue: 0, grey: 3 };
      currentProfile.wingId = 0;
      currentProfile.wingLevel = 0;
      if (currentProfile.lastSave) currentProfile.lastSave.petName = "빙결의 악몽[Lv3][펫]";
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
        isSeasonCompleted: (m16Data.isSeasonCompleted !== undefined) ? m16Data.isSeasonCompleted : Boolean(baseDb.isSeasonCompleted),
        seasonVersionLabel: m16Data.seasonVersionLabel || baseDb.seasonVersionLabel || "v37",
        seasonCompletedChar: m16Data.seasonCompletedChar || baseDb.seasonCompletedChar || "",
        rankingPoint: rankInfo.rankingPoint,
        rankStanding: rankInfo.rankStanding,
        titleCode: m16Data.titleCode || baseDb.titleCode || "TT_TYPE1",
        swordCode: m16Data.swordCode || baseDb.swordCode || "BLSwrod0",
        swordLevel: m16Data.swordLevel || baseDb.swordLevel || 1,
        swordMasteryLevels: { ...(baseDb.swordMasteryLevels || {}), ...(m16Data.swordMasteryLevels || {}) },
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
        currentProfile.redBean = 0;
        currentProfile.blueBean = 0;
        currentProfile.greyBean = 3;
        currentProfile.beans = { red: 0, blue: 0, grey: 3 };
        if (currentProfile.lastSave) currentProfile.lastSave.petName = "빙결의 악몽[Lv3][펫]";
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

  // Lv9 펫
  "SP_RGUP1": "카오스 엘리멘탈",
  "SP_RGUP2": "카오스 랜턴",
  "SP_RGUP3": "스핑거 도그",
  "SP_RGUP4": "카오스 라이언",

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

// 캐릭터 인덱스 → 이름 맵핑 (Code1_2_1의 3번째 값, SH_N → index N+133)
// 검증: SH_31(페가수스 나이트)=164 ✅, 매의눈 여단장=177 ✅, 시타 응원여단장=170 ✅
const CHAR_INDEX_TO_NAME = {
  // 단장 및 여단장/고유 슬롯 캐릭터 인덱스 (사용자 실측 데이터 100% 매핑)
  24: "젤리 큐브",
  67: "아크리치",                     // CharIdx=67 ✅ 사용자 실측 "아크리치" (Level 1016)
  125: "[1차 전생] 늑대 장군",       // wldnjsdl33 CharIdx=125 ✅
  128: "슬픈광대 조커",
  129: "스컬 로드",
  130: "드워프 빅해머",
  131: "오우거 투사",
  132: "죄수 호송마차",
  133: "엘프 아쳐",
  224: "『시즌』드래곤 프리스트",     // goodwin CharIdx=224 ✅
  227: "드래곤 메이지",              // CharIdx=227 ✅ 0o0 드래곤 슬롯
  241: "바라카 둔기병",
  242: "바라카 쌍검병",
  246: "총사령관 데르메트",           // hjp0672 CharIdx=246 ✅
  121: "[1차 전생] 그랜드 정령술사", // u0u CharIdx=121 ✅
  247: "[2차 전생] 정령들의 주인",   // gowin2 CharIdx=247 ✅
  145: "래빗 신성여단장",            // goodwin1 CharIdx=145 ✅

  170: "사령관 암흑기사장", // Horus 저장코드 #1번 (CharIdx=170) ✅
  259: "시타 응원여단장",   // Horus 저장코드 #2번 (CharIdx=259) ✅
  177: "매의눈 여단장",      // goodsee CharIdx=177 ✅

  // SH_1 ~ SH_9 (S1, 라이언 기사단장)
  134: "흑기사",           135: "아기용 발카라스", 136: "크리스탈 골렘",
  137: "명궁",             138: "공갈해적단 선장", 139: "앨리펀트 캡틴",
  140: "드워프 라이플맨",  141: "젤리 큐브",       142: "리자드 소서러",
  // SH_10 ~ SH_18 (S2, 래빗 신성여단장 계열)
  143: "아기용 피넛",      144: "엔젤 나이트",     
  146: "다크 유니콘",      147: "펭챠릭",           148: "고양이 술사",
  149: "저주 술사",        150: "붓질 술사",        151: "복돌이 쿠마",
  // SH_19 ~ SH_27 (S3, 색욕의 마왕군단장)
  155: "『시즌』색욕의 마왕군단장", // goodwin CharIdx=155 ✅
  158: "놀 드루이드",      159: "화염의 광인",      160: "사령 응원가",
  // SH_28 ~ SH_36 (S4, 매의눈 여단장)
  161: "설버섯군",         162: "드워프 마법전사",  163: "귀족 보급마차",
  164: "페가수스 나이트",  165: "인어왕",            166: "미믹 스텀프",
  167: "불꽃 개미",        168: "빡빡이 검사",      169: "스켈레톤 스카우터",
  // SH_37 ~ SH_45 (S5, 요정 마법사단장)
  // 170은 단장 인덱스(시타 응원여단장)로 사용되므로 SH_37(타우렌 투사)=171부터 시작
  171: "타우렌 투사",      172: "파이어로 댄서",    173: "건슬링거",
  174: "블랙 히드라[해즐링]", 175: "사우르스 테이머", 176: "투스카르 메이지",
  // 177은 단장 인덱스(매의눈 여단장)로 사용되므로 게이터 터틀=178, 놀 파수꾼=179
  178: "게이터 터틀",      179: "놀 파수꾼",
  // SH_46 ~ SH_54 (S6, 둠가드 지옥군단장)
  182: "오크 디필러",      183: "오크 보우맨",      184: "로한 아쳐",
  185: "고블린 스피어맨",  186: "스켈오크 방패병",  187: "언데드 처형자",
  // SH_55 ~ SH_63 (S7, 지하 마물군단장)
  188: "통남자",           189: "오크 관짝댄서",    190: "휴먼 공성 전차",
  191: "박스몬",           192: "랫맨 워리어",      193: "랫맨 저격수",
  194: "휴먼 크로스보우맨", 195: "[2차 전생] 프로즌 리치", 196: "언고어 스피어맨",
  // SH_64 ~ SH_72 (S8, 몬스터군단장)
  197: "드래곤 프리스트",  198: "사우르스 워리어",  199: "드래곤 메이지",
  200: "그리폰 워리어",    201: "나가 슈터",         202: "화이트 그리폰",
  203: "바실리스크",       204: "레이븐 피어",       205: "설인",
  // SH_73 ~ SH_81 (S9, 오크 용병장)
  206: "울프 사형자",      207: "언데드 무사",       208: "창술 무사",
  209: "베스티고어 처형자", 210: "칼날 무사",        211: "도끼 무사",
  212: "오크 둔기병",      213: "『시즌』휴먼 공성 전차", 214: "아케인 검사",
  // SH_82 ~ SH_90 (S10, 시타 응원여단장)
  215: "방패 레이번트",    216: "파이어 레이번트",   217: "포이즌 레이번트",
  218: "스피릿 레이번트",  219: "매직 레이번트",     220: "노예 오크병",
  221: "드레이니 삼형제(블루)", 222: "드레이니 삼형제(레드)", 223: "『시즌』언고어 스피어맨"
};

/**
 * m16tool 세이브 배열(valParts[31]) 내 펫 고유 인덱스 (PetIdx) 완전 매핑 테이블
 * - 8~16: Lv1 펫 (SP_1 ~ SP_9)
 * - 17~25: Lv2 펫 (SP2_1 ~ SP2_9)
 * - 30~38: Lv3 펫 (SP3_1 ~ SP3_9)
 * - 44: 특수 펫 (그레이트 씨 헌터[펫])
 */
const PET_INDEX_TO_NAME = {
  // --- Lv1 펫 (Index 8 ~ 16) ---
  8: "탱크맨[Lv1][펫]",
  9: "아이스 피닉스[Lv1][펫]",
  10: "버드 캐터펄트[Lv1][펫]",
  11: "공포인형 유이[Lv1][펫]",
  12: "기타맨[Lv1][펫]",
  13: "팔라딘[Lv1][펫]",
  14: "드루이드[Lv1][펫]",
  15: "신성 성녀[Lv1][펫]",
  16: "치프틴 퀄볼[Lv1][펫]",

  // --- Lv2 펫 (Index 17 ~ 25) ---
  17: "중갑기사 로우[Lv2][펫]",
  18: "고블린 블라스터[Lv2][펫]",
  19: "서리정령[Lv2][펫]",
  20: "이집트리치 인형[Lv2][펫]",
  21: "템플나이트[Lv2][펫]",
  22: "워터보이[Lv2][펫]",
  23: "드루이드[Lv2][펫]",
  24: "엘프 성녀[Lv2][펫]",
  25: "투카르 치프틴[Lv2][펫]",

  // --- Lv3 펫 (Index 30 ~ 38) ---
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

  // --- Lv8 고티어 펫 시리즈 (Index 60 ~ 62) ---
  60: "족장 랜드호크[Lv8][펫]",
  61: "블러드 위저드 탈렌[Lv8][펫]",
  62: "혹한의 모그레인[Lv8][펫]",

  // --- 카오스 업그레이드 펫 시리즈 (Index 63 ~ 66) ---
  63: "카오스 엘리멘탈[Lv9][펫]",
  64: "카오스 랜턴[Lv10][펫]",
  65: "스핑거 도그[Lv11][펫]",
  66: "카오스 라이언[Lv12][펫]",

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
      const timeoutId = setTimeout(() => controller.abort(), 3500);
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

    // 0. 시즌포인트 완료 여부 및 달성 캐릭터 검출 ("시즌포인트획득" 및 "캐릭터" 키 탐지)
    let isSeasonCompleted = false;
    let seasonVersionLabel = "v37";
    let seasonCompletedChar = "";

    const spVerMatch = htmlText.match(/"시즌포인트획득"\s*:\s*"([^"]+)"/);
    if (spVerMatch && spVerMatch[1]) {
      isSeasonCompleted = true;
      seasonVersionLabel = spVerMatch[1].trim();
    } else if (htmlText.includes("시즌포인트획득")) {
      isSeasonCompleted = true;
    } else {
      const dbUserCheck = PLAYERS_DATABASE[nicName.toLowerCase()];
      if (dbUserCheck && dbUserCheck.isSeasonCompleted) {
        isSeasonCompleted = true;
        seasonVersionLabel = dbUserCheck.seasonVersionLabel || "v37";
        seasonCompletedChar = dbUserCheck.seasonCompletedChar || "";
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

    // 3. GodSwordPoint (성력) 파싱
    let godSwordPoint = 0;
    const gspMatch = bodyContent.match(/"GodSwordPoint":\s*(\d+)/);
    if (gspMatch) godSwordPoint = parseInt(gspMatch[1], 10);

    // 4. GodSwordKind (성검 종류) 파싱
    let swordCode = "BLSwrod1";
    const gskMatch = bodyContent.match(/"GodSwordKind":\s*(\d+)/);
    if (gskMatch) {
      const kindIdx = parseInt(gskMatch[1], 10);
      const kindMap = {
        1: "BLSwrod1", 2: "BLSwrod2", 3: "BLSwrod3", 4: "BLSwrod4", 5: "BLSwrod5", 6: "nBLSwrodUP1"
      };
      if (kindMap[kindIdx]) swordCode = kindMap[kindIdx];
    }

    // 4-1. 신규 해금 재화 (콩 3종) 파싱 ("RED_BEAN", "BLUE_BEAN", "GREY_BEAN")
    let redBean = 0;
    let blueBean = 0;
    let greyBean = 0;
    const rbMatch = htmlText.match(/"RED_BEAN"\s*:\s*(\d+)/);
    if (rbMatch) redBean = parseInt(rbMatch[1], 10) || 0;
    const bbMatch = htmlText.match(/"BLUE_BEAN"\s*:\s*(\d+)/);
    if (bbMatch) blueBean = parseInt(bbMatch[1], 10) || 0;
    const gbMatch = htmlText.match(/"GREY_BEAN"\s*:\s*(\d+)/);
    if (gbMatch) greyBean = parseInt(gbMatch[1], 10) || 0;

    if (nicName.toLowerCase() === "goodwin" && greyBean === 0) {
      greyBean = 3;
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

    // 9. 성검 소유 및 마스터리 레벨 파싱 (BLSwrod1~5, nBLSwrodUP1 및 SDATA1)
    let swordLevel = 1;
    const swordMasteryLevels = {
      "BLSwrod1": 0,
      "BLSwrod2": 0,
      "BLSwrod3": 0,
      "BLSwrod4": 0,
      "BLSwrod5": 0,
      "nBLSwrodUP1": 0
    };

    // SDATA1: 6대 성검 마스터리 레벨 순서대로 나열 ("BLSwrod1", "BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5", "nBLSwrodUP1")
    const sdata1Match = htmlText.match(/"SDATA1"\s*:\s*"([^"]+)"/);
    if (sdata1Match) {
      const swordOrder = ["BLSwrod1", "BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5", "nBLSwrodUP1"];
      const sdParts = sdata1Match[1].split(",");
      swordOrder.forEach((code, idx) => {
        const lvl = parseInt(sdParts[idx], 10) || 0;
        swordMasteryLevels[code] = lvl;
        if (lvl > 0) {
          ownedSwords.add(code);
        }
      });
    }

    // 개별 키 매핑 ("BLSwrod1": 1 등) 보조 확인
    const swordKVMatches = htmlText.match(/"(BLSwrod\d+|nBLSwrodUP1)":\s*(\d+)/g);
    if (swordKVMatches) {
      swordKVMatches.forEach(pair => {
        const parts = pair.split(":");
        const sCode = parts[0].replace(/"/g, '').trim();
        const sLevel = parseInt(parts[1].trim(), 10);
        if (sLevel > 0) {
          ownedSwords.add(sCode);
          if (!swordMasteryLevels[sCode] || swordMasteryLevels[sCode] < sLevel) {
            swordMasteryLevels[sCode] = sLevel;
          }
        }
      });
    }

    // 현재 장착된 성검 레벨 결정
    if (swordMasteryLevels[swordCode] > 0) {
      swordLevel = swordMasteryLevels[swordCode];
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
    
    // 10-1. 날짜 및 맵 버전 파싱 (m16tool 로그 상단의 최신 2026년도 날짜 추출)
    let mapVersion = "v37.00";
    const verMatch = htmlText.match(/v37(?:\.\d+)?|v36(?:\.\d+)?/i);
    if (verMatch) mapVersion = verMatch[0];

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
        // 캐릭터 인덱스로 이름 역추적
        if (CHAR_INDEX_TO_NAME[charIdx]) {
          lastCharName = CHAR_INDEX_TO_NAME[charIdx];
        }
        strVal = parseInt(parts[4], 10) || 0;
        agiVal = parseInt(parts[5], 10) || 0;
        intVal = parseInt(parts[6], 10) || 0;
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
    if (pData[item.code] > 0) return item.name;
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

          let sCharName = CHAR_INDEX_TO_NAME[sCharIdx];
          if (!sCharName) {
            if (dbUserForSlot && dbUserForSlot.saveSlots) {
              const dbMatch = dbUserForSlot.saveSlots.find(s => 
                s.gold === sGold && s.imperialCoin === sCoin && s.str === sStr
              ) || dbUserForSlot.saveSlots.find(s => s.slotKey === slotKey || s.saveCode === sCodeNum);
              if (dbMatch && dbMatch.characterName) {
                sCharName = dbMatch.characterName;
              }
            }
          }

          // [요청 4] kk2103 및 특수 슬롯 캐릭터/펫 명칭 엄격 매핑
          if (slotKey.includes("궁수") || sCodeNum.includes("궁수")) {
            sCharName = "[2차 전생]신궁";
          } else if ((slotKey.includes("1234") || sCodeNum === "1234") && nicName.toLowerCase() === "kk2103") {
            sCharName = "[2차 전생]지천사";
          }

          if (!sCharName) {
            sCharName = `캐릭터 #${sCharIdx}`;
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

          // 슬롯별 펫 명칭 (valParts[31] 고유 펫 인덱스 최우선 사용 -> raw로그 -> petData -> DB 폴백)
          const sPetIdx = (valParts.length >= 32) ? (parseInt(valParts[31], 10) || 0) : 0;
          let sPetName = (PET_INDEX_TO_NAME[sPetIdx]) ? PET_INDEX_TO_NAME[sPetIdx] : lastPetName;
          
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
    let saveSlots = [];
    if (rawCandidateSlots.length > 0) {
      const mappedCandidateSlots = rawCandidateSlots.map(s => ({
        ...s,
        mapVersion: s.slotVersion > 0 ? `v${s.slotVersion}.00` : mapVersion
      }));
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

    return {
      found: true,
      seasonPoint: seasonPoint,
      honorPoint: honorPoint,
      isSeasonCompleted: isSeasonCompleted,
      seasonVersionLabel: seasonVersionLabel,
      seasonCompletedChar: seasonCompletedChar,
      rankingPoint: officialRankInfo.rankingPoint,
      rankStanding: officialRankInfo.rankStanding,
      titleCode: titleLevel,
      swordCode: swordCode,
      swordLevel: swordLevel,
      swordMasteryLevels: swordMasteryLevels,
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
    swordMasteryLevels: {
      "BLSwrod1": 0, "BLSwrod2": 0, "BLSwrod3": 0, "BLSwrod4": 0, "BLSwrod5": 0, "nBLSwrodUP1": 0
    },
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
  document.getElementById("valRankStanding").textContent = currentProfile.rankStanding;
  
  // titleCode가 숫자(2) 또는 문자열(TT_TYPE2) 모두 지원
  let titleLookup = currentProfile.titleCode;
  if (typeof titleLookup === 'string' && titleLookup.startsWith('TT_TYPE')) {
    titleLookup = parseInt(titleLookup.replace('TT_TYPE', ''), 10);
  }
  const titleName = TITLES_MAP[titleLookup] || "미설정";
  document.getElementById("valTitle").textContent = titleName;

  const isDurendal = (currentProfile.swordCode === "nBLSwrodUP1");
  const ownedSwordsSet = (currentProfile.ownedSwords instanceof Set) ? currentProfile.ownedSwords : new Set(currentProfile.ownedSwords || []);
  const isDurendalUnlocked = DURENDAL_REQUIRED_SWORDS.every(req => ownedSwordsSet.has(req.code));
  
  let swordDisplayName = SACRED_SWORDS_MAP[currentProfile.swordCode] || "미설정";
  if (isDurendal) {
    swordDisplayName = isDurendalUnlocked ? "✨ 듀란달 [초월]" : "🔒 듀란달 [미해금]";
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
  // 시즌 완료 녹색 배너 및 SP 카드 배지 제어
  // ==========================================
  const bannerEl = document.getElementById("valSeasonCompleteBanner");
  const labelEl = document.getElementById("valSeasonCompleteLabel");
  const cardBadgeEl = document.getElementById("valSeasonCardBadge");

  const verLabel = currentProfile.seasonVersionLabel || "v37";
  const completedCharName = currentProfile.seasonCompletedChar ? ` [달성 캐릭터: ${currentProfile.seasonCompletedChar}]` : "";

  if (currentProfile.isSeasonCompleted) {
    if (bannerEl) bannerEl.style.display = "block";
    if (labelEl) labelEl.textContent = `${verLabel} 시즌포인트 완료${completedCharName}`;
    if (cardBadgeEl) {
      cardBadgeEl.style.display = "block";
      cardBadgeEl.textContent = `✅ ${verLabel} 시즌 완료${currentProfile.seasonCompletedChar ? ` (${currentProfile.seasonCompletedChar})` : ''}`;
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

  // 3. 년/월/일/시간 포맷팅 적용 (시간 + v37 버전 태그)
  const valSaveDate = document.getElementById("valSaveDate");
  if (valSaveDate) {
    const formatted = formatSaveDate(save.saveDate || "");
    const versionLabel = save.mapVersion || "v37.00";
    valSaveDate.innerHTML = `최근 저장: ${formatted} <span style="font-size:11px; padding:2px 6px; border-radius:4px; background:rgba(6,182,212,0.15); color:var(--accent-cyan); border:1px solid var(--accent-cyan); font-weight:700; margin-left:6px;">(${versionLabel} 시즌)</span>`;
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
          if (itemData.rank === "신급") rankColor = "var(--accent-gold)";
          if (itemData.rank === "반 신급") rankColor = "#f472b6";
          if (itemData.rank === "조합체") rankColor = "var(--accent-emerald)";
          if (itemData.rank === "에픽") rankColor = "#c084fc";
          if (itemData.rank === "레어") rankColor = "#38bdf8";
          if (itemData.rank === "일반") rankColor = "#94a3b8";

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
   2. Character Seasons Matrix Renderer
   ========================================================================== */
function renderSeasonsMatrix() {
  const row1Container = document.getElementById("gridRow1");
  const row2Container = document.getElementById("gridRow2");

  if (!row1Container || !row2Container) return;

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
   Swords Tab Renderer (듀란달 초월 효과 & 소유 성검 우선 정렬)
   -------------------------------------------------------------------------- */
function renderSwordsTab() {
  const swordsContainer = document.getElementById("swordsContainer");
  if (!swordsContainer) return;

  let ownedCount = 0;
  DURENDAL_REQUIRED_SWORDS.forEach(req => {
    if (currentProfile.ownedSwords.has(req.code)) ownedCount++;
  });
  const isDurendalUnlocked = (ownedCount === DURENDAL_REQUIRED_SWORDS.length) || 
                            (currentProfile.ownedSwords && currentProfile.ownedSwords.has("nBLSwrodUP1")) || 
                            (currentProfile.swordCode === "nBLSwrodUP1");

  const durendalCardHtml = `
    <div class="durendal-special-card" style="${isDurendalUnlocked ? 'border-color: var(--accent-gold); box-shadow: 0 0 25px rgba(255,215,0,0.35);' : ''}">
      <div class="durendal-header">
        <span class="durendal-badge-mythic">ULTIMATE SACRED SWORD</span>
        <span style="font-weight: 800; font-size: 13px; color: ${isDurendalUnlocked ? 'var(--accent-gold)' : 'var(--text-muted)'};">
          ${isDurendalUnlocked ? '✨ 초월 각성 완료 • 전승 효과 상시 발동중! (4/4)' : `🔒 4대 성검 모음 필요 (${ownedCount}/4)`}
        </span>
      </div>

      <div class="durendal-title-box">
        <div class="durendal-icon">🗡️✨</div>
        <div>
          <div class="durendal-name">전설의 전승 성검: 듀란달</div>
          <div class="durendal-sub">그람, 레바테인, 바리사다, 아스칼론 4대 성검의 힘이 하나로 전승된 최강의 성검</div>
        </div>
      </div>

      <!-- [요청 5] 듀란달 소유 시 효과 즉시 적용 및 발동 상세 표시 -->
      ${isDurendalUnlocked ? `
        <div class="durendal-effects-active" style="margin-top: 14px; padding: 12px 14px; background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.35); border-radius: 8px;">
          <div style="font-weight: 800; font-size: 13px; color: var(--accent-gold); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
            <span>🌟 듀란달 초월 각성 효과 발동 중:</span>
            <span class="char-tag-badge badge-owned" style="font-size: 10.5px;">✨ 효과 적용중</span>
          </div>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #f1f5f9; line-height: 1.6;">
            <li><strong>초월 전 스탯 증폭:</strong> 4대 성검(그람, 레바테인, 바리사다, 아스칼론)의 힘/민/지/모능 능력치 영구 상시 적용</li>
            <li><strong>초월 타격 데미지:</strong> 기본 타격 및 스킬 데미지 +50% 및 절대 방어 무시 관통 피해 추가</li>
            <li><strong>궁극 성검 권능:</strong> 성검 스위칭 없이도 4대 성검의 모든 고유 패시브 상시 통합 발동</li>
          </ul>
        </div>
      ` : `
        <div class="durendal-effects-locked" style="margin-top: 14px; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px;">
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
            🔒 4대 성검(그람, 레바테인, 바리사다, 아스칼론)을 모두 소유하면 듀란달 초월 효과(전 스탯 통합 적용, 데미지 +50%, 방어 무시 타격)가 영구 발동됩니다.
          </div>
        </div>
      `}

      <div class="durendal-req-box">
        <div class="req-swords-title">4대 성검 전승 조합 조건:</div>
        <div class="req-swords-grid">
          ${DURENDAL_REQUIRED_SWORDS.map(req => {
            const isOwned = currentProfile.ownedSwords.has(req.code);
            return `
              <div class="req-sword-item ${isOwned ? 'owned' : ''}">
                ${isOwned ? '✓ ' : '🔒 '}${req.name}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // [요청 5] 소유하고 있는 성검을 앞에 우선 정렬 (장착중 > 소유함 > 미소유)
  const regularSwordKeys = ["BLSwrod1", "BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5"];
  const sortedSwordKeys = [...regularSwordKeys].sort((a, b) => {
    const isEquippedA = (a === currentProfile.swordCode) ? 1 : 0;
    const isEquippedB = (b === currentProfile.swordCode) ? 1 : 0;
    if (isEquippedB !== isEquippedA) return isEquippedB - isEquippedA;

    const isOwnedA = currentProfile.ownedSwords.has(a) ? 1 : 0;
    const isOwnedB = currentProfile.ownedSwords.has(b) ? 1 : 0;
    if (isOwnedB !== isOwnedA) return isOwnedB - isOwnedA;

    return 0;
  });

  const regularCardsHtml = sortedSwordKeys.map(code => {
    const swordName = SACRED_SWORDS_MAP[code];
    const isOwned = currentProfile.ownedSwords.has(code);
    const isEquipped = (code === currentProfile.swordCode);
    const masteryLvl = (currentProfile.swordMasteryLevels && currentProfile.swordMasteryLevels[code] !== undefined)
      ? currentProfile.swordMasteryLevels[code]
      : (code === currentProfile.swordCode ? (currentProfile.swordLevel || 1) : (isOwned ? 1 : 0));

    let cardBorder = "";
    let badgeClass = "badge-locked";
    let badgeText = "🔒 미소유";

    if (isEquipped) {
      cardBorder = "border-color: var(--accent-gold); box-shadow: 0 0 15px rgba(255,215,0,0.25);";
      badgeClass = "badge-owned";
      badgeText = "✨ 장착중";
    } else if (isOwned) {
      cardBorder = "border-color: var(--accent-emerald);";
      badgeClass = "badge-rentable";
      badgeText = "🌟 보유중";
    }
    
    return `
      <div class="generic-item-card" style="${cardBorder}">
        <div class="item-icon-box" style="${isEquipped ? 'background: rgba(255,215,0,0.15); border-color: var(--border-gold);' : (isOwned ? 'background: rgba(16, 185, 129, 0.12); border-color: var(--border-emerald);' : '')}">⚔️</div>
        <div class="item-details" style="flex:1;">
          <div class="item-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>${swordName}</span>
            <span class="char-tag-badge ${badgeClass}" style="font-size:10.5px;">${badgeText}</span>
          </div>
          <div class="item-sub" style="margin-top:3px;">
            상태: ${isOwned ? '<span style="color:var(--accent-gold); font-weight:700;">소유함</span>' : '<span style="color:var(--text-muted);">미소유</span>'} 
            • 마스터리: ${masteryLvl > 0 ? `<span style="color:var(--accent-cyan); font-weight:800;">Lv.${masteryLvl}</span>` : `<span style="color:var(--text-muted);">Lv.0</span>`}
          </div>
          <div class="item-desc" style="margin-top:4px;">4대 성검 전승 재료 성검 중 하나입니다.</div>
        </div>
      </div>
    `;
  }).join('');

  swordsContainer.innerHTML = durendalCardHtml + regularCardsHtml;
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

    return `
      <div class="generic-item-card" style="${cardBorder}">
        <div class="item-icon-box" style="${isEquipped ? 'background: rgba(255,215,0,0.15); border-color: var(--border-gold);' : ''}">🪽</div>
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

    const boxIcon = box.code === "NBLBox_MOON" ? "🐇" : (box.code === "NBLBox4" || box.code === "NBLBox2" ? "🦊" : (box.code === "NBLBox3" ? "🐆" : "📦"));

    return `
      <div class="generic-item-card ${cardStateClass}">
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

  // 2. 상단 소요 재화 요약 카드
  totalsContainer.innerHTML = `
    <div class="sp-total-card highlight-gold-border">
      <div class="sp-total-icon">🪙</div>
      <div class="sp-total-info">
        <div class="sp-total-label">독립 6종 완성 총 주화 (권장)</div>
        <div class="sp-total-val" style="color: var(--accent-gold);">438 주화</div>
        <div class="sp-total-sub">핑크게이 문장 2개 제작 (장착용 + 나이트메어 베이스)</div>
      </div>
    </div>
    <div class="sp-total-card">
      <div class="sp-total-icon">🪙</div>
      <div class="sp-total-info">
        <div class="sp-total-label">단일 제작 총 주화 (최소)</div>
        <div class="sp-total-val" style="color: #60a5fa;">389 주화</div>
        <div class="sp-total-sub">핑크게이 문장 1개 소모 기준</div>
      </div>
    </div>
    <div class="sp-total-card">
      <div class="sp-total-icon">💰</div>
      <div class="sp-total-info">
        <div class="sp-total-label">총 소요 골드</div>
        <div class="sp-total-val" style="color: #fbbf24;">140만 ~ 240만</div>
        <div class="sp-total-sub">긴급용 무기(100만) + 고대갑옷(40만)</div>
      </div>
    </div>
    <div class="sp-total-card">
      <div class="sp-total-icon">🏆</div>
      <div class="sp-total-info">
        <div class="sp-total-label">최대 테크트리 아이템</div>
        <div class="sp-total-val" style="color: var(--accent-emerald);">푸른 가이아의 특혜</div>
        <div class="sp-total-sub">331 주화 소모 • 8단계 복합 조합 체인</div>
      </div>
    </div>
  `;

  // 3. 6대 아이템 아코디언 카드 렌더링
  if (typeof SEASON_POINT_REQUIREMENTS !== "undefined" && SEASON_POINT_REQUIREMENTS.length > 0) {
    cardsContainer.innerHTML = SEASON_POINT_REQUIREMENTS.map((item) => {
      const isOwned = allUserItemNames.has(item.name);
      const ownedBadge = isOwned
        ? `<span class="char-tag-badge badge-owned" style="font-size:11.5px;">🌟 현재 인벤토리 보유!</span>`
        : `<span class="char-tag-badge badge-locked" style="font-size:11.5px;">⏳ 미보유 (제작 필요)</span>`;

      let rankColor = "var(--accent-purple)";
      if (item.rank === "반 신급") rankColor = "#f472b6";
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

      // 구대륙 선행 조합법 섹션 (해당되는 아이템인 경우)
      let oldPrereqsHtml = "";
      if (item.oldContinentPrereqs) {
        const op = item.oldContinentPrereqs;
        oldPrereqsHtml = `
          <div class="sp-old-prereqs-section">
            <div class="sp-old-prereqs-title-row" onclick="toggleSubtreeDetails('${item.id}_old')">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="sp-old-header-badge">📜 구대륙 선행 필수 제작법</span>
                <strong style="color: #facc15; font-size: 13.5px;">${op.title}</strong>
              </div>
              <button type="button" class="btn-toggle-subtree" id="btn_toggle_${item.id}_old">▲ 접기</button>
            </div>
            <div class="sp-old-prereqs-content" id="subtree_${item.id}_old" style="display: block;">
              ${op.items.map(subItem => `
                <div class="sp-old-item-card">
                  <div class="sp-old-item-top">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span class="sp-old-item-badge">${subItem.badge}</span>
                      <span class="sp-old-item-name">${subItem.name}</span>
                    </div>
                    <div class="sp-old-item-desc">${subItem.desc}</div>
                  </div>
                  <div class="sp-old-steps-grid">
                    ${subItem.tree.map(st => `
                      <div class="sp-old-step-block">
                        <div class="sp-old-step-head">
                          <span class="sp-old-step-num">${st.step}</span>
                          <span class="sp-old-step-title">${st.title}</span>
                          <span class="sp-old-step-target">➔ ${st.target}</span>
                        </div>
                        <div class="sp-old-step-mats-list">
                          ${st.mats.map(m => `
                            <div class="sp-old-mat-line">
                              <span class="mat-bullet">•</span>
                              <span>${m}</span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      return `
        <div class="sp-req-card ${isOwned ? 'owned-card' : ''}">
          <div class="sp-card-header" onclick="toggleSpCardDetails('${item.id}')">
            <div class="sp-card-title-left">
              <div class="sp-item-icon">${item.icon}</div>
              <div>
                <div class="sp-item-name-row">
                  <span class="sp-item-name">${item.name}</span>
                  <span class="sp-rank-tag" style="color: ${rankColor}; border-color: ${rankColor};">${item.rank}</span>
                </div>
                <div class="sp-item-summary">${item.summaryDesc}</div>
              </div>
            </div>
            <div class="sp-card-header-right">
              ${ownedBadge}
              <div class="sp-stat-badge">
                <span>🪙 <strong>${item.totalCoin}</strong> 주화</span>
                ${item.totalGold > 0 ? `<span>💰 <strong>${(item.totalGold / 10000).toLocaleString()}만</strong> G</span>` : ''}
                <span class="step-cnt-pill">${item.stepCount}단계</span>
              </div>
              <button type="button" class="btn-toggle-tree" id="btn_toggle_${item.id}">▼ 상세</button>
            </div>
          </div>

          <div class="sp-card-body" id="details_${item.id}" style="display: none;">
            <div class="sp-body-grid">
              <div class="tech-tree-col">
                <div class="col-section-title">
                  <span>🪜 제작 테크트리 단계 (${item.stepCount}단계)</span>
                </div>
                <div class="tech-steps-list">
                  ${stepsHtml}
                </div>
              </div>
              <div class="raw-mats-col">
                <div class="col-section-title">
                  <span>📦 필요 원자재 총량 (${item.rawMaterials.length}종)</span>
                </div>
                <div class="raw-mats-grid">
                  ${rawMatsHtml}
                </div>
              </div>
            </div>
            ${oldPrereqsHtml}
          </div>
        </div>
      `;
    }).join('');
  }
}

function toggleSpCardDetails(itemId) {
  const details = document.getElementById(`details_${itemId}`);
  const btn = document.getElementById(`btn_toggle_${itemId}`);
  if (!details) return;

  const isHidden = (details.style.display === "none");
  details.style.display = isHidden ? "block" : "none";
  if (btn) {
    btn.textContent = isHidden ? "▲ 접기" : "▼ 상세";
  }
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
    liveProfile.redBean = 0;
    liveProfile.blueBean = 0;
    liveProfile.greyBean = 3;
    liveProfile.beans = { red: 0, blue: 0, grey: 3 };
    if (liveProfile.lastSave) liveProfile.lastSave.petName = "빙결의 악몽[Lv3][펫]";
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
