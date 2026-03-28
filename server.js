const http = require("http");
const https = require("https");

const API_KEY = encodeURIComponent("e55876d6623c3db32f3a26993049300c44e007a1f74a26d875ca3dfbc11b94a7");
const CITY_CODE = "26"; // 울산광역시
const PORT = process.env.PORT || 3000;

function callAPI(path, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({
      cityCode: CITY_CODE,
      pageNo: 1,
      numOfRows: 100,
      ...params,
    });
    const apiUrl = `https://apis.data.go.kr/1613000/${path}?serviceKey=${API_KEY}&${qs}`;

    https.get(apiUrl, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function parseItems(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  for (const item of itemMatches) {
    const obj = {};
    const fields = item.match(/<(\w+)>([^<]*)<\/\1>/g) || [];
    for (const field of fields) {
      const m = field.match(/<(\w+)>([^<]*)<\/\1>/);
      if (m) obj[m[1]] = m[2].trim();
    }
    items.push(obj);
  }
  return items;
}

// CORS 헤더 설정 함수
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Max-Age", "86400");
}

const server = http.createServer(async (req, res) => {
  // CORS 헤더 항상 설정
  setCORS(res);

  // OPTIONS preflight 즉시 응답
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;
  const query = Object.fromEntries(parsed.searchParams);

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    if (pathname === "/api/route") {
      const xml = await callAPI("BusRouteInfoInqireService/getRouteNoList", {
        routeNo: query.routeNo || "743",
      });
      const items = parseItems(xml);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, items }));

    } else if (pathname === "/api/stops") {
      const xml = await callAPI("BusRouteInfoInqireService/getRouteAcctoThrghSttnList", {
        routeId: query.routeId,
      });
      const items = parseItems(xml);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, items }));

    } else if (pathname === "/api/position") {
      const xml = await callAPI("BusLcInfoInqireService/getRouteAcctoBusLcList", {
        routeId: query.routeId,
      });
      const items = parseItems(xml);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, items }));

    } else if (pathname === "/") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.writeHead(200);
      res.end("울산 버스 API 서버 정상 작동 중 🚌");

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, message: "Not found" }));
    }
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, message: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ 울산 버스 API 서버 실행 중 (포트: ${PORT})`);
});
