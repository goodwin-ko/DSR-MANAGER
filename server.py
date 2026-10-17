import http.server
import urllib.request
import urllib.parse
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

PORT = 8080

def fetch_single_m16_html(nic):
    target = f"https://m16tool.xyz/Game/DSR/UserLog/RPGDetail?nicName={urllib.parse.quote(nic)}&character=info1"
    req = urllib.request.Request(target, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    })
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read().decode('utf-8', errors='replace')

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
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
