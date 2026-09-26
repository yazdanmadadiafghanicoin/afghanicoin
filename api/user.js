import sql from "./db.js";

const MAX_ENERGY = 100;
const ENERGY_REGEN_SECONDS = 60;

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
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed"
      });
    }

    const telegramId = req.query.telegram_id;

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        message: "telegram_id is required"
      });
    }

    let users = await sql`
      SELECT *
      FROM users
      WHERE telegram_id = ${String(telegramId)}
      LIMIT 1
    `;

    if (users.length === 0) {
      users = await sql`
        INSERT INTO users (
          telegram_id,
          balance,
          energy,
          level,
          power,
          energy_updated_at
        )
        VALUES (
          ${String(telegramId)},
          0,
          ${MAX_ENERGY},
          1,
          1,
          NOW()
        )
        RETURNING *
      `;
    }

    let user = users[0];

    // محاسبه انرژی دوباره شارژ شده
    const updatedAt = new Date(
      user.energy_updated_at || user.created_at
    );

    const now = new Date();

    const secondsPassed = Math.floor(
      (now.getTime() - updatedAt.getTime()) / 1000
    );

    const regenerated = Math.floor(
      secondsPassed / ENERGY_REGEN_SECONDS
    );

    const oldEnergy = Number(user.energy || 0);

    const energy = Math.min(
      MAX_ENERGY,
      oldEnergy + regenerated
    );

    if (energy !== oldEnergy) {
      const updated = await sql`
        UPDATE users
        SET
          energy = ${energy},
          energy_updated_at = NOW()
        WHERE telegram_id = ${String(telegramId)}
        RETURNING *
      `;

      user = updated[0];
    }

    return res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error("User error:", error);

    return res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message
    });
  }
}
