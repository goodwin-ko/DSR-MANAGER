/**
 * DSR Manager - Server-side CORS Proxy & Static Web Server
 * Render / Local Server 100% Live Search & Ranking Proxy (Zero External Dependencies)
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function fetchUrlText(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    };
    https.get(url, options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    }).on('error', reject);
  });
}

function parseRankingBoardHtml(htmlText) {
  const rows = [];
  if (!htmlText) return rows;
  const trMatches = htmlText.matchAll(/<tr[^>]*>\s*<td>\s*(\d+)\s*<\/td>\s*<td>\s*<a[^>]*nicName=([^&"'>]+)[^>]*>.*?<\/a>\s*<\/td>\s*<td>\s*([\d,]+)\s*<\/td>\s*<\/tr>/gis);
  for (const m of trMatches) {
    try {
      const rankNum = parseInt(m[1].trim(), 10);
      const nicName = decodeURIComponent(m[2].trim());
      const scoreNum = parseInt(m[3].replace(/,/g, '').trim(), 10);
      rows.push({
        rank: rankNum,
        nicName: nicName,
        score: scoreNum
      });
    } catch (e) {}
  }
  return rows;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Server-side m16tool Single Proxy Endpoint (/api/m16log?nicName=...)
  if (pathname === '/api/m16log') {
    const nicName = parsedUrl.searchParams.get('nicName') || '';
    if (!nicName) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'nicName parameter is required' }));
    }

    const targetUrl = `https://m16tool.xyz/Game/DSR/UserLog/RPGDetail?nicName=${encodeURIComponent(nicName)}&character=info1`;
    try {
      const body = await fetchUrlText(targetUrl);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(body);
    } catch (err) {
      console.error('Server Proxy Fetch Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Failed to fetch from m16tool' }));
    }
  }

  // 1-1. Server-side TOP 100 Rankings Endpoint (/api/m16rankings_top100)
  if (pathname === '/api/m16rankings_top100') {
    const anchors = ['Horus', 'DallDall', 'Jonas', 'kk2103'];
    const baseUrl = "https://m16tool.xyz/Game/DSR/Rank/Index?board=%EC%9C%A0%EC%A0%80%EB%9E%AD%ED%82%B9&nicname=";
    try {
      const htmls = await Promise.all(
        anchors.map(nic => fetchUrlText(`${baseUrl}${encodeURIComponent(nic)}`).catch(() => ""))
      );
      const allRows = {};
      htmls.forEach(html => {
        const rows = parseRankingBoardHtml(html);
        rows.forEach(r => {
          if (r.rank <= 100) allRows[r.rank] = r;
        });
      });
      const sortedRows = Object.keys(allRows)
        .map(k => parseInt(k, 10))
        .sort((a, b) => a - b)
        .map(k => allRows[k]);

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify({ rankings: sortedRows }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Failed to fetch top 100 rankings' }));
    }
  }

  // 2. Server-side Official Rankings Endpoint (/api/m16rankings)
  if (pathname === '/api/m16rankings') {
    const userBoardUrl = "https://m16tool.xyz/Game/DSR/Rank/Index?board=%EC%9C%A0%EC%A0%80%EB%9E%AD%ED%82%B9";
    const tierBoardUrl = "https://m16tool.xyz/Game/DSR/Rank/Index?board=%EA%B3%84%EA%B8%89%EB%9E%AD%ED%82%B9";
    try {
      const [uHtml, tHtml] = await Promise.all([
        fetchUrlText(userBoardUrl).catch(() => ""),
        fetchUrlText(tierBoardUrl).catch(() => "")
      ]);
      const userRows = parseRankingBoardHtml(uHtml);
      const tierRows = parseRankingBoardHtml(tHtml);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify({
        userBoard: userRows,
        tierBoard: tierRows
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Failed to fetch rankings' }));
    }
  }

  // 3. Server-side Batch Logs Endpoint (/api/m16logs_batch?nics=...)
  if (pathname === '/api/m16logs_batch') {
    const nicsRaw = parsedUrl.searchParams.get('nics') || '';
    const nics = nicsRaw.split(',').map(n => n.trim()).filter(Boolean).slice(0, 50);
    if (!nics.length) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'nics parameter is required' }));
    }

    const results = {};
    await Promise.all(nics.map(async (nic) => {
      const targetUrl = `https://m16tool.xyz/Game/DSR/UserLog/RPGDetail?nicName=${encodeURIComponent(nic)}&character=info1`;
      try {
        results[nic] = await fetchUrlText(targetUrl);
      } catch (e) {
        results[nic] = null;
      }
    }));

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({ results }));
  }

  // 4. Static File Server
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`DSR Manager Server listening on port ${PORT}`);
});
