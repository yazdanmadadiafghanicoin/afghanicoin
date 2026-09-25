import sql from "./db.js";

export default async function handler(req, res) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id TEXT UNIQUE NOT NULL,
        username TEXT,
        balance INTEGER DEFAULT 0,
        energy INTEGER DEFAULT 100,
        level INTEGER DEFAULT 1,
        power INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // اضافه کردن ستون برای زمان آخرین تغییر انرژی
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS energy_updated_at TIMESTAMP DEFAULT NOW()
    `;

    return res.status(200).json({
      success: true,
      message: "Afghani Coin system is ready!"
    });

  } catch (error) {
    console.error("Setup error:", error);

    return res.status(500).json({
      success: false,
      message: "Database setup failed",
      error: error.message
    });
  }
}
