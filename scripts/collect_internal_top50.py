import urllib.request
import urllib.parse
import re
import json
import os
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

KST = timezone(timedelta(hours=9))
RANK_BASE_URL = "https://m16tool.xyz/Game/DSR/Rank/Index?board=%EC%9C%A0%EC%A0%80%EB%9E%AD%ED%82%B9"
GETLOG_URL = "https://logs2.m16tool.xyz/Game/DSR/UserLog/GetLog"
OUTPUT_JS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data_internal_100.js")

CHAR_INDEX_TO_NAME = {
    24: "젤리 큐브", 35: "[1차 전생] 하이 메이지", 43: "[1차 전생] 스나이퍼",
    67: "아크리치", 88: "[1차 전생] 다크 레인저", 98: "[1차 전생] 아크 메이지",
    110: "[1차 전생] 빛의 사제", 121: "[1차 전생] 그랜드 정령술사",
    124: "[2차 전생] 프로즌 리치", 125: "[1차 전생] 늑대 장군",
    134: "리자드 소서러", 135: "라이언 기사단장", 145: "래빗 신성여단장",
    155: "색욕의 마왕군단장", 164: "페가수스 나이트", 170: "사령관 암흑기사장",
    173: "[2차 전생] 지천사", 177: "매의눈 여단장", 195: "[2차 전생] 프로즌 리치",
    196: "휴먼 크로스보우맨", 197: "시타델 좀비", 208: "둠가드 지옥군단장",
    209: "사령관 몽마", 211: "오크 관짝댄서", 213: "박스몬", 219: "매직 레이번트",
    221: "드레이니 삼형제(블루)", 222: "드레이니 삼형제(레드)", 224: "드래곤 프리스트",
    225: "지하 마물군단장", 231: "바실리스크", 234: "몬스터군단장",
    236: "언데드 무사", 237: "창술 무사", 242: "바라카 쌍검병",
    244: "오크 용병장", 245: "사령관 데스크라운", 246: "총사령관 데르메트",
    247: "[2차 전생] 정령들의 주인", 253: "스피릿 레이번트", 254: "매직 레이번트",
    255: "노예 오크병", 259: "시타 응원여단장", 260: "총사령관 요정왕",
    261: "총사령관 요정왕", 262: "총사령관 아이기스",
}

PET_INDEX_TO_NAME = {
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
    69: "카오스 벨러그[Lv13][펫]", 70: "카오스 서리용[Lv14][펫]", 99: "백스플 개구리[펫]",
}


def calculate_pet_stats_info(pet_name, pet_idx=0, pet_exp=1818149888):
    clean_name = re.sub(r'\|c[0-9a-fA-F]{8}|\|r', '', str(pet_name or "")).strip()
    if (not clean_name or clean_name in ("없음", "조회 대기중", "-")) and not pet_idx:
        return 0, 0, "미장착"

    max_stats = 2612632
    tier_label = "Lv.1 기본 펫"

    if "Lv14" in clean_name or "서리용" in clean_name or pet_idx == 70:
        max_stats, tier_label = 28000000, "Lv.14 카오스 펫"
    elif "Lv13" in clean_name or "벨러그" in clean_name or pet_idx == 69:
        max_stats, tier_label = 24500000, "Lv.13 카오스 펫"
    elif "Lv12" in clean_name or "카오스 라이언" in clean_name or pet_idx == 66:
        max_stats, tier_label = 21500000, "Lv.12 카오스 펫"
    elif "Lv11" in clean_name or "스핑거 도그" in clean_name or pet_idx == 65:
        max_stats, tier_label = 19000000, "Lv.11 카오스 펫"
    elif "Lv10" in clean_name or "카오스 랜턴" in clean_name or pet_idx == 64:
        max_stats, tier_label = 17500000, "Lv.10 카오스 펫"
    elif "Lv9" in clean_name or "카오스 엘리멘탈" in clean_name or pet_idx == 63:
        max_stats, tier_label = 16000000, "Lv.9 카오스 펫"
    elif any(k in clean_name for k in ("Lv8", "탈렌", "랜드호크", "모그레인")) or (60 <= pet_idx <= 62):
        max_stats, tier_label = 13999752, "Lv.8 고티어 펫"
    elif any(k in clean_name for k in ("Lv7", "마인드 마스터", "바로크", "마법병기")) or (57 <= pet_idx <= 59):
        max_stats, tier_label = 11900000, "Lv.7 업그레이드 펫"
    elif any(k in clean_name for k in ("Lv6", "서리군주 베인", "루인", "마법기")) or (54 <= pet_idx <= 56):
        max_stats, tier_label = 9850000, "Lv.6 업그레이드 펫"
    elif any(k in clean_name for k in ("Lv5", "여군주", "옥크로", "조트")) or (51 <= pet_idx <= 53):
        max_stats, tier_label = 7819772, "Lv.5 업그레이드 펫"
    elif any(k in clean_name for k in ("Lv4", "밴디트 마스터", "빙결의 군주", "해곤", "맘 투석기", "스완", "엘프보이", "고위 성녀", "드워프 드루이드")) or (40 <= pet_idx <= 49 and pet_idx not in (43, 44)):
        max_stats, tier_label = 6120052, "Lv.4 진화 펫"
    elif any(k in clean_name for k in ("Lv3", "빙결의 악몽", "데몬기사", "대형 대포", "리퍼 인형", "드라군", "리틀보이", "하이엘프")) or (29 <= pet_idx <= 38):
        max_stats, tier_label = 5869092, "Lv.3 진화 펫"
    elif any(k in clean_name for k in ("코르", "씨 헌터")) or pet_idx in (44, 67, 68):
        max_stats, tier_label = 4167485, "특수 펫"
    elif any(k in clean_name for k in ("Lv2", "서리정령", "중갑기사", "블라스터", "이집트리치", "템플나이트", "워터보이", "엘프 성녀", "투카르")) or (17 <= pet_idx <= 26):
        max_stats, tier_label = 3876422, "Lv.2 진화 펫"
    elif "개구리" in clean_name or pet_idx in (43, 99):
        max_stats, tier_label = 3509595, "특수 펫"

    pet_level = 6000
    pet_stats = max_stats
    if 0 < pet_exp < 1800000000:
        ratio = min(1.0, (pet_exp / 1818149888.0) ** 0.5)
        pet_level = max(1, round(6000 * ratio))
        pet_stats = round(max_stats * ratio)

    return pet_stats, pet_level, tier_label


def fetch_url(url, timeout=15):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_ranking_rows(html_text):
    rows = []
    if not html_text:
        return rows
    tr_matches = re.findall(
        r'<tr[^>]*>\s*<td>\s*(\d+)\s*</td>\s*<td>\s*<a[^>]*nicName=([^&"\'>]+)[^>]*>.*?</a>\s*</td>\s*<td>\s*([\d,]+)\s*</td>\s*</tr>',
        html_text,
        flags=re.DOTALL | re.IGNORECASE,
    )
    for rank_str, nic_raw, score_str in tr_matches:
        try:
            rank_num = int(rank_str.strip())
            nic_name = urllib.parse.unquote(nic_raw.strip())
            score_num = int(score_str.replace(",", "").strip())
            rows.append({
                "rank": rank_num,
                "nicName": nic_name,
                "userScore": score_num,
            })
        except Exception:
            pass
    return rows


def fetch_top50_board():
    urls = [
        RANK_BASE_URL,
        f"{RANK_BASE_URL}&index=2",
    ]
    all_rows = {}
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(fetch_url, u) for u in urls]
        for fut in as_completed(futures):
            try:
                html_text = fut.result()
                for r in parse_ranking_rows(html_text):
                    if 1 <= r["rank"] <= 50:
                        all_rows[r["rank"]] = r
            except Exception as e:
                print(f"[WARN] Failed to fetch ranking page: {e}")
    return [all_rows[k] for k in sorted(all_rows.keys())][:50]


def resolve_char_name(cidx, s, a, i, fallback_char):
    if cidx in (260, 261):
        return "총사령관 요정왕"
    if cidx == 225:
        return "지하 마물군단장"
    if cidx == 209:
        return "사령관 몽마"
    if cidx == 245:
        return "사령관 데스크라운"
    if cidx == 170:
        return "사령관 암흑기사장"
    if cidx == 246:
        return "총사령관 데르메트"
    if (s, a, i) == (433208, 252598, 252598):
        return "총사령관 데르메트"
    if (s, a, i) == (252598, 433208, 252598):
        return "총사령관 요정왕"
    if (s, a, i) == (252598, 252598, 433208):
        return "총사령관 아이기스"
    if (s, a, i) == (216604, 126299, 126299):
        return "사령관 암흑기사장"
    if (s, a, i) == (126299, 126299, 216604):
        return "사령관 몽마"
    if (s, a, i) == (126299, 216604, 126299):
        return "사령관 데스크라운"
    if cidx in CHAR_INDEX_TO_NAME:
        return CHAR_INDEX_TO_NAME[cidx]
    if fallback_char and fallback_char != "-":
        return fallback_char
    return "-"


def fetch_getlog_24h(nic_name, now_kst):
    cutoff = now_kst - timedelta(hours=25)
    months = sorted({now_kst.strftime("%Y-%m"), cutoff.strftime("%Y-%m")}, reverse=True)
    entries = []
    for m_str in months:
        for idx in range(7):
            try:
                data = urllib.parse.urlencode({
                    "nicName": nic_name,
                    "character": "info1",
                    "index": str(idx),
                    "Month": m_str
                }).encode("utf-8")
                req = urllib.request.Request(GETLOG_URL, data=data, headers={
                    "User-Agent": "Mozilla/5.0",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Origin": "https://m16tool.xyz",
                    "Referer": "https://m16tool.xyz/"
                })
                resp = json.loads(urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="replace"))
                if not resp.get("success") or not resp.get("data"):
                    break
                stop = False
                for item_str in resp["data"]:
                    item = json.loads(item_str)
                    dt = datetime.strptime(item["CreateDate"][:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=KST)
                    if dt < cutoff:
                        stop = True
                        break
                    entries.append((dt, item.get("Loging", "")))
                if stop or len(resp["data"]) < 30:
                    break
            except Exception:
                break
    entries.sort(key=lambda x: x[0], reverse=True)
    return entries


def parse_log_deltas(log_str, target_slot):
    d_sacred = 0
    d_coin = 0
    d_sp = 0
    d_rp = 0
    for m in re.finditer(r'GodSwordPoint:(\d+)->(\d+)', log_str):
        d_sacred += int(m.group(2)) - int(m.group(1))
    for m in re.finditer(r'iPOINT:(\d+)->(\d+)', log_str):
        d_sp += int(m.group(2)) - int(m.group(1))
    for m in re.finditer(r'iRP:(\d+)->(\d+)', log_str):
        d_rp += int(m.group(2)) - int(m.group(1))
    for m in re.finditer(r'(Code1_[^\[\s]+)\[1\]:(\d+)->(\d+)', log_str):
        slot_k, old_v, new_v = m.group(1), int(m.group(2)), int(m.group(3))
        if not target_slot or target_slot == "-" or slot_k == target_slot:
            d_coin += (new_v - old_v)
    return d_sacred, d_coin, d_sp, d_rp


def fetch_ranker_detail_and_24h(ranker, now_kst):
    nic_name = ranker["nicName"]
    url = f"https://m16tool.xyz/Game/DSR/UserLog/RPGDetail?nicName={urllib.parse.quote(nic_name)}&character=info1"
    try:
        html_text = fetch_url(url, timeout=12)
    except Exception:
        return {
            "coin": 0, "sacredPower": 0, "str": 0, "agi": 0, "int": 0,
            "totStats": 0, "charName": "-", "seasonPoint": 0, "honorPoint": 0,
            "petIdx": 0, "petExp": 1818149888, "petName": "미장착", "petStats": 0, "petLevel": 0, "petTierLabel": "미장착",
            "runeStats": 0, "equippedRunes": "미장착",
            "ownedPetCount": 0, "ownedHeroCount": 0, "boxPointSum": 0,
            "latestSlot": "-", "lastSaveDate": "-", "logEntries": []
        }

    sacred_power = 0
    m_sp = re.search(r'"GodSwordPoint"\s*:\s*(\d+)', html_text)
    if m_sp:
        sacred_power = int(m_sp.group(1))

    season_point = 0
    m_ip = re.search(r'"iPOINT"\s*:\s*(\d+)', html_text)
    if m_ip:
        season_point = int(m_ip.group(1))

    honor_point = 0
    m_rp = re.search(r'"iRP"\s*:\s*(\d+)', html_text)
    if m_rp:
        honor_point = int(m_rp.group(1))

    fallback_char = "-"
    m_ch = re.search(r'"캐릭터"\s*:\s*"([^"]+)"', html_text)
    if m_ch:
        fallback_char = re.sub(r'\|c[0-9a-fA-F]{8}|\|r', '', m_ch.group(1)).strip()

    last_save_date = "-"
    m_dt = re.search(r'(\d{1,2}/\d{1,2}/20\d{2}\s+\d{1,2}:\d{1,2}:\d{1,2})', html_text)
    if m_dt:
        last_save_date = m_dt.group(1)

    coin = 0
    str_v = agi_v = int_v = 0
    cidx = -1
    pet_idx = 0
    pet_exp = 1818149888
    latest_slot = "-"

    slots = re.findall(r'"(Code1_(\d+)_[^"]+)"\s*:\s*"([^"]+)"', html_text)
    best_ver = -1
    for slot_key, ver_str, val_str in slots:
        if "_1_1_1" in slot_key:
            continue
        ver_num = int(ver_str) if ver_str.isdigit() else 0
        parts = val_str.split(",")
        if len(parts) >= 7 and ver_num >= best_ver:
            best_ver = ver_num
            latest_slot = slot_key
            try:
                coin = int(parts[1])
                cidx = int(parts[2])
                str_v = int(parts[4])
                agi_v = int(parts[5])
                int_v = int(parts[6])
                if len(parts) > 31 and parts[31].strip().isdigit():
                    pet_idx = int(parts[31].strip())
                if len(parts) > 32 and parts[32].strip().isdigit():
                    pet_exp = int(parts[32].strip())
            except Exception:
                pass

    pet_name = PET_INDEX_TO_NAME.get(pet_idx, f"미확인 펫(#{pet_idx})" if pet_idx > 0 else "미장착")
    pet_stats, pet_level, pet_tier_label = calculate_pet_stats_info(pet_name, pet_idx, pet_exp)

    owned_pet_count = len([1 for k, v in re.findall(r'"(SP\d*_[A-Za-z0-9_]+)"\s*:\s*(\d+)', html_text) if int(v) > 0 and not k.startswith("SP_LBOX") and not k.startswith("SP_RGUP")])
    owned_hero_count = len([1 for _, v in re.findall(r'"(SH_\d+)"\s*:\s*(\d+)', html_text) if int(v) > 0])
    box_point_sum = sum(int(v) for _, v in re.findall(r'"(BoxPoint_[^"]+)"\s*:\s*(\d+)', html_text))

    # Parse Rune levels (SDATA2[30..35]) and equip flags (SDATA2[36..41])
    rune_stats = 0
    equipped_runes_list = []
    m_sd2 = re.search(r'"SDATA2"\s*:\s*"([^"]+)"', html_text)
    if m_sd2:
        sd2 = [int(x.strip()) if x.strip().isdigit() else 0 for x in m_sd2.group(1).split(",")]
        rune_defs = [
            (30, 36, "힘", 40000),
            (31, 37, "민", 40000),
            (32, 38, "지", 40000),
            (33, 39, "균형", 45000),
            (34, 40, "투지", 0),
            (35, 41, "탐욕", 0),
        ]
        for lv_idx, eq_idx, r_label, per_lv_stat in rune_defs:
            lv = sd2[lv_idx] if lv_idx < len(sd2) else 0
            eq = sd2[eq_idx] if eq_idx < len(sd2) else 0
            if eq > 0 and lv > 0:
                rune_stats += lv * per_lv_stat
                equipped_runes_list.append(f"{r_label}{lv}")
    equipped_runes = "·".join(equipped_runes_list) if equipped_runes_list else "미장착"

    char_name = resolve_char_name(cidx, str_v, agi_v, int_v, fallback_char)
    log_entries = fetch_getlog_24h(nic_name, now_kst)

    return {
        "coin": coin,
        "sacredPower": sacred_power,
        "str": str_v,
        "agi": agi_v,
        "int": int_v,
        "totStats": str_v + agi_v + int_v,
        "charName": char_name,
        "seasonPoint": season_point,
        "honorPoint": honor_point,
        "petIdx": pet_idx,
        "petExp": pet_exp,
        "petName": pet_name,
        "petStats": pet_stats,
        "petLevel": pet_level,
        "petTierLabel": pet_tier_label,
        "runeStats": rune_stats,
        "equippedRunes": equipped_runes,
        "ownedPetCount": owned_pet_count,
        "ownedHeroCount": owned_hero_count,
        "boxPointSum": box_point_sum,
        "latestSlot": latest_slot,
        "lastSaveDate": last_save_date,
        "logEntries": log_entries,
    }


def build_hourly_snapshots_24h(top50, now_kst):
    """
    Build 25 hourly checkpoints (from 24 hours ago up to now) by walking backwards
    from each ranker's latest save state through their GetLog entries.
    """
    current_hour_floor = now_kst.replace(minute=0, second=0, microsecond=0)
    # Checkpoints: [T-24h, T-23h, ..., T-1h, T(now)] -> 25 snapshots = 24 hourly intervals
    checkpoints = [current_hour_floor - timedelta(hours=h) for h in range(24, 0, -1)]
    checkpoints.append(now_kst)

    snapshots = [{
        "timestamp": int(cp.timestamp() * 1000),
        "dateStr": cp.strftime("%Y-%m-%d %H:%M"),
        "records": {}
    } for cp in checkpoints]

    for r in top50:
        k = r["nicName"].strip().lower()
        cur_coin = r.get("coin", 0)
        cur_sacred = r.get("sacredPower", 0)
        cur_sp = r.get("seasonPoint", 0)
        cur_rp = r.get("honorPoint", 0)
        cur_score = r.get("userScore", 0)
        tot_stats = r.get("totStats", 0)
        target_slot = r.get("latestSlot", "-")
        char_name = r.get("charName", "-")

        entries = r.get("logEntries", [])
        e_idx = 0

        # Walk backwards from newest checkpoint (index 24 = now) to oldest (index 0 = T-24h)
        for cp_idx in range(len(checkpoints) - 1, -1, -1):
            cp_time = checkpoints[cp_idx]
            while e_idx < len(entries) and entries[e_idx][0] > cp_time:
                _, log_str = entries[e_idx]
                ds, dc, dsp, drp = parse_log_deltas(log_str, target_slot)
                cur_sacred = max(0, cur_sacred - ds)
                cur_coin = max(0, cur_coin - dc)
                cur_sp = max(0, cur_sp - dsp)
                cur_rp = max(0, cur_rp - drp)
                cur_score = max(0, cur_score - (ds * 10) - (dc * 10) - (dsp * 10000))
                e_idx += 1

            snapshots[cp_idx]["records"][k] = {
                "rank": r["rank"],
                "nicName": r["nicName"].strip(),
                "userScore": cur_score,
                "coin": cur_coin,
                "sacredPower": cur_sacred,
                "seasonPoint": cur_sp,
                "honorPoint": cur_rp,
                "totStats": tot_stats,
                "petName": r.get("petName", "미장착"),
                "petStats": r.get("petStats", 0),
                "runeStats": r.get("runeStats", 0),
                "equippedRunes": r.get("equippedRunes", "미장착"),
                "latestSlot": target_slot,
                "charName": char_name,
            }

    return snapshots


def collect_top50_with_24h_history():
    now_kst = datetime.now(KST)
    top50 = fetch_top50_board()
    if not top50:
        return [], []

    with ThreadPoolExecutor(max_workers=10) as executor:
        future_map = {executor.submit(fetch_ranker_detail_and_24h, r, now_kst): r for r in top50}
        for fut in as_completed(future_map):
            r = future_map[fut]
            try:
                r.update(fut.result())
            except Exception:
                pass

    top50.sort(key=lambda x: x["rank"])
    snapshots = build_hourly_snapshots_24h(top50, now_kst)

    # Strip raw logEntries before serializing
    clean_top50 = []
    for r in top50:
        c = dict(r)
        c.pop("logEntries", None)
        clean_top50.append(c)

    return clean_top50, snapshots


def main():
    print("Fetching TOP 50 board + 24h GetLog save history from m16tool...")
    top50, snapshots = collect_top50_with_24h_history()
    if not top50:
        print("[ERROR] No ranking rows fetched. Aborting update.")
        return

    now_str = datetime.now(KST).strftime("%Y-%m-%d %H:%M")
    js_content = (
        f"// Auto-collected 24h hourly-grouped TOP 50 internal ranking snapshots (KST {now_str})\n"
        f"const DSR_TOP100_INITIAL = {json.dumps(top50, ensure_ascii=False, indent=2)};\n\n"
        f"const DSR_INTERNAL_HISTORY = {json.dumps(snapshots, ensure_ascii=False)};\n"
    )

    with open(OUTPUT_JS_PATH, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"Saved {len(top50)} rankers and {len(snapshots)} hourly checkpoints (24h) to {OUTPUT_JS_PATH}")


if __name__ == "__main__":
    main()
