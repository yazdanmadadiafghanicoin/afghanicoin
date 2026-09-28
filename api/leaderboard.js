import sql from "./db.js";

export default async function handler(req, res) {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    try {

        const telegramId =
            req.query?.telegram_id
            ? String(req.query.telegram_id)
            : null;

        // گرفتن 50 نفر اول
        const leaderboard = await sql`
            SELECT
                id,
                telegram_id,
                username,
                balance,
                level,
                power
            FROM users
            ORDER BY
                balance DESC,
                level DESC,
                power DESC,
                id ASC
            LIMIT 50
        `;

        const rankedUsers = leaderboard.map((user, index) => {

            let medal = "";

            if (index === 0) {
                medal = "🥇";
            } else if (index === 1) {
                medal = "🥈";
            } else if (index === 2) {
                medal = "🥉";
            }

            return {
                rank: index + 1,
                medal: medal,

                username:
                    user.username ||
                    `Miner ${String(user.id).padStart(3, "0")}`,

                balance:
                    Number(user.balance || 0),

                level:
                    Number(user.level || 1),

                power:
                    Number(user.power || 1)
            };
        });

        let myRank = null;
        let myUser = null;

        // پیدا کردن کاربر فعلی
        if (telegramId) {

            const users = await sql`
                SELECT
                    id,
                    telegram_id,
                    username,
                    balance,
                    level,
                    power
                FROM users
                WHERE telegram_id = ${telegramId}
                LIMIT 1
            `;

            if (users.length > 0) {

                const user = users[0];

                myUser = {
                    username:
                        user.username ||
                        `Miner ${String(user.id).padStart(3, "0")}`,

                    balance:
                        Number(user.balance || 0),

                    level:
                        Number(user.level || 1),

                    power:
                        Number(user.power || 1)
                };

                // رتبه واقعی
                const rankResult = await sql`
                    SELECT COUNT(*) AS count
                    FROM users
                    WHERE balance > ${Number(user.balance || 0)}
                `;

                myRank =
                    Number(rankResult[0].count || 0) + 1;
            }
        }

        return res.status(200).json({

            success: true,

            totalUsers: Number(
                (await sql`
                    SELECT COUNT(*) AS count
                    FROM users
                `)[0].count
            ),

            leaderboard: rankedUsers,

            myRank: myRank,

            myUser: myUser

        });

    } catch (error) {

        console.error(
            "LEADERBOARD ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Leaderboard server error",

            error:
                error.message

        });
    }
}
