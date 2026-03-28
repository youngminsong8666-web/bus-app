const http = require("http");
const https = require("https");

const API_KEY = encodeURIComponent("e55876d6623c3db32f3a26993049300c44e007a1f74a26d875ca3dfbc11b94a7");
const CITY_CODE = "26"; // ✅ 울산광역시 정확한 도시코드
const PORT = 3000;

function callAPI(path, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({
      cityCode: CITY_CODE,
      pageNo: 1,
      numOfRows: 100,
      ...params,
    });
    const apiUrl = `https://apis.data.go.kr/1613000/${path}?serviceKey=${API_KEY}&${qs}`;
    console.log("▶ 호출:", decodeURIComponent(apiUrl).substring(0, 150) + "...");

    https.get(apiUrl, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log("▶ 응답:", data.substring(0, 300));
        resolve(data);
      });
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

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;
  const query = Object.fromEntries(parsed.searchParams);

  try {
    // ── 원문 확인
    if (pathname === "/api/raw") {
      const xml = await callAPI("BusRouteInfoInqireService/getRouteNoList", {
        routeNo: query.routeNo || "743",
      });
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.writeHead(200);
      res.end(xml);

    // ── 노선 ID 조회
    } else if (pathname === "/api/route") {
      const xml = await callAPI("BusRouteInfoInqireService/getRouteNoList", {
        routeNo: query.routeNo || "743",
      });
      const items = parseItems(xml);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, items }));

    // ── 경유 정류장 조회
    } else if (pathname === "/api/stops") {
      const xml = await callAPI("BusRouteInfoInqireService/getRouteAcctoThrghSttnList", {
        routeId: query.routeId,
      });
      const items = parseItems(xml);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, items }));

    // ── 실시간 버스 위치
    } else if (pathname === "/api/position") {
      const xml = await callAPI("BusLcInfoInqireService/getRouteAcctoBusLcList", {
        routeId: query.routeId,
      });
      const items = parseItems(xml);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, items }));

    } else {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, message: "Not found" }));
    }
  } catch (e) {
    console.error("오류:", e.message);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, message: e.message }));
  }
});

server.listen(PORT, () => {
  console.log("=====================================");
  console.log("✅ 울산 버스 API 서버 실행 중");
  console.log(`📡 http://localhost:${PORT}`);
  console.log("=====================================");
  console.log("▶ 테스트:");
  console.log(`  http://localhost:${PORT}/api/route?routeNo=743`);
  console.log(`  http://localhost:${PORT}/api/route?routeNo=543`);
});
