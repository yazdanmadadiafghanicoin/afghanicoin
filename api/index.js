import sql from "./db.js";

const MAX_ENERGY = 100;
const ENERGY_REGEN_SECONDS = 10;
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

  if (lastRequests.size > 5000) {
    for (const [k, time] of lastRequests) {
      if (now - time > 60000) {
        lastRequests.delete(k);
      }
    }
  }

  return false;
}

/* =========================
   ENERGY REGENERATION
========================= */

async function regenerateEnergy(user) {
  if (!user.energy_updated_at) {
    return user;
  }

  const now = Date.now();

  const lastUpdate =
    new Date(user.energy_updated_at).getTime();

  if (Number.isNaN(lastUpdate)) {
    return user;
  }

  const elapsedSeconds =
    Math.floor((now - lastUpdate) / 1000);

  if (elapsedSeconds < ENERGY_REGEN_SECONDS) {
    return user;
  }

  const energyToAdd =
    Math.floor(
      elapsedSeconds / ENERGY_REGEN_SECONDS
    );

  if (energyToAdd <= 0) {
    return user;
  }

  const newEnergy =
    Math.min(
      MAX_ENERGY,
      Number(user.energy) + energyToAdd
    );

  const updated = await sql`
    UPDATE users
    SET
      energy = ${newEnergy},
      energy_updated_at = NOW()
    WHERE telegram_id = ${user.telegram_id}
    RETURNING *
  `;

  return updated[0] || user;
}

/* =========================
   MAIN API
========================= */

export default async function handler(req, res) {

  try {

    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    /* =========================
       TEST API
    ========================= */

    if (
      req.method === "GET" &&
      url.pathname === "/api"
    ) {

      return res.status(200).json({
        success: true,
        message: "Afghani Coin Backend is running!",
        coin: "AFC",
        energy_regeneration:
          "1 energy every 10 seconds"
      });
    }

    /* =========================
       GET USER
    ========================= */

    if (
      req.method === "GET" &&
      url.pathname === "/api/user"
    ) {

      const telegramId =
        url.searchParams.get("telegram_id");

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

      /* Create user if not exists */

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
            ${telegramId},
            0,
            ${MAX_ENERGY},
            1,
            1,
            NOW()
          )
          RETURNING *
        `;
      }

      const user =
        await regenerateEnergy(users[0]);

      return res.status(200).json({
        success: true,
        user
      });
    }

    /* =========================
       MINE
    ========================= */

    if (
      req.method === "POST" &&
      url.pathname === "/api/mine"
    ) {

      const body = req.body || {};

      const telegramId =
        String(body.telegram_id || "");

      if (!telegramId) {

        return res.status(400).json({
          success: false,
          message: "telegram_id is required"
        });
      }

      /* Rate limit */

      if (
        isRateLimited(
          req,
          telegramId
        )
      ) {

        return res.status(429).json({
          success: false,
          message:
            "Too many requests. Please slow down."
        });
      }

      /* Find user */

      let users = await sql`
        SELECT *
        FROM users
        WHERE telegram_id = ${telegramId}
        LIMIT 1
      `;

      if (users.length === 0) {

        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      /* Regenerate energy */

      const currentUser =
        await regenerateEnergy(users[0]);

      /* No energy */

      if (
        Number(currentUser.energy) <= 0
      ) {

        return res.status(400).json({
          success: false,
          message: "No energy",
          user: currentUser
        });
      }

      /* Mining power */

      const power =
        Number(currentUser.power);

      /* Update balance + energy */

      const updated = await sql`
        UPDATE users
        SET
          balance = balance + ${power},
          energy = energy - 1,
          energy_updated_at = NOW()
        WHERE telegram_id = ${telegramId}
          AND energy > 0
        RETURNING *
      `;

      if (updated.length === 0) {

        return res.status(400).json({
          success: false,
          message: "Mining failed"
        });
      }

      const user = updated[0];

      const mined =
        Number(user.power);

      /* Save mining history */

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

    /* =========================
       UPGRADE
    ========================= */

    if (
      req.method === "POST" &&
      url.pathname === "/api/upgrade"
    ) {

      const body = req.body || {};

      const telegramId =
        String(body.telegram_id || "");

      if (!telegramId) {

        return res.status(400).json({
          success: false,
          message: "telegram_id is required"
        });
      }

      if (
        isRateLimited(
          req,
          telegramId
        )
      ) {

        return res.status(429).json({
          success: false,
          message:
            "Too many requests. Please slow down."
        });
      }

      let users = await sql`
        SELECT *
        FROM users
        WHERE telegram_id = ${telegramId}
        LIMIT 1
      `;

      if (users.length === 0) {

        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const user =
        await regenerateEnergy(users[0]);

      const cost =
        Number(user.level) * 10;

      if (
        Number(user.balance) < cost
      ) {

        return res.status(400).json({
          success: false,
          message:
            `Need ${cost} AFC to upgrade`,
          user
        });
      }

      const updated = await sql`
        UPDATE users
        SET
          balance = balance - ${cost},
          level = level + 1,
          power = power + 1
        WHERE telegram_id = ${telegramId}
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

    /* =========================
       MINING HISTORY
    ========================= */

    if (
      req.method === "GET" &&
      url.pathname === "/api/mining-history"
    ) {

      const telegramId =
        url.searchParams.get("telegram_id");

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

    /* =========================
       NOT FOUND
    ========================= */

    return res.status(404).json({
      success: false,
      message: "API endpoint not found"
    });

  } catch (error) {

    console.error(
      "API error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
      }
