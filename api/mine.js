
import sql from "./db.js";

export default async function handler(req, res) {
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
