import sql from "./db.js";

export default async function handler(req, res) {

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

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
            req.query?.telegram_id || null;

        const leaderboard = await sql`
            SELECT
                id,
                username,
                balance,
                level,
                power
            FROM users
            ORDER BY
                balance DESC,
                id ASC
            LIMIT 50
        `;

        const rankedUsers = leaderboard.map(
            (user, index) => ({
                rank: index + 1,
                username:
                    user.username || "AFC Miner",
                balance:
                    Number(user.balance || 0),
                level:
                    Number(user.level || 1),
                power:
                    Number(user.power || 1)
            })
        );

        let myRank = null;
        let myUser = null;

        if (telegramId) {

            const users = await sql`
                SELECT
                    id,
                    username,
                    balance,
                    level,
                    power
                FROM users
                WHERE telegram_id = ${String(telegramId)}
                LIMIT 1
            `;

            if (users.length > 0) {

                myUser = users[0];

                const rankResult = await sql`
                    SELECT COUNT(*) + 1 AS rank
                    FROM users
                    WHERE balance >
                        ${Number(myUser.balance || 0)}
                `;

                myRank =
                    Number(rankResult[0].rank);
            }
        }

        return res.status(200).json({

            success: true,

            leaderboard: rankedUsers,

            myRank: myRank,

            myUser: myUser
                ? {
                    username:
                        myUser.username ||
                        "AFC Miner",

                    balance:
                        Number(
                            myUser.balance || 0
                        ),

                    level:
                        Number(
                            myUser.level || 1
                        ),

                    power:
                        Number(
                            myUser.power || 1
                        )
                }
                : null
        });

    } catch (error) {

        console.error(
            "LEADERBOARD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Leaderboard server error",
            error: error.message
        });
    }
}
