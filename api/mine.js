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

  // پاسخ به CORS preflight
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

    let users = await sql`
      SELECT *
      FROM users
      WHERE telegram_id = ${String(telegram_id)}
      LIMIT 1
    `;

    if (users.length === 0) {
      users = await sql`
        INSERT INTO users
          (
            telegram_id,
            balance,
            energy,
            level,
            power,
            energy_updated_at
          )
        VALUES
          (
            ${String(telegram_id)},
            0,
            100,
            1,
            1,
            NOW()
          )
        RETURNING *
      `;
    }

    let user = users[0];

    // محاسبه انرژی دوباره شارژ شده
    const lastUpdate = user.energy_updated_at
      ? new Date(user.energy_updated_at).getTime()
      : Date.now();

    const now = Date.now();

    const elapsedSeconds = Math.floor(
      (now - lastUpdate) / 1000
    );

    const regenerated = Math.floor(
      elapsedSeconds / ENERGY_REGEN_SECONDS
    );

    let currentEnergy = Number(user.energy || 0);

    if (regenerated > 0) {
      currentEnergy = Math.min(
        MAX_ENERGY,
        currentEnergy + regenerated
      );

      await sql`
        UPDATE users
        SET
          energy = ${currentEnergy},
          energy_updated_at = NOW()
        WHERE telegram_id = ${String(telegram_id)}
      `;

      // اطلاعات جدید کاربر
      user = {
        ...user,
        energy: currentEnergy
      };
    }

    // انرژی تمام شده
    if (currentEnergy <= 0) {
      return res.status(400).json({
        success: false,
        message: "No energy",
        user: {
          ...user,
          energy: 0
        }
      });
    }

    const mined = Number(user.power || 1);

    // استخراج
    const updated = await sql`
      UPDATE users
      SET
        balance = balance + ${mined},
        energy = energy - 1,
        energy_updated_at = NOW()
      WHERE telegram_id = ${String(telegram_id)}
      RETURNING *
    `;

    return res.status(200).json({
      success: true,
      message: "Mining successful!",
      mined: mined,
      user: updated[0]
    });

  } catch (error) {
    console.error("Mining error:", error);

    return res.status(500).json({
      success: false,
      message: "Mining failed",
      error: error.message
    });
  }
}
