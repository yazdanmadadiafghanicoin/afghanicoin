import sql from "./db.js";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed"
      });
    }

    const { telegram_id } = req.body || {};

    if (!telegram_id) {
      return res.status(400).json({
        success: false,
        message: "telegram_id is required"
      });
    }

    const users = await sql`
      SELECT *
      FROM users
      WHERE telegram_id = ${String(telegram_id)}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];

    const cost = Number(user.level || 1) * 100;

    if (Number(user.balance || 0) < cost) {
      return res.status(400).json({
        success: false,
        message:
          `Not enough AFC. Upgrade costs ${cost} AFC.`
      });
    }

    const updated = await sql`
      UPDATE users
      SET
        balance = balance - ${cost},
        level = level + 1,
        power = power + 1
      WHERE telegram_id = ${String(telegram_id)}
      RETURNING *
    `;

    return res.status(200).json({
      success: true,
      message: "Upgrade successful!",
      cost: cost,
      user: updated[0]
    });

  } catch (error) {
    console.error("Upgrade error:", error);

    return res.status(500).json({
      success: false,
      message: "Upgrade failed",
      error: error.message
    });
  }
}
