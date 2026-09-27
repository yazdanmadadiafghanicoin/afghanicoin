import sql from "./db.js";

const MAX_ENERGY = 100;

// جلوگیری از درخواست‌های خیلی سریع از یک IP
const RATE_LIMIT_MS = 700;

const lastRequests = new Map();

function getClientKey(req, telegramId) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket?.remoteAddress || "unknown";

  return `${ip}:${telegramId}`;
}

function isRateLimited(req, telegramId) {
  const key = getClientKey(req, telegramId);
  const now = Date.now();
  const last = lastRequests.get(key) || 0;

  if (now - last < RATE_LIMIT_MS) {
    return true;
  }

  lastRequests.set(key, now);

  // پاک‌سازی ساده حافظه
  if (lastRequests.size > 5000) {
    for (const [k, time] of lastRequests) {
      if (now - time > 60000) {
        lastRequests.delete(k);
      }
    }
  }

  return false;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // --------------------------------
    // TEST API
    // --------------------------------
    if (req.method === "GET" && url.pathname === "/api") {
      return res.status(200).json({
        success: true,
        message: "Afghani Coin Backend is running!",
        coin: "AFC"
      });
    }

    // --------------------------------
    // GET / CREATE USER
    // --------------------------------
    if (req.method === "GET" && url.pathname === "/api/user") {
      const telegramId = url.searchParams.get("telegram_id");

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
          INSERT INTO users (
            telegram_id,
            balance,
            energy,
            level,
            power
          )
          VALUES (
            ${telegramId},
            0,
            ${MAX_ENERGY},
            1,
            1
          )
          RETURNING *
        `;
      }

      return res.status(200).json({
        success: true,
        user: users[0]
      });
    }

    // --------------------------------
    // MINE
    // --------------------------------
    if (req.method === "POST" && url.pathname === "/api/mine") {
      const { telegram_id } = req.body || {};

      if (!telegram_id) {
        return res.status(400).json({
          success: false,
          message: "telegram_id is required"
        });
      }

      // جلوگیری از کلیک‌های خیلی سریع
      if (isRateLimited(req, telegram_id)) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please slow down."
        });
      }

      /*
       * UPDATE اتمیک:
       * فقط وقتی انرژی بیشتر از صفر باشد،
       * balance و energy همزمان تغییر می‌کنند.
       */
      const updated = await sql`
        UPDATE users
        SET
          balance = balance + power,
          energy = energy - 1
        WHERE telegram_id = ${telegram_id}
          AND energy > 0
        RETURNING *
      `;

      if (updated.length === 0) {
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

        return res.status(400).json({
          success: false,
          message: "No energy",
          user: users[0]
        });
      }

      const user = updated[0];
      const mined = user.power;

      // ثبت تاریخچه استخراج
      await sql`
        INSERT INTO mining_history (
          user_id,
          telegram_id,
          mined,
          power,
          balance_after,
          energy_after
        )
        VALUES (
          ${user.id},
          ${user.telegram_id},
          ${mined},
          ${user.power},
          ${user.balance},
          ${user.energy}
        )
      `;

      return res.status(200).json({
        success: true,
        mined,
        user
      });
    }

    // --------------------------------
    // UPGRADE
    // --------------------------------
    if (req.method === "POST" && url.pathname === "/api/upgrade") {
      const { telegram_id } = req.body || {};

      if (!telegram_id) {
        return res.status(400).json({
          success: false,
          message: "telegram_id is required"
        });
      }

      if (isRateLimited(req, telegram_id)) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please slow down."
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

      const cost = user.level * 10;

      if (user.balance < cost) {
        return res.status(400).json({
          success: false,
          message: `Need ${cost} AFC to upgrade`,
          user
        });
      }

      const updated = await sql`
        UPDATE users
        SET
          balance = balance - ${cost},
          level = level + 1,
          power = power + 1
        WHERE telegram_id = ${telegram_id}
          AND balance >= ${cost}
        RETURNING *
      `;

      if (updated.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Upgrade failed"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Upgrade successful!",
        cost,
        user: updated[0]
      });
    }

    // --------------------------------
    // MINING HISTORY
    // --------------------------------
    if (
      req.method === "GET" &&
      url.pathname === "/api/mining-history"
    ) {
      const telegramId = url.searchParams.get("telegram_id");

      if (!telegramId) {
        return res.status(400).json({
          success: false,
          message: "telegram_id is required"
        });
      }

      const history = await sql`
        SELECT
          id,
          mined,
          power,
          balance_after,
          energy_after,
          created_at
        FROM mining_history
        WHERE telegram_id = ${telegramId}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      return res.status(200).json({
        success: true,
        history
      });
    }

    // --------------------------------
    // API NOT FOUND
    // --------------------------------
    return res.status(404).json({
      success: false,
      message: "API endpoint not found"
    });

  } catch (error) {
    console.error("API error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
      }
