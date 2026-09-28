import sql from "./db.js";
import { logWalletTransaction } from "./wallet-log.js";

const MAX_ENERGY = 100;
const ENERGY_REGEN_SECONDS = 10;
const RATE_LIMIT_MS = 700;

const lastRequests = new Map();

function regenerateEnergy(user) {

    const now = Date.now();

    const updatedAt =
        new Date(user.energy_updated_at).getTime();

    const elapsedSeconds =
        Math.floor((now - updatedAt) / 1000);

    const regenerated =
        Math.floor(
            elapsedSeconds / ENERGY_REGEN_SECONDS
        );

    if (regenerated <= 0) {

        return {
            energy: Number(user.energy),
            energy_updated_at:
                user.energy_updated_at
        };
    }

    const newEnergy =
        Math.min(
            MAX_ENERGY,
            Number(user.energy) + regenerated
        );

    return {
        energy: newEnergy,
        energy_updated_at:
            new Date(now).toISOString()
    };
}

export default async function handler(req, res) {

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {

        const requestUrl =
            new URL(
                req.url || "/",
                "https://afghanicoin.vercel.app"
            );

        const pathname =
            requestUrl.pathname;

        // =========================
        // API STATUS
        // =========================

        if (
            req.method === "GET" &&
            (
                pathname === "/api" ||
                pathname === "/api/"
            )
        ) {

            return res.status(200).json({

                success: true,

                message:
                    "Afghani Coin Backend is running!",

                coin: "AFC",

                energy_regeneration:
                    "1 energy every 10 seconds"

            });
        }

        // =========================
        // USER
        // =========================

        if (
            req.method === "GET" &&
            (
                pathname === "/api/user" ||
                pathname === "/api/user/"
            )
        ) {

            const telegramId =
                requestUrl.searchParams.get(
                    "telegram_id"
                );

            if (!telegramId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "telegram_id is required"
                });
            }

            let users = await sql`
                SELECT *
                FROM users
                WHERE telegram_id = ${telegramId}
                LIMIT 1
            `;

            if (users.length === 0) {

                const created = await sql`
                    INSERT INTO users
                    (
                        telegram_id,
                        username,
                        balance,
                        energy,
                        level,
                        power,
                        energy_updated_at
                    )
                    VALUES
                    (
                        ${telegramId},
                        NULL,
                        0,
                        100,
                        1,
                        1,
                        NOW()
                    )
                    RETURNING *
                `;

                users = created;
            }

            const user = users[0];

            const regenerated =
                regenerateEnergy(user);

            if (
                regenerated.energy !==
                Number(user.energy)
            ) {

                const updated = await sql`
                    UPDATE users
                    SET
                        energy =
                            ${regenerated.energy},
                        energy_updated_at =
                            ${regenerated.energy_updated_at}
                    WHERE telegram_id =
                        ${telegramId}
                    RETURNING *
                `;

                return res.status(200).json({
                    success: true,
                    user: updated[0]
                });
            }

            return res.status(200).json({
                success: true,
                user: user
            });
        }

        // =========================
        // MINE
        // =========================

        if (
            req.method === "POST" &&
            (
                pathname === "/api/mine" ||
                pathname === "/api/mine/"
            )
        ) {

            const {
                telegram_id
            } = req.body || {};

            if (!telegram_id) {

                return res.status(400).json({
                    success: false,
                    message:
                        "telegram_id is required"
                });
            }

            const telegramKey =
                String(telegram_id);

            const last =
                lastRequests.get(
                    telegramKey
                );

            const now = Date.now();

            if (
                last &&
                now - last < RATE_LIMIT_MS
            ) {

                return res.status(429).json({
                    success: false,
                    message:
                        "Too many requests"
                });
            }

            lastRequests.set(
                telegramKey,
                now
            );

            let users = await sql`
                SELECT *
                FROM users
                WHERE telegram_id =
                    ${telegramKey}
                LIMIT 1
            `;

            if (users.length === 0) {

                users = await sql`
                    INSERT INTO users
                    (
                        telegram_id,
                        username,
                        balance,
                        energy,
                        level,
                        power,
                        energy_updated_at
                    )
                    VALUES
                    (
                        ${telegramKey},
                        NULL,
                        0,
                        100,
                        1,
                        1,
                        NOW()
                    )
                    RETURNING *
                `;
            }

            const user = users[0];

            const regenerated =
                regenerateEnergy(user);

            const energy =
                regenerated.energy;

            if (energy <= 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Not enough energy",
                    user: {
                        ...user,
                        energy: 0
                    }
                });
            }

            const power =
                Number(user.power || 1);

            const newBalance =
                Number(user.balance || 0)
                + power;

            const newEnergy =
                energy - 1;

            const updated = await sql`
                UPDATE users
                SET
                    balance =
                        ${newBalance},
                    energy =
                        ${newEnergy},
                    energy_updated_at =
                        ${regenerated.energy_updated_at}
                WHERE telegram_id =
                    ${telegramKey}
                RETURNING *
            `;

            try {

                await sql`
                    INSERT INTO mining_history
                    (
                        user_id,
                        telegram_id,
                        mined,
                        power,
                        balance_after,
                        energy_after
                    )
                    VALUES
                    (
                        ${updated[0].id},
                        ${telegramKey},
                        ${power},
                        ${power},
                        ${newBalance},
                        ${newEnergy}
                    )
                `;

            } catch (historyError) {

                console.error(
                    "Mining history error:",
                    historyError
                );
            }

            // ثبت در Wallet
            try {

                await logWalletTransaction(
                    telegramKey,
                    "mine",
                    power,
                    newBalance,
                    "استخراج AFC"
                );

            } catch (walletError) {

                console.error(
                    "Wallet log error:",
                    walletError
                );
            }

            return res.status(200).json({

                success: true,

                mined: power,

                user: updated[0]

            });
        }

        // =========================
        // UPGRADE
        // =========================

        if (
            req.method === "POST" &&
            (
                pathname === "/api/upgrade" ||
                pathname === "/api/upgrade/"
            )
        ) {

            const {
                telegram_id
            } = req.body || {};

            if (!telegram_id) {

                return res.status(400).json({
                    success: false,
                    message:
                        "telegram_id is required"
                });
            }

            const telegramId =
                String(telegram_id);

            const users = await sql`
                SELECT *
                FROM users
                WHERE telegram_id =
                    ${telegramId}
                LIMIT 1
            `;

            if (users.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });
            }

            const user = users[0];

            const level =
                Number(user.level || 1);

            const power =
                Number(user.power || 1);

            const cost =
                level * 100;

            const balance =
                Number(user.balance || 0);

            if (balance < cost) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Need ${cost} AFC to upgrade`
                });
            }

            const newBalance =
                balance - cost;

            const updated = await sql`
                UPDATE users
                SET
                    balance =
                        ${newBalance},
                    level =
                        ${level + 1},
                    power =
                        ${power + 1}
                WHERE telegram_id =
                    ${telegramId}
                RETURNING *
            `;

            // ثبت هزینه Upgrade در Wallet
            try {

                await logWalletTransaction(
                    telegramId,
                    "upgrade",
                    -cost,
                    newBalance,
                    "ارتقای قدرت استخراج"
                );

            } catch (walletError) {

                console.error(
                    "Wallet log error:",
                    walletError
                );
            }

            return res.status(200).json({

                success: true,

                user: updated[0]

            });
        }

        // =========================
        // MINING HISTORY
        // =========================

        if (
            req.method === "GET" &&
            (
                pathname === "/api/mining-history" ||
                pathname === "/api/mining-history/"
            )
        ) {

            const telegramId =
                requestUrl.searchParams.get(
                    "telegram_id"
                );

            if (!telegramId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "telegram_id is required"
                });
            }

            const history = await sql`
                SELECT *
                FROM mining_history
                WHERE telegram_id =
                    ${telegramId}
                ORDER BY created_at DESC
                LIMIT 100
            `;

            return res.status(200).json({

                success: true,

                history

            });
        }

        return res.status(404).json({

            success: false,

            message:
                "Endpoint not found",

            path: pathname,

            method: req.method

        });

    } catch (error) {

        console.error(
            "API ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error",

            error:
                error.message

        });
    }
        }
