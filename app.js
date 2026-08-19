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

document.addEventListener("DOMContentLoaded", () => {
  initSearch();
  initSimulator();
  initTabs();
  
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
function initSearch() {
  const searchInput = document.getElementById("searchInput");
  const btnSearch = document.getElementById("btnSearch");
  const chkSaveId = document.getElementById("chkSaveId");

  if (btnSearch) {
    btnSearch.addEventListener("click", () => {
      const query = searchInput.value.trim();
      if (query) {
        handleSaveIdState(query);
        loadProfile(query);
      } else {
        showApiNotice("아이디를 입력한 후 조회해 주세요.", false, 3000);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const query = searchInput.value.trim();
        if (query) {
          handleSaveIdState(query);
          loadProfile(query);
        } else {
          showApiNotice("아이디를 입력한 후 조회해 주세요.", false, 3000);
        }
      }
    });
  }

  if (chkSaveId) {
    chkSaveId.addEventListener("change", () => {
      const query = searchInput.value.trim();
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
 * m16tool.xyz 실시간 연동 및 프로필 데이터 바인딩
 */
async function loadProfile(userId) {
  if (!userId || !userId.trim()) {
    showApiNotice("아이디를 입력한 후 조회해 주세요.", false, 3000);
    return;
  }

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

    currentProfile = {
      ...dbProfile,
      userId: cleanId,
      ownedSwords: new Set(dbProfile.ownedSwords || []),
      warehouseData: { ...dbProfile.warehouseData },
      petData: { ...dbProfile.petData },
      ownedCodes: new Set(dbProfile.ownedCodes || []),
      saveSlots: (dbProfile.saveSlots && dbProfile.saveSlots.length > 0) ? dbProfile.saveSlots : [safeLastSave],
      selectedSlotIndex: 0,
      lastSave: { ...safeLastSave }
    };

    try { updateProfileStatsUI(); } catch (e) {}
    try { renderSeasonsMatrix(); } catch (e) {}
    try { renderOtherTabsData(); } catch (e) {}
    showApiNotice(`'${cleanId}' 유저 로그를 조회 중입니다...`);
  } else {
    showApiNotice(`'${cleanId}' m16tool 유저 로그를 라이브 조회 중입니다...`);
  }

  // 2단계: 백그라운드 라이브 연동 (m16tool 라이브 파싱)
  try {
    const m16Data = await fetchM16ToolUserLog(cleanId);

    if (m16Data && m16Data.found) {
      const safeLastSave = m16Data.lastSave || {
        saveDate: "기록 없음",
        characterName: "조회 정보 없음",
        characterLevel: 0,
        petName: "없음",
        gold: 0, imperialCoin: 0, darkStone: 0,
        str: 0, agi: 0, int: 0,
        heroItems: [], petItems: [], warehouseItems: []
      };

      currentProfile = {
        userId: cleanId,
        seasonPoint: (m16Data.seasonPoint !== undefined) ? m16Data.seasonPoint : (currentProfile.seasonPoint || 0),
        honorPoint: (m16Data.honorPoint !== undefined) ? m16Data.honorPoint : (currentProfile.honorPoint || 0),
        isSeasonCompleted: (m16Data.isSeasonCompleted !== undefined) ? m16Data.isSeasonCompleted : currentProfile.isSeasonCompleted,
        seasonVersionLabel: m16Data.seasonVersionLabel || currentProfile.seasonVersionLabel || "v36",
        rankingPoint: (m16Data.rankingPoint !== undefined && m16Data.rankingPoint > 0) ? m16Data.rankingPoint : (currentProfile.rankingPoint || 0),
        rankStanding: m16Data.rankStanding || currentProfile.rankStanding || "일반 유저",
        titleCode: m16Data.titleCode || currentProfile.titleCode || "TT_TYPE1",
        swordCode: m16Data.swordCode || currentProfile.swordCode || "BLSwrod0",
        swordLevel: m16Data.swordLevel || currentProfile.swordLevel || 1,
        ownedSwords: new Set([...(currentProfile.ownedSwords || []), ...(m16Data.ownedSwords || [])]),
        wingId: m16Data.wingId || currentProfile.wingId || 1,
        wingLevel: m16Data.wingLevel || currentProfile.wingLevel || 1,
        warehouseData: { ...currentProfile.warehouseData, ...m16Data.warehouseData },
        sacredPower: m16Data.sacredPower || currentProfile.sacredPower || "0",
        petData: { ...currentProfile.petData, ...m16Data.petData },
        ownedCodes: new Set([...(currentProfile.ownedCodes || []), ...(m16Data.ownedCodes || [])]),
        saveSlots: (m16Data.saveSlots && m16Data.saveSlots.length > 0) ? m16Data.saveSlots : (currentProfile.saveSlots || [safeLastSave]),
        selectedSlotIndex: 0,
        lastSave: { ...safeLastSave }
      };

      try { updateProfileStatsUI(); } catch (e) {}
      try { renderSeasonsMatrix(); } catch (e) {}
      try { renderOtherTabsData(); } catch (e) {}
      showApiNotice(`[OK] '${cleanId}' m16tool 최신 동적 로그 갱신 성공! (슬롯 ${currentProfile.saveSlots.length}개 탐지)`, false, 4000);
    } else if (!dbProfile) {
      currentProfile = createEmptyProfile(cleanId);
      try { updateProfileStatsUI(); } catch (e) {}
      try { renderSeasonsMatrix(); } catch (e) {}
      try { renderOtherTabsData(); } catch (e) {}
      showApiNotice(`'${cleanId}' 유저의 m16tool 검색 결과가 없습니다. 아이디를 확인해 주세요.`, false, 5000);
    } else {
      showApiNotice(`[OK] '${cleanId}' 프로필 데이터 조회가 완료되었습니다.`, false, 3000);
    }
  } catch (err) {
    console.warn("m16tool Fetch Warning:", err);
    if (!dbProfile) {
      currentProfile = createEmptyProfile(cleanId);
      try { updateProfileStatsUI(); } catch (e) {}
      try { renderSeasonsMatrix(); } catch (e) {}
      try { renderOtherTabsData(); } catch (e) {}
      showApiNotice(`'${cleanId}' 유저 조회 중 통신 지연이 발생했습니다.`, false, 4000);
    }
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

  // 개구리 펫 지원
  "SP_FROG": "백스플 개구리[펫]",
  "백스플 개구리[펫]": "백스플 개구리[펫]"
};

/**
 * 펫 계열별 숫자에 따른 펫 코드 매핑 매트릭스 (1~9 계열, 2~9 레벨)
 */
const SP2_SERIES_MATRIX = {
  1: {
    2: { code: "SP2_1", name: "중갑기사 로우" },
    3: { code: "SP3_1", name: "데몬기사 조던" },
    4: { code: "SP4_1", name: "대검기사 해곤" },
    5: { code: "SP3_1U", name: "해골기사 조트" },
    6: { code: "SP3_1U2", name: "사령기사 루인" },
    7: { code: "SP3_1U3", name: "대군주 바로크" },
    8: { code: "SP3_1U4", name: "족장 랜드호크" },
    9: { code: "SP_RGUP1", name: "카오스 엘리멘탈" }
  },
  2: {
    2: { code: "SP2_2", name: "고블린 블라스터" },
    3: { code: "SP3_2", name: "대형 대포" },
    4: { code: "SP4_2", name: "맘 투석기" },
    5: { code: "SP3_2U", name: "옥크로 투석기" },
    6: { code: "SP3_2U2", name: "블러드 엘프 마법기" },
    7: { code: "SP3_2U3", name: "블러드 엘프 마법병기" },
    8: { code: "SP3_2U4", name: "블러드 위저드 탈렌" },
    9: { code: "SP_RGUP2", name: "카오스 랜턴" }
  },
  3: {
    2: { code: "SP2_3", name: "서리정령" },
    3: { code: "SP3_3", name: "빙결의 악몽" },
    4: { code: "SP4_3", name: "빙결의 군주" },
    5: { code: "SP3_3U", name: "빙결의 여군주" },
    6: { code: "SP3_3U2", name: "서리군주 베인" },
    7: { code: "SP3_3U3", name: "마인드 마스터" },
    8: { code: "SP3_3U4", name: "혹한의 모그레인" },
    9: { code: "SP_RGUP3", name: "스핑거 도그" }
  },
  4: {
    2: { code: "SP2_4", name: "이집트리치 인형" },
    3: { code: "SP3_4", name: "리퍼 인형" },
    4: { code: "SP4_4", name: "밴쉬 인형" }
  },
  5: {
    2: { code: "SP2_5", name: "템플나이트" },
    3: { code: "SP3_5", name: "드라군나이트" },
    4: { code: "SP4_5", name: "스완 나이트" }
  },
  6: {
    2: { code: "SP2_6", name: "워터보이" },
    3: { code: "SP3_6", name: "리틀보이" },
    4: { code: "SP4_6", name: "엘프보이" }
  },
  7: {
    2: { code: "SP2_7", name: "드루이드Lv2" },
    3: { code: "SP3_7", name: "드루이드" },
    4: { code: "SP4_7", name: "드워프 드루이드" }
  },
  8: {
    2: { code: "SP2_8", name: "엘프 성녀" },
    3: { code: "SP3_8", name: "하이엘프 성녀" },
    4: { code: "SP4_8", name: "고위 성녀" }
  },
  9: {
    2: { code: "SP2_9", name: "투카르 치프틴" },
    3: { code: "SP3_9", name: "사티로스 마스터" },
    4: { code: "SP4_9", name: "밴디트 마스터" }
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

  // 2. 계열 1~9 누적 소유 체크
  for (let k = 1; k <= 9; k++) {
    const mainCode = `SP2_${k}`;
    const mainLevel = pData[mainCode] || 0;
    if (mainLevel > 0) {
      for (let lvl = 2; lvl <= mainLevel; lvl++) {
        const item = SP2_SERIES_MATRIX[k]?.[lvl];
        if (item && item.code === petCode) {
          return { owned: true, level: mainLevel };
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
  194: "휴먼 크로스보우맨", 195: "휴먼 마법사",     196: "언고어 스피어맨",
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
  221: "드레이니 삼형제(블루)", 222: "드레이니 삼형제(레드)", 223: "드레이니 삼형제(퍼플)"
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
  38: "사티로스 마스터[Lv3][펫]",

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

  // --- 특수 펫 ---
  44: "그레이트 씨 헌터[펫]"
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

/**
 * m16tool.xyz RPGDetail Real-time Fetcher & Key-Value Level Parser
 * 각 유저별 독립된 동적 데이터 파싱
 */
async function fetchM16ToolUserLog(nicName) {
  const targetUrl = `https://m16tool.xyz/Game/DSR/UserLog/RPGDetail?nicName=${encodeURIComponent(nicName)}&character=info1`;
  const proxyList = [
    `/api/m16log?nicName=${encodeURIComponent(nicName)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    targetUrl
  ];

  let htmlText = null;

  for (const proxyUrl of proxyList) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(proxyUrl, { 
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const txt = await res.text();
        if (txt && txt.length > 300 && !txt.includes("해당 유저의 검색된 사항이 없습니다") && !txt.includes("검색 결과가 없습니다")) {
          htmlText = txt;
          break;
        }
      }
    } catch (e) {
      console.warn(`Proxy fetch timeout/error for ${proxyUrl}`);
    }
  }

  if (!htmlText) return null;

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

    // 0. 시즌포인트 완료 여부 검출 ("시즌포인트획득" 키 탐지)
    let isSeasonCompleted = false;
    let seasonVersionLabel = "v36";

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
        seasonVersionLabel = dbUserCheck.seasonVersionLabel || "v36";
      }
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

    // 5. 칭호 파싱 - "TT_TYPE1": N 에서 N값이 칭호 레벨 (1=브론즈, 2=실버, ...)
    let titleLevel = 1;
    const ttMatch = bodyContent.match(/"TT_TYPE1"\s*:\s*(\d+)/);
    if (ttMatch) {
      titleLevel = parseInt(ttMatch[1], 10) || 1;
    }

    // 6. SH_ 캐릭터 코드 파싱 ("SH_1": 1 과 같이 값이 1 이상인 소유 캐릭터만 파싱!)
    const shKVMatches = bodyContent.match(/"SH_(\d+)":\s*([1-9]\d*)/g);
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

    // 7. SP_ / SP2_ / SP3_ / SP_RGUP / SP_LBOX 펫 코드 파싱 (코드 패턴 확장)
    const petKVMatches = htmlText.match(/"(SP_\d+|SP2_\d+|SP3_\d+\w*|SP4_\d+|SP5_\d+|SP_RGUP\d+|SP_LBOX\d+)":\s*([1-9]\d*)/g);
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

    // 8. 창고 코드 파싱
    const boxKVMatches = bodyContent.match(/"(BLBox\d+|NBLBox\d+|NBLBox_UP\d+)":\s*([1-9]\d*)/g);
    if (boxKVMatches) {
      boxKVMatches.forEach(pair => {
        const parts = pair.split(":");
        const bCode = parts[0].replace(/"/g, '').trim();
        const bLevel = parseInt(parts[1].trim(), 10);
        if (bLevel > 0) {
          warehouseData[bCode] = bLevel;
        }
      });
    }

    // 9. 성검 소유 코드 파싱
    let swordLevel = 1;
    const swordKVMatches = bodyContent.match(/"(BLSwrod\d+|nBLSwrodUP1)":\s*([1-9]\d*)/g);
    if (swordKVMatches) {
      swordKVMatches.forEach(pair => {
        const parts = pair.split(":");
        const sCode = parts[0].replace(/"/g, '').trim();
        const sLevel = parseInt(parts[1].trim(), 10);
        if (sLevel > 0) {
          ownedSwords.add(sCode);
          if (sCode === swordCode) {
            swordLevel = sLevel;
          }
        }
      });
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
    let mapVersion = "v36.00";
    const verMatch = htmlText.match(/v36(?:\.\d+)?/i);
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

  // 1. SP2_1 ~ SP2_9 코드의 값(1, 2, 3...)에 따른 펫 계산
  const sp2Matrix = {
    1: { 1: "중갑기사 로우[Lv2][펫]", 2: "데몬기사 조던[Lv3][펫]", 3: "대검기사 해곤[Lv4][펫]" },
    2: { 1: "고블린 블라스터[Lv2][펫]", 2: "대형 대포[Lv3][펫]", 3: "맘 투석기[Lv4][펫]" },
    3: { 1: "서리정령[Lv2][펫]", 2: "빙결의 악몽[Lv3][펫]", 3: "빙결의 군주[Lv4][펫]" },
    4: { 1: "이집트리치 인형[Lv2][펫]", 2: "리퍼 인형[Lv3][펫]", 3: "밴쉬 인형[Lv4][펫]" },
    5: { 1: "템플나이트[Lv2][펫]", 2: "드라군나이트[Lv3][펫]", 3: "스완 나이트[Lv4][펫]" },
    6: { 1: "워터보이[Lv2][펫]", 2: "리틀보이[Lv3][펫]", 3: "엘프보이[Lv4][펫]" },
    7: { 1: "드루이드[Lv2][펫]", 2: "드루이드[Lv3][펫]", 3: "드워프 드루이드[Lv4][펫]" },
    8: { 1: "엘프 성녀[Lv2][펫]", 2: "하이엘프 성녀[Lv3][펫]", 3: "고위 성녀[Lv4][펫]" },
    9: { 1: "투카르 치프틴[Lv2][펫]", 2: "사티로스 마스터[Lv3][펫]", 3: "밴디트 마스터[Lv4][펫]" }
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

  // 2. 단일 업그레이드 펫 코드 (SP_RGUP, SP3_1U 등)
  const specialMap = [
    { code: "SP_RGUP4", name: "카오스 라이언[Lv12][펫]" },
    { code: "SP_RGUP3", name: "스핑거 도그[Lv11][펫]" },
    { code: "SP_RGUP2", name: "카오스 랜턴[Lv10][펫]" },
    { code: "SP_RGUP1", name: "카오스 엘리멘탈[Lv9][펫]" },
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

    // 10-6. 다크스톤 (SDATA에서 확인)
    const sdataMatch = htmlText.match(/"SDATA1"\s*:\s*"([^"]+)"/);
    if (sdataMatch) {
      const sdParts = sdataMatch[1].split(",");
      if (sdParts[0]) darkStone = parseInt(sdParts[0], 10) || 0;
    }

    // 10-7. m16tool HTML 내 세이브 슬롯 탐지 (Code1_2_1, Code1_2_2 등 모든 슬롯)
    const saveSlots = [];
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
          
          let sCodeNum = slotKey.replace(/^Code1_\d+_/, "").replace(/^Code1_/, "").trim();

          const sGold = parseInt(valParts[0], 10) || 0;
          const sCoin = parseInt(valParts[1], 10) || 0;
          const sCharIdx = parseInt(valParts[2], 10) || 0;
          const sStr = parseInt(valParts[4], 10) || 0;
          const sAgi = parseInt(valParts[5], 10) || 0;
          const sInt = parseInt(valParts[6], 10) || 0;

          // 사전등록 DB(PLAYERS_DATABASE) 슬롯 매핑을 통해 원본 저장 이름/숫자 (젤리, 드래곤, 토, 01, 1 등) 100% 보존
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
            const dbUserForSlot = PLAYERS_DATABASE[nicName.toLowerCase()];
            if (dbUserForSlot && dbUserForSlot.saveSlots) {
              const dbMatch = dbUserForSlot.saveSlots.find(s => 
                s.gold === sGold && s.imperialCoin === sCoin && s.str === sStr
              ) || dbUserForSlot.saveSlots.find(s => s.slotKey === slotKey || s.saveCode === sCodeNum);
              if (dbMatch && dbMatch.characterName) {
                sCharName = dbMatch.characterName;
              }
            }
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

          saveSlots.push({
            slotKey: slotKey,
            saveCode: sCodeNum,
            mapVersion: mapVersion,
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

    // 기본 슬롯 보장
    if (saveSlots.length === 0) {
      saveSlots.push({
        slotKey: "Code1_2_1",
        saveCode: "1",
        characterName: lastCharName,
        characterLevel: lastCharLevel,
        petName: lastPetName,
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

    // 디버그 로그 (브라우저 콘솔에서 확인 가능)
    console.log(`[DSR Parser] userId=${nicName}, 탐지된 세이브 슬롯 ${saveSlots.length}개:`, saveSlots);

    const dbUserCheck = PLAYERS_DATABASE[nicName.toLowerCase()];
    const rPoints = (dbUserCheck && dbUserCheck.rankingPoint) ? dbUserCheck.rankingPoint : 0;
    const computedRank = calculateRankStanding(rPoints, honorPoint, dbUserCheck ? dbUserCheck.rankStanding : null);

    return {
      found: true,
      seasonPoint: seasonPoint,
      honorPoint: honorPoint,
      isSeasonCompleted: isSeasonCompleted,
      seasonVersionLabel: seasonVersionLabel,
      rankingPoint: rPoints,
      rankStanding: computedRank,
      titleCode: titleLevel,
      swordCode: swordCode,
      swordLevel: swordLevel,
      ownedSwords: Array.from(ownedSwords),
      wingId: 1,
      wingLevel: 1,
      warehouseData: warehouseData,
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
    rankingPoint: 0,
    rankStanding: "조회 대기중",
    titleCode: "TT_TYPE1",
    swordCode: "BLSwrod1",
    swordLevel: 0,
    ownedSwords: new Set(),
    wingId: 0,
    wingLevel: 0,
    warehouseData: {},
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
    const verTag = slot.mapVersion || "v36.00";
    const codeTagStyle = isActive ? "color:#090d16; font-weight:900;" : "color:var(--accent-gold); font-weight:800;";
    const verStyle = isActive ? "color:#090d16; opacity:0.9;" : "color:var(--text-sub); opacity:0.85;";

    btn.innerHTML = `<span style="${codeTagStyle}">[저장코드 #${codeNum}]</span> <span style="font-size:10.5px; ${verStyle}">(${verTag})</span> <span>${charTitle}</span>`;

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
  // 시즌 완료 녹색 배너 및 SP 카드 배지 제어
  // ==========================================
  const bannerEl = document.getElementById("valSeasonCompleteBanner");
  const labelEl = document.getElementById("valSeasonCompleteLabel");
  const cardBadgeEl = document.getElementById("valSeasonCardBadge");

  const verLabel = currentProfile.seasonVersionLabel || "v36";

  if (currentProfile.isSeasonCompleted) {
    if (bannerEl) bannerEl.style.display = "block";
    if (labelEl) labelEl.textContent = `${verLabel} 시즌포인트 완료`;
    if (cardBadgeEl) {
      cardBadgeEl.style.display = "block";
      cardBadgeEl.textContent = `✅ ${verLabel} 시즌 완료`;
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
    slotKey: "Code1_2_1",
    saveCode: "1",
    mapVersion: "v36.00",
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

  // 3. 년/월/일/시간 포맷팅 적용 (시간 + v36 버전 태그)
  const valSaveDate = document.getElementById("valSaveDate");
  if (valSaveDate) {
    const formatted = formatSaveDate(save.saveDate || "");
    const versionLabel = save.mapVersion || "v36";
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
    const item = slots[i] || { id: 0, count: 0 };
    const hasItem = (item.id > 0);
    const itemData = DSR_ITEMS_MAP[item.id] || null;

    let icon = defaultCategoryIcon;
    let name = "빈 슬롯";
    let codeText = "";
    let rankBadge = "";

    if (hasItem) {
      if (itemData) {
        icon = itemData.icon || defaultCategoryIcon;
        name = itemData.name;
        codeText = item.count > 0 ? `+#${item.id} (+${item.count})` : `#${item.id}`;
        
        if (itemData.rank) {
          let rankColor = "var(--accent-purple)";
          if (itemData.rank === "신급") rankColor = "var(--accent-gold)";
          if (itemData.rank === "반 신급") rankColor = "#f472b6";
          if (itemData.rank === "조합체") rankColor = "var(--accent-emerald)";
          if (itemData.rank === "에픽") rankColor = "#c084fc";

          rankBadge = `<span style="font-size:9.5px; padding:1px 5px; border-radius:4px; background:rgba(255,255,255,0.06); color:${rankColor}; border:1px solid ${rankColor}; font-weight:700;">${itemData.rank}</span>`;
        }
      } else {
        name = `아이템 #${item.id}`;
        codeText = item.count > 0 ? `ID:${item.id} (+${item.count})` : `ID:${item.id}`;
      }
    }

    html += `
      <div class="slot-card ${hasItem ? 'filled' : 'empty'}">
        <span class="slot-num">${i + 1}</span>
        <div class="slot-icon">${icon}</div>
        <div class="slot-info">
          <div class="slot-name">${name}</div>
          <div class="slot-code">${hasItem ? `${codeText} ${rankBadge}` : '<span style="color:var(--text-muted); font-size:10.5px;">[빈칸]</span>'}</div>
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
    } else if (currentProfile.seasonPoint >= char.reqSp) {
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
    const isRentable = !isOwned && (currentProfile.seasonPoint >= char.reqSp);

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
    });
  });
}

/* ==========================================================================
   3. Render Other Tabs (Swords, Pet Single-Row Grid, Wings, Warehouse, Relics)
   ========================================================================== */
function renderOtherTabsData() {
  renderSwordsTab();
  renderPetLevelBundlesTab();
  renderWingsTab();
  renderWarehouseTab();

  // Relics
  const relicsContainer = document.getElementById("relicsContainer");
  if (relicsContainer) {
    relicsContainer.innerHTML = OTHER_TABS_DATA.relics.map(relic => `
      <div class="generic-item-card">
        <div class="item-icon-box">🔮</div>
        <div class="item-details">
          <div class="item-title">${relic.name}</div>
          <div class="item-sub" style="color: var(--accent-purple);">${relic.rank} • ${relic.level}</div>
          <div class="item-desc">${relic.effect}</div>
        </div>
      </div>
    `).join('');
  }
}

/* --------------------------------------------------------------------------
   Swords Tab Renderer
   -------------------------------------------------------------------------- */
function renderSwordsTab() {
  const swordsContainer = document.getElementById("swordsContainer");
  if (!swordsContainer) return;

  let ownedCount = 0;
  DURENDAL_REQUIRED_SWORDS.forEach(req => {
    if (currentProfile.ownedSwords.has(req.code)) ownedCount++;
  });
  const isDurendalUnlocked = (ownedCount === DURENDAL_REQUIRED_SWORDS.length);

  const durendalCardHtml = `
    <div class="durendal-special-card">
      <div class="durendal-header">
        <span class="durendal-badge-mythic">ULTIMATE SACRED SWORD</span>
        <span style="font-weight: 800; font-size: 13px; color: ${isDurendalUnlocked ? 'var(--accent-gold)' : 'var(--text-muted)'};">
          ${isDurendalUnlocked ? '✨ 초월 각성 완료 (4/4)' : `🔒 4대 성검 모음 필요 (${ownedCount}/4)`}
        </span>
      </div>

      <div class="durendal-title-box">
        <div class="durendal-icon">🗡️✨</div>
        <div>
          <div class="durendal-name">전설의 전승 성검: 듀란달</div>
          <div class="durendal-sub">그람, 레바테인, 바리사다, 아스칼론 4대 성검의 힘이 하나로 전승된 최강의 성검</div>
        </div>
      </div>

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

  const regularSwordKeys = ["BLSwrod1", "BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5"];
  const regularCardsHtml = regularSwordKeys.map(code => {
    const swordName = SACRED_SWORDS_MAP[code];
    const isOwned = currentProfile.ownedSwords.has(code);
    const isEquipped = (code === currentProfile.swordCode);
    
    return `
      <div class="generic-item-card" style="${isEquipped ? 'border-color: var(--accent-gold); box-shadow: 0 0 15px rgba(255,215,0,0.2);' : ''}">
        <div class="item-icon-box">⚔️</div>
        <div class="item-details">
          <div class="item-title">
            ${swordName}
            ${isEquipped ? '<span style="font-size:11px; color:var(--accent-gold); font-weight:800;"> (장착중)</span>' : ''}
          </div>
          <div class="item-sub">
            상태: ${isOwned ? '<span style="color:var(--accent-gold);">소유함</span>' : '<span style="color:var(--text-muted);">미소유</span>'} 
            • 레벨: Lv.${currentProfile.swordLevel}
          </div>
          <div class="item-desc">4대 성검 전승 재료 성검 중 하나입니다.</div>
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

  wingsContainer.innerHTML = WINGS_CATALOG.map(wing => {
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
}

/* --------------------------------------------------------------------------
   Warehouse Tab Renderer
   -------------------------------------------------------------------------- */
function renderWarehouseTab() {
  const warehouseContainer = document.getElementById("warehouseContainer");
  if (!warehouseContainer) return;

  const userWarehouse = currentProfile.warehouseData || {};

  warehouseContainer.innerHTML = WAREHOUSE_CATALOG.map(box => {
    const userLevel = userWarehouse[box.code] || 0;
    const isOwned = (userLevel > 0);
    const isMax = (userLevel >= box.maxLevel);

    let cardStateClass = "warehouse-unowned";
    let badgeClass = "badge-locked";
    let badgeText = `🔒 미소유`;
    let levelText = `Lv.0 (미소유)`;

    if (isMax) {
      cardStateClass = "warehouse-max";
      badgeClass = "badge-owned";
      badgeText = `🌟 소유 (Lv.9 Max)`;
      levelText = `Lv.9 (Max 달성!)`;
    } else if (isOwned) {
      cardStateClass = "warehouse-owned";
      badgeClass = "badge-rentable";
      badgeText = `🟢 보유중 (Lv.${userLevel})`;
      levelText = `Lv.${userLevel} / ${box.maxLevel}`;
    }

    return `
      <div class="generic-item-card ${cardStateClass}">
        <div class="item-icon-box">📦</div>
        <div class="item-details">
          <div class="item-title">
            ${box.name}
            <span style="font-size:11px; opacity:0.75; font-weight:400;"> [${box.category}]</span>
          </div>
          <div class="item-sub">
            레벨: <span style="font-weight:800;">${levelText}</span>
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
}
