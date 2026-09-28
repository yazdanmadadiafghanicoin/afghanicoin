import sql from "./db.js";
import { ensureWalletTable } from "./wallet-log.js";

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

    try {

        await ensureWalletTable();

        if (req.method !== "GET") {
            return res.status(405).json({
                success: false,
                message: "Wallet transactions can only be viewed"
            });
        }

        const telegramId = req.query?.telegram_id;

        if (!telegramId) {
            return res.status(400).json({
                success: false,
                message: "telegram_id is required"
            });
        }

        const user = await sql`
            SELECT
                id,
                telegram_id,
                username,
                balance,
                level,
                power
            FROM users
            WHERE telegram_id = ${String(telegramId)}
            LIMIT 1
        `;

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const transactions = await sql`
            SELECT
                id,
                type,
                amount,
                balance_after,
                description,
                created_at
            FROM wallet_transactions
            WHERE telegram_id = ${String(telegramId)}
            ORDER BY created_at DESC
            LIMIT 100
        `;

        return res.status(200).json({

            success: true,

            wallet: {
                telegram_id: user[0].telegram_id,
                username: user[0].username || "AFC Miner",
                balance: Number(user[0].balance || 0),
                level: Number(user[0].level || 1),
                power: Number(user[0].power || 1)
            },

            transactions: transactions.map(item => ({
                id: item.id,
                type: item.type,
                amount: Number(item.amount || 0),
                balance_after: Number(item.balance_after || 0),
                description: item.description,
                created_at: item.created_at
            }))

        });

    } catch (error) {

        console.error("WALLET ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Wallet server error",
            error: error.message
        });
    }
}
