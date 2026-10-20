import http.server
import urllib.request
import urllib.parse
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

PORT = 8080

def fetch_url_html(target_url):
    req = urllib.request.Request(target_url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    })
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read().decode('utf-8', errors='replace')

def fetch_single_m16_html(nic):
    target = f"https://m16tool.xyz/Game/DSR/UserLog/RPGDetail?nicName={urllib.parse.quote(nic)}&character=info1"
    return fetch_url_html(target)

def parse_ranking_board_html(html_text):
    rows = []
    if not html_text:
        return rows
    tr_matches = re.findall(r'<tr[^>]*>\s*<td>\s*(\d+)\s*</td>\s*<td>\s*<a[^>]*nicName=([^&"\'>]+)[^>]*>.*?</a>\s*</td>\s*<td>\s*([\d,]+)\s*</td>\s*</tr>', html_text, flags=re.DOTALL | re.IGNORECASE)
    for rank_str, nic_raw, score_str in tr_matches:
        try:
            rank_num = int(rank_str.strip())
            nic_name = urllib.parse.unquote(nic_raw.strip())
            score_num = int(score_str.replace(',', '').strip())
            rows.append({
                "rank": rank_num,
                "nicName": nic_name,
                "score": score_num
            })
        except Exception:
            pass
    return rows

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/m16rankings':
            user_board_url = "https://m16tool.xyz/Game/DSR/Rank/Index?board=%EC%9C%A0%EC%A0%80%EB%9E%AD%ED%82%B9"
            tier_board_url = "https://m16tool.xyz/Game/DSR/Rank/Index?board=%EA%B3%84%EA%B8%89%EB%9E%AD%ED%82%B9"
            user_rows = []
            tier_rows = []
            with ThreadPoolExecutor(max_workers=2) as executor:
                f_user = executor.submit(fetch_url_html, user_board_url)
                f_tier = executor.submit(fetch_url_html, tier_board_url)
                try:
                    user_rows = parse_ranking_board_html(f_user.result())
                except Exception:
                    user_rows = []
                try:
                    tier_rows = parse_ranking_board_html(f_tier.result())
                except Exception:
                    tier_rows = []

            payload = json.dumps({
                "userBoard": user_rows,
                "tierBoard": tier_rows
            }, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(payload)
            return

        if parsed.path == '/api/m16logs_batch':
            qs = urllib.parse.parse_qs(parsed.query)
            nics_raw = qs.get('nics', [''])[0]
            nics = [n.strip() for n in nics_raw.split(',') if n.strip()]
            if not nics:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error": "nics parameter is required"}')
                return

            results = {}
            with ThreadPoolExecutor(max_workers=10) as executor:
                future_to_nic = {executor.submit(fetch_single_m16_html, nic): nic for nic in nics[:50]}
                for future in as_completed(future_to_nic):
                    nic = future_to_nic[future]
                    try:
                        results[nic] = future.result()
                    except Exception:
                        results[nic] = None

            payload = json.dumps({"results": results}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(payload)
            return

        if parsed.path == '/api/m16log':
            qs = urllib.parse.parse_qs(parsed.query)
            nic = qs.get('nicName', [''])[0]
            if not nic:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "nicName parameter is required"}')
                return

            try:
                html_text = fetch_single_m16_html(nic)
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(html_text.encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode('utf-8'))
            return

        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), ProxyHTTPRequestHandler)
    print(f"DSR Manager local server with /api/m16log running on http://localhost:{PORT}")
    server.serve_forever()
