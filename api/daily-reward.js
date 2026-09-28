import sql from "./db.js";
import { logWalletTransaction } from "./wallet-log.js";

const REWARDS = [
    100,
    150,
    200,
    300,
    400,
    500,
    1000
];

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

    if (req.method !== "POST") {

        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    try {

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

        await sql`
            CREATE TABLE IF NOT EXISTS daily_rewards (
                id SERIAL PRIMARY KEY,
                telegram_id TEXT UNIQUE NOT NULL,
                last_claim_date DATE,
                streak INTEGER DEFAULT 0
            )
        `;

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

        const rewards = await sql`
            SELECT *
            FROM daily_rewards
            WHERE telegram_id =
                ${telegramId}
            LIMIT 1
        `;

        const today =
            new Date()
                .toISOString()
                .slice(0, 10);

        let streak = 0;

        let lastClaimDate = null;

        if (rewards.length > 0) {

            streak =
                Number(
                    rewards[0].streak || 0
                );

            lastClaimDate =
                rewards[0].last_claim_date;
        }

        if (lastClaimDate) {

            const lastDate =
                new Date(lastClaimDate)
                    .toISOString()
                    .slice(0, 10);

            if (lastDate === today) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Daily reward already claimed today",

                    already_claimed: true,

                    streak: streak

                });
            }
        }

        streak++;

        if (streak > 7) {
            streak = 1;
        }

        const reward =
            REWARDS[streak - 1];

        const newBalance =
            Number(user.balance || 0)
            + reward;

        const updated = await sql`
            UPDATE users
            SET balance =
                ${newBalance}
            WHERE telegram_id =
                ${telegramId}
            RETURNING *
        `;

        if (rewards.length === 0) {

            await sql`
                INSERT INTO daily_rewards
                (
                    telegram_id,
                    last_claim_date,
                    streak
                )
                VALUES
                (
                    ${telegramId},
                    ${today},
                    ${streak}
                )
            `;

        } else {

            await sql`
                UPDATE daily_rewards
                SET
                    last_claim_date =
                        ${today},
                    streak =
                        ${streak}
                WHERE telegram_id =
                    ${telegramId}
            `;
        }

        // ثبت Wallet
        await logWalletTransaction(
            telegramId,
            "daily_reward",
            reward,
            newBalance,
            "پاداش روزانه"
        );

        return res.status(200).json({

            success: true,

            message:
                "Daily reward claimed successfully",

            reward: reward,

            streak: streak,

            user: updated[0]

        });

    } catch (error) {

        console.error(
            "DAILY REWARD ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Daily reward server error",

            error:
                error.message

        });
    }
}
