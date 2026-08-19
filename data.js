/**
 * 대륙 RPG 매니저 - 데이터베이스 (Database & Config)
 * 유저 아이디별 완전히 독립된 100% 개별 프로필 데이터 (시간 정보 수록)
 */

// 1. 캐릭터 10개 시즌 90종 공식 데이터베이스
const SEASONS_DATA = [
  {
    season: 1,
    id: "S1",
    commander: "라이언 기사단장",
    characters: [
      { code: "SH_1", name: "흑기사", reqSp: 5 },
      { code: "SH_2", name: "아기용 발카라스", reqSp: 8 },
      { code: "SH_3", name: "크리스탈 골렘", reqSp: 10 },
      { code: "SH_4", name: "명궁", reqSp: 13 },
      { code: "SH_5", name: "공갈해적단 선장", reqSp: 15 },
      { code: "SH_6", name: "앨리펀트 캡틴", reqSp: 18 },
      { code: "SH_7", name: "드워프 라이플맨", reqSp: 20 },
      { code: "SH_8", name: "젤리 큐브", reqSp: 22 },
      { code: "SH_9", name: "리자드 소서러", reqSp: 24 }
    ]
  },
  {
    season: 2,
    id: "S2",
    commander: "래빗 신성여단장",
    characters: [
      { code: "SH_10", name: "아기용 피넛", reqSp: 25 },
      { code: "SH_11", name: "엔젤 나이트", reqSp: 27 },
      { code: "SH_12", name: "관짝 댄서", reqSp: 28 },
      { code: "SH_13", name: "다크 유니콘", reqSp: 30 },
      { code: "SH_14", name: "펭챠릭", reqSp: 32 },
      { code: "SH_15", name: "고양이 술사", reqSp: 34 },
      { code: "SH_16", name: "저주 술사", reqSp: 36 },
      { code: "SH_17", name: "붓질 술사", reqSp: 38 },
      { code: "SH_18", name: "복돌이 쿠마", reqSp: 40 }
    ]
  },
  {
    season: 3,
    id: "S3",
    commander: "색욕의 마왕군단장",
    characters: [
      { code: "SH_19", name: "슬픈광대 조커", reqSp: 37 },
      { code: "SH_20", name: "스컬 로드", reqSp: 42 },
      { code: "SH_21", name: "드워프 빅해머", reqSp: 47 },
      { code: "SH_22", name: "오우거 투사", reqSp: 46 },
      { code: "SH_23", name: "죄수 호송마차", reqSp: 48 },
      { code: "SH_24", name: "엘프 아쳐", reqSp: 50 },
      { code: "SH_25", name: "놀 드루이드", reqSp: 52 },
      { code: "SH_26", name: "화염의 광인", reqSp: 53 },
      { code: "SH_27", name: "사령 응원가", reqSp: 55 }
    ]
  },
  {
    season: 4,
    id: "S4",
    commander: "매의눈 여단장",
    characters: [
      { code: "SH_28", name: "설버섯군", reqSp: 57 },
      { code: "SH_29", name: "드워프 마법전사", reqSp: 59 },
      { code: "SH_30", name: "귀족 보급마차", reqSp: 62 },
      { code: "SH_31", name: "페가수스 나이트", reqSp: 64 },
      { code: "SH_32", name: "인어왕", reqSp: 67 },
      { code: "SH_33", name: "미믹 스텀프", reqSp: 70 },
      { code: "SH_34", name: "불꽃 개미", reqSp: 72 },
      { code: "SH_35", name: "빡빡이 검사", reqSp: 74 },
      { code: "SH_36", name: "스켈레톤 스카우터", reqSp: 76 }
    ]
  },
  {
    season: 5,
    id: "S5",
    commander: "요정 마법사단장",
    characters: [
      { code: "SH_37", name: "타우렌 투사", reqSp: 79 },
      { code: "SH_38", name: "파이어로 댄서", reqSp: 81 },
      { code: "SH_39", name: "건슬링거", reqSp: 83 },
      { code: "SH_40", name: "블랙 히드라[해즐링]", reqSp: 85 },
      { code: "SH_41", name: "사우르스 테이머", reqSp: 87 },
      { code: "SH_42", name: "투스카르 메이지", reqSp: 89 },
      { code: "SH_43", name: "게이터 터틀", reqSp: 91 },
      { code: "SH_44", name: "스켈레톤 스피어맨", reqSp: 93 },
      { code: "SH_45", name: "놀 파수꾼", reqSp: 95 }
    ]
  },
  {
    season: 6,
    id: "S6",
    commander: "둠가드 지옥군단장",
    characters: [
      { code: "SH_46", name: "구울 마법사", reqSp: 98 },
      { code: "SH_47", name: "시타델 좀비", reqSp: 101 },
      { code: "SH_48", name: "고블린 일꾼", reqSp: 103 },
      { code: "SH_49", name: "오크 디필러", reqSp: 105 },
      { code: "SH_50", name: "오크 보우맨", reqSp: 107 },
      { code: "SH_51", name: "로한 아쳐", reqSp: 110 },
      { code: "SH_52", name: "고블린 스피어맨", reqSp: 113 },
      { code: "SH_53", name: "스켈오크 방패병", reqSp: 116 },
      { code: "SH_54", name: "언데드 처형자", reqSp: 119 }
    ]
  },
  {
    season: 7,
    id: "S7",
    commander: "지하 마물군단장",
    characters: [
      { code: "SH_55", name: "통남자", reqSp: 122 },
      { code: "SH_56", name: "오크 관짝댄서", reqSp: 125 },
      { code: "SH_57", name: "휴먼 공성 전차", reqSp: 128 },
      { code: "SH_58", name: "박스몬", reqSp: 131 },
      { code: "SH_59", name: "랫맨 워리어", reqSp: 134 },
      { code: "SH_60", name: "랫맨 저격수", reqSp: 137 },
      { code: "SH_61", name: "휴먼 크로스보우맨", reqSp: 140 },
      { code: "SH_62", name: "휴먼 마법사", reqSp: 143 },
      { code: "SH_63", name: "언고어 스피어맨", reqSp: 147 }
    ]
  },
  {
    season: 8,
    id: "S8",
    commander: "몬스터군단장",
    characters: [
      { code: "SH_64", name: "드래곤 프리스트", reqSp: 153 },
      { code: "SH_65", name: "사우르스 워리어", reqSp: 156 },
      { code: "SH_66", name: "드래곤 메이지", reqSp: 159 },
      { code: "SH_67", name: "그리폰 워리어", reqSp: 162 },
      { code: "SH_68", name: "나가 슈터", reqSp: 165 },
      { code: "SH_69", name: "화이트 그리폰", reqSp: 168 },
      { code: "SH_70", name: "바실리스크", reqSp: 171 },
      { code: "SH_71", name: "레이븐 피어", reqSp: 174 },
      { code: "SH_72", name: "설인", reqSp: 177 }
    ]
  },
  {
    season: 9,
    id: "S9",
    commander: "오크 용병장",
    characters: [
      { code: "SH_73", name: "울프 사형자", reqSp: 180 },
      { code: "SH_74", name: "언데드 무사", reqSp: 183 },
      { code: "SH_75", name: "창술 무사", reqSp: 186 },
      { code: "SH_76", name: "베스티고어 처형자", reqSp: 189 },
      { code: "SH_77", name: "칼날 무사", reqSp: 192 },
      { code: "SH_78", name: "도끼 무사", reqSp: 195 },
      { code: "SH_79", name: "오크 둔기병", reqSp: 198 },
      { code: "SH_80", name: "바라카 쌍검병", reqSp: 201 },
      { code: "SH_81", name: "아케인 검사", reqSp: 204 }
    ]
  },
  {
    season: 10,
    id: "S10",
    commander: "시타 응원여단장",
    characters: [
      { code: "SH_82", name: "방패 레이번트", reqSp: 207 },
      { code: "SH_83", name: "파이어 레이번트", reqSp: 210 },
      { code: "SH_84", name: "포이즌 레이번트", reqSp: 213 },
      { code: "SH_85", name: "스피릿 레이번트", reqSp: 216 },
      { code: "SH_86", name: "매직 레이번트", reqSp: 219 },
      { code: "SH_87", name: "노예 오크병", reqSp: 222 },
      { code: "SH_88", name: "드레이니 삼형제(블루)", reqSp: 225 },
      { code: "SH_89", name: "드레이니 삼형제(레드)", reqSp: 228 },
      { code: "SH_90", name: "드레이니 삼형제(퍼플)", reqSp: 231 }
    ]
  }
];

// 2. 칭호 맵
// 칭호: "TT_TYPE1": N 에서 N(값)이 칭호 레벨
const TITLES_LEVEL_MAP = {
  1: "브론즈 칭호",
  2: "실버 칭호",
  3: "골드 칭호",
  4: "플래티넘 칭호",
  5: "다이아몬드 칭호",
  6: "마스터 칭호",
  7: "그랜드마스터 칭호",
  8: "챌린저 칭호",
  9: "대륙 맹주 칭호",
  10: "G.O.D 칭호",
  11: "Super G.O.D 칭호"
};
// 하위 호환용 (기존 코드에서 TITLES_MAP 참조 시)
const TITLES_MAP = TITLES_LEVEL_MAP;

// 3. 성검 (Sacred Swords Code Map)
const SACRED_SWORDS_MAP = {
  "BLSwrod1": "클라인(모능-이벤트)",
  "BLSwrod2": "그람(모능)",
  "BLSwrod3": "레바테인(지능)",
  "BLSwrod4": "바리사다(민첩)",
  "BLSwrod5": "아스칼론(힘)",
  "nBLSwrodUP1": "듀란달"
};

const DURENDAL_REQUIRED_SWORDS = [
  { code: "BLSwrod2", name: "그람(모능)" },
  { code: "BLSwrod3", name: "레바테인(지능)" },
  { code: "BLSwrod4", name: "바리사다(민첩)" },
  { code: "BLSwrod5", name: "아스칼론(힘)" }
];

// 4. 공식 날개 (Wings) 23종 데이터 및 9레벨 진화 트리
const WINGS_CATALOG = [
  { id: 1, name: "청조의 날개", req: "기본 날개" },
  { id: 2, name: "홍조의 날개", req: "[청조의 날개 Max시 선택 가능]" },
  { id: 3, name: "데비의 날개", req: "[홍조의 날개 Max시 선택 가능]" },
  { id: 4, name: "불꽃의 날개", req: "[데비의 날개 Max시 선택 가능]" },
  { id: 5, name: "윙 화이트", req: "[불꽃의 날개 Max시 선택 가능]" },
  { id: 6, name: "윙 블루", req: "[윙 화이트 Max시 선택 가능]" },
  { id: 7, name: "윙 그린", req: "[윙 블루 Max시 선택 가능]" },
  { id: 8, name: "윙 오렌지", req: "[윙 그린 Max시 선택 가능]" },
  { id: 9, name: "윙 레드", req: "[윙 오렌지 Max시 선택 가능]" },
  { id: 10, name: "윙 퍼플", req: "[윙 레드 Max시 선택 가능]" },
  { id: 11, name: "윙 각퍼플", req: "[윙 퍼플 Max시 선택 가능]" },
  { id: 12, name: "일리단 데빌 날개", req: "[윙 각퍼플 Max시 선택 가능]" },
  { id: 13, name: "듀얼 날개", req: "[일리단 데빌 날개 Max시 선택 가능]" },
  { id: 14, name: "엔트 날개", req: "[듀얼 날개 Max시 선택 가능]" },
  { id: 15, name: "요정 날개", req: "[엔트 날개 Max시 선택 가능]" },
  { id: 16, name: "지옥 날개", req: "[요정 날개 Max시 선택 가능]" },
  { id: 17, name: "해골왕 날개", req: "[지옥 날개 Max시 선택 가능]" },
  { id: 18, name: "피닉스 날개", req: "[해골왕 날개 Max시 선택 가능]" },
  { id: 19, name: "엔젤불꽃 날개", req: "[피닉스 날개 Max시 선택 가능]" },
  { id: 20, name: "라바 날개", req: "[엔젤불꽃 날개 Max시 선택 가능]" },
  { id: 21, name: "요정왕 날개", req: "[라바 날개 Max시 선택 가능]" },
  { id: 22, name: "요정불 날개", req: "[요정왕 날개 Max시 선택 가능]" },
  { id: 23, name: "푸른깃털 날개", req: "[요정불 날개 Max시 선택 가능]" }
];

// 5. 공식 창고 (Warehouse Box) 16종 데이터 및 9레벨/초월 조합 트리
const WAREHOUSE_CATALOG = [
  { code: "BLBox1", name: "순록", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox2", name: "타란튤라", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox3", name: "고슴도치", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox4", name: "알파카", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox5", name: "상어", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox6", name: "개미", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox7", name: "거북이", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox8", name: "큰뿔사슴", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox9", name: "코끼리", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox10", name: "벤디트 개", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "BLBox11", name: "판다", category: "기본 창고", maxLevel: 9, req: "기본 제공" },
  { code: "NBLBox1", name: "루돌프", category: "이벤트 창고", maxLevel: 9, req: "이벤트 보상" },
  { code: "NBLBox2", name: "분홍 여우", category: "초월 창고", maxLevel: 9, req: "타란튤라Lv9, 고슴도치Lv9, 알파카Lv9, 상어Lv9 소유시 사용 가능" },
  { code: "NBLBox3", name: "재규어", category: "초월 창고", maxLevel: 9, req: "개미Lv9, 거북이Lv9, 큰뿔사슴Lv9, 코끼리Lv9, 벤디트 개Lv9, 판다Lv9 소유시 사용 가능" },
  { code: "NBLBox4", name: "분홍 여우 성체", category: "최상위 초월 창고", maxLevel: 9, req: "분홍여우, 재규어 소유시 사용 가능" },
  { code: "NBLBox_UP1", name: "고블린 왕자", category: "각성 창고", maxLevel: 9, req: "분홍 여우 성체 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP2", name: "고블린 황제", category: "각성 창고", maxLevel: 9, req: "고블린 왕자 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP3", name: "소울 구울", category: "각성 창고", maxLevel: 9, req: "고블린 황제 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP4", name: "다이스 조커", category: "각성 창고", maxLevel: 9, req: "소울 구울 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP5", name: "검은눈 고양이", category: "각성 창고", maxLevel: 9, req: "다이스 조커 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP6", name: "루나 고양이", category: "최종 각성 창고", maxLevel: 9, req: "검은눈 고양이 MAX (Lv9) 달성시 가능" }
];

// 6. 공식 레벨별 펫 묶음 데이터
const PET_LEVEL_BUNDLES = [
  {
    level: 1,
    title: "Lv1 펫 묶음",
    pets: [
      { code: "SP_1", name: "탱크맨", desc: "힘 스텟 펫" },
      { code: "SP_3", name: "버드 캐터펄트", desc: "민첩 스텟 펫" },
      { code: "SP_2", name: "아이스 피닉스", desc: "지능 스텟 펫" },
      { code: "SP_4", name: "공포인형 유이", desc: "방어 감소 디버프 펫" },
      { code: "SP_5", name: "기타맨", desc: "아이템 드랍률 상승 펫" },
      { code: "SP_6", name: "팔라딘", desc: "받는 트리거 데미지 감소 펫" },
      { code: "SP_7", name: "드루이드", desc: "트리거 데미지 증가 펫" },
      { code: "SP_8", name: "신성 성녀", desc: "성검 소환시 성력 증가량 증폭 펫" },
      { code: "SP_9", name: "치프틴 퀼볼", desc: "밀리 근접 유닛 데미지 반사 펫" }
    ]
  },
  {
    level: 2,
    title: "Lv2 펫 묶음",
    pets: [
      { code: "SP2_1", name: "중갑기사 로우", desc: "탱크맨 외 6종 소유시 소환 가능" },
      { code: "SP2_2", name: "고블린 블라스터", desc: "버드 캐터펄트 외 6종 소유시 소환 가능" },
      { code: "SP2_3", name: "서리정령", desc: "아이스 피닉스 외 6종 소유시 소환 가능" },
      { code: "SP2_4", name: "이집트리치 인형", desc: "중갑기사/고블린/서리정령 소유시 가능" },
      { code: "SP2_6", name: "워터보이", desc: "중갑기사/고블린/서리정령 소유시 가능" },
      { code: "SP2_5", name: "템플나이트", desc: "중갑기사/고블린/서리정령 소유시 가능" },
      { code: "SP2_7", name: "드루이드Lv2", desc: "중갑기사/고블린/서리정령 소유시 가능" },
      { code: "SP2_8", name: "엘프 성녀", desc: "중갑기사/고블린/서리정령 소유시 가능" },
      { code: "SP2_9", name: "투카르 치프틴", desc: "중갑기사/고블린/서리정령 소유시 가능" }
    ]
  },
  {
    level: 3,
    title: "Lv3 펫 묶음",
    pets: [
      { code: "SP3_1", name: "데몬기사 조던", desc: "중갑기사 로우 외 6종 소유시 소환 가능" },
      { code: "SP3_2", name: "대형 대포", desc: "고블린 블라스터 외 6종 소유시 소환 가능" },
      { code: "SP3_3", name: "빙결의 악몽", desc: "서리정령 외 6종 소유시 소환 가능" },
      { code: "SP3_4", name: "리퍼 인형", desc: "데몬기사/대형대포/빙결악몽 소유시 가능" },
      { code: "SP3_5", name: "드라군나이트", desc: "데몬기사/대형대포/빙결악몽 소유시 가능" },
      { code: "SP3_6", name: "리틀보이", desc: "데몬기사/대형대포/빙결악몽 소유시 가능" },
      { code: "SP3_7", name: "드루이드", desc: "데몬기사/대형대포/빙결악몽 소유시 가능" },
      { code: "SP3_8", name: "하이엘프 성녀", desc: "데몬기사/대형대포/빙결악몽 소유시 가능" },
      { code: "SP3_9", name: "사티로스 마스터", desc: "데몬기사/대형대포/빙결악몽 소유시 가능" }
    ]
  },
  {
    level: 4,
    title: "Lv4 펫 묶음",
    pets: [
      { code: "SP4_1", name: "대검기사 해곤", desc: "Lv4 계열 펫" },
      { code: "SP4_2", name: "맘 투석기", desc: "Lv4 계열 펫" },
      { code: "SP4_3", name: "빙결의 군주", desc: "Lv4 계열 펫" },
      { code: "SP4_4", name: "밴쉬 인형", desc: "Lv4 계열 펫" },
      { code: "SP4_5", name: "스완 나이트", desc: "Lv4 계열 펫" },
      { code: "SP4_6", name: "엘프보이", desc: "Lv4 계열 펫" },
      { code: "SP4_7", name: "드워프 드루이드", desc: "Lv4 계열 펫" },
      { code: "SP4_8", name: "고위 성녀", desc: "Lv4 계열 펫" },
      { code: "SP4_9", name: "밴디트 마스터", desc: "Lv4 계열 펫" }
    ]
  },
  {
    level: 5,
    title: "Lv5 업그레이드 펫 묶음",
    pets: [
      { code: "SP3_1U", name: "해골기사 조트", desc: "Lv5 업그레이드 펫" },
      { code: "SP3_2U", name: "옥크로 투석기", desc: "Lv5 업그레이드 펫" },
      { code: "SP3_3U", name: "빙결의 여군주", desc: "Lv5 업그레이드 펫" },
      { code: "SP5_1", name: "어둠의 군주 조던", desc: "Lv5 신화 펫" },
      { code: "SP5_2", name: "파멸의 대포", desc: "Lv5 신화 펫" },
      { code: "SP5_3", name: "절대빙결의 정령", desc: "Lv5 신화 펫" }
    ]
  },
  {
    level: 6,
    title: "Lv6 업그레이드 펫 묶음",
    pets: [
      { code: "SP3_1U2", name: "사령기사 루인", desc: "Lv6 업그레이드 펫" },
      { code: "SP3_2U2", name: "블러드 엘프 마법기", desc: "Lv6 업그레이드 펫" },
      { code: "SP3_3U2", name: "서리군주 베인", desc: "Lv6 업그레이드 펫" }
    ]
  },
  {
    level: 7,
    title: "Lv7 업그레이드 펫 묶음",
    pets: [
      { code: "SP3_1U3", name: "대군주 바로크", desc: "Lv7 업그레이드 펫" },
      { code: "SP3_2U3", name: "블러드 엘프 마법병기", desc: "Lv7 업그레이드 펫" },
      { code: "SP3_3U3", name: "마인드 마스터", desc: "Lv7 업그레이드 펫" }
    ]
  },
  {
    level: 8,
    title: "Lv8 업그레이드 펫 묶음",
    pets: [
      { code: "SP3_1U4", name: "족장 랜드호크", desc: "Lv8 업그레이드 펫" },
      { code: "SP3_2U4", name: "블러드 위저드 탈렌", desc: "Lv8 업그레이드 펫" },
      { code: "SP3_3U4", name: "혹한의 모그레인", desc: "Lv8 업그레이드 펫" }
    ]
  },
  {
    level: 9,
    title: "Lv9 업그레이드 펫 묶음",
    pets: [
      { code: "SP_RGUP1", name: "카오스 엘리멘탈", desc: "Lv9 최상위 펫" },
      { code: "SP_RGUP2", name: "카오스 랜턴", desc: "Lv9 최상위 펫" },
      { code: "SP_RGUP3", name: "스핑거 도그", desc: "Lv9 최상위 펫" },
      { code: "SP_RGUP4", name: "카오스 라이언", desc: "Lv9 최상위 펫" }
    ]
  }
];

// 7. 기타 탭 정보
const OTHER_TABS_DATA = {
  relics: [
    { name: "용의 여의주", rank: "신화 1급", level: "Lv.MAX", effect: "모든 공격력 +50%, 성력 증가량 +20%" },
    { name: "태고의 수정구", rank: "전설 2급", level: "Lv.8", effect: "스킬 쿨타임 감소 -15%, MP 회복 +100" },
    { name: "마왕의 징장", rank: "유일 3급", level: "Lv.5", effect: "적 방어력 20% 무시, 트리거 데미지 +15%" }
  ]
};

// 8. DSR 아이템 코드 맵 (goodwin 실측 및 m16tool 세이브 아이템 ID 매핑)
const DSR_ITEMS_MAP = {
  372: { name: "데릭의 톱날칼[에픽]", icon: "⚔️", rank: "에픽" },
  370: { name: "데릭의 뼈갑옷[에픽]", icon: "🛡️", rank: "에픽" },
  298: { name: "견고한 벽[신급]", icon: "🏰", rank: "신급" },
  279: { name: "시즌 전생 칭호[에픽]", icon: "🏷️", rank: "에픽" },
  361: { name: "핑크게이의 문장[반 신급]", icon: "🏅", rank: "반 신급" },
  304: { name: "지능의 인장Lv2[에픽]", icon: "💎", rank: "에픽" },
  318: { name: "천사의 날개[반 신급]", icon: "🪽", rank: "반 신급" },
  297: { name: "수령에 빠뜨린자[신급]", icon: "🥋", rank: "신급" },
  339: { name: "푸른 가이아의 특혜[조합체]", icon: "🌿", rank: "조합체" },
  360: { name: "타락한 파워[반 신급]", icon: "🟣", rank: "반 신급" },
  264: { name: "엽기 보석[신급]", icon: "💎", rank: "신급" },
  303: { name: "힘의 인장Lv2[에픽]", icon: "📌", rank: "에픽" },
  263: { name: "곰팡살팽의 쉴드[신급]", icon: "🛡️", rank: "신급" },
  248: { name: "부식의 나이프[신급]", icon: "🗡️", rank: "신급" },
  299: { name: "호빵 반지[신급]", icon: "💍", rank: "신급" }
};

// 9. 사전등록 유저 로컬 DB (아이디별 100% 개별 독립 데이터 & 시간 수록)
const PLAYERS_DATABASE = {
  "wldnjsdl33": {
    userId: "wldnjsdl33",
    seasonPoint: 0,
    honorPoint: 0,
    rankingPoint: 0,
    rankStanding: "일반 유저",
    titleCode: 1,
    swordCode: "BLSwrod0",
    swordLevel: 1,
    ownedSwords: [],
    wingId: 1,
    wingLevel: 1,
    sacredPower: "0",
    petData: { "SP_FROG": 1 },
    ownedCodes: ["SH_1"],
    lastSave: {
      saveDate: "2026-08-03 22:52:00",
      characterName: "[1차 전생] 늑대 장군",
      characterLevel: 6000,
      petName: "백스플 개구리[펫]",
      petLevel: 5712,
      gold: 909710,
      imperialCoin: 130,
      darkStone: 0,
      str: 42073,
      agi: 72148,
      int: 42073,
      heroItems: [
        { id: 322, count: 0 }, { id: 320, count: 0 }, { id: 267, count: 0 },
        { id: 268, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 320, count: 0 }, { id: 322, count: 0 }, { id: 190, count: 0 },
        { id: 215, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 268, count: 0 }, { id: 268, count: 0 }, { id: 304, count: 0 },
        { id: 227, count: 0 }, { id: 316, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_5004",
        saveCode: "5004",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 22:52:00",
        characterName: "[1차 전생] 늑대 장군",
        characterLevel: 6000,
        petName: "백스플 개구리[펫]",
        gold: 909710,
        imperialCoin: 130,
        darkStone: 0,
        str: 42073,
        agi: 72148,
        int: 42073,
        heroItems: [
          { id: 322, count: 0 }, { id: 320, count: 0 }, { id: 267, count: 0 },
          { id: 268, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 320, count: 0 }, { id: 322, count: 0 }, { id: 190, count: 0 },
          { id: 215, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 268, count: 0 }, { id: 268, count: 0 }, { id: 304, count: 0 },
          { id: 227, count: 0 }, { id: 316, count: 0 }, { id: 0, count: 0 }
        ]
      }
    ]
  },
  "godwin": {
    userId: "godwin",
    seasonPoint: 68,
    honorPoint: 0,
    rankingPoint: 0,
    rankStanding: "일반 유저",
    titleCode: 1,
    swordCode: "BLSwrod0",
    swordLevel: 1,
    ownedSwords: [],
    wingId: 1,
    wingLevel: 1,
    sacredPower: "0",
    petData: { "SP_6": 1, "SP_7": 1, "SP_9": 1 },
    ownedCodes: ["SH_1"],
    lastSave: {
      saveDate: "2026-08-04 00:17:03",
      characterName: "『시즌』색욕의 마왕군단장",
      characterLevel: 6000,
      petName: "그레이트 씨 헌터[펫]",
      petLevel: 6000,
      gold: 516010,
      imperialCoin: 133932,
      darkStone: 0,
      str: 63149,
      agi: 108302,
      int: 63149,
      heroItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 248, count: 0 },
        { id: 361, count: 0 }, { id: 279, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 318, count: 0 },
        { id: 248, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 299, count: 0 }, { id: 318, count: 0 }, { id: 263, count: 0 },
        { id: 298, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_1",
        saveCode: "1",
        mapVersion: "v36.00",
        saveDate: "2026-08-04 00:17:03",
        characterName: "『시즌』색욕의 마왕군단장",
        characterLevel: 6000,
        petName: "그레이트 씨 헌터[펫]",
        petLevel: 6000,
        gold: 516010,
        imperialCoin: 133932,
        darkStone: 0,
        str: 63149,
        agi: 108302,
        int: 63149,
        heroItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 248, count: 0 },
          { id: 361, count: 0 }, { id: 279, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 318, count: 0 },
          { id: 248, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 299, count: 0 }, { id: 318, count: 0 }, { id: 263, count: 0 },
          { id: 298, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      },
      {
        slotKey: "Code1_2_2",
        saveCode: "2",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:32:22",
        characterName: "『시즌』드래곤 프리스트",
        characterLevel: 6000,
        petName: "그레이트 씨 헌터[펫]",
        petLevel: 5561,
        gold: 851373,
        imperialCoin: 1123,
        darkStone: 0,
        str: 42073,
        agi: 42073,
        int: 72148,
        heroItems: [
          { id: 324, count: 0 }, { id: 254, count: 0 }, { id: 263, count: 0 },
          { id: 318, count: 0 }, { id: 0, count: 17 }, { id: 279, count: 0 }
        ],
        petItems: [
          { id: 324, count: 0 }, { id: 272, count: 0 }, { id: 318, count: 0 },
          { id: 323, count: 0 }, { id: 0, count: 8 }, { id: 263, count: 0 }
        ],
        warehouseItems: [
          { id: 0, count: 1 }, { id: 0, count: 8 }, { id: 0, count: 0 },
          { id: 237, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      }
    ]
  },
  "goodwin": {
    userId: "goodwin",
    seasonPoint: 111,
    honorPoint: 258,
    isSeasonCompleted: true,
    seasonVersionLabel: "v36",
    rankingPoint: 1420,
    rankStanding: "1위 (상위 랭커)",
    titleCode: "TT_TYPE2", // 실버 칭호
    swordCode: "BLSwrod2", // 그람(모능)
    swordLevel: 1,
    ownedSwords: ["BLSwrod1", "BLSwrod2"],
    wingId: 5,
    wingLevel: 9,
    warehouseData: {
      "BLBox1": 1, "BLBox4": 1
    },
    sacredPower: "10,671",
    petData: {
      "SP_2": 1, "SP_4": 1, "SP_5": 1, "SP_6": 1, "SP_7": 1, "SP_8": 1, "SP_9": 1,
      "SP2_3": 1, "SP2_4": 1, "SP2_5": 1, "SP2_6": 1, "SP2_7": 1, "SP2_8": 1, "SP2_9": 1
    },
    ownedCodes: [
      "SH_1", "SH_2"
    ],
    lastSave: {
      saveDate: "2026-08-03 20:56:10",
      characterName: "『시즌』페가수스 나이트",
      characterLevel: 6000,
      petName: "서리정령[Lv2][펫]",
      petLevel: 6000,
      gold: 733202,
      imperialCoin: 117838,
      darkStone: 0,
      str: 42073,
      agi: 42073,
      int: 72148,
      heroItems: [
        { id: 372, count: 0 }, // 1. 데릭의 톱날칼[에픽]
        { id: 370, count: 0 }, // 2. 데릭의 뼈갑옷[에픽]
        { id: 298, count: 0 }, // 3. 견고한 벽[신급]
        { id: 279, count: 0 }, // 4. 시즌 전생 칭호[에픽]
        { id: 361, count: 0 }, // 5. 핑크게이의 문장[반 신급]
        { id: 0, count: 0 }   // 6. 빈 슬롯
      ],
      petItems: [
        { id: 372, count: 0 }, // 1. 데릭의 톱날칼[에픽]
        { id: 370, count: 0 }, // 2. 데릭의 뼈갑옷[에픽]
        { id: 297, count: 0 }, // 3. 수령에 빠뜨린자[신급]
        { id: 318, count: 0 }, // 4. 천사의 날개[반 신급]
        { id: 339, count: 0 }, // 5. 푸른 가이아의 특혜[조합체]
        { id: 0, count: 0 }   // 6. 빈 슬롯
      ],
      warehouseItems: [
        { id: 304, count: 0 }, // 1. 지능의 인장Lv2[에픽]
        { id: 318, count: 0 }, // 2. 천사의 날개[반 신급]
        { id: 0, count: 0 },
        { id: 0, count: 0 },
        { id: 0, count: 0 },
        { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_1",
        saveCode: "1",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:56:10",
        characterName: "『시즌』페가수스 나이트",
        characterLevel: 6000,
        petName: "서리정령[Lv2][펫]",
        gold: 733202,
        imperialCoin: 117838,
        darkStone: 0,
        str: 42073,
        agi: 42073,
        int: 72148,
        heroItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 298, count: 0 },
          { id: 279, count: 0 }, { id: 361, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 297, count: 0 },
          { id: 318, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 304, count: 0 }, { id: 318, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      },
      {
        slotKey: "Code1_1_1",
        saveCode: "2",
        mapVersion: "v36.00",
        saveDate: "2026-08-02 14:22:10",
        characterName: "명궁",
        characterLevel: 6000,
        petName: "서리정령[Lv2][펫]",
        gold: 830200,
        imperialCoin: 1114,
        darkStone: 0,
        str: 23733,
        agi: 23733,
        int: 40708,
        heroItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 318, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 304, count: 0 }, { id: 297, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 318, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      },
      {
        slotKey: "Code1_2_2",
        saveCode: "2",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:32:22",
        characterName: "『시즌』드래곤 프리스트",
        characterLevel: 6000,
        petName: "그레이트 씨 헌터[펫]",
        petLevel: 5561,
        gold: 851373,
        imperialCoin: 1123,
        darkStone: 0,
        str: 42073,
        agi: 42073,
        int: 72148,
        heroItems: [
          { id: 324, count: 0 }, { id: 254, count: 0 }, { id: 263, count: 0 },
          { id: 318, count: 0 }, { id: 0, count: 17 }, { id: 279, count: 0 }
        ],
        petItems: [
          { id: 324, count: 0 }, { id: 272, count: 0 }, { id: 318, count: 0 },
          { id: 323, count: 0 }, { id: 0, count: 8 }, { id: 263, count: 0 }
        ],
        warehouseItems: [
          { id: 0, count: 1 }, { id: 0, count: 8 }, { id: 0, count: 0 },
          { id: 237, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      }
    ]
  },
  "goodwin1": {
    userId: "goodwin1",
    seasonPoint: 120,
    honorPoint: 230,
    rankingPoint: 0,
    rankStanding: "래빗 신성여단장",
    titleCode: "TT_TYPE3",
    swordCode: "BLSwrod2",
    swordLevel: 1,
    ownedSwords: ["BLSwrod1", "BLSwrod2"],
    wingId: 4,
    wingLevel: 7,
    sacredPower: "5,568",
    petData: {
      "SP_RGUP1": 1
    },
    ownedCodes: ["SH_10", "SH_18"],
    lastSave: {
      saveDate: "2025-09-22 21:15:00",
      characterName: "『시즌』래빗 신성여단장",
      characterLevel: 6000,
      petName: "그레이트 씨 헌터[펫]",
      petLevel: 6000,
      gold: 567611,
      imperialCoin: 163290,
      darkStone: 0,
      str: 63149,
      agi: 63149,
      int: 108302,
      heroItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 297, count: 0 },
        { id: 361, count: 0 }, { id: 279, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 304, count: 0 }, { id: 318, count: 0 }, { id: 298, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 318, count: 0 },
        { id: 297, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_1",
        saveCode: "1",
        mapVersion: "v36.00",
        saveDate: "2025-09-22 21:15:00",
        characterName: "『시즌』래빗 신성여단장",
        characterLevel: 6000,
        petName: "그레이트 씨 헌터[펫]",
        gold: 567611,
        imperialCoin: 163290,
        darkStone: 0,
        str: 63149,
        agi: 63149,
        int: 108302,
        heroItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 297, count: 0 },
          { id: 361, count: 0 }, { id: 279, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 304, count: 0 }, { id: 318, count: 0 }, { id: 298, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 318, count: 0 },
          { id: 297, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 }
        ]
      }
    ]
  },
  "u0u": {
    userId: "u0u",
    seasonPoint: 0,
    honorPoint: 0,
    rankingPoint: 0,
    rankStanding: "일반 유저",
    titleCode: "TT_TYPE1",
    swordCode: "BLSwrod0",
    swordLevel: 1,
    ownedSwords: [],
    wingId: 1,
    wingLevel: 1,
    sacredPower: "0",
    petData: {
      "SP_FROG": 1
    },
    ownedCodes: ["SH_1"],
    lastSave: {
      saveDate: "2026-08-03 20:32:22",
      characterName: "[1차 전생] 그랜드 정령술사",
      characterLevel: 3138,
      petName: "백스플 개구리[펫]",
      petLevel: 57,
      gold: 484993,
      imperialCoin: 0,
      darkStone: 0,
      str: 22039,
      agi: 22039,
      int: 37804,
      heroItems: [
        { id: 324, count: 0 }, { id: 323, count: 0 }, { id: 323, count: 0 },
        { id: 323, count: 0 }, { id: 0, count: 0 }, { id: 215, count: 0 }
      ],
      petItems: [
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 43, count: 0 }
      ],
      warehouseItems: [
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_소환",
        saveCode: "소환",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:32:22",
        characterName: "[1차 전생] 그랜드 정령술사",
        characterLevel: 3138,
        petName: "백스플 개구리[펫]",
        gold: 484993,
        imperialCoin: 0,
        darkStone: 0,
        str: 22039,
        agi: 22039,
        int: 37804,
        heroItems: [
          { id: 324, count: 0 }, { id: 323, count: 0 }, { id: 323, count: 0 },
          { id: 323, count: 0 }, { id: 0, count: 0 }, { id: 215, count: 0 }
        ],
        petItems: [
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 43, count: 0 }
        ],
        warehouseItems: [
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      },
      {
        slotKey: "Code1_2_정령",
        saveCode: "정령",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 19:15:00",
        characterName: "정령사",
        characterLevel: 6000,
        petName: "백스플 개구리[펫]",
        gold: 1000000,
        imperialCoin: 0,
        darkStone: 0,
        str: 8625,
        agi: 17250,
        int: 8625,
        heroItems: [
          { id: 188, count: 0 }, { id: 44, count: 0 }, { id: 14, count: 0 },
          { id: 187, count: 0 }, { id: 187, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 190, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 25, count: 0 }
        ],
        warehouseItems: [
          { id: 273, count: 0 }, { id: 273, count: 0 }, { id: 273, count: 0 },
          { id: 273, count: 0 }, { id: 273, count: 0 }, { id: 273, count: 0 }
        ]
      },
      {
        slotKey: "Code1_2_궁수",
        saveCode: "궁수",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 18:00:00",
        characterName: "궁수",
        characterLevel: 6000,
        petName: "백스플 개구리[펫]",
        gold: 0,
        imperialCoin: 0,
        darkStone: 0,
        str: 4654,
        agi: 21,
        int: 31,
        heroItems: [
          { id: 13, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [],
        warehouseItems: []
      }
    ]
  },
  "hjp0672": {
    userId: "hjp0672",
    seasonPoint: 230,
    honorPoint: 450,
    rankingPoint: 0,
    rankStanding: "총사령관 데르메트",
    titleCode: "TT_TYPE3",
    swordCode: "BLSwrod2",
    swordLevel: 1,
    ownedSwords: ["BLSwrod1", "BLSwrod2"],
    wingId: 5,
    wingLevel: 9,
    sacredPower: "485,660",
    petData: {
      "SP_RGUP4": 12
    },
    ownedCodes: ["SH_1", "SH_2"],
    lastSave: {
      saveDate: "2026-08-03 20:32:26",
      characterName: "『시즌』총사령관 데르메트",
      characterLevel: 6000,
      petName: "카오스 라이언[Lv12][펫]",
      petLevel: 6000,
      gold: 1000000,
      imperialCoin: 472636,
      darkStone: 0,
      str: 433208,
      agi: 252598,
      int: 252598,
      heroItems: [
        { id: 361, count: 0 }, { id: 370, count: 0 }, { id: 265, count: 0 },
        { id: 372, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 264, count: 0 }, { id: 370, count: 0 }, { id: 372, count: 0 },
        { id: 339, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_시즌",
        saveCode: "시즌",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:32:26",
        characterName: "『시즌』총사령관 데르메트",
        characterLevel: 6000,
        petName: "카오스 라이언[Lv12][펫]",
        gold: 1000000,
        imperialCoin: 472636,
        darkStone: 0,
        str: 433208,
        agi: 252598,
        int: 252598,
        heroItems: [
          { id: 361, count: 0 }, { id: 370, count: 0 }, { id: 265, count: 0 },
          { id: 372, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 264, count: 0 }, { id: 370, count: 0 }, { id: 372, count: 0 },
          { id: 339, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      }
    ]
  },
  "0o0": {
    userId: "0o0",
    seasonPoint: 10,
    honorPoint: 0,
    rankingPoint: 0,
    rankStanding: "일반 유저",
    titleCode: "TT_TYPE1",
    swordCode: "BLSwrod0",
    swordLevel: 1,
    ownedSwords: [],
    wingId: 1,
    wingLevel: 1,
    sacredPower: "0",
    petData: {
      "SP_FROG": 1
    },
    ownedCodes: ["SH_1"],
    lastSave: {
      saveDate: "2026-08-03 20:32:26",
      characterName: "『시즌』젤리 큐브",
      characterLevel: 6000,
      petName: "백스플 개구리[펫]",
      petLevel: 4990,
      gold: 1000000,
      imperialCoin: 9,
      darkStone: 0,
      str: 42153,
      agi: 42073,
      int: 72068,
      heroItems: [
        { id: 223, count: 0 }, { id: 224, count: 0 }, { id: 220, count: 0 },
        { id: 219, count: 0 }, { id: 279, count: 0 }, { id: 215, count: 0 }
      ],
      petItems: [
        { id: 190, count: 0 }, { id: 31, count: 0 }, { id: 93, count: 0 },
        { id: 43, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 223, count: 0 }, { id: 190, count: 0 }, { id: 218, count: 0 },
        { id: 217, count: 0 }, { id: 215, count: 0 }, { id: 216, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_젤리",
        saveCode: "젤리",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:32:26",
        characterName: "『시즌』젤리 큐브",
        characterLevel: 6000,
        petName: "백스플 개구리[펫]",
        gold: 1000000,
        imperialCoin: 1310,
        darkStone: 0,
        str: 42153, agi: 42073, int: 72068,
        heroItems: [{ id: 223, count: 0 }, { id: 224, count: 0 }, { id: 220, count: 0 }, { id: 219, count: 0 }],
        petItems: [{ id: 190, count: 0 }, { id: 31, count: 0 }],
        warehouseItems: [{ id: 223, count: 0 }, { id: 190, count: 0 }]
      },
      {
        slotKey: "Code1_2_드래곤",
        saveCode: "드래곤",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:35:12",
        characterName: "드래곤 메이지",
        characterLevel: 6000,
        petName: "백스플 개구리[펫]",
        gold: 0,
        imperialCoin: 1307,
        darkStone: 0,
        str: 42073, agi: 42073, int: 72148,
        heroItems: [], petItems: [], warehouseItems: []
      },
      {
        slotKey: "Code1_2_리치",
        saveCode: "리치",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:36:00",
        characterName: "아크리치",
        characterLevel: 1016,
        petName: "백스플 개구리[펫]",
        gold: 1000000,
        imperialCoin: 936,
        darkStone: 0,
        str: 5115, agi: 5115, int: 10230,
        heroItems: [], petItems: [], warehouseItems: []
      }
    ]
  },
  "sic": {
    userId: "Sic",
    seasonPoint: 111,
    honorPoint: 0,
    isSeasonCompleted: true,
    seasonVersionLabel: "v36",
    rankingPoint: 0,
    rankStanding: "순위 미등록 (일반 유저)",
    titleCode: "TT_TYPE1",
    swordCode: "BLSwrod0",
    swordLevel: 1,
    ownedSwords: [],
    wingId: 1,
    wingLevel: 1,
    sacredPower: "12,273",
    petData: {
      "SP_RGUP1": 15
    },
    ownedCodes: ["SH_60"],
    lastSave: {
      saveDate: "2026-08-03 20:32:26",
      characterName: "『시즌』휴먼 공성 전차",
      characterLevel: 6000,
      petName: "신성 성녀[Lv1][펫]",
      petLevel: 6000,
      gold: 288970,
      imperialCoin: 582557,
      darkStone: 0,
      str: 72148, agi: 42073, int: 42073,
      heroItems: [
        { id: 322, count: 0 }, { id: 320, count: 0 }, { id: 279, count: 0 },
        { id: 298, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 318, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 304, count: 0 }, { id: 361, count: 0 }, { id: 296, count: 0 },
        { id: 370, count: 0 }, { id: 318, count: 0 }, { id: 372, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_1",
        saveCode: "1",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:32:26",
        characterName: "『시즌』휴먼 공성 전차",
        characterLevel: 6000,
        petName: "신성 성녀[Lv1][펫]",
        gold: 288970,
        imperialCoin: 582557,
        darkStone: 0,
        str: 72148, agi: 42073, int: 42073,
        heroItems: [
          { id: 322, count: 0 }, { id: 320, count: 0 }, { id: 279, count: 0 },
          { id: 298, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 318, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 304, count: 0 }, { id: 361, count: 0 }, { id: 296, count: 0 },
          { id: 370, count: 0 }, { id: 318, count: 0 }, { id: 372, count: 0 }
        ]
      }
    ]
  },
  "gowin2": {
    userId: "gowin2",
    seasonPoint: 85,
    honorPoint: 190,
    rankingPoint: 0,
    rankStanding: "일반 유저",
    titleCode: "TT_TYPE2",
    swordCode: "BLSwrod2",
    swordLevel: 1,
    ownedSwords: ["BLSwrod1", "BLSwrod2"],
    wingId: 3,
    wingLevel: 5,
    sacredPower: "0",
    petData: {
      "SP3_3": 1, "SP2_3": 1
    },
    ownedCodes: ["SH_1", "SH_2"],
    lastSave: {
      saveDate: "2026-08-03 23:39:32",
      characterName: "『[2차 전생]』정령들의 주인",
      characterLevel: 6000,
      petName: "빙결의 악몽[Lv3][펫]",
      petLevel: 6000,
      gold: 309606,
      imperialCoin: 151492,
      darkStone: 0,
      str: 60150,
      agi: 60310,
      int: 108142,
      heroItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 297, count: 0 },
        { id: 304, count: 0 }, { id: 360, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 304, count: 0 },
        { id: 297, count: 0 }, { id: 361, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 264, count: 0 }, { id: 303, count: 0 }, { id: 339, count: 0 },
        { id: 263, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_1",
        saveCode: "1",
        mapVersion: "v36.00",
        saveDate: "2025-09-22 21:15:00",
        characterName: "『[2차 전생]』정령들의 주인",
        characterLevel: 6000,
        petName: "빙결의 악몽[Lv3][펫]",
        gold: 309606,
        imperialCoin: 151492,
        darkStone: 0,
        str: 60150,
        agi: 60310,
        int: 108142,
        heroItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 297, count: 0 },
          { id: 304, count: 0 }, { id: 360, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 304, count: 0 },
          { id: 297, count: 0 }, { id: 361, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 264, count: 0 }, { id: 303, count: 0 }, { id: 339, count: 0 },
          { id: 263, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      }
    ]
  },
  "goodsee": {
    userId: "goodsee",
    seasonPoint: 177,
    honorPoint: 0,
    rankingPoint: 0,
    rankStanding: "매의눈 여단장",
    titleCode: "TT_TYPE5",
    swordCode: "BLSwrod1",
    swordLevel: 1,
    ownedSwords: ["BLSwrod1"],
    wingId: 5,
    wingLevel: 9,
    warehouseData: {
      "BLBox1": 1
    },
    sacredPower: "4,812",
    petData: {
      "SP_RGUP1": 1
    },
    ownedCodes: [
      "SH_1", "SH_2"
    ],
    lastSave: {
      saveDate: "2025-09-22 18:46:18",
      characterName: "『시즌』매의눈 여단장",
      characterLevel: 6000,
      petName: "그레이트 씨 헌터[펫]",
      petLevel: 6000,
      gold: 1000000,
      imperialCoin: 166086,
      darkStone: 0,
      str: 63149,
      agi: 108302,
      int: 63149,
      heroItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 297, count: 0 },
        { id: 361, count: 0 }, { id: 279, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 318, count: 0 },
        { id: 297, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 318, count: 0 }, { id: 303, count: 0 }, { id: 299, count: 0 },
        { id: 298, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_1",
        saveDate: "2025-09-22 18:46:18",
        characterName: "『시즌』매의눈 여단장",
        characterLevel: 6000,
        petName: "그레이트 씨 헌터[펫]",
        gold: 1000000,
        imperialCoin: 166086,
        darkStone: 0,
        str: 63149,
        agi: 108302,
        int: 63149,
        heroItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 297, count: 0 },
          { id: 361, count: 0 }, { id: 279, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 318, count: 0 },
          { id: 297, count: 0 }, { id: 339, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 318, count: 0 }, { id: 303, count: 0 }, { id: 299, count: 0 },
          { id: 298, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      }
    ]
  },
  "horus": {
    userId: "Horus",
    seasonPoint: 240,
    honorPoint: 0,
    rankingPoint: 0,
    rankStanding: "시타 응원여단장",
    titleCode: "TT_TYPE5",
    swordCode: "BLSwrod1",
    swordLevel: 1,
    ownedSwords: ["BLSwrod1"],
    wingId: 5,
    wingLevel: 9,
    warehouseData: {
      "BLBox1": 1
    },
    sacredPower: "12,692,677",
    petData: {
      "SP3_2U3": 1
    },
    ownedCodes: [
      "SH_82", "SH_83", "SH_84", "SH_85", "SH_86", "SH_87", "SH_88", "SH_89", "SH_90"
    ],
    lastSave: {
      saveDate: "2026-08-03 21:15:00",
      characterName: "『시즌』시타 응원여단장",
      characterLevel: 6000,
      petName: "블러드 위저드 탈렌[Lv8][펫]",
      petLevel: 6000,
      gold: 1000000,
      imperialCoin: 810039,
      darkStone: 0,
      str: 63149,
      agi: 63149,
      int: 108302,
      heroItems: [
        { id: 370, count: 0 }, { id: 279, count: 0 }, { id: 298, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 320, count: 0 }, { id: 322, count: 0 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_2_2",
        saveCode: "2",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 21:15:00",
        characterName: "『시즌』시타 응원여단장",
        characterLevel: 6000,
        petName: "블러드 위저드 탈렌[Lv8][펫]",
        gold: 1000000,
        imperialCoin: 810039,
        darkStone: 0,
        str: 63149,
        agi: 63149,
        int: 108302,
        heroItems: [
          { id: 370, count: 0 }, { id: 279, count: 0 }, { id: 298, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 320, count: 0 }, { id: 322, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      },
      {
        slotKey: "Code1_2_1",
        saveCode: "1",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:30:00",
        characterName: "사령관 암흑기사장",
        characterLevel: 6000,
        petName: "블러드 위저드 탈렌[펫]",
        gold: 1000000,
        imperialCoin: 456345,
        darkStone: 0,
        str: 216604,
        agi: 126299,
        int: 126299,
        heroItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 279, count: 0 },
          { id: 339, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 361, count: 0 },
          { id: 305, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      }
    ]
  }
};


