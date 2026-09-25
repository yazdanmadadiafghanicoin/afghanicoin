import sql from "./db.js";

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Test API
    if (req.method === "GET" && url.pathname === "/api") {
      return res.status(200).json({
        success: true,
        message: "Afghani Coin Backend is running!",
        coin: "AFC"
      });
    }

    // Get/Create User
    if (req.method === "GET" && url.pathname === "/api/user") {
      const telegramId = url.searchParams.get("telegram_id");

      if (!telegramId) {
        return res.status(400).json({
          success: false,
          message: "telegram_id is required"
        });
      }

      let users = await sql`
        SELECT * FROM users
        WHERE telegram_id = ${telegramId}
        LIMIT 1
      `;

      if (users.length === 0) {
        users = await sql`
          INSERT INTO users (telegram_id)
          VALUES (${telegramId})
          RETURNING *
        `;
      }

      return res.status(200).json({
        success: true,
        user: users[0]
      });
    }

    // Mine
    if (req.method === "POST" && url.pathname === "/api/mine") {
      const { telegram_id } = req.body || {};

      if (!telegram_id) {
        return res.status(400).json({
          success: false,
          message: "telegram_id is required"
        });
      }

      const users = await sql`
        SELECT * FROM users
        WHERE telegram_id = ${telegram_id}
        LIMIT 1
      `;

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const user = users[0];

      if (user.energy <= 0) {
        return res.status(400).json({
          success: false,
          message: "No energy"
        });
      }

      const mined = user.power;

      const updated = await sql`
        UPDATE users
        SET
          balance = balance + ${mined},
          energy = energy - 1
        WHERE telegram_id = ${telegram_id}
        RETURNING *
      `;

      return res.status(200).json({
        success: true,
        mined,
        user: updated[0]
      });
    }

    // Upgrade
    if (req.method === "POST" && url.pathname === "/api/upgrade") {
      const { telegram_id } = req.body || {};

      if (!telegram_id) {
        return res.status(400).json({
          success: false,
          message: "telegram_id is required"
        });
      }

      const users = await sql`
        SELECT * FROM users
        WHERE telegram_id = ${telegram_id}
        LIMIT 1
      `;

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const user = users[0];

      const cost = user.level * 10;

      if (user.balance < cost) {
        return res.status(400).json({
          success: false,
          message: `Need ${cost} AFC to upgrade`
        });
      }

      const updated = await sql`
        UPDATE users
        SET
          balance = balance - ${cost},
          level = level + 1,
          power = power + 1
        WHERE telegram_id = ${telegram_id}
        RETURNING *
      `;

      return res.status(200).json({
        success: true,
        message: "Upgrade successful!",
        user: updated[0]
      });
    }

    return res.status(404).json({
      success: false,
      message: "API endpoint not found"
    });

  } catch (error) {
    console.error("API error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
}
