const http = require("http");

const PORT = process.env.PORT; // 🔥 viktigt för Railway

const APP_ID = process.env.BLIKK_APP_ID;
const APP_SECRET = process.env.BLIKK_APP_SECRET;

let accessToken = null;
let tokenExpires = 0;

// 🔐 sanity check
if (!APP_ID || !APP_SECRET) {
  console.error("❌ Missing env vars");
  process.exit(1);
}

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

  // fallback expiry (1h)
  tokenExpires = Date.now() + (60 * 60 * 1000);

  console.log("🔑 Token refreshed");
}

// 🔁 Säkerställ att token finns
async function ensureToken() {
  if (!accessToken || Date.now() > tokenExpires) {
    await getToken();
  }
}

const server = http.createServer(async (req, res) => {
  try {
    console.log("👉 Request:", req.url);

    if (!req.url.startsWith("/blikk")) {
      res.writeHead(200);
      return res.end("OK");
    }

    await ensureToken();

    const path = req.url.replace("/blikk", "");
    const url = "https://publicapi.blikk.com" + path;

    console.log("➡️ Forward:", url);

    let response = await fetch(url, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });

    // 🔁 retry om token failar
    if (response.status === 401) {
      console.log("🔁 Token expired, refreshing...");
      await getToken();

      response = await fetch(url, {
        method: req.method,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json"
        }
      });
    }

    const text = await response.text();

    res.writeHead(response.status, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" // 🔥 för frontend
    });

    res.end(text);

  } catch (error) {
    console.error("❌ ERROR:", error);
    res.writeHead(500);
    res.end("Server error");
  }
});

// 🚀 starta server
server.listen(PORT, () => {
  console.log(`🚀 Running on port ${PORT}`);
});