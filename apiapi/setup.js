
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

    res.status(200).json({
      success: true,
      message: "Afghani Coin users table is ready!"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Database setup failed"
    });
  }
}
