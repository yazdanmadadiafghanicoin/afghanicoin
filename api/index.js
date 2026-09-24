export default function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api") {
    return res.status(200).json({
      success: true,
      message: "Afghani Coin Backend is running!",
      coin: "AFC",
      balance: 0,
      energy: 100,
      level: 1,
      power: 1
    });
  }

  if (req.method === "GET" && url.pathname === "/api/user") {
    return res.status(200).json({
      success: true,
      balance: 0,
      energy: 100,
      level: 1,
      power: 1
    });
  }

  if (req.method === "POST" && url.pathname === "/api/mine") {
    return res.status(200).json({
      success: true,
      message: "Mining successful!",
      mined: 1,
      balance: 1,
      energy: 99
    });
  }

  if (req.method === "POST" && url.pathname === "/api/upgrade") {
    return res.status(200).json({
      success: true,
      message: "Upgrade successful!",
      balance: 0,
      energy: 100,
      level: 2,
      power: 2
    });
  }

  return res.status(404).json({
   
