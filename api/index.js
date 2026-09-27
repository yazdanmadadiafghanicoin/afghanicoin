import sql from "./db.js";

const MAX_ENERGY = 100;
const ENERGY_REGEN_SECONDS = 10;
const RATE_LIMIT_MS = 700;

const lastRequests = new Map();

function regenerateEnergy(user) {
    const now = Date.now();

    const updatedAt = new Date(user.energy_updated_at).getTime();

    const elapsedSeconds =
        Math.floor((now - updatedAt) / 1000);

    const regenerated =
        Math.floor(
            elapsedSeconds / ENERGY_REGEN_SECONDS
        );

    if (regenerated <= 0) {
        return {
            energy: Number(user.energy),
            energy_updated_at: user.energy_updated_at
        };
    }

    const newEnergy = Math.min(
        MAX_ENERGY,
        Number(user.energy) + regenerated
    );

    return {
        energy: newEnergy,
        energy_updated_at: new Date(
            now
        ).toISOString()
    };
}

export default async function handler(req, res) {

    /*
    ================================
    CORS
    ================================
    */

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

        /*
        ================================
        MAIN API
        ================================
        */

        if (
            req.method === "GET" &&
            req.url === "/api"
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

        /*
        ================================
        GET USER
        ================================
        */

        if (
            req.method === "GET" &&
            req.url.startsWith("/api/user")
        ) {

            const url =
                new URL(
                    req.url,
                    "https://afghanicoin.vercel.app"
                );

            const telegramId =
                url.searchParams.get(
                    "telegram_id"
                );

            if (!telegramId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "telegram_id is required"

                });
            }

            let users =
                await sql`
                    SELECT *
                    FROM users
                    WHERE telegram_id = ${telegramId}
                    LIMIT 1
                `;

            if (users.length === 0) {

                const created =
                    await sql`
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

            return res.status(200).json({

                success: true,

                user: users[0]

            });
        }

        /*
        ================================
        MINE
        ================================
        */

        if (
            req.method === "POST" &&
            req.url === "/api/mine"
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

            /*
            Rate limit
            */

            const last =
                lastRequests.get(
                    String(telegram_id)
                );

            const now =
                Date.now();

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
                String(telegram_id),
                now
            );

            /*
            Find user
            */

            let users =
                await sql`
                    SELECT *
                    FROM users
                    WHERE telegram_id =
                        ${String(telegram_id)}
                    LIMIT 1
                `;

            /*
            Create user if not exists
            */

            if (users.length === 0) {

                users =
                    await sql`
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
                            ${String(telegram_id)},
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

            const user =
                users[0];

            /*
            Regenerate energy
            */

            const regenerated =
                regenerateEnergy(user);

            let energy =
                regenerated.energy;

            /*
            No energy
            */

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

            /*
            Mining amount
            */

            const power =
                Number(user.power || 1);

            const newBalance =
                Number(user.balance || 0)
                + power;

            const newEnergy =
                energy - 1;

            /*
            Save user
            */

            const updated =
                await sql`
                    UPDATE users

                    SET
                        balance = ${newBalance},
                        energy = ${newEnergy},
                        energy_updated_at =
                            ${regenerated.energy_updated_at}

                    WHERE telegram_id =
                        ${String(telegram_id)}

                    RETURNING *
                `;

            /*
            Mining history
            */

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
                        ${String(telegram_id)},
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

            return res.status(200).json({

                success: true,

                mined: power,

                user: updated[0]

            });
        }

        /*
        ================================
        UPGRADE
        ================================
        */

        if (
            req.method === "POST" &&
            req.url === "/api/upgrade"
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

            const users =
                await sql`
                    SELECT *
                    FROM users
                    WHERE telegram_id =
                        ${String(telegram_id)}
                    LIMIT 1
                `;

            if (users.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });
            }

            const user =
                users[0];

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

            const updated =
                await sql`
                    UPDATE users

                    SET
                        balance =
                            ${balance - cost},

                        level =
                            ${level + 1},

                        power =
                            ${power + 1}

                    WHERE telegram_id =
                        ${String(telegram_id)}

                    RETURNING *
                `;

            return res.status(200).json({

                success: true,

                user: updated[0]

            });
        }

        /*
        ================================
        MINING HISTORY
        ================================
        */

        if (
            req.method === "GET" &&
            req.url.startsWith(
                "/api/mining-history"
            )
        ) {

            const url =
                new URL(
                    req.url,
                    "https://afghanicoin.vercel.app"
                );

            const telegramId =
                url.searchParams.get(
                    "telegram_id"
                );

            if (!telegramId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "telegram_id is required"

                });
            }

            const history =
                await sql`
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

        /*
        ================================
        NOT FOUND
        ================================
        */

        return res.status(404).json({

            success: false,

            message:
                "Endpoint not found"

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
