const http = require("http");

const PORT = process.env.PORT || 3000;

const APP_ID = process.env.BLIKK_APP_ID;
const APP_SECRET = process.env.BLIKK_APP_SECRET;

let accessToken = null;
let tokenExpires = 0;

// 🔑 Hämta token
async function getToken() {
  const base64 = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64");

  const res = await fetch("https://publicapi.blikk.com/v1/Auth/Token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${base64}`,
      "Accept": "application/json"
    }
  });

  const data = await res.json();

  accessToken = data.accessToken;

  // sätt expiry (fallback 1h)
  tokenExpires = Date.now() + (60 * 60 * 1000);

  console.log("🔑 Token refreshed");
}

// 🔁 Se till att token alltid finns
async function ensureToken() {
  if (!accessToken || Date.now() > tokenExpires) {
    await getToken();
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url.startsWith("/blikk")) {
      res.writeHead(404);
      return res.end("Not found");
    }

    await ensureToken();

    const path = req.url.replace("/blikk", "");
    const url = "https://publicapi.blikk.com" + path;

    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });

    const text = await response.text();

    res.writeHead(response.status, {
      "Content-Type": "application/json"
    });

    res.end(text);

  } catch (error) {
    console.error("❌ ERROR:", error);
    res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Running on port ${PORT}`);
});