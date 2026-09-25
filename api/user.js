import sql from "./db.js";

export default async function handler(req, res) {
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

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message
    });
  }
}
