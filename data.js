/**
 * 대륙 RPG 매니저 - 데이터베이스 (Database & Config)
 * 유저 아이디별 완전히 독립된 100% 개별 프로필 데이터 (시간 정보 수록)
 */

// ==========================================
// 0. 시스템 버전 및 패치 히스토리 관리 (패치 시마다 버전 업 & 내용 반영)
// ==========================================
const APP_VERSION = "v37.5.5";
const APP_RELEASE_DATE = "2026.10.20";

const PATCH_HISTORY = [
  {
    version: "v37.5.5",
    date: "2026.10.20",
    badge: "LATEST",
    title: "창고 초월 해금 조건(분홍여우·재규어·분홍여우 성체) & 각성 체인(고블린 왕자~루나 고양이) 및 '달토끼' 정밀 매핑",
    items: [
      {
        icon: "📦",
        title: "분홍 여우 · 재규어 · 분홍 여우 성체 ~ 루나 고양이 실제 조건 및 업그레이드 체인 정밀 판별",
        desc: "m16tool 원시 로그의 NBLBox2~4 고정 출력 오류를 배제하고, 타란튤라~상어 Lv.9(분홍 여우), 개미~판다 Lv.9(재규어), BLBoxUP1~6 및 SDATA2[11](분홍 여우 성체 ~ 루나 고양이) 체인을 정확히 매핑하여 HiYuKi, ndaebag, Horus 등의 창고 내역을 100% 일치시켰습니다."
      },
      {
        icon: "🐇",
        title: "최종 각성 특전 창고 '달토끼' 추가 (루나 고양이 MAX Lv.9 달성 시 해금)",
        desc: "루나 고양이 MAX(Lv.9) 달성 시 사용할 수 있는 '달토끼' 창고를 추가하고, 루나 고양이 만렙 유저(Horus 등) 조회 시 자동 해금되도록 연동했습니다."
      },
      {
        icon: "🔮",
        title: "유물 보유 시 받는 모든 버프(8대 항목) 종합 집계 및 보유 유물별 실시간 수치 표시",
        desc: "상시 트리거 데미지, 증표 포함 최대 트리거 데미지, 총 아이템 드랍률, 받는 트리거 데미지 감소, 총 성력 보너스, 초기 생성 제국주화 보너스(+2,700), 계급레벨 보너스(+1), 스코어 보너스 및 보유 유물별 현재 레벨 적용 수치를 한눈에 표시합니다."
      }
    ]
  },
  {
    version: "v37.5.2",
    date: "2026.10.18",
    badge: "UPDATE",
    title: "유물 보유 시 적용되는 전체 8대 버프 종합 현황판 & 보유 유물별 실시간 버프 상세 표시",
    items: [
      {
        icon: "🔮",
        title: "유물 보유 시 받는 모든 버프(8대 항목) 종합 집계 및 보유 유물별 실시간 수치 표시",
        desc: "상시 트리거 데미지, 증표 포함 최대 트리거 데미지, 총 아이템 드랍률, 받는 트리거 데미지 감소, 총 성력 보너스, 초기 생성 제국주화 보너스(+2,700), 계급레벨 보너스(+1), 스코어 보너스 및 보유 유물별 현재 레벨 적용 수치를 한눈에 표시합니다."
      },
      {
        icon: "✨",
        title: "유물 목록박스A(SDATA2) 및 성유물 목록박스A(SP_LBOX1~10) 정밀 분리 매핑",
        desc: "m16tool의 SDATA2 앞 10자리는 '유물 목록박스A(일반 유물 10종)'로, SP_LBOX1~10 코드는 '성유물 목록박스A(성유물 10종 + 전부 MAX 시 로잔티움의 성물 자동 해금)'로 정확히 분리하여 표시합니다."
      },
      {
        icon: "🏆",
        title: "m16tool 공식 유저랭킹 & 계급랭킹 TOP 30 순위·스코어 실시간 동기화",
        desc: "m16tool 공식 랭킹 보드(유저랭킹/계급랭킹)의 실시간 1위~30위 순위 변동 및 스코어, 신규 진입 랭커를 그대로 가져와 100% 동일한 순위로 표시합니다."
      },
      {
        icon: "⚡",
        title: "아이디 조회 시 리프레시 없이 즉시 최신 데이터 반영",
        desc: "페이지 접속 시 프록시 요청 과부하를 유발하던 백그라운드 호출을 최적화하고, 타임스탬프 캐시 방지 및 멀티 프록시 병렬 응답을 적용해 조회 버튼 클릭 즉시 최신 세이브가 표시됩니다."
      },
      {
        icon: "👑",
        title: "상단 스탯 카드(랭킹포인트 & 계급순위) 실제 m16tool 순위 연동",
        desc: "유저 조회 시 상단 카드의 랭킹포인트와 계급순위가 고정된 구버전 수치 대신 실제 m16tool 유저랭킹/계급랭킹 순위 및 점수와 실시간 연동되도록 개선했습니다."
      }
    ]
  },
  {
    version: "v37.4.0",
    date: "2026.10.15",
    badge: "MAJOR",
    title: "신규 아이템 3종/펫 정밀 매핑 & 4대 유물 도감 전면 개편 & 세이브 슬롯 최신순 정렬",
    items: [
      {
        icon: "⚔️",
        title: "신규 아이템 3종 공식 등록 및 미매핑 아이템 코드번호 전용 표기",
        desc: "377번 '헤로스 완드[영웅]', 376번 '헬 윈드보우[영웅]', 375번 '살육자의 도끼'를 정식 등록하였으며, 매핑되지 않은 아이템은 임의의 명칭 대신 순수 코드 번호(#ID)로만 깔끔하게 표시하도록 개선했습니다."
      },
      {
        icon: "📂",
        title: "세이브 슬롯 최신 저장 슬롯 최우선(맨 앞) 자동 정렬 및 기본 선택",
        desc: "계정 조회 시 가장 최근에 저장된 최신 세이브 슬롯이 맨 앞에 배치되고, 최초 화면에 최신 저장 슬롯 데이터부터 즉시 활성화되도록 순서 정렬을 전면 개편했습니다."
      },
      {
        icon: "🐾",
        title: "goodwin 펫 '빙결의 악몽' 매핑 정상화 & 신규 펫 '켈자르맨서 코르' 등록",
        desc: "goodwin의 펫을 실제 장착 펫인 '빙결의 악몽[Lv3][펫]'으로 완벽하게 매핑하고 오류를 제거하였으며, 신규 추가된 펫 '켈자르맨서 코르[펫]'을 도감 및 시스템에 공식 등록했습니다."
      },
      {
        icon: "🏹",
        title: "kk2103 2대 세이브 슬롯 캐릭터 명칭 정밀 연동",
        desc: "kk2103 유저의 37_궁수 슬롯을 '[2차 전생]신궁' 및 '켈자르맨서 코르[펫]'으로, 37_1234 슬롯을 '[2차 전생]지천사'로 정확하게 분리 등록했습니다."
      },
      {
        icon: "🗡️",
        title: "성검 탭 듀란달 전승 효과 발동 및 소유 성검 우선 배치",
        desc: "4대 성검 전승 달성 시 듀란달의 초월 효과가 시각적으로 즉시 활성화되며, 보유/장착 중인 성검이 목록 앞쪽에 우선 정렬되어 한눈에 파악할 수 있도록 개선했습니다."
      },
      {
        icon: "🪽",
        title: "goodwin 날개 코드 정확한 미보유 판정 및 날개 시스템 정밀화",
        desc: "날개 미소유 유저에게 날개가 표시되던 문제를 수정하고, m16tool의 NBWing 코드를 정확하게 분석하여 미소유 시 '장착된 날개 없음'으로 엄격하게 판정합니다."
      },
      {
        icon: "🔮",
        title: "공식 4대 유물 도감 시스템 전면 개편 (최대 Lv.9)",
        desc: "유물 목록박스A(10종, SP_LBOX), 성유물 목록박스A(11종), 성유물 목록박스B(1종, 파멸 성물), 신유물 목록박스A(1종, 태극령)의 전체 23종 유물 도감 및 레벨별 세부 옵션/획득 경로를 완벽 탑재했습니다."
      }
    ]
  },
  {
    version: "v37.3.3",
    date: "2026.10.15",
    badge: "UPDATE",
    title: "랭킹 분석실 & 유저 프로필 '673 주화' v37 최신 세이브 실시간 동기화 및 캐시 버스팅 적용",
    items: [
      {
        icon: "🪙",
        title: "goodwin 673 제국 주화(v37 최신 세이브) 1:1 완전 일치",
        desc: "과거 v36 시즌 슬롯의 117,838 주화가 랭킹 분석실에 노출되던 원인을 원천 차단하고, 2026년 10월 15일 최신 저장(Code1_37_1)의 673 주화 및 670,813 Gold를 랭킹 테이블에 100% 실시간 반영했습니다."
      },
      {
        icon: "🔄",
        title: "랭킹-프로필 양방향 실시간 동기화 엔진 (Two-Way Live Sync) 가동",
        desc: "프로필 로드 및 세이브 슬롯 변경 시 랭킹 테이블 내 유저 데이터가 즉시 갱신되며, 랭킹 분석실 진입 시에도 최신 세이브 슬롯의 주화/골드/스탯을 최우선 연동하도록 구조를 개편했습니다."
      },
      {
        icon: "🛡️",
        title: "신규 v37 아이템 4종(#377, #375, #376, #266) 도감 등록",
        desc: "v37 세이브 인벤토리에 장착된 신규 아이템 고유 ID를 도감에 등록하여 미등록 박스가 아닌 정규 등급 아이템으로 렌더링되도록 처리했습니다."
      },
      {
        icon: "🚀",
        title: "브라우저 정적 자원 캐시 버스팅(?v=37.3.3) 적용",
        desc: "스크립트 및 스타일시트에 버전 쿼리를 추가하여 브라우저에 구버전(117,838 주화 시절) 스크립트가 캐시되어 갱신이 지연되는 현상을 완전히 방지했습니다."
      }
    ]
  },
  {
    version: "v37.3.2",
    date: "2026.10.15",
    badge: "UPDATE",
    title: "랭킹 분석실 1위부터 기본 정렬 정상화 & v37 최신 세이브 기준 표기 엄수 & 정렬 기준 시각화 강화",
    items: [
      {
        icon: "👑",
        title: "기본 순위 1위부터 정렬(1위 ➔ 30위) 정상화",
        desc: "랭킹 분석실 탭을 열었을 때 기본 순위가 30위부터 역순으로 정렬되던 문제를 수정하여, 공식 1위부터 정상적으로 표시되도록 개선했습니다."
      },
      {
        icon: "🛡️",
        title: "v37 최신 세이브(Code1_37_...) 기준 데이터 엄수 및 슬롯 태그 표기",
        desc: "랭킹 테이블 및 프로필 조회 시 과거 시즌의 최고 수치가 아닌 현재 시즌(v37) 최신 세이브 슬롯 데이터 기준으로 주화/골드/스탯을 일치시켰으며, 랭커 행마다 세이브 슬롯 태그(#37_1, #37_시즌 등)를 명시했습니다."
      },
      {
        icon: "📊",
        title: "정렬 기준 실시간 안내 배너 & 정렬 열(컬럼) 하이라이트 강화",
        desc: "정렬 버튼 클릭 시 상단 안내 배너에 현재 정렬 기준(예: 🪙 제국 주화 [높은 순 ▼])과 상세 해설이 실시간 표시되고, 테이블 내 해당 열(헤더 및 전체 셀)에 하이라이트 효과가 적용되어 어떤 데이터 기준인지 한눈에 알 수 있습니다."
      },
      {
        icon: "👆",
        title: "테이블 헤더 제목 클릭 정렬 및 1위 초기화 버튼 추가",
        desc: "테이블 헤더(제목 열)를 클릭하여 즉시 정렬할 수 있으며, '👑 1위부터 보기 (초기화)' 버튼으로 언제든 기본 1위 순위로 되돌아갈 수 있습니다."
      }
    ]
  },
  {
    version: "v37.3.1",
    date: "2026.10.15",
    badge: "UPDATE",
    title: "랭킹 분석실 '최신 저장 세이브' 기준 주화 표기 전환 & 다중 슬롯 주화 뱃지 지원",
    items: [
      {
        icon: "🪙",
        title: "랭킹 분석실 주화 갯수 '최신 저장(Latest Save)' 기준 전면 개편",
        desc: "기존의 전 슬롯 중 최대치(Max) 집계 방식에서 벗어나, 현재 m16tool에 저장된 최신 세이브 슬롯(Latest Save)의 실제 주화/골드/스탯을 1:1로 정확하게 표시하도록 전면 개편했습니다 (예: goodwin 235 주화, Horus 344,254 주화, HiYuKi 174,802 주화 등)."
      },
      {
        icon: "📂",
        title: "다중 세이브 슬롯 완전 보존 & 슬롯 버튼별 주화 수량 뱃지 표기",
        desc: "최신 버전 외의 다른 세이브 슬롯이 필터링되어 사라지던 문제를 해결하여 계정 내 모든 슬롯을 100% 보존하고, 세이브 슬롯 선택 버튼마다 [저장코드 #2] (🪙 117,838)처럼 보유 주화 수량을 한눈에 확인할 수 있도록 개선했습니다."
      },
      {
        icon: "🔄",
        title: "m16tool 라이브 동기화 상태 투명화",
        desc: "외부 프록시 지연으로 캐시된 데이터가 표시될 때와 실시간 동기화가 완료되었을 때의 상태 안내를 명확히 구분하여 데이터 갱신 여부를 바로 알 수 있도록 처리했습니다."
      }
    ]
  },
  {
    version: "v37.3.0",
    date: "2026.10.14",
    badge: "MAJOR & RANKINGS",
    title: "m16tool 실시간 연동 랭킹 분석실 & 유저/계급 랭킹 스코어 계산 공식 완전 해설 탑재",
    items: [
      {
        icon: "🏆",
        title: "m16tool 유저랭킹 TOP 30 & 계급랭킹 TOP 30 실시간 정렬 뷰 신설",
        desc: "m16tool 공식 유저랭킹(30인)과 계급랭킹(30인)의 실시간 데이터를 통합하여, 순위/스코어/시즌포인트(iPOINT)/명예포인트(iRP)/제국주화/성력(GodSwordPoint)/소지골드/3대스탯을 한눈에 비교할 수 있는 [🏆 랭킹 분석실] 탭을 신설했습니다."
      },
      {
        icon: "🎯",
        title: "5대 핵심 지표별 다중 정렬 (시즌포인트, 명예포인트, 주화, 성력, 스코어)",
        desc: "기본 순위뿐만 아니라 시즌포인트순, 명예포인트순, 제국주화순, 성력순, 스코어순, 골드순, 스탯순으로 즉시 재정렬하고, 검색창을 통해 원하는 랭커를 실시간으로 검색할 수 있습니다."
      },
      {
        icon: "📐",
        title: "계급랭킹 & 유저랭킹 스코어 산출 공식(수식 및 가중치) 완전 분석 리포트",
        desc: "계급랭킹의 핵심 공식[(명예포인트 × 2) + 시즌포인트 + 박스포인트 합산]과 유저랭킹의 지배적 지표인 성력(GodSwordPoint) 가중치(×11.5), 3대 스탯, 보유 재화의 스코어 반영 메커니즘을 실제 최상위 랭커 실측 데이터를 통해 완벽하게 해설합니다."
      },
      {
        icon: "🔍",
        title: "랭커 아이디 원클릭 프로필 즉시 조회 연동",
        desc: "랭킹 테이블에서 원하는 랭커 아이디를 클릭하면 해당 랭커의 프로필이 메인 화면에 즉시 로딩되어 보유 캐릭터, 펫, 창고, 세이브 슬롯을 바로 분석할 수 있습니다."
      },
      {
        icon: "📱",
        title: "모바일 & 태블릿 최적화 랭킹 반응형 UI 탑재",
        desc: "모바일 환경에서도 랭킹 통계 및 수식 카드가 깨지지 않도록 부드러운 가로 스크롤 및 컴팩트 칩 디자인을 적용했습니다."
      }
    ]
  },
  {
    version: "v37.2.1",
    date: "2026.10.14",
    badge: "FIX & ENHANCE",
    title: "신/구 승급 연계도 렌더링 정상화 & 시즌포인트 구대륙 2대 선행 상세 제작법 추가",
    items: [
      {
        icon: "⚡",
        title: "신/구 승급 연계도 (Bridge) 렌더링 정상화 및 4대 계보 상세화",
        desc: "승급 연계도 클릭 시 빈 화면으로 나오던 데이터 속성 불일치 문제를 해결하고, 4대 승급 체인의 단계별 필요 재료 칩과 진행 플로우를 세부적으로 표시하도록 개선했습니다."
      },
      {
        icon: "📜",
        title: "핑크게이 카드 내 구대륙 2대 선행(신대륙인의 문장 12단계 & 봉인 해제자 칭호 7단계) 상세 제작법 탑재",
        desc: "시즌포인트 핑크게이의 문장 및 나이트메어 반지 제작의 첫 관문인 '신대륙인의 문장(무기 9단계+문장 10단계)'과 '봉인 해제자 칭호(8괘+5대 칭호)'의 세부 제작법과 필요 재료를 카드 내부 아코디언으로 직접 확인할 수 있도록 구축했습니다."
      },
      {
        icon: "📌",
        title: "힘의 인장Lv2 카드 내 구대륙 '심연의 해적 인장(3단계)' 제작법 상세 안내",
        desc: "기본 힘/민/지 인장 및 콜럼버스의 인장을 거쳐 심연의 해적 인장을 만드는 상세 레시피를 인장 카드 내에 직접 수록했습니다."
      }
    ]
  },
  {
    version: "v37.2.0",
    date: "2026.10.14",
    badge: "MAJOR",
    title: "구대륙 조합 도감 (41종) 신설 & 신/구대륙 계승·승급 연계 시스템 구축",
    items: [
      {
        icon: "📜",
        title: "구대륙 전체 조합법 41종 정식 추가 (총 69종)",
        desc: "공통(7종), 무기(9종), 문장(12종), 칭호(7종), 인장(5종), 특수(1종) 등 구대륙 전체 41종 조합법을 도감에 신규 등록하여 신대륙(28종)과 함께 통합 지원합니다."
      },
      {
        icon: "⚡",
        title: "신/구대륙 승급 연계 및 선행 트리 매칭 (Bridge System)",
        desc: "구대륙 무기/문장 ➔ 신대륙인의 문장 ➔ 긴급용 무기 ➔ 핑크게이/나이트메어 연계, 8괘/5대 칭호 ➔ 봉인 해제자 칭호 연계, 콜럼버스 ➔ 심연의 해적 ➔ 신대륙 힘의 인장Lv2 연계 등 4대 승급 계보를 도감 카드 및 시각 다이어그램으로 완벽 연계했습니다."
      },
      {
        icon: "🗺️",
        title: "조합법 탭 대륙별 필터 및 승급 연계도 뷰 신설",
        desc: "조합법 탭 상단에 [전체(69종)], [신대륙(28종)], [구대륙(41종)], [신/구대륙 승급 연계도] 대륙 전용 필터 버튼을 추가하여 원하는 대륙의 조합법을 손쉽게 탐색할 수 있습니다."
      },
      {
        icon: "⭐",
        title: "시즌포인트 6대 테크트리 내 구대륙 선행 조건 명시",
        desc: "핑크게이의 문장 및 힘의 인장Lv2 등 시즌포인트 핵심 장비 제작에 요구되는 구대륙 베이스 아이템 계보를 명확하게 안내합니다."
      }
    ]
  },
  {
    version: "v37.1.3",
    date: "2026.10.13",
    badge: "UPDATE",
    title: "모바일 & 태블릿 반응형 UI/UX 전면 최적화",
    items: [
      {
        icon: "📱",
        title: "모바일 화면(스마트폰/태블릿) 맞춤형 반응형 레이아웃 도입",
        desc: "헤더 검색창, 프로필 7대 핵심 스탯 카드, 최근 세이브 요약 패널을 스마트폰 화면 비율에 맞추어 유연한 세로 스택 및 2열 그리드로 자동 재배치했습니다."
      },
      {
        icon: "⚔️",
        title: "시즌 1~10 캐릭터 매트릭스 & 인벤토리 모바일 뷰 개편",
        desc: "기존 5열 고정 매트릭스를 모바일 화면 크기에 따라 3열➔2열➔1열로 자동 전환하고, 인벤토리 6칸 슬롯의 텍스트 짤림을 개선하여 스마트폰에서도 한눈에 파악할 수 있도록 최적화했습니다."
      },
      {
        icon: "📜",
        title: "조합법 & 시즌포인트 테크트리 터치/스크롤 경험 향상",
        desc: "조합법 카테고리 필터 가로 터치 스크롤 지원, 6대 아이템 아코디언 카드 및 제작 단계, 필요 원자재 칩이 좁은 화면에서도 쾌적하게 보이도록 반응형 스타일을 적용했습니다."
      },
      {
        icon: "✨",
        title: "세이브 슬롯 & 탭 메뉴 모바일 스와이프 지원",
        desc: "상단 메인 탭과 복수 세이브 슬롯 선택 버튼에 모바일 네이티브 가로 터치 스크롤(-webkit-overflow-scrolling)을 적용했습니다."
      }
    ]
  },
  {
    version: "v37.1.2",
    date: "2026.10.12",
    badge: "UPDATE",
    title: "신규 아이템 매핑 등록 (나이트메어 반지, 블루티렉스 칭호/가죽)",
    items: [
      {
        icon: "💍",
        title: "373번 '나이트메어 반지[반 신급]' 등록 및 시즌포인트 보유 연동",
        desc: "시즌포인트 6대 필수 조건 아이템 중 하나인 '나이트메어 반지[반 신급]'의 고유 ID 373번을 정식 등록하여 인벤토리 보유 판정에 연동했습니다."
      },
      {
        icon: "🏷️",
        title: "367번 '블루티렉스 퇴치 칭호[에픽]' 등록",
        desc: "인게임 칭호 아이템 367번 '블루티렉스 퇴치 칭호[에픽]'을 도감에 등록했습니다."
      },
      {
        icon: "🦖",
        title: "368번 '[레전드급]블루티렉스 가죽' 등록",
        desc: "레전드급 재료/장비 아이템 368번 '[레전드급]블루티렉스 가죽'을 도감에 등록했습니다."
      }
    ]
  },
  {
    version: "v37.1.1",
    date: "2026.10.12",
    badge: "UPDATE",
    title: "아이템 매핑 보정 - 374번 치프틴 그람의 목걸이[조합체]",
    items: [
      {
        icon: "📿",
        title: "고유 ID 374 '치프틴 그람의 목걸이[조합체]' 매핑 수정",
        desc: "인게임 세이브 데이터 374번 고유 코드를 '스피드 스크롤'에서 시즌포인트 6대 필수 조건 아이템인 '치프틴 그람의 목걸이[조합체]'로 정확하게 매핑 수정했습니다."
      },
      {
        icon: "✨",
        title: "시즌포인트 도감 및 인벤토리 보유 감지 연동",
        desc: "영웅 인벤토리/창고의 374번 아이템이 정상 인식되어, 조합법 탭의 '시즌포인트 6대 필수 아이템' 인벤토리 보유 상태(🌟 현재 인벤토리 보유!)와 완벽 동기화됩니다."
      }
    ]
  },
  {
    version: "v37.1.0",
    date: "2026.10.12",
    badge: "UPDATE",
    title: "신대륙 조합법 도감 & 시즌포인트 6대 테크트리 신설",
    items: [
      {
        icon: "📜",
        title: "신대륙 조합법 도감 & 조합법 탭 신설",
        desc: "유물 탭 우측에 '조합법' 전용 탭이 추가되었습니다. 공통, 무기, 갑옷, 문장, 악세, 인장 등 신대륙 28종 전체 조합법을 실시간 텍스트 검색 및 카테고리 필터로 편리하게 조회할 수 있습니다."
      },
      {
        icon: "⭐",
        title: "시즌포인트 6대 필수 아이템 테크트리 & 재화 분석",
        desc: "치프틴 그람의 목걸이(4주화), 핑크게이의 문장(49주화/100만G), 푸른 가이아의 특혜(331주화/40만G), 힘의 인장Lv2(5주화), 나이트메어 반지(49주화/100만G), 시즌포인트 깃발의 단계별 제작 순서, 누적 주화/골드 소요량, 필요 원자재 총량 및 현재 인벤토리 보유 여부를 실시간 제공합니다."
      },
      {
        icon: "💎",
        title: "v37 인벤토리/창고/펫 고유 ID 신규 매핑 대거 등록",
        desc: "데스토의 제왕홀(320), 스피드 스크롤(374), 파란빛 목걸이(242), 그림자 목걸이(258), 신대륙의 첫번째 보물(259), 신대륙의 두번째 보물(260), 스피릿 목걸이-레어-(237), 치프틴 그람의 목걸이(9) 등 신규 아이템을 실시간 등록했습니다."
      },
      {
        icon: "⚡",
        title: "로컬 서버 CORS 라이브 프록시 지원 (server.py)",
        desc: "로컬 테스트 환경에서도 m16tool 라이브 검색이 100% 정상 작동하도록 내장 프록시 서버를 지원합니다."
      }
    ]
  },
  {
    version: "v37.0.0",
    date: "2026.10.11",
    badge: "MAJOR",
    title: "v37 최신 시즌 대응 & m16tool 신규 개편 로그 연동",
    items: [
      {
        icon: "🚀",
        title: "v37 최신 시즌 세이브 슬롯 자동 필터링",
        desc: "Code1_37_시즌 등 신규 시즌 세이브 슬롯을 감지하여 최신 버전 슬롯만 우선 표시하며, 원본 저장코드명(#시즌)을 온전히 보존합니다."
      },
      {
        icon: "🎖️",
        title: "시즌포인트 획득 & 달성 캐릭터 상세 표시",
        desc: "'시즌포인트획득': 'v37' 및 달성 캐릭터(『시즌』사령관 암흑기사장 등)를 판독하여 상단 배너와 배지에 실시간 노출합니다."
      },
      {
        icon: "⚔️",
        title: "SH_1 ~ SH_90 캐릭터 소유(1=소유, 0=미소유) 100% 동기화",
        desc: "개편된 로그의 90종 캐릭터 소유 코드(1/0)를 실시간 반영하여 시즌 1~10 캐릭터 도감 소유 현황을 완벽 동기화합니다."
      },
      {
        icon: "🐾",
        title: "펫 레벨 진화 & 업그레이드 체인 정밀 판정",
        desc: "SP_1~9 소유 판정, SP2_1~9 레벨별 펫 변환, 9강 Max 달성 시 다음 단계 해금 및 고티어 업그레이드 펫(SP3 / RGUP) 우선 인식을 적용했습니다."
      },
      {
        icon: "📦",
        title: "창고(BLBox) & 성검(BLSwrod) 최신 로그 연동",
        desc: "BLBox1~11 및 각성 창고(BLBoxUP1~6), 4대 성검 및 듀란달의 9강 레벨 수치와 소유 현황을 실시간 연동합니다."
      },
      {
        icon: "🔍",
        title: "조회 유저 아이디 실시간 표시",
        desc: "검색 완료 시 헤더 우측에 현재 조회된 유저 아이디가 선명하게 표시됩니다."
      }
    ]
  }
];

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

// 5. 공식 창고 (Warehouse Box) 22종 데이터 및 9레벨/초월 조합 트리
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
  { code: "NBLBox2", name: "분홍 여우", category: "초월 창고", maxLevel: 9, isUnlockOnly: true, req: "타란튤라Lv9, 고슴도치Lv9, 알파카Lv9, 상어Lv9 소유시 사용 가능" },
  { code: "NBLBox3", name: "재규어", category: "초월 창고", maxLevel: 9, isUnlockOnly: true, req: "개미Lv9, 거북이Lv9, 큰뿔사슴Lv9, 코끼리Lv9, 벤디트 개Lv9, 판다Lv9 소유시 사용 가능" },
  { code: "NBLBox4", name: "분홍 여우 성체", category: "최상위 초월 창고", maxLevel: 9, req: "분홍여우, 재규어 소유시 사용 가능 (최대 Lv.9 업그레이드)" },
  { code: "NBLBox_UP1", altCode: "BLBoxUP1", name: "고블린 왕자", category: "각성 창고", maxLevel: 9, req: "분홍 여우 성체 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP2", altCode: "BLBoxUP2", name: "고블린 황제", category: "각성 창고", maxLevel: 9, req: "고블린 왕자 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP3", altCode: "BLBoxUP3", name: "소울 구울", category: "각성 창고", maxLevel: 9, req: "고블린 황제 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP4", altCode: "BLBoxUP4", name: "다이스 조커", category: "각성 창고", maxLevel: 9, req: "소울 구울 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP5", altCode: "BLBoxUP5", name: "검은눈 고양이", category: "각성 창고", maxLevel: 9, req: "다이스 조커 MAX (Lv9) 달성시 가능" },
  { code: "NBLBox_UP6", altCode: "BLBoxUP6", name: "루나 고양이", category: "최종 각성 창고", maxLevel: 9, req: "검은눈 고양이 MAX (Lv9) 달성시 가능 (최대 Lv.9 업그레이드)" },
  { code: "NBLBox_MOON", name: "달토끼", category: "초월 특전 창고", maxLevel: 9, isUnlockOnly: true, req: "루나 고양이 MAX (Lv9) 달성시 사용 가능" }
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
  },
  {
    level: 10,
    title: "신규 & 특수 펫 묶음",
    pets: [
      { code: "SP_KEL", name: "켈자르맨서 코르[펫]", desc: "v37 신규 추가 특수 펫" },
      { code: "SP_FROG", name: "백스플 개구리[펫]", desc: "특수 이벤트 펫" }
    ]
  }
];

// 7. 공식 유물 (Relics) 4대 목록박스 데이터베이스 (최대 Lv.9)
const RELICS_DATABASE = [
  {
    boxId: "relic_box_a",
    boxTitle: "유물 목록박스A",
    icon: "🔮",
    badge: "10종 도감 (SDATA2 기본 유물)",
    desc: "기본/이벤트/보스 처치로 획득 가능한 10대 기본 유물입니다. (최대 Lv.9)",
    items: [
      { code: "REL_A1", name: "이키라의 석상", source: "블랙 히드라 데릭", maxLevel: 9, option: "레벨당 트리거 데미지 5%", baseVal: 5, unit: "%", type: "triggerDmg" },
      { code: "REL_A2", name: "도굴꾼의 석상", source: "이벤트 획득", maxLevel: 9, option: "레벨당 아이템 드랍률 3%", baseVal: 3, unit: "%", type: "dropRate" },
      { code: "REL_A3", name: "서리 석상", source: "미정", maxLevel: 9, option: "레벨당 트리거 데미지 5%, LV9달성시 시즌 영웅의 증표 습득시 효과 2배", baseVal: 5, unit: "%", type: "triggerDmgSpecial" },
      { code: "REL_A4", name: "벨레브의 석상", source: "미정", maxLevel: 9, option: "레벨당 트리거 데미지 5%, LV9달성시 전설의 증표 습득시 효과 3배", baseVal: 5, unit: "%", type: "triggerDmgSpecial" },
      { code: "REL_A5", name: "은빛버드의 석상", source: "미정", maxLevel: 9, option: "레벨당 트리거 데미지 5%, LV9달성시 사령관의 증표 습득시 효과 3배", baseVal: 5, unit: "%", type: "triggerDmgSpecial" },
      { code: "REL_A6", name: "데빌로의 석상", source: "미정", maxLevel: 9, option: "레벨당 트리거 데미지 10%, LV9달성시 총사령관의 증표 습득시 효과 5배", baseVal: 10, unit: "%", type: "triggerDmgSpecial" },
      { code: "REL_A7", name: "퍼프로의 석상", source: "이벤트 획득", maxLevel: 9, option: "레벨당 드랍률 증가 5%", baseVal: 5, unit: "%", type: "dropRate" },
      { code: "REL_A8", name: "기오루의 석상", source: "미정", maxLevel: 9, option: "레벨당 받는 트리거 데미지 -1%, 기오루의 석상, 이무기의 석상, 인비즈의 석상 합산", baseVal: -1, unit: "%", type: "dmgReduce" },
      { code: "REL_A9", name: "이무기의 석상", source: "미정", maxLevel: 9, option: "레벨당 받는 트리거 데미지 -1%, 기오루의 석상, 이무기의 석상, 인비즈의 석상 합산", baseVal: -1, unit: "%", type: "dmgReduce" },
      { code: "REL_A10", name: "인비즈의 석상", source: "미정", maxLevel: 9, option: "레벨당 받는 트리거 데미지 -1%, 기오루의 석상, 이무기의 석상, 인비즈의 석상 합산", baseVal: -1, unit: "%", type: "dmgReduce" }
    ]
  },
  {
    boxId: "holy_relic_box_a",
    boxTitle: "성유물 목록박스A",
    icon: "✨",
    badge: "11종 도감 (SP_LBOX 성유물)",
    desc: "이벤트 및 후원(SP_LBOX1~10) / 성유물A 전부 MAX 달성 시 해금되는 고대 성유물입니다. (최대 Lv.9)",
    items: [
      { code: "HRL_1", name: "바티칸의 성물", source: "이벤트 및 후원", maxLevel: 9, option: "레벨당 트리거 데미지 10%", baseVal: 10, unit: "%", type: "triggerDmg" },
      { code: "HRL_2", name: "로티엘의 깃털", source: "이벤트 및 후원", maxLevel: 9, option: "레벨당 아이템 드랍률 5%", baseVal: 5, unit: "%", type: "dropRate" },
      { code: "HRL_3", name: "콜롬버스의 나침반", source: "이벤트 및 후원", maxLevel: 9, option: "레벨당 초기 캐릭터 생성시 지급되는 제국주화 재화량 +300", baseVal: 300, unit: "주화", type: "coinBonus" },
      { code: "HRL_4", name: "축복의 성잔", source: "이벤트 및 후원", maxLevel: 9, option: "레벨당 성력 증가량 +1", baseVal: 1, unit: "", type: "sacredPower" },
      { code: "HRL_5", name: "청룡의 유물", source: "이벤트 및 후원", maxLevel: 9, option: "시즌 영웅의 증표 습득시 레벨당 트리거 데미지 +15%", baseVal: 15, unit: "%", type: "triggerDmg" },
      { code: "HRL_6", name: "갓파의 유물", source: "이벤트 및 후원", maxLevel: 9, option: "전설의 증표 습득시 레벨당 트리거 데미지 +15%", baseVal: 15, unit: "%", type: "triggerDmg" },
      { code: "HRL_7", name: "봉황의 깃털", source: "이벤트 및 후원", maxLevel: 9, option: "사령관의 증표 습득시 레벨당 트리거 데미지 +15%", baseVal: 15, unit: "%", type: "triggerDmg" },
      { code: "HRL_8", name: "로툴러스의 모래시계", source: "이벤트 및 후원", maxLevel: 9, option: "레벨당 받는 트리거 데미지 -2%, 로툴러스의 모래시계, 발키리의 잔, 이브의 귀걸이 합산", baseVal: -2, unit: "%", type: "dmgReduce" },
      { code: "HRL_9", name: "발키리의 잔", source: "이벤트 및 후원", maxLevel: 9, option: "레벨당 받는 트리거 데미지 -2%, 로툴러스의 모래시계, 발키리의 잔, 이브의 귀걸이 합산", baseVal: -2, unit: "%", type: "dmgReduce" },
      { code: "HRL_10", name: "이브의 귀걸이", source: "이벤트 및 후원", maxLevel: 9, option: "레벨당 받는 트리거 데미지 -2%, 로툴러스의 모래시계, 발키리의 잔, 이브의 귀걸이 합산", baseVal: -2, unit: "%", type: "dmgReduce" },
      { code: "HRL_ROZ", name: "로잔티움의 성물", source: "성유물 목록박스A 전부 MAX 소지", maxLevel: 1, option: "아이템드랍률 +50%, 트리거 데미지 +100%, 계급레벨 +1, 성력 증가량 +5, 받는 트리거 데미지 +26%(성유물A효과 합산)", type: "setBonus" }
    ]
  },
  {
    boxId: "holy_relic_box_b",
    boxTitle: "성유물 목록박스B",
    icon: "💀",
    badge: "1종 도감 (파멸의 성유물)",
    desc: "로잔티움의 성물 소유 시 해금되는 상위 성유물입니다. (최대 Lv.9)",
    items: [
      { code: "HRL_B_ROZ", name: "로잔티움의 파멸 성물", source: "로잔티움의 성물 소유시", maxLevel: 9, option: "로잔티움의 성물 소유시, 로잔티움의 파멸 성물 레벨에 따라 효과 증가 / 레벨당 아이템 드랍률 +10%, 트리거 데미지 +15%", baseVal: 15, unit: "%", type: "special" }
    ]
  },
  {
    boxId: "divine_relic_box_a",
    boxTitle: "신유물 목록박스A",
    icon: "👑",
    badge: "1종 도감 (최상위 신유물)",
    desc: "특수 혜택으로 제공되는 최상위 신유물입니다. (최대 Lv.9)",
    items: [
      { code: "DRL_TAEGUK", name: "태극령", source: "특수 혜택", maxLevel: 9, option: "레벨당 드랍률 +25%, 레벨당 트리거 데미지 +50%, 레벨당 성력 증가량 +1, 레벨당 받는 트리거 데미지 -5%, 레벨당 스코어 점수 +2", type: "mythic" }
    ]
  }
];

const OTHER_TABS_DATA = {
  relics: RELICS_DATABASE
};

// 7-1. 신대륙 전체 아이템 조합법 데이터베이스
const NEW_CONTINENT_RECIPES = [
  // 1. 공통
  {
    id: "rec_necklace_blue",
    category: "공통",
    categoryKey: "common",
    name: "파란빛 목걸이[조합체]",
    coin: 1,
    gold: 0,
    materials: ["파란빛 목걸이 조합서", "스피릿 목걸이 -레어-", "블러드 스톤[조합재료]"],
    rank: "조합체",
    icon: "📿"
  },
  {
    id: "rec_necklace_shadow",
    category: "공통",
    categoryKey: "common",
    name: "그림자 목걸이[조합체]",
    coin: 3,
    gold: 0,
    materials: ["그림자 목걸이 조합서", "파란빛 목걸이[조합체]", "산적왕의 목걸이"],
    rank: "조합체",
    icon: "📿"
  },
  {
    id: "rec_treasure_1",
    category: "공통",
    categoryKey: "common",
    name: "신대륙의 첫번째 보물[조합체]",
    coin: 4,
    gold: 0,
    materials: ["신대륙의 첫번째 보물 조합서", "그림자 목걸이[조합체]", "장곤충의 보석[조합재료]"],
    rank: "조합체",
    icon: "🏆"
  },
  {
    id: "rec_treasure_2",
    category: "공통",
    categoryKey: "common",
    name: "신대륙의 두번째 보물[조합체]",
    coin: 4,
    gold: 0,
    materials: ["신대륙의 두번째 보물 조합서", "신대륙의 첫번째 보물[조합체]", "스컬 보석[조합재료]"],
    rank: "조합체",
    icon: "🏆"
  },
  {
    id: "rec_treasure_3",
    category: "공통",
    categoryKey: "common",
    name: "신대륙의 세번째 보물[조합체]",
    coin: 10,
    gold: 0,
    materials: ["신대륙의 세번째 보물 조합서", "신대륙의 두번째 보물[조합체]", "로구밍의 다리[조합재료]", "얼음의 병[조합재료]"],
    rank: "조합체",
    icon: "🏆"
  },
  {
    id: "rec_treasure_4",
    category: "공통",
    categoryKey: "common",
    name: "신대륙의 네번째 보물[조합체]",
    coin: 15,
    gold: 0,
    materials: ["신대륙의 네번째 보물 조합서", "신대륙의 세번째 보물[조합체]", "코브라의 독[조합재료]", "바실리스크의 보석[조합재료]"],
    rank: "조합체",
    icon: "🏆"
  },
  {
    id: "rec_demon_armor",
    category: "공통",
    categoryKey: "common",
    name: "-유니크급-데몬의 갑옷",
    coin: 18,
    gold: 0,
    materials: ["데몬의 갑옷 조합서", "-유니크급-낚시꾼의 갑옷", "데몬의 파편[조합재료]"],
    rank: "유니크급",
    icon: "🛡️"
  },
  {
    id: "rec_trophy_3",
    category: "공통",
    categoryKey: "common",
    name: "3트로피3[조합체]",
    coin: 17,
    gold: 0,
    materials: ["3트로피3 조합서", "-유니크급-데몬의 갑옷", "신대륙의 네번째 보물[조합체]"],
    rank: "조합체",
    icon: "🏆"
  },
  {
    id: "rec_spirit_shield",
    category: "공통",
    categoryKey: "common",
    name: "스피릿 방패[조합체]",
    coin: 16,
    gold: 0,
    materials: ["스피릿 방패 조합서", "신대륙의 네번째 보물[조합체]", "은빛 반지[희귀급]", "데몬의 파편[조합재료]"],
    rank: "조합체",
    icon: "🛡️"
  },

  // 2. 무기 / 에픽
  {
    id: "rec_desto_scepter",
    category: "무기",
    categoryKey: "weapon",
    name: "데스토의 제왕홀[에픽]",
    coin: 0,
    gold: 0,
    materials: ["데스토의 제왕홀[봉인된 에픽]", "뮤턴트의 심장[???]", "해골 기름[???]"],
    rank: "에픽",
    icon: "🪄"
  },
  {
    id: "rec_dagger_ancient",
    category: "무기",
    categoryKey: "weapon",
    name: "고대의 단검[노말]",
    coin: 15,
    gold: 0,
    materials: ["고대의 단검[노말] 조합서", "고대의 단검[신대륙,초보용]", "산양의 가죽;;[조합재료]"],
    rank: "노말",
    icon: "🗡️"
  },
  {
    id: "rec_dagger_coast",
    category: "무기",
    categoryKey: "weapon",
    name: "해안의 단검",
    coin: 20,
    gold: 0,
    materials: ["해안의 단검 조합서", "고대의 단검[노말]", "독뱀의 맹독[조합재료]", "변이된 나가 슈터의 칼[조합재료]"],
    rank: "조합체",
    icon: "🗡️"
  },
  {
    id: "rec_dagger_sky",
    category: "무기",
    categoryKey: "weapon",
    name: "천공의 단검",
    coin: 40,
    gold: 0,
    materials: ["천공의 단검 조합서", "해안의 단검", "아종 그리폰의 깃털[조합재료]", "아종 그리폰킹의 발톱[조합재료]"],
    rank: "조합체",
    icon: "🗡️"
  },
  {
    id: "rec_dagger_diag",
    category: "무기",
    categoryKey: "weapon",
    name: "디아그의 단검",
    coin: 55,
    gold: 0,
    materials: ["디아그의 단검 조합서", "천공의 단검", "강력한 령의 결정체[조합재료]", "봉인당한 신의 영혼[조합재료]"],
    rank: "조합체",
    icon: "🗡️"
  },
  {
    id: "rec_dagger_zandalar",
    category: "무기",
    categoryKey: "weapon",
    name: "진달라의 단검",
    coin: 0,
    gold: 0,
    materials: ["디아그의 단검", "잔달라 드래곤의 목[조합재료]", "잔달라 드래곤의 심장[조합재료]"],
    rank: "조합체",
    icon: "🗡️"
  },
  {
    id: "rec_derick_saw",
    category: "무기",
    categoryKey: "weapon",
    name: "데릭의 톱날칼[에픽]",
    coin: 0,
    gold: 0,
    materials: ["데릭의 톱날칼[봉인된 에픽]", "미믹의 가지[???]", "블랙히드라 헤츨링의 날개[???]"],
    rank: "에픽",
    icon: "⚔️"
  },

  // 3. 갑옷
  {
    id: "rec_cow_treasure",
    category: "갑옷",
    categoryKey: "armor",
    name: "저주받은 카우의 보물[???]",
    coin: 6,
    gold: 0,
    materials: ["저주받은 카우의 보물 조합서", "정예기사의 영혼[조합재료]", "정예나이트의 영혼[조합재료]", "-유니크급-저주받은 카우갑옷"],
    rank: "희귀",
    icon: "🛡️"
  },
  {
    id: "rec_cow_house",
    category: "갑옷",
    categoryKey: "armor",
    name: "저주받은 카우의집 [조합체]",
    coin: 20,
    gold: 0,
    materials: ["저주받은 카우의집 조합서", "저주받은 카우의 보물[???]", "3트로피3[조합체]", "보어 라이더의 심장"],
    rank: "조합체",
    icon: "🏰"
  },
  {
    id: "rec_ancient_treasure",
    category: "갑옷",
    categoryKey: "armor",
    name: "고대의보물[조합체]",
    coin: 25,
    gold: 0,
    materials: ["고대의보물 조합서", "저주받은 카우의집 [조합체]", "3트로피3[조합체]", "신대륙의 네번째 보물[조합체]"],
    rank: "조합체",
    icon: "💎"
  },
  {
    id: "rec_ancient_cloak",
    category: "갑옷",
    categoryKey: "armor",
    name: "고대의망토[조합체]",
    coin: 18,
    gold: 0,
    materials: ["고대의망토 조합서", "3트로피3[조합체]", "-유니크급-데몬의 갑옷", "스피릿 방패[조합체]"],
    rank: "조합체",
    icon: "🧣"
  },
  {
    id: "rec_ancient_armor",
    category: "갑옷",
    categoryKey: "armor",
    name: "고대의갑옷[조합체]",
    coin: 0,
    gold: 400000,
    materials: ["고대의갑옷 조합서", "고대의망토[조합체]", "3트로피3[조합체]", "케이의 해골"],
    rank: "조합체",
    icon: "🛡️"
  },
  {
    id: "rec_derick_bone_armor",
    category: "갑옷",
    categoryKey: "armor",
    name: "데릭의 뼈갑옷[에픽]",
    coin: 0,
    gold: 0,
    materials: ["데릭의 뼈갑옷[봉인된 에픽]", "미믹의 가지[???]", "블랙히드라 헤츨링의 날개[???]"],
    rank: "에픽",
    icon: "🛡️"
  },

  // 4. 문장
  {
    id: "rec_emergency_weapon",
    category: "문장",
    categoryKey: "insignia",
    name: "긴급용 무기[조합체]",
    coin: 0,
    gold: 1000000,
    materials: ["긴급용 무기 조합서", "신대륙인의 문장[반 신급]", "봉인 해제자 칭호[에픽]", "이상한토끼의 뼈[조합재료]", "이상한사슴의 뿔[조합재료]", "꽃게의 큰맛살[조합재료]"],
    rank: "조합체",
    icon: "⚔️",
    requiredOldItem: "구대륙 신대륙인의 문장[반 신급] + 봉인 해제자 칭호[에픽]"
  },
  {
    id: "rec_hopang_weapon",
    category: "문장",
    categoryKey: "insignia",
    name: "호빵의 무구[조합체]",
    coin: 1,
    gold: 0,
    materials: ["호빵의 무구 조합서", "긴급용 무기[조합체]", "불타는 보구 -노말-", "달의 조각[조합재료]", "정예나이트의 영혼[조합재료]", "정예기사의 영혼[조합재료]"],
    rank: "조합체",
    icon: "🗡️"
  },
  {
    id: "rec_cobold_insignia",
    category: "문장",
    categoryKey: "insignia",
    name: "코볼드 광산의 문장[반 신급]",
    coin: 12,
    gold: 0,
    materials: ["코볼드 광산의 문장 조합서", "호빵의 무구[조합체]", "코볼트 일꾼의 곡괭이[조합재료]", "엘리트 코볼트의 가죽[조합재료]", "코볼트 감독관의 채찍[조합재료]"],
    rank: "반 신급",
    icon: "⛏️"
  },
  {
    id: "rec_snow_spider",
    category: "문장",
    categoryKey: "insignia",
    name: "폭설 거미의 문장[반 신급]",
    coin: 18,
    gold: 0,
    materials: ["폭설 거미의 문장 조합서", "코볼드 광산의 문장[반 신급]", "폭설거미의 다리[조합재료]", "폭설거미의 핵[조합재료]"],
    rank: "반 신급",
    icon: "❄️"
  },
  {
    id: "rec_pinkgay_insignia",
    category: "문장",
    categoryKey: "insignia",
    name: "핑크게이의 문장[반 신급]",
    coin: 18,
    gold: 0,
    materials: ["핑크게이의 문장 조합서", "폭설 거미의 문장[반 신급]", "처참한 좀비의 머리[조합재료]", "핑크게이의 팬티[조합재료]", "타락한 파워[반 신급]"],
    rank: "반 신급",
    icon: "🏅"
  },

  // 5. 악세
  {
    id: "rec_ancient_book",
    category: "악세",
    categoryKey: "accessory",
    name: "낡은 고대의 책[조합체]",
    coin: 30,
    gold: 0,
    materials: ["낡은 고대의 책 조합서", "케이의 해골", "고대의갑옷[조합체]", "희망의빛[조합재료]", "어둠"],
    rank: "조합체",
    icon: "📖"
  },
  {
    id: "rec_gaia_privilege",
    category: "악세",
    categoryKey: "accessory",
    name: "가이아의 특혜[조합체]",
    coin: 33,
    gold: 0,
    materials: ["가이아의 특혜 조합서", "낡은 고대의 책[조합체]", "타락한 가이아의 가지[조합재료]"],
    rank: "조합체",
    icon: "🌿"
  },
  {
    id: "rec_blue_gaia_privilege",
    category: "악세",
    categoryKey: "accessory",
    name: "푸른 가이아의 특혜[조합체]",
    coin: 35,
    gold: 0,
    materials: ["푸른 가이아의 특혜 조합서", "가이아의 특혜[조합체]", "가이아의 수액[조합재료]", "봉인된 가이아의 심장[조합재료]"],
    rank: "조합체",
    icon: "🌿"
  },
  {
    id: "rec_2d_insignia",
    category: "악세",
    categoryKey: "accessory",
    name: "2차원의 문장[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["푸른 가이아의 특혜[조합체]", "차원의 광전사 아뮬렛[조합재료]"],
    rank: "반 신급",
    icon: "🌀"
  },
  {
    id: "rec_bright_light_insignia",
    category: "악세",
    categoryKey: "accessory",
    name: "강렬한 빛의 문장[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["2차원의 문장[반 신급]", "거대 개구리의 갑옷[조합재료]", "강렬한 빛[조합재료]"],
    rank: "반 신급",
    icon: "✨"
  },
  {
    id: "rec_prophecy_insignia",
    category: "악세",
    categoryKey: "accessory",
    name: "예언의 문장[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["강렬한 빛의 문장[반 신급]", "계약된 종이[조합재료]", "전사의 비석[조합재료]"],
    rank: "반 신급",
    icon: "📜"
  },

  // 6. 인장 & 특수
  {
    id: "rec_seal_str",
    category: "인장",
    categoryKey: "seal",
    name: "힘의 인장Lv2[에픽]",
    coin: 5,
    gold: 0,
    materials: ["힘의 인장Lv2 조합서", "심연의 해적 인장[에픽]", "차가운 돼지고기[조합재료]", "힘의 조각Lv2[???]", "보어 라이더의 심장"],
    rank: "에픽",
    icon: "📌",
    requiredOldItem: "구대륙 심연의 해적 인장[에픽] (시즌포인트 핵심)"
  },
  {
    id: "rec_seal_agi",
    category: "인장",
    categoryKey: "seal",
    name: "민첩의 인장Lv2[에픽]",
    coin: 5,
    gold: 0,
    materials: ["민첩의 인장Lv2 조합서", "심연의 해적 인장[에픽]", "차가운 돼지고기[조합재료]", "민첩의 조각Lv2[???]", "보어 라이더의 심장"],
    rank: "에픽",
    icon: "📌",
    requiredOldItem: "구대륙 심연의 해적 인장[에픽]"
  },
  {
    id: "rec_seal_int",
    category: "인장",
    categoryKey: "seal",
    name: "지능의 인장Lv2[에픽]",
    coin: 5,
    gold: 0,
    materials: ["지능의 인장Lv2 조합서", "심연의 해적 인장[에픽]", "차가운 돼지고기[조합재료]", "지식의 조각Lv2[???]", "보어 라이더의 심장"],
    rank: "에픽",
    icon: "💎",
    requiredOldItem: "구대륙 심연의 해적 인장[에픽]"
  },
  {
    id: "rec_chieftain_necklace",
    category: "인장",
    categoryKey: "seal",
    name: "치프틴 그람의 목걸이[조합체]",
    coin: 0,
    gold: 0,
    materials: ["그림자 목걸이[조합체]", "치프틴 그람의 지팡이[조합재료]"],
    rank: "조합체",
    icon: "📿"
  },
  {
    id: "rec_nightmare_ring",
    category: "인장",
    categoryKey: "seal",
    name: "나이트메어 반지[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["핑크게이의 문장[반 신급]", "악몽이 담긴 반지[조합재료]", "흉몽의 영혼[조합재료]", "드림워커의 영혼[조합재료]"],
    rank: "반 신급",
    icon: "💍"
  }
];

// 신대륙 기본 프로퍼티 보장
NEW_CONTINENT_RECIPES.forEach(r => {
  if (!r.continent) r.continent = "신대륙";
  if (!r.continentKey) r.continentKey = "new";
});

// 7-1-B. 구대륙 전체 아이템 조합법 데이터베이스 (41종)
const OLD_CONTINENT_RECIPES = [
  // 1. 공통 (7종)
  {
    id: "rec_old_necklace_red",
    continent: "구대륙",
    continentKey: "old",
    category: "공통",
    categoryKey: "common",
    name: "붉은빛 목걸이[조합체]",
    coin: 0,
    gold: 0,
    materials: ["붉은빛 목걸이 조합서", "우두머리 목걸이 -레어-", "피나는돌[조합재료]"],
    rank: "조합체",
    icon: "📿",
    upgradeTarget: "구대륙 빛나는 목걸이[조합체]"
  },
  {
    id: "rec_old_necklace_shining",
    continent: "구대륙",
    continentKey: "old",
    category: "공통",
    categoryKey: "common",
    name: "빛나는 목걸이[조합체]",
    coin: 0,
    gold: 0,
    materials: ["빛나는 목걸이 조합서", "붉은빛 목걸이[조합체]", "산적의 목걸이"],
    rank: "조합체",
    icon: "📿",
    upgradeTarget: "구대륙 대륙의 첫번째 보물[조합체]"
  },
  {
    id: "rec_old_treasure_1",
    continent: "구대륙",
    continentKey: "old",
    category: "공통",
    categoryKey: "common",
    name: "대륙의 첫번째 보물[조합체]",
    coin: 0,
    gold: 0,
    materials: ["대륙의 첫번째 보물 조합서", "빛나는 목걸이[조합체]", "성충의 보석[조합재료]"],
    rank: "조합체",
    icon: "🏆",
    upgradeTarget: "구대륙 대륙의 두번째보물[조합체]"
  },
  {
    id: "rec_old_treasure_2",
    continent: "구대륙",
    continentKey: "old",
    category: "공통",
    categoryKey: "common",
    name: "대륙의 두번째보물[조합체]",
    coin: 0,
    gold: 0,
    materials: ["대륙의 두번째 보물 조합서", "대륙의 첫번째 보물[조합체]", "이상한 보석[조합재료]"],
    rank: "조합체",
    icon: "🏆",
    upgradeTarget: "구대륙 대륙의 세번째 보물"
  },
  {
    id: "rec_old_treasure_3",
    continent: "구대륙",
    continentKey: "old",
    category: "공통",
    categoryKey: "common",
    name: "대륙의 세번째 보물",
    coin: 0,
    gold: 0,
    materials: ["대륙의 세번째 보물 조합서", "대륙의 두번째보물[조합체]", "불꽃의 병[조합재료]", "장애인의 다리[조합재료]"],
    rank: "조합체",
    icon: "🏆",
    upgradeTarget: "구대륙 2트로피2[조합체] & 소울방패[노말][조합체]"
  },
  {
    id: "rec_old_legend_armor",
    continent: "구대륙",
    continentKey: "old",
    category: "공통",
    categoryKey: "common",
    name: "전설의갑옷[노말][조합체]",
    coin: 0,
    gold: 0,
    materials: ["전설의갑옷[노말]조합서", "악마의 파편[조합재료]", "전설의갑옷[각성전!]"],
    rank: "노말",
    icon: "🛡️",
    upgradeTarget: "구대륙 2트로피2[조합체] & 대륙의망토[조합체]"
  },
  {
    id: "rec_old_trophy_2",
    continent: "구대륙",
    continentKey: "old",
    category: "공통",
    categoryKey: "common",
    name: "2트로피2[조합체]",
    coin: 0,
    gold: 0,
    materials: ["2트로피2 조합서", "대륙의 세번째 보물", "전설의갑옷[노말][조합체]"],
    rank: "조합체",
    icon: "🏆",
    upgradeTarget: "구대륙 대륙의망토 & 대륙의갑옷 (신대륙 3트로피3 계승 모티브)"
  },

  // 2. 무기 (9종)
  {
    id: "rec_old_gun_normal",
    continent: "구대륙",
    continentKey: "old",
    category: "무기",
    categoryKey: "weapon",
    name: "전설의총[노말]",
    coin: 0,
    gold: 0,
    materials: ["전설의총[노말]조합서", "양털;;[조합재료]", "전설의총[대륙,초보용]"],
    rank: "노말",
    icon: "🔫",
    upgradeTarget: "구대륙 대륙의 총[조합체]"
  },
  {
    id: "rec_old_gun_continent",
    continent: "구대륙",
    continentKey: "old",
    category: "무기",
    categoryKey: "weapon",
    name: "대륙의 총[조합체]",
    coin: 0,
    gold: 0,
    materials: ["대륙의 총 조합서", "소원의빛[조합재료]", "부운영자들의 해골", "전설의총[노말]"],
    rank: "조합체",
    icon: "🔫",
    upgradeTarget: "구대륙 창공의 활"
  },
  {
    id: "rec_old_bow_sky",
    continent: "구대륙",
    continentKey: "old",
    category: "무기",
    categoryKey: "weapon",
    name: "창공의 활",
    coin: 0,
    gold: 0,
    materials: ["창공의 활 조합서", "대륙의 총[조합체]", "하피의 깃털[조합재료]", "창공의지배자의 발톱[조합재료]"],
    rank: "조합체",
    icon: "🏹",
    upgradeTarget: "구대륙 가이아의 활"
  },
  {
    id: "rec_old_bow_gaia",
    continent: "구대륙",
    continentKey: "old",
    category: "무기",
    categoryKey: "weapon",
    name: "가이아의 활",
    coin: 0,
    gold: 0,
    materials: ["가이아의 활 조합서", "창공의 활", "강력한 힘의 결정체[조합재료]", "신의 영혼[조합재료]"],
    rank: "조합체",
    icon: "🏹",
    upgradeTarget: "구대륙 차원의 활[반 신급]"
  },
  {
    id: "rec_old_bow_dimension",
    continent: "구대륙",
    continentKey: "old",
    category: "무기",
    categoryKey: "weapon",
    name: "차원의 활[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["가이아의 활", "리자드맨의 심장[조합재료]", "블루드래곤의 목[조합재료]"],
    rank: "반 신급",
    icon: "🏹",
    upgradeTarget: "구대륙 영혼의 활[반 신급]"
  },
  {
    id: "rec_old_bow_soul",
    continent: "구대륙",
    continentKey: "old",
    category: "무기",
    categoryKey: "weapon",
    name: "영혼의 활[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["차원의 활[반 신급]", "원한이 담긴 반지[조합재료]", "망령의 영혼[조합재료]", "악령의 영혼[조합재료]"],
    rank: "반 신급",
    icon: "🏹",
    upgradeTarget: "구대륙 영웅의 활[신급]"
  },
  {
    id: "rec_old_bow_hero",
    continent: "구대륙",
    continentKey: "old",
    category: "무기",
    categoryKey: "weapon",
    name: "영웅의 활[신급]",
    coin: 0,
    gold: 0,
    materials: ["영혼의 활[반 신급]", "궁병의 활조각[???]", "몽크의 제황홀[???]", "킹 오브 팬텀[???]", "기사의 검[???]"],
    rank: "신급",
    icon: "🏹",
    upgradeTarget: "구대륙 봉인된 활[신급]"
  },
  {
    id: "rec_old_bow_sealed",
    continent: "구대륙",
    continentKey: "old",
    category: "무기",
    categoryKey: "weapon",
    name: "봉인된 활[신급]",
    coin: 0,
    gold: 0,
    materials: ["영웅의 활[신급]", "히드라의 몸통[???]", "히드라의 목[???]", "히드라의 머리[???]", "히드라의 꼬리[???]"],
    rank: "신급",
    icon: "🏹",
    upgradeTarget: "구대륙 여행자의 활[신급]"
  },
  {
    id: "rec_old_bow_traveler",
    continent: "구대륙",
    continentKey: "old",
    category: "무기",
    categoryKey: "weapon",
    name: "여행자의 활[신급]",
    coin: 0,
    gold: 0,
    materials: ["봉인된 활[신급]", "봉인서"],
    rank: "신급",
    icon: "🏹",
    upgradeTarget: "구대륙 신대륙의 문장[반 신급] (➔ 신대륙인의 문장 ➔ 신대륙 긴급용 무기)"
  },

  // 3. 문장 (12종)
  {
    id: "rec_old_soul_shield",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "소울방패[노말][조합체]",
    coin: 0,
    gold: 0,
    materials: ["소울방패 조합서", "대륙의 세번째 보물", "악마의 파편[조합재료]", "럭셔리반지[희귀급]"],
    rank: "노말",
    icon: "🛡️",
    upgradeTarget: "구대륙 대륙의망토[조합체]"
  },
  {
    id: "rec_old_cloak_continent",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "대륙의망토[조합체]",
    coin: 0,
    gold: 0,
    materials: ["대륙의망토 조합서", "소울방패[노말][조합체]", "2트로피2[조합체]", "전설의갑옷[노말][조합체]"],
    rank: "조합체",
    icon: "🧣",
    upgradeTarget: "구대륙 대륙의갑옷[조합체]"
  },
  {
    id: "rec_old_armor_continent",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "대륙의갑옷[조합체]",
    coin: 0,
    gold: 0,
    materials: ["대륙의갑옷 조합서", "대륙의망토[조합체]", "부운영자들의 해골", "2트로피2[조합체]"],
    rank: "조합체",
    icon: "🛡️",
    upgradeTarget: "구대륙 낡은 대륙의 책[조합체]"
  },
  {
    id: "rec_old_book_continent",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "낡은 대륙의 책[조합체]",
    coin: 0,
    gold: 0,
    materials: ["낡은 대륙의 책 조합서", "대륙의갑옷[조합체]", "부운영자들의 해골", "소원의빛[조합재료]", "???"],
    rank: "조합체",
    icon: "📖",
    upgradeTarget: "구대륙 세계수의 특혜[조합체]"
  },
  {
    id: "rec_old_worldtree_privilege",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "세계수의 특혜[조합체]",
    coin: 0,
    gold: 0,
    materials: ["세계수의 특혜 조합서", "타락한 세계수의 가지[조합재료]", "낡은 대륙의 책[조합체]"],
    rank: "조합체",
    icon: "🌳",
    upgradeTarget: "구대륙 붉은 세계수의 특혜"
  },
  {
    id: "rec_old_red_worldtree",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "붉은 세계수의 특혜",
    coin: 0,
    gold: 0,
    materials: ["붉은 세계수의 특혜 조합서", "세계수의 특혜[조합체]", "붉은 영물의 심장[조합재료]", "개구리의 진액[조합재료]"],
    rank: "조합체",
    icon: "🌺",
    upgradeTarget: "구대륙 차원의 문장[반 신급]"
  },
  {
    id: "rec_old_dimension_insignia",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "차원의 문장[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["붉은 세계수의 특혜", "차원의 전사 아뮬렛[조합재료]"],
    rank: "반 신급",
    icon: "🌀",
    upgradeTarget: "구대륙 빛의 문장[반 신급]"
  },
  {
    id: "rec_old_light_insignia",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "빛의 문장[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["차원의 문장[반 신급]", "개구리의 갑옷[조합재료]", "빛[조합재료]"],
    rank: "반 신급",
    icon: "✨",
    upgradeTarget: "구대륙 고대의 문장[반 신급]"
  },
  {
    id: "rec_old_ancient_insignia",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "고대의 문장[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["빛의 문장[반 신급]", "비석[조합재료]", "이상한 종이[조합재료]"],
    rank: "반 신급",
    icon: "🏛️",
    upgradeTarget: "구대륙 인두인의 예언 문장[반 신급]"
  },
  {
    id: "rec_old_induin_insignia",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "인두인의 예언 문장[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["인두인의 예언 문장 조합서", "다크 발키리의 문장[반 신급]", "고대의 문장[반 신급]"],
    rank: "반 신급",
    icon: "📜",
    upgradeTarget: "구대륙 신대륙의 문장[반 신급]"
  },
  {
    id: "rec_old_newcont_insignia_base",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "신대륙의 문장[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["신대륙의 문장 조합서", "여행자의 활[신급]", "인두인의 예언 문장[반 신급]", "펠 임프의 시체[조합재료]", "펠 샤먼의 지팡이[조합재료]", "펠 오버시어의 검[조합재료]"],
    rank: "반 신급",
    icon: "🏅",
    upgradeTarget: "구대륙 신대륙인의 문장[반 신급]"
  },
  {
    id: "rec_old_newcont_person_insignia",
    continent: "구대륙",
    continentKey: "old",
    category: "문장",
    categoryKey: "insignia",
    name: "신대륙인의 문장[반 신급]",
    coin: 0,
    gold: 0,
    materials: ["신대륙인의 문장 조합서", "신대륙의 문장[반 신급]", "엘퀴네스의 눈물[조합재료]", "크리스탈 골렘의 블럭[조합재료]", "하이브 마인드의 촉수[조합재료]"],
    rank: "반 신급",
    icon: "👑",
    upgradeTarget: "⚡ [신대륙 승급] 신대륙 긴급용 무기[조합체] 필수 재료 (➔ 핑크게이의 문장 ➔ 나이트메어 반지)"
  },

  // 4. 칭호 (7종)
  {
    id: "rec_old_paper",
    continent: "구대륙",
    continentKey: "old",
    category: "칭호",
    categoryKey: "title",
    name: "대륙의 종이[에픽]",
    coin: 0,
    gold: 0,
    materials: ["대륙의 종이 조합서", "우 괘 [에픽]", "좌 괘 [에픽]", "지 괘 [에픽]", "토 괘 [에픽]"],
    rank: "에픽",
    icon: "📄",
    upgradeTarget: "구대륙 장군의 칭호[에픽]"
  },
  {
    id: "rec_old_pen",
    continent: "구대륙",
    continentKey: "old",
    category: "칭호",
    categoryKey: "title",
    name: "대륙의 펜[에픽]",
    coin: 0,
    gold: 0,
    materials: ["대륙의 펜 조합서", "괴 괘 [에픽]", "뢰 괘 [에픽]", "멸 괘 [에픽]", "묘 괘 [에픽]"],
    rank: "에픽",
    icon: "✒️",
    upgradeTarget: "구대륙 장군의 칭호[에픽]"
  },
  {
    id: "rec_old_title_general",
    continent: "구대륙",
    continentKey: "old",
    category: "칭호",
    categoryKey: "title",
    name: "장군의 칭호[에픽]",
    coin: 0,
    gold: 0,
    materials: ["장군의 칭호 조합서", "대륙의 종이[에픽]", "대륙의 펜[에픽]"],
    rank: "에픽",
    icon: "🎖️",
    upgradeTarget: "구대륙 여행자의 칭호[에픽]"
  },
  {
    id: "rec_old_title_leader",
    continent: "구대륙",
    continentKey: "old",
    category: "칭호",
    categoryKey: "title",
    name: "리더의 칭호[에픽]",
    coin: 0,
    gold: 0,
    materials: ["지하계 주술사의 스탭[???]", "처형자의 칼[???]", "워리더의 방패 [???]"],
    rank: "에픽",
    icon: "🛡️",
    upgradeTarget: "구대륙 여행자의 칭호[에픽] & 레이븐 칭호[에픽]"
  },
  {
    id: "rec_old_title_traveler",
    continent: "구대륙",
    continentKey: "old",
    category: "칭호",
    categoryKey: "title",
    name: "여행자의 칭호[에픽]",
    coin: 0,
    gold: 0,
    materials: ["여행자의 칭호 조합서", "전왕의 칭호[에픽]", "장군의 칭호[에픽]", "리더의 칭호[에픽]"],
    rank: "에픽",
    icon: "🗺️",
    upgradeTarget: "구대륙 레이븐 칭호[에픽]"
  },
  {
    id: "rec_old_title_raven",
    continent: "구대륙",
    continentKey: "old",
    category: "칭호",
    categoryKey: "title",
    name: "레이븐 칭호[에픽]",
    coin: 0,
    gold: 0,
    materials: ["레이븐 칭호 조합서", "여행자의 칭호[에픽]", "리더의 칭호[에픽]", "레이븐 피어의 가방[조합재료]"],
    rank: "에픽",
    icon: "🦅",
    upgradeTarget: "구대륙 봉인 해제자 칭호[에픽]"
  },
  {
    id: "rec_old_title_unsealer",
    continent: "구대륙",
    continentKey: "old",
    category: "칭호",
    categoryKey: "title",
    name: "봉인 해제자 칭호[에픽]",
    coin: 0,
    gold: 0,
    materials: ["봉인 해제자 칭호 조합서", "봉인 해제자A[에픽]", "봉인 해제자B[에픽]", "봉인 해제자C[에픽]", "레이븐 칭호[에픽]"],
    rank: "에픽",
    icon: "🔓",
    upgradeTarget: "⚡ [신대륙 승급] 신대륙 긴급용 무기[조합체] 필수 재료 (➔ 핑크게이의 문장 ➔ 나이트메어 반지)"
  },

  // 5. 인장 (5종)
  {
    id: "rec_old_seal_str",
    continent: "구대륙",
    continentKey: "old",
    category: "인장",
    categoryKey: "seal",
    name: "힘의 인장[에픽]",
    coin: 0,
    gold: 0,
    materials: ["힘의 인장 조합서", "힘의 조각[???]", "돼지고기[조합재료]", "돼지의 심장"],
    rank: "에픽",
    icon: "📌",
    upgradeTarget: "구대륙 콜럼버스의 인장[에픽]"
  },
  {
    id: "rec_old_seal_int",
    continent: "구대륙",
    continentKey: "old",
    category: "인장",
    categoryKey: "seal",
    name: "지식의 인장[에픽]",
    coin: 0,
    gold: 0,
    materials: ["지식의 인장 조합서", "지식의 조각[???]", "돼지고기[조합재료]", "돼지의 심장"],
    rank: "에픽",
    icon: "💎",
    upgradeTarget: "구대륙 콜럼버스의 인장[에픽]"
  },
  {
    id: "rec_old_seal_agi",
    continent: "구대륙",
    continentKey: "old",
    category: "인장",
    categoryKey: "seal",
    name: "민첩의 인장[에픽]",
    coin: 0,
    gold: 0,
    materials: ["민첩의 인장 조합서", "민첩의 조각[???]", "돼지고기[조합재료]", "돼지의 심장"],
    rank: "에픽",
    icon: "🏹",
    upgradeTarget: "구대륙 콜럼버스의 인장[에픽]"
  },
  {
    id: "rec_old_seal_columbus",
    continent: "구대륙",
    continentKey: "old",
    category: "인장",
    categoryKey: "seal",
    name: "콜럼버스의 인장[에픽]",
    coin: 0,
    gold: 0,
    materials: ["콜럼버스의 인장 조합서", "옥좌의 인장", "힘의 인장", "민첩의 인장", "지식의 인장", "대나무 창"],
    rank: "에픽",
    icon: "🧭",
    upgradeTarget: "구대륙 심연의 해적 인장[에픽]"
  },
  {
    id: "rec_old_seal_pirate",
    continent: "구대륙",
    continentKey: "old",
    category: "인장",
    categoryKey: "seal",
    name: "심연의 해적 인장[에픽]",
    coin: 0,
    gold: 0,
    materials: ["심연의 해적 인장 조합서", "드워프 해적의 총[조합재료]", "콜럼버스의 인장[에픽]", "심연의 해적모자[조합재료]"],
    rank: "에픽",
    icon: "🏴‍☠️",
    upgradeTarget: "⚡ [신대륙 승급] 신대륙 힘의 인장Lv2[에픽] (시즌포인트 조건) / 민첩 / 지능 인장Lv2 필수 재료"
  },

  // 6. 기타 (1종)
  {
    id: "rec_old_sealed_scroll",
    continent: "구대륙",
    continentKey: "old",
    category: "기타",
    categoryKey: "etc",
    name: "봉인된 스크롤",
    coin: 0,
    gold: 0,
    materials: ["봉인된 석판A[조합재료]", "봉인된 석판B[조합재료]", "봉인된 석판C[조합재료]"],
    rank: "기타",
    icon: "📜",
    upgradeTarget: "구대륙 퀘스트 및 봉인 해제용 특수 스크롤"
  }
];

// 통합 전체 조합법 데이터베이스 (신대륙 28종 + 구대륙 41종 = 총 69종)
const ALL_RECIPES_DATABASE = [...NEW_CONTINENT_RECIPES, ...OLD_CONTINENT_RECIPES];

// 7-1-C. 신/구대륙 4대 핵심 승급 계보도 (Bridge System)
const CONTINENT_UPGRADE_BRIDGES = [
  {
    id: "bridge_insignia",
    icon: "🏅",
    title: "1. 문장 & 무기 ➔ 핑크게이 & 나이트메어 반지 체인",
    target: "핑크게이의 문장 & 나이트메어 반지",
    targetSpItem: "핑크게이의 문장 & 나이트메어 반지",
    badge: "시즌포인트 핵심 계보",
    color: "#f472b6",
    desc: "구대륙 21단계(무기9단계 + 문장10단계 + 신대륙인2단계)와 구대륙 칭호 7단계가 신대륙 '긴급용 무기(100만G)'로 승급되는 루트입니다.",
    summary: "구대륙 21단계(무기9단계 + 문장10단계 + 신대륙인2단계)와 구대륙 칭호 7단계가 신대륙 '긴급용 무기(100만G)'로 승급되는 루트입니다.",
    steps: [
      {
        phase: "구대륙 무기 (9단계)",
        continent: "구대륙 무기 (9단계)",
        item: "전설의총 ➔ ... ➔ 여행자의 활[신급]",
        name: "전설의총 ➔ ... ➔ 여행자의 활[신급]",
        note: "양털 ➔ 부운영자 해골 ➔ 창공지배자 발톱 ➔ 신의 영혼 ➔ 블루드래곤 목 ➔ 망령/악령 ➔ 킹오브팬텀/기사검 ➔ 히드라 4파츠 ➔ 봉인서",
        desc: "양털 ➔ 부운영자 해골 ➔ 창공지배자 발톱 ➔ 신의 영혼 ➔ 블루드래곤 목 ➔ 망령/악령 ➔ 킹오브팬텀/기사검 ➔ 히드라 4파츠 ➔ 봉인서",
        materials: ["전설의총", "대륙의 총", "창공의 활", "가이아의 활", "차원의 활", "영혼의 활", "영웅의 활", "봉인된 활", "여행자의 활[신급]"]
      },
      {
        phase: "구대륙 문장 (10단계)",
        continent: "구대륙 문장 (10단계)",
        item: "소울방패 ➔ ... ➔ 인두인의 예언 문장[반 신급]",
        name: "소울방패 ➔ ... ➔ 인두인의 예언 문장[반 신급]",
        note: "대륙 3보물 ➔ 2트로피2 ➔ 대륙갑옷 ➔ 세계수 특혜 ➔ 붉은 세계수 ➔ 차원의 문장 ➔ 빛의 문장 ➔ 고대의 문장 ➔ 다크 발키리 문장",
        desc: "대륙 3보물 ➔ 2트로피2 ➔ 대륙갑옷 ➔ 세계수 특혜 ➔ 붉은 세계수 ➔ 차원의 문장 ➔ 빛의 문장 ➔ 고대의 문장 ➔ 다크 발키리 문장",
        materials: ["소울방패", "대륙의망토", "대륙의갑옷", "낡은 대륙의 책", "세계수의 특혜", "붉은 세계수의 특혜", "차원의 문장", "빛의 문장", "고대의 문장", "인두인의 예언 문장"]
      },
      {
        phase: "구대륙 최종 결합",
        continent: "구대륙 최종 결합",
        item: "여행자의 활 + 인두인 ➔ 신대륙의 문장 ➔ 신대륙인의 문장[반 신급]",
        name: "여행자의 활 + 인두인 ➔ 신대륙의 문장 ➔ 신대륙인의 문장[반 신급]",
        note: "여행자의 활 + 인두인의 예언 문장 + 펠3종 ➔ 신대륙의 문장 + 엘퀴네스 눈물 + 크리스탈 골렘 블럭 + 하이브마인드 촉수 ➔ 신대륙인의 문장",
        desc: "여행자의 활 + 인두인의 예언 문장 + 펠3종 ➔ 신대륙의 문장 + 엘퀴네스 눈물 + 크리스탈 골렘 블럭 + 하이브마인드 촉수 ➔ 신대륙인의 문장",
        materials: ["신대륙의 문장[반 신급]", "신대륙인의 문장[반 신급]"]
      },
      {
        phase: "⚡ 신대륙 승급 결합",
        continent: "⚡ 신대륙 승급 결합",
        item: "신대륙인의 문장 + 봉인 해제자 칭호 ➔ 긴급용 무기[조합체] (100만 Gold)",
        name: "신대륙인의 문장 + 봉인 해제자 칭호 ➔ 긴급용 무기[조합체] (100만 Gold)",
        note: "구대륙 최종 문장과 칭호가 100만 골드 및 필드 재료(토끼뼈, 사슴뿔, 꽃게맛살)와 결합하여 신대륙 첫 문장으로 승급!",
        desc: "구대륙 최종 문장과 칭호가 100만 골드 및 필드 재료(토끼뼈, 사슴뿔, 꽃게맛살)와 결합하여 신대륙 첫 문장으로 승급!",
        materials: ["신대륙인의 문장[반 신급]", "봉인 해제자 칭호[에픽]", "100만 Gold", "이상한토끼의 뼈", "이상한사슴의 뿔", "꽃게의 큰맛살"]
      },
      {
        phase: "신대륙 최종 도달 (시즌포인트)",
        continent: "신대륙 최종 도달 (시즌포인트)",
        item: "긴급용 무기 ➔ 호빵(1) ➔ 코볼드(12) ➔ 폭설 거미(18) ➔ 핑크게이(18) ➔ 나이트메어 반지",
        name: "긴급용 무기 ➔ 호빵(1) ➔ 코볼드(12) ➔ 폭설 거미(18) ➔ 핑크게이(18) ➔ 나이트메어 반지",
        note: "총 49주화 소모하여 시즌포인트 필수 인증 장비인 핑크게이의 문장 및 나이트메어 반지 획득!",
        desc: "총 49주화 소모하여 시즌포인트 필수 인증 장비인 핑크게이의 문장 및 나이트메어 반지 획득!",
        materials: ["호빵의 무구", "코볼드 광산의 문장", "폭설 거미의 문장", "핑크게이의 문장[반 신급]", "나이트메어 반지[반 신급]"]
      }
    ]
  },
  {
    id: "bridge_title",
    icon: "🏷️",
    title: "2. 칭호 ➔ 8괘 ➔ 장군/리더 ➔ 레이븐 ➔ 봉인 해제자 칭호 체인",
    target: "봉인 해제자 칭호[에픽] (긴급용 무기 필수 재료)",
    targetSpItem: "봉인 해제자 칭호[에픽] (긴급용 무기 필수 재료)",
    badge: "칭호 승급 계보",
    color: "#c084fc",
    desc: "구대륙 8괘부터 시작하여 5대 칭호를 결합하고, 봉인 해제자 A/B/C를 통해 신대륙 진입 필수 칭호인 '봉인 해제자 칭호'를 획득합니다.",
    summary: "구대륙 8괘부터 시작하여 5대 칭호를 결합하고, 봉인 해제자 A/B/C를 통해 신대륙 진입 필수 칭호인 '봉인 해제자 칭호'를 획득합니다.",
    steps: [
      {
        phase: "구대륙 8괘 수집 (1단계)",
        continent: "구대륙 8괘 수집 (1단계)",
        item: "8괘 ➔ 대륙의 종이[에픽] + 대륙의 펜[에픽]",
        name: "8괘 ➔ 대륙의 종이[에픽] + 대륙의 펜[에픽]",
        note: "우/좌/지/토 괘 ➔ 대륙의 종이 | 괴/뢰/멸/묘 괘 ➔ 대륙의 펜",
        desc: "우/좌/지/토 괘 ➔ 대륙의 종이 | 괴/뢰/멸/묘 괘 ➔ 대륙의 펜",
        materials: ["대륙의 종이 조합서", "대륙의 펜 조합서", "우/좌/지/토 괘", "괴/뢰/멸/묘 괘"]
      },
      {
        phase: "구대륙 중간 칭호 (2단계)",
        continent: "구대륙 중간 칭호 (2단계)",
        item: "종이 + 펜 ➔ 장군의 칭호 | 주술사스탭+처형자칼+워리더방패 ➔ 리더의 칭호",
        name: "종이 + 펜 ➔ 장군의 칭호 | 주술사스탭+처형자칼+워리더방패 ➔ 리더의 칭호",
        note: "장군의 칭호와 리더의 칭호는 여행자 칭호의 필수 재료",
        desc: "장군의 칭호와 리더의 칭호는 여행자 칭호의 필수 재료",
        materials: ["장군의 칭호 조합서", "지하계 주술사의 스탭", "처형자의 칼", "워리더의 방패"]
      },
      {
        phase: "구대륙 고위 칭호 (3단계)",
        continent: "구대륙 고위 칭호 (3단계)",
        item: "전왕 + 장군 + 리더 ➔ 여행자의 칭호[에픽] ➔ (+리더+레이븐가방) 레이븐 칭호",
        name: "전왕 + 장군 + 리더 ➔ 여행자의 칭호[에픽] ➔ (+리더+레이븐가방) 레이븐 칭호",
        note: "여행자 칭호와 리더 칭호, 레이븐 피어의 가방을 결합하여 레이븐 칭호 완성",
        desc: "여행자 칭호와 리더 칭호, 레이븐 피어의 가방을 결합하여 레이븐 칭호 완성",
        materials: ["여행자의 칭호 조합서", "전왕의 칭호", "장군의 칭호", "리더의 칭호", "레이븐 칭호 조합서", "레이븐 피어의 가방"]
      },
      {
        phase: "구대륙 최종 칭호 (4단계)",
        continent: "구대륙 최종 칭호 (4단계)",
        item: "레이븐 칭호 + 봉인 해제자 A/B/C ➔ 봉인 해제자 칭호[에픽]",
        name: "레이븐 칭호 + 봉인 해제자 A/B/C ➔ 봉인 해제자 칭호[에픽]",
        note: "구대륙 최종 칭호 완성! 신대륙 긴급용 무기 제작에 소모됩니다.",
        desc: "구대륙 최종 칭호 완성! 신대륙 긴급용 무기 제작에 소모됩니다.",
        materials: ["봉인 해제자 칭호 조합서", "레이븐 칭호[에픽]", "봉인 해제자A[에픽]", "봉인 해제자B[에픽]", "봉인 해제자C[에픽]"]
      },
      {
        phase: "⚡ 신대륙 승급 결합",
        continent: "⚡ 신대륙 승급 결합",
        item: "봉인 해제자 칭호 + 신대륙인의 문장 ➔ 긴급용 무기[조합체]",
        name: "봉인 해제자 칭호 + 신대륙인의 문장 ➔ 긴급용 무기[조합체]",
        note: "신대륙 문장 5단계(핑크게이)와 나이트메어 반지 제작의 첫걸음 완성!",
        desc: "신대륙 문장 5단계(핑크게이)와 나이트메어 반지 제작의 첫걸음 완성!",
        materials: ["긴급용 무기 조합서", "봉인 해제자 칭호[에픽]", "신대륙인의 문장[반 신급]", "100만 Gold"]
      }
    ]
  },
  {
    id: "bridge_seal",
    icon: "📌",
    title: "3. 인장 ➔ 심연의 해적 ➔ 신대륙 인장Lv2 체인",
    target: "힘의 인장Lv2[에픽] (시즌포인트 필수 인증템)",
    targetSpItem: "힘의 인장Lv2[에픽] (시즌포인트 필수 인증템)",
    badge: "시즌포인트 인장 계보",
    color: "#f59e0b",
    desc: "구대륙 힘/민/지 3대 스탯 인장과 콜럼버스의 인장을 합쳐 '심연의 해적 인장'을 만들고, 신대륙 인장Lv2로 각성합니다.",
    summary: "구대륙 힘/민/지 3대 스탯 인장과 콜럼버스의 인장을 합쳐 '심연의 해적 인장'을 만들고, 신대륙 인장Lv2로 각성합니다.",
    steps: [
      {
        phase: "구대륙 3대 기초 인장 (1단계)",
        continent: "구대륙 3대 기초 인장 (1단계)",
        item: "힘/지식/민첩 조각 + 돼지고기 + 돼지 심장 ➔ 힘 / 지식 / 민첩의 인장[에픽]",
        name: "힘/지식/민첩 조각 + 돼지고기 + 돼지 심장 ➔ 힘 / 지식 / 민첩의 인장[에픽]",
        note: "구대륙 필드 재료로 3종 기본 스탯 인장 제작",
        desc: "구대륙 필드 재료로 3종 기본 스탯 인장 제작",
        materials: ["힘의 인장 조합서", "지식의 인장 조합서", "민첩의 인장 조합서", "돼지고기", "돼지의 심장"]
      },
      {
        phase: "구대륙 통합 인장 (2단계)",
        continent: "구대륙 통합 인장 (2단계)",
        item: "옥좌의 인장 + 힘/민/지 인장 + 대나무 창 ➔ 콜럼버스의 인장[에픽]",
        name: "옥좌의 인장 + 힘/민/지 인장 + 대나무 창 ➔ 콜럼버스의 인장[에픽]",
        note: "3대 인장을 하나로 묶어 콜럼버스의 인장 완성",
        desc: "3대 인장을 하나로 묶어 콜럼버스의 인장 완성",
        materials: ["콜럼버스의 인장 조합서", "옥좌의 인장", "힘의 인장", "민첩의 인장", "지식의 인장", "대나무 창"]
      },
      {
        phase: "구대륙 최종 인장 (3단계)",
        continent: "구대륙 최종 인장 (3단계)",
        item: "콜럼버스의 인장 + 드워프 해적 총 + 심연의 해적모자 ➔ 심연의 해적 인장[에픽]",
        name: "콜럼버스의 인장 + 드워프 해적 총 + 심연의 해적모자 ➔ 심연의 해적 인장[에픽]",
        note: "구대륙 최고 에픽 인장 완성!",
        desc: "구대륙 최고 에픽 인장 완성!",
        materials: ["심연의 해적 인장 조합서", "콜럼버스의 인장[에픽]", "드워프 해적의 총", "심연의 해적모자"]
      },
      {
        phase: "⚡ 신대륙 승급 각성 (시즌포인트)",
        continent: "⚡ 신대륙 승급 각성 (시즌포인트)",
        item: "심연의 해적 인장 + 차가운 돼지고기 + 힘의 조각Lv2 + 보어 라이더 심장 ➔ 힘의 인장Lv2[에픽]",
        name: "심연의 해적 인장 + 차가운 돼지고기 + 힘의 조각Lv2 + 보어 라이더 심장 ➔ 힘의 인장Lv2[에픽]",
        note: "5주화 소모하여 시즌포인트 필수 조건 아이템인 힘의 인장Lv2 획득! (민첩/지능Lv2 동일 구조)",
        desc: "5주화 소모하여 시즌포인트 필수 조건 아이템인 힘의 인장Lv2 획득! (민첩/지능Lv2 동일 구조)",
        materials: ["힘의 인장Lv2 조합서", "심연의 해적 인장[에픽]", "5 주화", "차가운 돼지고기", "힘의 조각Lv2", "보어 라이더의 심장"]
      }
    ]
  },
  {
    id: "bridge_treasure",
    icon: "🌿",
    title: "4. 목걸이 / 보물 / 갑옷 ➔ 푸른 가이아의 특혜 체인",
    target: "푸른 가이아의 특혜[조합체] (331주화 / 40만 Gold)",
    targetSpItem: "푸른 가이아의 특혜[조합체] (331주화 / 40만 Gold)",
    badge: "최대 규모 체인",
    color: "#10b981",
    desc: "구대륙의 붉은빛 목걸이 ➔ 보물1~3 ➔ 2트로피2 구조가 신대륙에서 파란빛 목걸이 ➔ 보물1~4 ➔ 3트로피3로 계승되어 푸른 가이아의 특혜로 완성됩니다.",
    summary: "구대륙의 붉은빛 목걸이 ➔ 보물1~3 ➔ 2트로피2 구조가 신대륙에서 파란빛 목걸이 ➔ 보물1~4 ➔ 3트로피3로 계승되어 푸른 가이아의 특혜로 완성됩니다.",
    steps: [
      {
        phase: "구대륙 기본 계보",
        continent: "구대륙 기본 계보",
        item: "붉은빛 목걸이 ➔ 빛나는 목걸이 ➔ 대륙 1~3보물 ➔ 2트로피2 + 대륙의갑옷",
        name: "붉은빛 목걸이 ➔ 빛나는 목걸이 ➔ 대륙 1~3보물 ➔ 2트로피2 + 대륙의갑옷",
        note: "구대륙의 보물/갑옷 조합 시스템 모티브",
        desc: "구대륙의 보물/갑옷 조합 시스템 모티브",
        materials: ["붉은빛 목걸이", "빛나는 목걸이", "대륙의 1~3보물", "2트로피2", "대륙의갑옷"]
      },
      {
        phase: "신대륙 보물 4연계",
        continent: "신대륙 보물 4연계",
        item: "파란빛 목걸이 ➔ 그림자 목걸이 ➔ 신대륙 1~4보물 (각 37주화)",
        name: "파란빛 목걸이 ➔ 그림자 목걸이 ➔ 신대륙 1~4보물 (각 37주화)",
        note: "총 3세트 제작 (111주화 소모)",
        desc: "총 3세트 제작 (111주화 소모)",
        materials: ["파란빛 목걸이", "그림자 목걸이", "신대륙의 첫번째~네번째 보물"]
      },
      {
        phase: "신대륙 갑옷 & 트로피",
        continent: "신대륙 갑옷 & 트로피",
        item: "데몬의 갑옷(18x3) ➔ 3트로피3(17x2) + 스피릿 방패(16) ➔ 고대의망토(18) ➔ 고대의갑옷(40만G)",
        name: "데몬의 갑옷(18x3) ➔ 3트로피3(17x2) + 스피릿 방패(16) ➔ 고대의망토(18) ➔ 고대의갑옷(40만G)",
        note: "케이의 해골 + 40만 골드로 고대의갑옷 완성",
        desc: "케이의 해골 + 40만 골드로 고대의갑옷 완성",
        materials: ["-유니크급-데몬의 갑옷", "3트로피3", "스피릿 방패", "고대의망토", "고대의갑옷", "케이의 해골", "40만 Gold"]
      },
      {
        phase: "신대륙 최종 도달 (시즌포인트)",
        continent: "신대륙 최종 도달 (시즌포인트)",
        item: "고대의갑옷 ➔ 낡은 고대의 책(30) ➔ 가이아의 특혜(33) ➔ 푸른 가이아의 특혜(35)",
        name: "고대의갑옷 ➔ 낡은 고대의 책(30) ➔ 가이아의 특혜(33) ➔ 푸른 가이아의 특혜(35)",
        note: "누적 331주화와 40만 골드로 시즌포인트 최고난도 아이템 완성!",
        desc: "누적 331주화와 40만 골드로 시즌포인트 최고난도 아이템 완성!",
        materials: ["낡은 고대의 책", "타락한 가이아의 가지", "가이아의 특혜", "가이아의 수액", "봉인된 가이아의 심장", "푸른 가이아의 특혜[조합체]"]
      }
    ]
  }
];

// 7-2. 시즌포인트 핵심 조건 6대 아이템 상세 테크트리 및 총 소요 재화 명세
const SEASON_POINT_REQUIREMENTS = [
  {
    id: "sp_chieftain",
    name: "치프틴 그람의 목걸이[조합체]",
    rank: "조합체",
    icon: "📿",
    totalCoin: 4,
    totalGold: 0,
    stepCount: 3,
    summaryDesc: "파란빛 목걸이 ➔ 그림자 목걸이 ➔ 치프틴 그람의 목걸이",
    steps: [
      {
        step: 1,
        target: "파란빛 목걸이[조합체]",
        coin: 1,
        gold: 0,
        materials: ["파란빛 목걸이 조합서", "스피릿 목걸이 -레어-", "블러드 스톤[조합재료]"]
      },
      {
        step: 2,
        target: "그림자 목걸이[조합체]",
        coin: 3,
        gold: 0,
        materials: ["그림자 목걸이 조합서", "파란빛 목걸이[조합체]", "산적왕의 목걸이"]
      },
      {
        step: 3,
        target: "치프틴 그람의 목걸이[조합체]",
        coin: 0,
        gold: 0,
        materials: ["그림자 목걸이[조합체]", "치프틴 그람의 지팡이[조합재료]"]
      }
    ],
    rawMaterials: [
      { name: "제국 주화", count: "4개", type: "currency" },
      { name: "스피릿 목걸이 -레어-", count: "1개", type: "equip" },
      { name: "블러드 스톤[조합재료]", count: "1개", type: "mat" },
      { name: "산적왕의 목걸이", count: "1개", type: "equip" },
      { name: "치프틴 그람의 지팡이[조합재료]", count: "1개", type: "mat" },
      { name: "파란빛 목걸이 조합서", count: "1개", type: "recipe" },
      { name: "그림자 목걸이 조합서", count: "1개", type: "recipe" }
    ]
  },
  {
    id: "sp_pinkgay",
    name: "핑크게이의 문장[반 신급]",
    rank: "반 신급",
    icon: "🏅",
    totalCoin: 49,
    totalGold: 1000000,
    stepCount: 5,
    summaryDesc: "긴급용 무기 ➔ 호빵의 무구 ➔ 코볼드 ➔ 폭설 거미 ➔ 핑크게이",
    steps: [
      {
        step: 1,
        target: "긴급용 무기[조합체]",
        coin: 0,
        gold: 1000000,
        materials: ["긴급용 무기 조합서", "구대륙: 신대륙인의 문장[반 신급] (12단계)", "구대륙: 봉인 해제자 칭호[에픽] (7단계)", "이상한토끼의 뼈[조합재료]", "이상한사슴의 뿔[조합재료]", "꽃게의 큰맛살[조합재료]"]
      },
      {
        step: 2,
        target: "호빵의 무구[조합체]",
        coin: 1,
        gold: 0,
        materials: ["호빵의 무구 조합서", "긴급용 무기[조합체]", "불타는 보구 -노말-", "달의 조각[조합재료]", "정예나이트의 영혼[조합재료]", "정예기사의 영혼[조합재료]"]
      },
      {
        step: 3,
        target: "코볼드 광산의 문장[반 신급]",
        coin: 12,
        gold: 0,
        materials: ["코볼드 광산의 문장 조합서", "호빵의 무구[조합체]", "코볼트 일꾼의 곡괭이[조합재료]", "엘리트 코볼트의 가죽[조합재료]", "코볼트 감독관의 채찍[조합재료]"]
      },
      {
        step: 4,
        target: "폭설 거미의 문장[반 신급]",
        coin: 18,
        gold: 0,
        materials: ["폭설 거미의 문장 조합서", "코볼드 광산의 문장[반 신급]", "폭설거미의 다리[조합재료]", "폭설거미의 핵[조합재료]"]
      },
      {
        step: 5,
        target: "핑크게이의 문장[반 신급]",
        coin: 18,
        gold: 0,
        materials: ["핑크게이의 문장 조합서", "폭설 거미의 문장[반 신급]", "처참한 좀비의 머리[조합재료]", "핑크게이의 팬티[조합재료]", "타락한 파워[반 신급]"]
      }
    ],
    rawMaterials: [
      { name: "제국 주화", count: "49개", type: "currency" },
      { name: "골드 (금)", count: "100만 Gold", type: "currency" },
      { name: "신대륙인의 문장[반 신급]", count: "1개", type: "equip" },
      { name: "봉인 해제자 칭호[에픽]", count: "1개", type: "title" },
      { name: "이상한토끼의 뼈", count: "1개", type: "mat" },
      { name: "이상한사슴의 뿔", count: "1개", type: "mat" },
      { name: "꽃게의 큰맛살", count: "1개", type: "mat" },
      { name: "불타는 보구 -노말-", count: "1개", type: "equip" },
      { name: "달의 조각", count: "1개", type: "mat" },
      { name: "정예나이트의 영혼", count: "1개", type: "mat" },
      { name: "정예기사의 영혼", count: "1개", type: "mat" },
      { name: "코볼트 일꾼의 곡괭이", count: "1개", type: "mat" },
      { name: "엘리트 코볼트의 가죽", count: "1개", type: "mat" },
      { name: "코볼트 감독관의 채찍", count: "1개", type: "mat" },
      { name: "폭설거미의 다리", count: "1개", type: "mat" },
      { name: "폭설거미의 핵", count: "1개", type: "mat" },
      { name: "처참한 좀비의 머리", count: "1개", type: "mat" },
      { name: "핑크게이의 팬티", count: "1개", type: "mat" },
      { name: "타락한 파워[반 신급]", count: "1개", type: "equip" },
      { name: "조합서 5종", count: "총 5장", type: "recipe" }
    ],
    oldContinentPrereqs: {
      title: "구대륙 선행 2대 필수 아이템 상세 제작법 (신대륙인의 문장 & 봉인 해제자 칭호)",
      items: [
        {
          name: "신대륙인의 문장[반 신급]",
          desc: "구대륙 무기(여행자의 활[신급] 9단계) + 구대륙 문장(인두인의 예언 문장 10단계) ➔ 신대륙의 문장 ➔ 신대륙인의 문장",
          badge: "구대륙 21단계 결합",
          tree: [
            {
              step: "A-1",
              title: "구대륙 무기 계보 (총 9단계 조합)",
              target: "여행자의 활[신급]",
              mats: [
                "1. 전설의총[노말] = 전설의총 조합서 + 양털;; + 전설의총[초보용]",
                "2. 대륙의 총 = 대륙의 총 조합서 + 소원의빛 + 부운영자들의 해골 + 전설의총[노말]",
                "3. 창공의 활 = 창공의 활 조합서 + 대륙의 총 + 하피의 깃털 + 창공의지배자의 발톱",
                "4. 가이아의 활 = 가이아의 활 조합서 + 창공의 활 + 강력한 힘의 결정체 + 신의 영혼",
                "5. 차원의 활[반 신급] = 가이아의 활 + 리자드맨의 심장 + 블루드래곤의 목",
                "6. 영혼의 활[반 신급] = 차원의 활 + 원한이 담긴 반지 + 망령의 영혼 + 악령의 영혼",
                "7. 영웅의 활[신급] = 영혼의 활 + 궁병의 활조각 + 몽크의 제황홀 + 킹 오브 팬텀 + 기사의 검",
                "8. 봉인된 활[신급] = 영웅의 활 + 히드라 몸통 + 히드라 목 + 히드라 머리 + 히드라 꼬리",
                "9. 여행자의 활[신급] = 봉인된 활[신급] + 봉인서"
              ]
            },
            {
              step: "A-2",
              title: "구대륙 문장 계보 (총 10단계 조합)",
              target: "인두인의 예언 문장[반 신급]",
              mats: [
                "1. 소울방패[노말] = 소울방패 조합서 + 대륙의 세번째 보물 + 악마의 파편 + 럭셔리반지",
                "2. 대륙의망토 = 대륙의망토 조합서 + 소울방패 + 2트로피2 + 전설의갑옷[노말]",
                "3. 대륙의갑옷 = 대륙의갑옷 조합서 + 대륙의망토 + 부운영자들의 해골 + 2트로피2",
                "4. 낡은 대륙의 책 = 낡은 대륙의 책 조합서 + 대륙의갑옷 + 부운영자 해골 + 소원의빛 + ???",
                "5. 세계수의 특혜 = 세계수의 특혜 조합서 + 타락한 세계수의 가지 + 낡은 대륙의 책",
                "6. 붉은 세계수의 특혜 = 조합서 + 세계수의 특혜 + 붉은 영물의 심장 + 개구리의 진액",
                "7. 차원의 문장[반 신급] = 붉은 세계수의 특혜 + 차원의 전사 아뮬렛",
                "8. 빛의 문장[반 신급] = 차원의 문장 + 개구리의 갑옷 + 빛",
                "9. 고대의 문장[반 신급] = 빛의 문장 + 비석 + 이상한 종이",
                "10. 인두인의 예언 문장[반 신급] = 인두인의 예언 문장 조합서 + 다크 발키리의 문장 + 고대의 문장"
              ]
            },
            {
              step: "A-3",
              title: "신대륙의 문장 ➔ 신대륙인의 문장 최종 결합 (2단계)",
              target: "신대륙인의 문장[반 신급]",
              mats: [
                "11. 신대륙의 문장[반 신급] = 신대륙의 문장 조합서 + 여행자의 활[신급] + 인두인의 예언 문장[반 신급] + 펠 임프의 시체 + 펠 샤먼의 지팡이 + 펠 오버시어의 검",
                "12. 신대륙인의 문장[반 신급] = 신대륙인의 문장 조합서 + 신대륙의 문장[반 신급] + 엘퀴네스의 눈물 + 크리스탈 골렘의 블럭 + 하이브 마인드의 촉수"
              ]
            }
          ]
        },
        {
          name: "봉인 해제자 칭호[에픽]",
          desc: "구대륙 8괘(대륙의 종이/펜) ➔ 장군/리더 ➔ 여행자 ➔ 레이븐 ➔ 봉인 해제자 칭호",
          badge: "구대륙 7단계 칭호",
          tree: [
            {
              step: "B-1",
              title: "8괘 수집 및 도구 제작 (2단계)",
              target: "대륙의 종이 & 대륙의 펜[에픽]",
              mats: [
                "1. 대륙의 종이[에픽] = 대륙의 종이 조합서 + 우 괘 + 좌 괘 + 지 괘 + 토 괘",
                "2. 대륙의 펜[에픽] = 대륙의 펜 조합서 + 괴 괘 + 뢰 괘 + 멸 괘 + 묘 괘"
              ]
            },
            {
              step: "B-2",
              title: "장군 & 리더 & 여행자 칭호 (3단계)",
              target: "여행자의 칭호[에픽]",
              mats: [
                "3. 장군의 칭호[에픽] = 장군의 칭호 조합서 + 대륙의 종이[에픽] + 대륙의 펜[에픽]",
                "4. 리더의 칭호[에픽] = 지하계 주술사의 스탭 + 처형자의 칼 + 워리더의 방패",
                "5. 여행자의 칭호[에픽] = 여행자의 칭호 조합서 + 전왕의 칭호[에픽] + 장군의 칭호[에픽] + 리더의 칭호[에픽]"
              ]
            },
            {
              step: "B-3",
              title: "레이븐 칭호 ➔ 봉인 해제자 칭호 최종 완성 (2단계)",
              target: "봉인 해제자 칭호[에픽]",
              mats: [
                "6. 레이븐 칭호[에픽] = 레이븐 칭호 조합서 + 여행자의 칭호[에픽] + 리더의 칭호[에픽] + 레이븐 피어의 가방",
                "7. 봉인 해제자 칭호[에픽] = 봉인 해제자 칭호 조합서 + 봉인 해제자A + 봉인 해제자B + 봉인 해제자C + 레이븐 칭호[에픽]"
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: "sp_blue_gaia",
    name: "푸른 가이아의 특혜[조합체]",
    rank: "조합체",
    icon: "🌿",
    totalCoin: 331,
    totalGold: 400000,
    stepCount: 8,
    summaryDesc: "보물1~4(x3) ➔ 데몬갑옷(x3) ➔ 3트로피3(x2) + 스피릿방패 ➔ 고대갑옷 ➔ 고대책 ➔ 가이아 ➔ 푸른 가이아",
    steps: [
      {
        step: 1,
        target: "신대륙의 네번째 보물[조합체] (총 3개 제작)",
        coin: 111,
        gold: 0,
        materials: ["1개당 37주화 소모 (1보물(4) ➔ 2보물(4) ➔ 3보물(10) ➔ 4보물(15))", "스피릿 목걸이, 블러드스톤, 산적왕목걸이, 장곤충, 스컬, 로구밍다리, 얼음병, 코브라독, 바실리스크보석"]
      },
      {
        step: 2,
        target: "-유니크급-데몬의 갑옷 (총 3개 제작)",
        coin: 54,
        gold: 0,
        materials: ["1개당 18주화 소모 (데몬의 갑옷 조합서(18) + 낚시꾼의 갑옷 + 데몬의 파편)"]
      },
      {
        step: 3,
        target: "3트로피3[조합체] (총 2개 제작)",
        coin: 34,
        gold: 0,
        materials: ["1개당 17주화 소모 (3트로피3 조합서(17) + 데몬의 갑옷 + 신대륙 4보물)"]
      },
      {
        step: 4,
        target: "스피릿 방패[조합체]",
        coin: 16,
        gold: 0,
        materials: ["스피릿 방패 조합서(16) + 신대륙 4보물 + 은빛 반지[희귀급] + 데몬의 파편"]
      },
      {
        step: 5,
        target: "고대의망토[조합체]",
        coin: 18,
        gold: 0,
        materials: ["고대의망토 조합서(18) + 3트로피3[조합체] + 데몬의 갑옷 + 스피릿 방패[조합체]"]
      },
      {
        step: 6,
        target: "고대의갑옷[조합체]",
        coin: 0,
        gold: 400000,
        materials: ["고대의갑옷 조합서 + 고대의망토[조합체] + 3트로피3[조합체] + 케이의 해골"]
      },
      {
        step: 7,
        target: "낡은 고대의 책 ➔ 가이아의 특혜[조합체]",
        coin: 63,
        gold: 0,
        materials: ["낡은 고대의 책(30): 케이의 해골, 고대의갑옷, 희망의빛, 어둠", "가이아의 특혜(33): 낡은 고대의 책, 타락한 가이아의 가지"]
      },
      {
        step: 8,
        target: "푸른 가이아의 특혜[조합체]",
        coin: 35,
        gold: 0,
        materials: ["푸른 가이아의 특혜 조합서(35) + 가이아의 특혜[조합체] + 가이아의 수액 + 봉인된 가이아의 심장"]
      }
    ],
    rawMaterials: [
      { name: "제국 주화", count: "331개", type: "currency" },
      { name: "골드 (금)", count: "40만 Gold", type: "currency" },
      { name: "신대륙 네번째 보물", count: "3개", type: "treasure" },
      { name: "-유니크급-데몬의 갑옷", count: "3개", type: "armor" },
      { name: "케이의 해골", count: "2개", type: "mat" },
      { name: "은빛 반지[희귀급]", count: "1개", type: "equip" },
      { name: "희망의빛 / 어둠", count: "각 1개", type: "mat" },
      { name: "타락한 가이아의 가지", count: "1개", type: "mat" },
      { name: "가이아의 수액", count: "1개", type: "mat" },
      { name: "봉인된 가이아의 심장", count: "1개", type: "mat" },
      { name: "각 단계 조합서 10종", count: "총 10장", type: "recipe" }
    ]
  },
  {
    id: "sp_seal_str",
    name: "힘의 인장Lv2[에픽]",
    rank: "에픽",
    icon: "📌",
    totalCoin: 5,
    totalGold: 0,
    stepCount: 1,
    summaryDesc: "심연의 해적 인장 + 차가운 돼지고기 + 힘의 조각Lv2 + 보어 라이더 심장",
    steps: [
      {
        step: 1,
        target: "힘의 인장Lv2[에픽]",
        coin: 5,
        gold: 0,
        materials: ["힘의 인장Lv2 조합서", "구대륙: 심연의 해적 인장[에픽] (콜럼버스 인장 기반)", "차가운 돼지고기[조합재료]", "힘의 조각Lv2[???]", "보어 라이더의 심장"]
      }
    ],
    rawMaterials: [
      { name: "제국 주화", count: "5개", type: "currency" },
      { name: "힘의 인장Lv2 조합서", count: "1개", type: "recipe" },
      { name: "심연의 해적 인장[에픽]", count: "1개 (구대륙 인장 최종)", type: "seal" },
      { name: "차가운 돼지고기[조합재료]", count: "1개", type: "mat" },
      { name: "힘의 조각Lv2[???]", count: "1개", type: "mat" },
      { name: "보어 라이더의 심장", count: "1개", type: "mat" }
    ],
    oldContinentPrereqs: {
      title: "구대륙 선행 필수 인장: 심연의 해적 인장[에픽] 상세 제작법",
      items: [
        {
          name: "심연의 해적 인장[에픽]",
          desc: "구대륙 힘/민/지 3대 스탯 인장과 콜럼버스의 인장을 통합하여 완성하는 구대륙 최종 인장",
          badge: "구대륙 3단계 인장",
          tree: [
            {
              step: "C-1",
              title: "3대 기본 스탯 인장 제작 (각 1개)",
              target: "힘 / 지식 / 민첩의 인장[에픽]",
              mats: [
                "1. 힘의 인장[에픽] = 힘의 인장 조합서 + 힘의 조각[???] + 돼지고기 + 돼지의 심장",
                "2. 지식의 인장[에픽] = 지식의 인장 조합서 + 지식의 조각[???] + 돼지고기 + 돼지의 심장",
                "3. 민첩의 인장[에픽] = 민첩의 인장 조합서 + 민첩의 조각[???] + 돼지고기 + 돼지의 심장"
              ]
            },
            {
              step: "C-2",
              title: "3대 인장 통합 ➔ 콜럼버스의 인장",
              target: "콜럼버스의 인장[에픽]",
              mats: [
                "4. 콜럼버스의 인장[에픽] = 콜럼버스의 인장 조합서 + 옥좌의 인장 + 힘의 인장 + 민첩의 인장 + 지식의 인장 + 대나무 창"
              ]
            },
            {
              step: "C-3",
              title: "구대륙 최종 심연의 해적 인장 완성",
              target: "심연의 해적 인장[에픽]",
              mats: [
                "5. 심연의 해적 인장[에픽] = 심연의 해적 인장 조합서 + 드워프 해적의 총 + 콜럼버스의 인장[에픽] + 심연의 해적모자"
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: "sp_nightmare",
    name: "나이트메어 반지[반 신급]",
    rank: "반 신급",
    icon: "💍",
    totalCoin: 49,
    totalGold: 1000000,
    stepCount: 2,
    summaryDesc: "핑크게이의 문장 (49주화) + 악몽이 담긴 반지 + 흉몽의 영혼 + 드림워커의 영혼",
    steps: [
      {
        step: 1,
        target: "핑크게이의 문장[반 신급] (선행 테크)",
        coin: 49,
        gold: 1000000,
        materials: ["긴급용 무기 ➔ 호빵의 무구 ➔ 코볼드 ➔ 폭설 거미 ➔ 핑크게이의 문장"]
      },
      {
        step: 2,
        target: "나이트메어 반지[반 신급]",
        coin: 0,
        gold: 0,
        materials: ["핑크게이의 문장[반 신급]", "악몽이 담긴 반지[조합재료]", "흉몽의 영혼[조합재료]", "드림워커의 영혼[조합재료]"]
      }
    ],
    rawMaterials: [
      { name: "제국 주화 (문장 포함)", count: "49개", type: "currency" },
      { name: "골드 (문장 포함)", count: "100만 Gold", type: "currency" },
      { name: "핑크게이의 문장[반 신급]", count: "1개", type: "insignia" },
      { name: "악몽이 담긴 반지[조합재료]", count: "1개", type: "mat" },
      { name: "흉몽의 영혼[조합재료]", count: "1개", type: "mat" },
      { name: "드림워커의 영혼[조합재료]", count: "1개", type: "mat" }
    ]
  },
  {
    id: "sp_flag",
    name: "시즌포인트 깃발[조합재료]",
    rank: "조합재료",
    icon: "🚩",
    totalCoin: 0,
    totalGold: 0,
    stepCount: 1,
    summaryDesc: "시즌포인트 획득을 인증하는 최종 특별 깃발 (인게임 퀘스트/드롭/교환)",
    steps: [
      {
        step: 1,
        target: "시즌포인트 깃발[조합재료]",
        coin: 0,
        gold: 0,
        materials: ["인게임 시즌 전용 퀘스트 / 드롭 / 교환처에서 획득"]
      }
    ],
    rawMaterials: [
      { name: "시즌포인트 깃발[조합재료]", count: "1개", type: "flag" }
    ]
  }
];

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
  299: { name: "호빵 반지[신급]", icon: "💍", rank: "신급" },
  324: { name: "[레전드급]저주받은구울의 손톱", icon: "💅", rank: "레전드급" },
  322: { name: "데스토의 보조갑옷[에픽]", icon: "🛡️", rank: "에픽" },
  246: { name: "블러드 나이프[신급]", icon: "🗡️", rank: "신급" },
  9: { name: "치프틴 그람의 목걸이[조합체]", icon: "📿", rank: "조합체" },
  374: { name: "치프틴 그람의 목걸이[조합체]", icon: "📿", rank: "조합체" },
  242: { name: "파란빛 목걸이[조합체]", icon: "📿", rank: "조합체" },
  320: { name: "데스토의 제왕홀[에픽]", icon: "🪄", rank: "에픽" },
  258: { name: "그림자 목걸이[조합체]", icon: "📿", rank: "조합체" },
  259: { name: "신대륙의 첫번째 보물[조합체]", icon: "🏆", rank: "조합체" },
  260: { name: "신대륙의 두번째 보물[조합체]", icon: "🏆", rank: "조합체" },
  237: { name: "스피릿 목걸이-레어-", icon: "📿", rank: "레어" },
  367: { name: "블루티렉스 퇴치 칭호[에픽]", icon: "🏷️", rank: "에픽" },
  368: { name: "[레전드급]블루티렉스 가죽", icon: "🦖", rank: "레전드급" },
  373: { name: "나이트메어 반지[반 신급]", icon: "💍", rank: "반 신급" },
  377: { name: "헤로스 완드[영웅]", icon: "🪄", rank: "영웅" },
  376: { name: "헬 윈드보우[영웅]", icon: "🏹", rank: "영웅" },
  375: { name: "살육자의 도끼", icon: "🪓", rank: "영웅" }
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
      saveDate: "2026-10-14 12:00:00",
      characterName: "『시즌』색욕의 마왕군단장",
      characterLevel: 6000,
      petName: "그레이트 씨 헌터[펫]",
      petLevel: 6000,
      gold: 10176,
      imperialCoin: 705,
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
        slotKey: "Code1_37_1",
        saveCode: "1",
        mapVersion: "v37.00",
        saveDate: "2026-10-14 12:00:00",
        characterName: "『시즌』색욕의 마왕군단장",
        characterLevel: 6000,
        petName: "그레이트 씨 헌터[펫]",
        gold: 51601,
        imperialCoin: 8000,
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
      }
    ]
  },
  "goodwin": {
    userId: "goodwin",
    seasonPoint: 116,
    honorPoint: 278,
    isSeasonCompleted: true,
    seasonVersionLabel: "v37",
    rankingPoint: 7413786,
    rankStanding: "계급 8위 (672점) / 유저 7위",
    titleCode: "TT_TYPE2", // 실버 칭호
    swordCode: "BLSwrod2", // 그람(모능)
    swordLevel: 40,        // SDATA1 그람 마스터리 Lv.40
    ownedSwords: ["BLSwrod1", "BLSwrod2"],
    swordMasteryLevels: {
      "BLSwrod1": 1,
      "BLSwrod2": 40,
      "BLSwrod3": 0,
      "BLSwrod4": 0,
      "BLSwrod5": 0,
      "nBLSwrodUP1": 0
    },
    wingId: 0,
    wingLevel: 0,
    redBean: 0,
    blueBean: 0,
    greyBean: 3,
    beans: { red: 0, blue: 0, grey: 3 },
    warehouseData: {
      "BLBox1": 1, "BLBox4": 1
    },
    relicData: {
      "REL_A1": 9, // 이키라의 석상 (Lv.9 Max - SDATA2[0])
      "REL_A2": 1  // 도굴꾼의 석상 (Lv.1 - SDATA2[1])
    },
    sacredPower: "11,098",
    petData: {
      "SP_2": 1, "SP_4": 1, "SP_5": 1, "SP_6": 1, "SP_7": 1, "SP_8": 1, "SP_9": 1,
      "SP2_3": 2, "SP2_4": 1, "SP2_5": 1, "SP2_6": 1, "SP2_7": 1, "SP2_8": 2, "SP2_9": 1
    },
    ownedCodes: [
      "SH_22", "NSH_2"
    ],
    lastSave: {
      saveDate: "2026-10-18 10:30:26",
      characterName: "페가수스 나이트",
      characterLevel: 6000,
      petName: "빙결의 악몽[Lv3][펫]",
      petLevel: 6000,
      gold: 465454,
      imperialCoin: 17741,
      darkStone: 0,
      str: 42073,
      agi: 42073,
      int: 72148,
      heroItems: [
        { id: 377, count: 0 }, // 1. 헤로스 완드[영웅]
        { id: 370, count: 0 }, // 2. 데릭의 뼈갑옷[에픽]
        { id: 297, count: 0 }, // 3. 수령에 빠뜨린자[신급]
        { id: 279, count: 0 }, // 4. 시즌 전생 칭호[에픽]
        { id: 373, count: 0 }, // 5. 나이트메어 반지[반 신급]
        { id: 0, count: 0 }    // 6. 빈 슬롯
      ],
      warehouseItems: [
        { id: 339, count: 0 }, // 1. 푸른 가이아의 특혜[조합체]
        { id: 264, count: 0 }, // 2. 엽기 보석[신급]
        { id: 298, count: 0 }, // 3. 견고한 벽[신급]
        { id: 266, count: 0 }, // 4. #266
        { id: 318, count: 0 }, // 5. 천사의 날개[반 신급]
        { id: 376, count: 0 }  // 6. 헬 윈드보우[영웅]
      ],
      petItems: [
        { id: 375, count: 0 }, // 1. 살육자의 도끼
        { id: 370, count: 0 }, // 2. 데릭의 뼈갑옷[에픽]
        { id: 297, count: 0 }, // 3. 수령에 빠뜨린자[신급]
        { id: 318, count: 0 }, // 4. 천사의 날개[반 신급]
        { id: 373, count: 0 }, // 5. 나이트메어 반지[반 신급]
        { id: 374, count: 0 }  // 6. 치프틴 그람의 목걸이[조합체]
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_37_1",
        saveCode: "1",
        mapVersion: "v37.00",
        saveDate: "2026-10-18 10:30:26",
        characterName: "페가수스 나이트",
        characterLevel: 6000,
        petName: "빙결의 악몽[Lv3][펫]",
        gold: 465454,
        imperialCoin: 17741,
        darkStone: 0,
        str: 42073,
        agi: 42073,
        int: 72148,
        heroItems: [
          { id: 377, count: 0 },
          { id: 370, count: 0 },
          { id: 297, count: 0 },
          { id: 279, count: 0 },
          { id: 373, count: 0 },
          { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 339, count: 0 },
          { id: 264, count: 0 },
          { id: 298, count: 0 },
          { id: 266, count: 0 },
          { id: 318, count: 0 },
          { id: 376, count: 0 }
        ],
        petItems: [
          { id: 375, count: 0 },
          { id: 370, count: 0 },
          { id: 297, count: 0 },
          { id: 318, count: 0 },
          { id: 373, count: 0 },
          { id: 374, count: 0 }
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
      saveDate: "2026-10-14 12:00:00",
      characterName: "『시즌』래빗 신성여단장",
      characterLevel: 6000,
      petName: "그레이트 씨 헌터[펫]",
      petLevel: 6000,
      gold: 553405,
      imperialCoin: 694,
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
        slotKey: "Code1_37_1",
        saveCode: "1",
        mapVersion: "v37.00",
        saveDate: "2026-10-14 12:00:00",
        characterName: "『시즌』래빗 신성여단장",
        characterLevel: 6000,
        petName: "그레이트 씨 헌터[펫]",
        gold: 553405,
        imperialCoin: 694,
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
      saveDate: "2026-10-14 12:00:00",
      characterName: "캐릭터 #254",
      characterLevel: 6000,
      petName: "신성 성녀[Lv1][펫]",
      petLevel: 6000,
      gold: 188032,
      imperialCoin: 1115,
      darkStone: 0,
      str: 9936, agi: 9936, int: 17056,
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
        slotKey: "Code1_37_123",
        saveCode: "123",
        mapVersion: "v37.00",
        saveDate: "2026-10-14 12:00:00",
        characterName: "캐릭터 #254",
        characterLevel: 6000,
        petName: "신성 성녀[Lv1][펫]",
        gold: 188032,
        imperialCoin: 1115,
        darkStone: 0,
        str: 9936, agi: 9936, int: 17056,
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
  "ssiiss": {
    userId: "ssiiss",
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
    sacredPower: "0",
    petData: {},
    ownedCodes: [],
    lastSave: {
      saveDate: "2026-08-03 20:30:00",
      characterName: "『시즌』언고어 스피어맨",
      characterLevel: 6000,
      petName: "서리정령[Lv2][펫]",
      petLevel: 6000,
      gold: 1000000,
      imperialCoin: 3428,
      darkStone: 0,
      str: 72148, agi: 42073, int: 42073,
      heroItems: [
        { id: 318, count: 0 }, { id: 279, count: 0 }, { id: 320, count: 0 },
        { id: 322, count: 0 }, { id: 0, count: 0 }, { id: 263, count: 0 }
      ],
      petItems: [
        { id: 237, count: 0 }, { id: 0, count: 0 }, { id: 322, count: 0 },
        { id: 320, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: []
    },
    saveSlots: [
      {
        slotKey: "Code1_2_go",
        saveCode: "go",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:30:00",
        characterName: "『시즌』언고어 스피어맨",
        characterLevel: 6000,
        petName: "서리정령[Lv2][펫]",
        gold: 1000000,
        imperialCoin: 3428,
        darkStone: 0,
        str: 72148, agi: 42073, int: 42073,
        heroItems: [
          { id: 318, count: 0 }, { id: 279, count: 0 }, { id: 320, count: 0 },
          { id: 322, count: 0 }, { id: 0, count: 0 }, { id: 263, count: 0 }
        ],
        petItems: [
          { id: 237, count: 0 }, { id: 0, count: 0 }, { id: 322, count: 0 },
          { id: 320, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: []
      },
      {
        slotKey: "Code1_1_9",
        saveCode: "9",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:28:00",
        characterName: "언고어 스피어맨",
        characterLevel: 6000,
        petName: "백스플 개구리[펫]",
        gold: 1000000,
        imperialCoin: 2240,
        darkStone: 0,
        str: 42073, agi: 42073, int: 72148,
        heroItems: [], petItems: [], warehouseItems: []
      },
      {
        slotKey: "Code1_2_1",
        saveCode: "1",
        mapVersion: "v36.00",
        saveDate: "2026-08-03 20:25:00",
        characterName: "특수 캐릭터",
        characterLevel: 6000,
        petName: "백스플 개구리[펫]",
        gold: 1000000,
        imperialCoin: 733,
        darkStone: 0,
        str: 42073, agi: 42073, int: 72148,
        heroItems: [], petItems: [], warehouseItems: []
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
      saveDate: "2026-10-14 12:00:00",
      characterName: "『[2차 전생]』정령들의 주인",
      characterLevel: 6000,
      petName: "빙결의 악몽[Lv3][펫]",
      petLevel: 6000,
      gold: 335888,
      imperialCoin: 109,
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
        slotKey: "Code1_37_1",
        saveCode: "1",
        mapVersion: "v37.00",
        saveDate: "2026-10-14 12:00:00",
        characterName: "『[2차 전생]』정령들의 주인",
        characterLevel: 6000,
        petName: "빙결의 악몽[Lv3][펫]",
        gold: 335888,
        imperialCoin: 109,
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
    seasonPoint: 45,
    honorPoint: 461,
    isSeasonCompleted: true,
    seasonVersionLabel: "v37",
    seasonCompletedChar: "『시즌』사령관 암흑기사장",
    rankingPoint: 157213192,
    rankStanding: "계급 4위 (1,015점) / 유저 1위",
    titleCode: "TT_TYPE1",
    titleLevel: 8,
    swordCode: "BLSwrod2",
    swordLevel: 9,
    ownedSwords: ["BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5", "nBLSwrodUP1"],
    swordMasteryLevels: {
      "BLSwrod1": 0,
      "BLSwrod2": 9,
      "BLSwrod3": 1,
      "BLSwrod4": 1,
      "BLSwrod5": 1,
      "nBLSwrodUP1": 33
    },
    wingId: 0,
    wingLevel: 0,
    warehouseData: {
      "BLBox2": 9, "BLBox3": 9, "BLBox4": 9, "BLBox5": 9, "BLBox6": 9,
      "BLBox7": 9, "BLBox8": 9, "BLBox9": 9, "BLBox10": 9, "BLBox11": 9,
      "BLBoxUP1": 9, "BLBoxUP2": 9, "BLBoxUP3": 9, "BLBoxUP4": 9, "BLBoxUP5": 9, "BLBoxUP6": 9,
      "NBLBox2": 9, "NBLBox3": 9, "NBLBox4": 9,
      "NBLBox_UP1": 9, "NBLBox_UP2": 9, "NBLBox_UP3": 9, "NBLBox_UP4": 9, "NBLBox_UP5": 9, "NBLBox_UP6": 9,
      "NBLBox_MOON": 9
    },
    relicData: {
      // 유물 목록박스A (SDATA2 앞 10자리: 9,1,0,0,0,0,9,0,0,0)
      "REL_A1": 9,
      "REL_A2": 1,
      "REL_A7": 9,
      // 성유물 목록박스A (SP_LBOX1~10 전부 Lv.9 + 로잔티움의 성물 자동 해금)
      "HRL_1": 9, "HRL_2": 9, "HRL_3": 9, "HRL_4": 9, "HRL_5": 9,
      "HRL_6": 9, "HRL_7": 9, "HRL_8": 9, "HRL_9": 9, "HRL_10": 9,
      "HRL_ROZ": 1
    },
    sacredPower: "13,302,733",
    redBean: 0,
    blueBean: 0,
    greyBean: 2,
    beans: { red: 0, blue: 0, grey: 2 },
    sdata1: "0,0,0,0,0,33,",
    sdata2: "9,1,0,0,0,0,9,0,0,0,0,9,0,0,0,0,0,0,0,37,8,37,0,",
    petData: {
      "SP_1": 1, "SP_2": 1, "SP_3": 1, "SP_4": 1, "SP_5": 1, "SP_6": 1, "SP_7": 1, "SP_8": 2, "SP_9": 1,
      "SP2_1": 4, "SP2_2": 4, "SP2_3": 4, "SP2_4": 3, "SP2_5": 3, "SP2_6": 3, "SP2_7": 3, "SP2_8": 3, "SP2_9": 3,
      "SP3_2U": 9, "SP3_2U2": 9, "SP3_2U3": 9
    },
    ownedCodes: [
      "SH_1", "SH_2", "SH_3", "SH_4", "SH_5", "SH_6", "SH_7", "SH_8", "SH_9", "SH_10",
      "SH_11", "SH_12", "SH_13", "SH_14", "SH_15", "SH_16", "SH_17", "SH_18", "SH_19", "SH_20",
      "SH_21", "SH_22", "SH_23", "SH_24", "SH_25", "SH_26", "SH_27",
      "SH_82", "SH_83", "SH_84", "SH_85", "SH_86", "SH_87", "SH_88", "SH_89", "SH_90"
    ],
    lastSave: {
      saveDate: "2026-10-17 10:30:00",
      characterName: "『시즌』시타 응원여단장",
      characterLevel: 6000,
      petName: "블러드 위저드 탈렌[Lv8][펫]",
      petLevel: 6000,
      gold: 1000000,
      imperialCoin: 888011,
      darkStone: 0,
      str: 63149,
      agi: 63149,
      int: 108302,
      heroItems: [
        { id: 322, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 367, count: 0 }, { id: 368, count: 0 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_37_2",
        saveCode: "2",
        mapVersion: "v37.00",
        saveDate: "2026-10-17 10:30:00",
        characterName: "『시즌』시타 응원여단장",
        characterLevel: 6000,
        petName: "블러드 위저드 탈렌[Lv8][펫]",
        petLevel: 6000,
        gold: 1000000,
        imperialCoin: 888011,
        darkStone: 0,
        str: 63149,
        agi: 63149,
        int: 108302,
        heroItems: [
          { id: 322, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 367, count: 0 }, { id: 368, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      },
      {
        slotKey: "Code1_37_1",
        saveCode: "1",
        mapVersion: "v37.00",
        saveDate: "2026-10-15 12:00:00",
        characterName: "사령관 암흑기사장",
        characterLevel: 6000,
        petName: "블러드 위저드 탈렌[Lv8][펫]",
        petLevel: 6000,
        gold: 1000000,
        imperialCoin: 344254,
        darkStone: 0,
        str: 216604,
        agi: 126299,
        int: 126299,
        heroItems: [
          { id: 373, count: 0 }, { id: 374, count: 0 }, { id: 339, count: 0 },
          { id: 361, count: 0 }, { id: 303, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      }
    ]
  },
  "mnm1823": {
    userId: "mnm1823",
    seasonPoint: 0,
    honorPoint: 0,
    isSeasonCompleted: true,
    seasonVersionLabel: "v37",
    seasonCompletedChar: "『시즌』사령관 암흑기사장",
    rankingPoint: 0,
    rankStanding: "순위 미등록 (일반 유저)",
    titleCode: 1,
    swordCode: "nBLSwrodUP1",
    swordLevel: 9,
    ownedSwords: ["BLSwrod2", "BLSwrod3", "BLSwrod4", "BLSwrod5", "nBLSwrodUP1"],
    wingId: 1,
    wingLevel: 1,
    sacredPower: "12,273",
    petData: {
      "SP_1": 1, "SP_2": 1, "SP_3": 1, "SP_4": 1, "SP_5": 1, "SP_6": 1, "SP_7": 1, "SP_8": 1, "SP_9": 1,
      "SP2_2": 5, "SP2_4": 4, "SP2_5": 4, "SP2_6": 4, "SP2_7": 4, "SP2_8": 4, "SP2_9": 4,
      "SP3_2U": 9, "SP3_2U2": 9, "SP3_2U3": 9, "SP3_2U4": 9
    },
    warehouseData: {
      "BLBox2": 1, "BLBox3": 1, "BLBox4": 9, "BLBox5": 9, "BLBox6": 9, "BLBox7": 9, "BLBox8": 9, "BLBox9": 9, "BLBox10": 9, "BLBox11": 9,
      "BLBoxUP1": 9, "BLBoxUP2": 9, "BLBoxUP3": 9, "BLBoxUP4": 9,
      "NBLBox3": 9
    },
    ownedCodes: [
      "SH_1", "SH_2", "SH_3", "SH_4", "SH_5", "SH_6", "SH_7", "SH_8", "SH_9", "SH_10",
      "SH_11", "SH_12", "SH_13", "SH_14", "SH_15", "SH_16", "SH_17", "SH_18", "SH_19", "SH_20",
      "SH_21", "SH_22", "SH_23", "SH_24", "SH_25", "SH_26", "SH_27", "SH_28", "SH_29", "SH_30"
    ],
    lastSave: {
      saveDate: "2026-10-11 22:00:00",
      characterName: "『시즌』사령관 암흑기사장",
      characterLevel: 6000,
      petName: "블러드 위저드 탈렌[Lv8][펫]",
      petLevel: 6000,
      gold: 1000000,
      imperialCoin: 430668,
      darkStone: 0,
      str: 216604, agi: 126299, int: 126299,
      heroItems: [
        { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 0, count: 10 },
        { id: 0, count: 80 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 367, count: 0 }, // 1. 블루티렉스 퇴치 칭호[에픽]
        { id: 0, count: 61 }, { id: 0, count: 0 },
        { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ],
      warehouseItems: [
        { id: 373, count: 0 }, // 1. 나이트메어 반지[반 신급]
        { id: 361, count: 0 }, // 2. 핑크게이의 문장[반 신급]
        { id: 339, count: 0 }, // 3. 푸른 가이아의 특혜[조합체]
        { id: 303, count: 0 }, // 4. 힘의 인장Lv2[에픽]
        { id: 374, count: 0 }, // 5. 치프틴 그람의 목걸이[조합체]
        { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_37_시즌",
        saveCode: "시즌",
        mapVersion: "v37.00",
        saveDate: "2026-10-11 22:00:00",
        characterName: "『시즌』사령관 암흑기사장",
        characterLevel: 6000,
        petName: "블러드 위저드 탈렌[Lv8][펫]",
        gold: 1000000,
        imperialCoin: 430668,
        darkStone: 0,
        str: 216604, agi: 126299, int: 126299,
        heroItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 0, count: 10 },
          { id: 0, count: 80 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 367, count: 0 }, // 1. 블루티렉스 퇴치 칭호[에픽]
          { id: 0, count: 61 }, { id: 0, count: 0 },
          { id: 0, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 373, count: 0 }, // 1. 나이트메어 반지[반 신급]
          { id: 361, count: 0 }, // 2. 핑크게이의 문장[반 신급]
          { id: 339, count: 0 }, // 3. 푸른 가이아의 특혜[조합체]
          { id: 303, count: 0 }, // 4. 힘의 인장Lv2[에픽]
          { id: 374, count: 0 }, // 5. 치프틴 그람의 목걸이[조합체]
          { id: 0, count: 0 }
        ]
      }
    ]
  },
  "tinymong": {
    userId: "Tinymong",
    seasonPoint: 0,
    honorPoint: 3,
    rankingPoint: 0,
    rankStanding: "일반 유저",
    titleCode: 1,
    swordCode: "BLSwrod0",
    swordLevel: 1,
    ownedSwords: [],
    wingId: 0,
    wingLevel: 0,
    redBean: 0,
    blueBean: 0,
    greyBean: 0,
    beans: { red: 0, blue: 0, grey: 0 },
    warehouseData: {},
    sacredPower: "0",
    petData: {},
    ownedCodes: [],
    lastSave: {
      saveDate: "2026-10-15 12:00:00",
      characterName: "[2차 전생]신궁 - 빛의 활의명수",
      characterLevel: 6000,
      petName: "없음",
      petLevel: 0,
      gold: 1000000,
      imperialCoin: 1018,
      darkStone: 0,
      str: 60150,
      agi: 108302,
      int: 60150,
      heroItems: [],
      warehouseItems: [],
      petItems: []
    },
    saveSlots: [
      {
        slotKey: "Code1_37_2222",
        saveCode: "2222",
        mapVersion: "v37.00",
        saveDate: "v37 세이브",
        characterName: "[2차 전생]신궁 - 빛의 활의명수",
        characterLevel: 6000,
        petName: "없음",
        gold: 1000000,
        imperialCoin: 1018,
        darkStone: 0,
        str: 60150,
        agi: 108302,
        int: 60150,
        heroItems: [],
        warehouseItems: [],
        petItems: []
      },
      {
        slotKey: "Code1_37_1111",
        saveCode: "1111",
        mapVersion: "v37.00",
        saveDate: "v37 세이브",
        characterName: "캐릭터",
        characterLevel: 6000,
        petName: "없음",
        gold: 934370,
        imperialCoin: 8,
        darkStone: 0,
        str: 32692,
        agi: 19057,
        int: 19057,
        heroItems: [],
        warehouseItems: [],
        petItems: []
      }
    ]
  },
  "kk2103": {
    userId: "kk2103",
    seasonPoint: 0,
    honorPoint: 0,
    rankingPoint: 4398117,
    rankStanding: "일반 유저",
    titleCode: 1,
    swordCode: "BLSwrod0",
    swordLevel: 1,
    ownedSwords: [],
    wingId: 0,
    wingLevel: 0,
    redBean: 0,
    blueBean: 0,
    greyBean: 0,
    beans: { red: 0, blue: 0, grey: 0 },
    warehouseData: {},
    sacredPower: "0",
    petData: {
      "켈자르맨서 코르[펫]": 1
    },
    ownedCodes: [],
    lastSave: {
      saveDate: "2026-10-15 12:00:00",
      characterName: "[2차 전생]신궁",
      characterLevel: 6000,
      petName: "켈자르맨서 코르[펫]",
      petLevel: 6000,
      gold: 1200,
      imperialCoin: 406,
      darkStone: 0,
      str: 60150,
      agi: 108302,
      int: 60150,
      heroItems: [
        { id: 376, count: 0 }, { id: 370, count: 0 }, { id: 360, count: 0 },
        { id: 267, count: 0 }, { id: 0, count: 0 }, { id: 19, count: 0 }
      ],
      warehouseItems: [
        { id: 192, count: 0 }, { id: 220, count: 0 }, { id: 220, count: 0 },
        { id: 192, count: 0 }, { id: 242, count: 0 }, { id: 0, count: 0 }
      ],
      petItems: [
        { id: 352, count: 0 }, { id: 370, count: 0 }, { id: 360, count: 0 },
        { id: 203, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
      ]
    },
    saveSlots: [
      {
        slotKey: "Code1_37_궁수",
        saveCode: "궁수",
        mapVersion: "v37.00",
        saveDate: "2026-10-15 12:00:00",
        characterName: "[2차 전생]신궁",
        characterLevel: 6000,
        petName: "켈자르맨서 코르[펫]",
        gold: 1200,
        imperialCoin: 406,
        darkStone: 0,
        str: 60150,
        agi: 108302,
        int: 60150,
        heroItems: [
          { id: 376, count: 0 }, { id: 370, count: 0 }, { id: 360, count: 0 },
          { id: 267, count: 0 }, { id: 0, count: 0 }, { id: 19, count: 0 }
        ],
        warehouseItems: [
          { id: 192, count: 0 }, { id: 220, count: 0 }, { id: 220, count: 0 },
          { id: 192, count: 0 }, { id: 242, count: 0 }, { id: 0, count: 0 }
        ],
        petItems: [
          { id: 352, count: 0 }, { id: 370, count: 0 }, { id: 360, count: 0 },
          { id: 203, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ]
      },
      {
        slotKey: "Code1_37_1234",
        saveCode: "1234",
        mapVersion: "v37.00",
        saveDate: "2026-10-15 11:00:00",
        characterName: "[2차 전생]지천사",
        characterLevel: 6000,
        petName: "켈자르맨서 코르[펫]",
        gold: 565676,
        imperialCoin: 20,
        darkStone: 0,
        str: 60150,
        agi: 60150,
        int: 108302,
        heroItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 360, count: 0 },
          { id: 267, count: 0 }, { id: 0, count: 0 }, { id: 0, count: 0 }
        ],
        warehouseItems: [
          { id: 208, count: 0 }, { id: 197, count: 0 }, { id: 260, count: 0 },
          { id: 227, count: 0 }, { id: 260, count: 0 }, { id: 260, count: 0 }
        ],
        petItems: [
          { id: 372, count: 0 }, { id: 370, count: 0 }, { id: 360, count: 0 },
          { id: 195, count: 0 }, { id: 316, count: 0 }, { id: 215, count: 0 }
        ]
      }
    ]
  }
};

// ==========================================
// 7. M16TOOL 실시간 연동 랭킹 데이터베이스 (유저랭킹 & 계급랭킹 TOP 30 - 최신 세이브 기준)
// ==========================================
const DSR_RANKINGS_DATA = {
  "updatedAt": "실시간 m16tool 자동 동기화 (v37 최신 세이브 기준)",
  "userRankings": [
    {
      "rank": 1,
      "nicName": "Horus",
      "userRank": 1,
      "userScore": 157213192,
      "tierRank": 4,
      "tierScore": 1015,
      "seasonPoint": 45,
      "honorPoint": 461,
      "coin": 888011,
      "gold": 1000000,
      "sacredPower": 13175725,
      "swordKind": 2,
      "titleLevel": 8,
      "totStats": 234600,
      "str": 63149,
      "agi": 63149,
      "int": 108302,
      "charName": "시타 응원여단장",
      "latestSlot": "Code1_37_2"
    },
    {
      "rank": 2,
      "nicName": "mnm1823",
      "userRank": 2,
      "userScore": 31557134,
      "tierRank": 13,
      "tierScore": 331,
      "seasonPoint": 37,
      "honorPoint": 130,
      "coin": 430668,
      "gold": 1000000,
      "sacredPower": 1241150,
      "swordKind": 6,
      "titleLevel": 11,
      "totStats": 469202,
      "str": 216604,
      "agi": 126299,
      "int": 126299,
      "charName": "사령관 암흑기사장",
      "latestSlot": "Code1_37_시즌"
    },
    {
      "rank": 3,
      "nicName": "vgbh111",
      "userRank": 3,
      "userScore": 21212404,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 45,
      "honorPoint": 461,
      "coin": 344268,
      "gold": 1000000,
      "sacredPower": 12694141,
      "swordKind": 2,
      "titleLevel": 8,
      "totStats": 469202,
      "str": 216604,
      "agi": 126299,
      "int": 126299,
      "charName": "사령관 암흑기사장",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 4,
      "nicName": "ndaebag",
      "userRank": 4,
      "userScore": 13981736,
      "tierRank": 7,
      "tierScore": 689,
      "seasonPoint": 155,
      "honorPoint": 267,
      "coin": 256386,
      "gold": 414408,
      "sacredPower": 350754,
      "swordKind": 3,
      "titleLevel": 5,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "페가수스 나이트",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 5,
      "nicName": "HiYuKi",
      "userRank": 5,
      "userScore": 12241296,
      "tierRank": 1,
      "tierScore": 1319,
      "seasonPoint": 121,
      "honorPoint": 539,
      "coin": 174812,
      "gold": 1000000,
      "sacredPower": 49110,
      "swordKind": 2,
      "titleLevel": 4,
      "totStats": 938404,
      "str": 433208,
      "agi": 252598,
      "int": 252598,
      "charName": "총사령관 데르메트",
      "latestSlot": "Code1_37_총"
    },
    {
      "rank": 6,
      "nicName": "Colaa",
      "userRank": 6,
      "userScore": 8952784,
      "tierRank": 15,
      "tierScore": 288,
      "seasonPoint": 20,
      "honorPoint": 110,
      "coin": 43669,
      "gold": 0,
      "sacredPower": 2712,
      "swordKind": 2,
      "titleLevel": 11,
      "totStats": 469202,
      "str": 216604,
      "agi": 126299,
      "int": 126299,
      "charName": "사령관 암흑기사장",
      "latestSlot": "Code1_37_2222"
    },
    {
      "rank": 7,
      "nicName": "goodwin",
      "userRank": 7,
      "userScore": 7413786,
      "tierRank": 8,
      "tierScore": 672,
      "seasonPoint": 116,
      "honorPoint": 278,
      "coin": 17741,
      "gold": 465454,
      "sacredPower": 11098,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "페가수스 나이트",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 8,
      "nicName": "gowin2",
      "userRank": 8,
      "userScore": 7092874,
      "tierRank": 11,
      "tierScore": 351,
      "seasonPoint": 81,
      "honorPoint": 135,
      "coin": 10315,
      "gold": 79842,
      "sacredPower": 156,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 228602,
      "str": 60150,
      "agi": 60310,
      "int": 108142,
      "charName": "[2차 전생] 정령들의 주인",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 9,
      "nicName": "Bulsanix2",
      "userRank": 9,
      "userScore": 6969059,
      "tierRank": 9,
      "tierScore": 591,
      "seasonPoint": 186,
      "honorPoint": 151,
      "coin": 317,
      "gold": 1000000,
      "sacredPower": 0,
      "swordKind": 2,
      "titleLevel": 1,
      "totStats": 938404,
      "str": 433208,
      "agi": 252598,
      "int": 252598,
      "charName": "총사령관 데르메트",
      "latestSlot": "Code1_37_8594"
    },
    {
      "rank": 10,
      "nicName": "kaeh3505",
      "userRank": 10,
      "userScore": 6849224,
      "tierRank": 25,
      "tierScore": 161,
      "seasonPoint": 81,
      "honorPoint": 40,
      "coin": 102,
      "gold": 1000000,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 2,
      "totStats": 228602,
      "str": 60150,
      "agi": 60310,
      "int": 108142,
      "charName": "[2차 전생] 정령들의 주인",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 11,
      "nicName": "123qqq",
      "userRank": 11,
      "userScore": 5974289,
      "tierRank": 6,
      "tierScore": 810,
      "seasonPoint": 164,
      "honorPoint": 323,
      "coin": 79,
      "gold": 43532,
      "sacredPower": 22,
      "swordKind": 3,
      "titleLevel": 1,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "페가수스 나이트",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 12,
      "nicName": "Sic",
      "userRank": 12,
      "userScore": 5521939,
      "tierRank": 19,
      "tierScore": 231,
      "seasonPoint": 61,
      "honorPoint": 85,
      "coin": 45793,
      "gold": 952964,
      "sacredPower": 12273,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 42153,
      "agi": 72068,
      "int": 42073,
      "charName": "캐릭터 #255",
      "latestSlot": "Code1_37_1234"
    },
    {
      "rank": 13,
      "nicName": "AmBon",
      "userRank": 13,
      "userScore": 5479862,
      "tierRank": 18,
      "tierScore": 233,
      "seasonPoint": 111,
      "honorPoint": 55,
      "coin": 104527,
      "gold": 621302,
      "sacredPower": 32313,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 63149,
      "agi": 63149,
      "int": 108302,
      "charName": "시타 응원여단장",
      "latestSlot": "Code1_37_5"
    },
    {
      "rank": 14,
      "nicName": "AQUARIA",
      "userRank": 14,
      "userScore": 5114232,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 98,
      "honorPoint": 0,
      "coin": 1342,
      "gold": 1000000,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 63149,
      "agi": 63149,
      "int": 108302,
      "charName": "래빗 신성여단장",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 15,
      "nicName": "magic.jet",
      "userRank": 15,
      "userScore": 5074615,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 54,
      "honorPoint": 0,
      "coin": 9970,
      "gold": 0,
      "sacredPower": 768,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 63149,
      "agi": 108302,
      "int": 63149,
      "charName": "매의눈 여단장",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 16,
      "nicName": "AQUARIA1",
      "userRank": 16,
      "userScore": 4987586,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 94,
      "honorPoint": 0,
      "coin": 1605,
      "gold": 1000000,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 1,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "캐릭터 #253",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 17,
      "nicName": "godwin",
      "userRank": 17,
      "userScore": 4985052,
      "tierRank": 14,
      "tierScore": 301,
      "seasonPoint": 73,
      "honorPoint": 108,
      "coin": 8000,
      "gold": 51601,
      "sacredPower": 54,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 63149,
      "agi": 108302,
      "int": 63149,
      "charName": "색욕의 마왕군단장",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 18,
      "nicName": "cor1501",
      "userRank": 18,
      "userScore": 4924894,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 81,
      "honorPoint": 15,
      "coin": 398,
      "gold": 673419,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 2,
      "totStats": 228602,
      "str": 60150,
      "agi": 60310,
      "int": 108142,
      "charName": "[2차 전생] 정령들의 주인",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 19,
      "nicName": "scrat2",
      "userRank": 19,
      "userScore": 4920194,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 79,
      "honorPoint": 0,
      "coin": 290,
      "gold": 876642,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 1,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "[1차 전생] 그랜드 정령술사",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 20,
      "nicName": "cally1",
      "userRank": 20,
      "userScore": 4879129,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 42,
      "honorPoint": 0,
      "coin": 12910,
      "gold": 252168,
      "sacredPower": 25,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 42073,
      "agi": 72148,
      "int": 42073,
      "charName": "바라카 쌍검병",
      "latestSlot": "Code1_37_쌍검병"
    },
    {
      "rank": 21,
      "nicName": "ywnjs3",
      "userRank": 21,
      "userScore": 4843416,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 78,
      "honorPoint": 0,
      "coin": 2970,
      "gold": 0,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 1,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "[1차 전생] 그랜드 정령술사",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 22,
      "nicName": "chaesung",
      "userRank": 22,
      "userScore": 4794414,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 68,
      "honorPoint": 15,
      "coin": 339,
      "gold": 825172,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 2,
      "totStats": 228602,
      "str": 60150,
      "agi": 60310,
      "int": 108142,
      "charName": "[2차 전생] 정령들의 주인",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 23,
      "nicName": "jwm204",
      "userRank": 23,
      "userScore": 4747616,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 69,
      "honorPoint": 7,
      "coin": 646,
      "gold": 1000000,
      "sacredPower": 94,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 42073,
      "agi": 72148,
      "int": 42073,
      "charName": "캐릭터 #237",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 24,
      "nicName": "ywnjs4",
      "userRank": 24,
      "userScore": 4676446,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 61,
      "honorPoint": 0,
      "coin": 3073,
      "gold": 482,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "[1차 전생] 그랜드 정령술사",
      "latestSlot": "Code1_37_샘물"
    },
    {
      "rank": 25,
      "nicName": "DallDall",
      "userRank": 25,
      "userScore": 4615359,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 21,
      "honorPoint": 0,
      "coin": 6842,
      "gold": 1000000,
      "sacredPower": 216,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 72148,
      "agi": 42073,
      "int": 42073,
      "charName": "드레이니 삼형제(블루)",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 26,
      "nicName": "kk2103",
      "userRank": 26,
      "userScore": 4408367,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 0,
      "honorPoint": 0,
      "coin": 1126,
      "gold": 1000000,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 0,
      "totStats": 228602,
      "str": 60150,
      "agi": 108302,
      "int": 60150,
      "charName": "[2차 전생]신궁",
      "latestSlot": "Code1_37_궁수"
    },
    {
      "rank": 27,
      "nicName": "Pan_Do_Ra",
      "userRank": 27,
      "userScore": 4400557,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 0,
      "honorPoint": 0,
      "coin": 247,
      "gold": 1000000,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 0,
      "totStats": 228602,
      "str": 60150,
      "agi": 108302,
      "int": 60150,
      "charName": "파이어 레이번트",
      "latestSlot": "Code1_37_2385"
    },
    {
      "rank": 28,
      "nicName": "thls1111",
      "userRank": 28,
      "userScore": 4325809,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 0,
      "honorPoint": 0,
      "coin": 3,
      "gold": 348750,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 0,
      "totStats": 156294,
      "str": 42073,
      "agi": 42153,
      "int": 72068,
      "charName": "캐릭터 #110",
      "latestSlot": "Code1_37_0"
    },
    {
      "rank": 29,
      "nicName": "cor150",
      "userRank": 29,
      "userScore": 4295776,
      "tierRank": 21,
      "tierScore": 221,
      "seasonPoint": 111,
      "honorPoint": 55,
      "coin": 5475,
      "gold": 695218,
      "sacredPower": 30556,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "언고어 스피어맨",
      "latestSlot": "Code1_37_5"
    },
    {
      "rank": 30,
      "nicName": "Nunnally",
      "userRank": 30,
      "userScore": 4265879,
      "tierRank": null,
      "tierScore": null,
      "seasonPoint": 43,
      "honorPoint": 0,
      "coin": 13981,
      "gold": 2530,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 1,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "언고어 스피어맨",
      "latestSlot": "Code1_37_1111"
    }
  ],
  "tierRankings": [
    {
      "rank": 1,
      "nicName": "HiYuKi",
      "tierRank": 1,
      "tierScore": 1319,
      "userRank": 5,
      "userScore": 12241296,
      "seasonPoint": 121,
      "honorPoint": 539,
      "coin": 174812,
      "gold": 1000000,
      "sacredPower": 49110,
      "swordKind": 2,
      "titleLevel": 4,
      "totStats": 938404,
      "str": 433208,
      "agi": 252598,
      "int": 252598,
      "charName": "총사령관 데르메트",
      "latestSlot": "Code1_37_총"
    },
    {
      "rank": 2,
      "nicName": "Jonas",
      "tierRank": 2,
      "tierScore": 1202,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 132,
      "honorPoint": 523,
      "coin": 14451,
      "gold": 940824,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 108302,
      "agi": 63149,
      "int": 63149,
      "charName": "아기용 발카라스",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 3,
      "nicName": "skever3523",
      "tierRank": 3,
      "tierScore": 1102,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 186,
      "honorPoint": 459,
      "coin": 928,
      "gold": 650371,
      "sacredPower": 8106,
      "swordKind": 1,
      "titleLevel": 1,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "페가수스 나이트",
      "latestSlot": "Code1_37_시즌"
    },
    {
      "rank": 4,
      "nicName": "Horus",
      "tierRank": 4,
      "tierScore": 1015,
      "userRank": 1,
      "userScore": 157213192,
      "seasonPoint": 45,
      "honorPoint": 461,
      "coin": 888011,
      "gold": 1000000,
      "sacredPower": 13175725,
      "swordKind": 2,
      "titleLevel": 8,
      "totStats": 234600,
      "str": 63149,
      "agi": 63149,
      "int": 108302,
      "charName": "시타 응원여단장",
      "latestSlot": "Code1_37_2"
    },
    {
      "rank": 5,
      "nicName": "goodwin1",
      "tierRank": 5,
      "tierScore": 892,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 108,
      "honorPoint": 386,
      "coin": 11200,
      "gold": 568656,
      "sacredPower": 5636,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 63149,
      "agi": 63149,
      "int": 108302,
      "charName": "래빗 신성여단장",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 6,
      "nicName": "123qqq",
      "tierRank": 6,
      "tierScore": 810,
      "userRank": 11,
      "userScore": 5974289,
      "seasonPoint": 164,
      "honorPoint": 323,
      "coin": 79,
      "gold": 43532,
      "sacredPower": 22,
      "swordKind": 3,
      "titleLevel": 1,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "페가수스 나이트",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 7,
      "nicName": "ndaebag",
      "tierRank": 7,
      "tierScore": 689,
      "userRank": 4,
      "userScore": 13981736,
      "seasonPoint": 155,
      "honorPoint": 267,
      "coin": 256386,
      "gold": 414408,
      "sacredPower": 350754,
      "swordKind": 3,
      "titleLevel": 5,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "페가수스 나이트",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 8,
      "nicName": "goodwin",
      "tierRank": 8,
      "tierScore": 672,
      "userRank": 7,
      "userScore": 7413786,
      "seasonPoint": 116,
      "honorPoint": 278,
      "coin": 17741,
      "gold": 465454,
      "sacredPower": 11098,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "페가수스 나이트",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 9,
      "nicName": "Bulsanix2",
      "tierRank": 9,
      "tierScore": 591,
      "userRank": 9,
      "userScore": 6969059,
      "seasonPoint": 186,
      "honorPoint": 151,
      "coin": 317,
      "gold": 1000000,
      "sacredPower": 0,
      "swordKind": 2,
      "titleLevel": 1,
      "totStats": 938404,
      "str": 433208,
      "agi": 252598,
      "int": 252598,
      "charName": "총사령관 데르메트",
      "latestSlot": "Code1_37_8594"
    },
    {
      "rank": 10,
      "nicName": "goodsee",
      "tierRank": 10,
      "tierScore": 453,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 87,
      "honorPoint": 177,
      "coin": 10281,
      "gold": 56482,
      "sacredPower": 4859,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 63149,
      "agi": 108302,
      "int": 63149,
      "charName": "매의눈 여단장",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 11,
      "nicName": "gowin2",
      "tierRank": 11,
      "tierScore": 351,
      "userRank": 8,
      "userScore": 7092874,
      "seasonPoint": 81,
      "honorPoint": 135,
      "coin": 10315,
      "gold": 79842,
      "sacredPower": 156,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 228602,
      "str": 60150,
      "agi": 60310,
      "int": 108142,
      "charName": "[2차 전생] 정령들의 주인",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 12,
      "nicName": "dnjs014",
      "tierRank": 12,
      "tierScore": 344,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 148,
      "honorPoint": 80,
      "coin": 1682,
      "gold": 312187,
      "sacredPower": 12,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 469202,
      "str": 216604,
      "agi": 126299,
      "int": 126299,
      "charName": "사령관 암흑기사장",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 13,
      "nicName": "mnm1823",
      "tierRank": 13,
      "tierScore": 331,
      "userRank": 2,
      "userScore": 31557134,
      "seasonPoint": 37,
      "honorPoint": 130,
      "coin": 430668,
      "gold": 1000000,
      "sacredPower": 1241150,
      "swordKind": 6,
      "titleLevel": 11,
      "totStats": 469202,
      "str": 216604,
      "agi": 126299,
      "int": 126299,
      "charName": "사령관 암흑기사장",
      "latestSlot": "Code1_37_시즌"
    },
    {
      "rank": 14,
      "nicName": "godwin",
      "tierRank": 14,
      "tierScore": 301,
      "userRank": 17,
      "userScore": 4985052,
      "seasonPoint": 73,
      "honorPoint": 108,
      "coin": 8000,
      "gold": 51601,
      "sacredPower": 54,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 63149,
      "agi": 108302,
      "int": 63149,
      "charName": "색욕의 마왕군단장",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 15,
      "nicName": "Colaa",
      "tierRank": 15,
      "tierScore": 288,
      "userRank": 6,
      "userScore": 8952784,
      "seasonPoint": 20,
      "honorPoint": 110,
      "coin": 43669,
      "gold": 0,
      "sacredPower": 2712,
      "swordKind": 2,
      "titleLevel": 11,
      "totStats": 469202,
      "str": 216604,
      "agi": 126299,
      "int": 126299,
      "charName": "사령관 암흑기사장",
      "latestSlot": "Code1_37_2222"
    },
    {
      "rank": 16,
      "nicName": "god0222",
      "tierRank": 16,
      "tierScore": 287,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 141,
      "honorPoint": 67,
      "coin": 615,
      "gold": 734035,
      "sacredPower": 67,
      "swordKind": 2,
      "titleLevel": 1,
      "totStats": 134682,
      "str": 62186,
      "agi": 36248,
      "int": 36248,
      "charName": "아기용 발카라스",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 17,
      "nicName": "lim123",
      "tierRank": 17,
      "tierScore": 252,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 154,
      "honorPoint": 43,
      "coin": 1117,
      "gold": 120645,
      "sacredPower": 136,
      "swordKind": 1,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 63149,
      "agi": 63149,
      "int": 108302,
      "charName": "래빗 신성여단장",
      "latestSlot": "Code1_37_2"
    },
    {
      "rank": 18,
      "nicName": "AmBon",
      "tierRank": 18,
      "tierScore": 233,
      "userRank": 13,
      "userScore": 5479862,
      "seasonPoint": 111,
      "honorPoint": 55,
      "coin": 104527,
      "gold": 621302,
      "sacredPower": 32313,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 63149,
      "agi": 63149,
      "int": 108302,
      "charName": "시타 응원여단장",
      "latestSlot": "Code1_37_5"
    },
    {
      "rank": 19,
      "nicName": "Sic",
      "tierRank": 19,
      "tierScore": 231,
      "userRank": 12,
      "userScore": 5521939,
      "seasonPoint": 61,
      "honorPoint": 85,
      "coin": 45793,
      "gold": 952964,
      "sacredPower": 12273,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 42153,
      "agi": 72068,
      "int": 42073,
      "charName": "캐릭터 #255",
      "latestSlot": "Code1_37_1234"
    },
    {
      "rank": 20,
      "nicName": "scrat",
      "tierRank": 20,
      "tierScore": 227,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 117,
      "honorPoint": 48,
      "coin": 12808,
      "gold": 11700,
      "sacredPower": 251,
      "swordKind": 2,
      "titleLevel": 1,
      "totStats": 234600,
      "str": 63149,
      "agi": 108302,
      "int": 63149,
      "charName": "매의눈 여단장",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 21,
      "nicName": "cor150",
      "tierRank": 21,
      "tierScore": 221,
      "userRank": 29,
      "userScore": 4295776,
      "seasonPoint": 111,
      "honorPoint": 55,
      "coin": 5475,
      "gold": 695218,
      "sacredPower": 30556,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 42073,
      "agi": 42073,
      "int": 72148,
      "charName": "언고어 스피어맨",
      "latestSlot": "Code1_37_5"
    },
    {
      "rank": 22,
      "nicName": "BLAIR",
      "tierRank": 22,
      "tierScore": 187,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 137,
      "honorPoint": 25,
      "coin": 676,
      "gold": 750643,
      "sacredPower": 0,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 156294,
      "str": 72148,
      "agi": 42073,
      "int": 42073,
      "charName": "드래곤 프리스트",
      "latestSlot": "Code1_37_0482"
    },
    {
      "rank": 23,
      "nicName": "ywnjs7",
      "tierRank": 23,
      "tierScore": 177,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 105,
      "honorPoint": 30,
      "coin": 4566,
      "gold": 0,
      "sacredPower": 625,
      "swordKind": 2,
      "titleLevel": 4,
      "totStats": 234600,
      "str": 108302,
      "agi": 63149,
      "int": 63149,
      "charName": "캐릭터 #225",
      "latestSlot": "Code1_37_군단장"
    },
    {
      "rank": 24,
      "nicName": "ywnjs1",
      "tierRank": 24,
      "tierScore": 164,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 102,
      "honorPoint": 25,
      "coin": 3547,
      "gold": 1000000,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 108302,
      "agi": 63149,
      "int": 63149,
      "charName": "캐릭터 #225",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 25,
      "nicName": "kaeh3505",
      "tierRank": 25,
      "tierScore": 161,
      "userRank": 10,
      "userScore": 6849224,
      "seasonPoint": 81,
      "honorPoint": 40,
      "coin": 102,
      "gold": 1000000,
      "sacredPower": 0,
      "swordKind": 0,
      "titleLevel": 2,
      "totStats": 228602,
      "str": 60150,
      "agi": 60310,
      "int": 108142,
      "charName": "[2차 전생] 정령들의 주인",
      "latestSlot": "Code1_37_1"
    },
    {
      "rank": 26,
      "nicName": "Butlers",
      "tierRank": 26,
      "tierScore": 141,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 69,
      "honorPoint": 0,
      "coin": 124,
      "gold": 1000000,
      "sacredPower": 398,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 469202,
      "str": 126299,
      "agi": 126299,
      "int": 216604,
      "charName": "베스티고어 처형자",
      "latestSlot": "Code1_37_1111"
    },
    {
      "rank": 27,
      "nicName": "Gottfried",
      "tierRank": 27,
      "tierScore": 133,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 121,
      "honorPoint": 0,
      "coin": 1063,
      "gold": 1000000,
      "sacredPower": 2,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 108302,
      "agi": 63149,
      "int": 63149,
      "charName": "창술 무사",
      "latestSlot": "Code1_37_2"
    },
    {
      "rank": 28,
      "nicName": "MAHA",
      "tierRank": 28,
      "tierScore": 133,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 133,
      "honorPoint": 0,
      "coin": 1116,
      "gold": 99020,
      "sacredPower": 21,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 53412,
      "str": 14374,
      "agi": 14374,
      "int": 24664,
      "charName": "캐릭터 #231",
      "latestSlot": "Code1_37_1212"
    },
    {
      "rank": 29,
      "nicName": "MAMA",
      "tierRank": 29,
      "tierScore": 129,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 117,
      "honorPoint": 6,
      "coin": 612,
      "gold": 715891,
      "sacredPower": 11541,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 228602,
      "str": 60150,
      "agi": 60310,
      "int": 108142,
      "charName": "[2차 전생] 정령들의 주인",
      "latestSlot": "Code1_37_1212"
    },
    {
      "rank": 30,
      "nicName": "DevilVsAngel",
      "tierRank": 30,
      "tierScore": 128,
      "userRank": null,
      "userScore": null,
      "seasonPoint": 116,
      "honorPoint": 0,
      "coin": 1168,
      "gold": 28761,
      "sacredPower": 376,
      "swordKind": 2,
      "titleLevel": 2,
      "totStats": 234600,
      "str": 108302,
      "agi": 63149,
      "int": 63149,
      "charName": "캐릭터 #225",
      "latestSlot": "Code1_37_2"
    }
  ]
};
