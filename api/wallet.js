import sql from "./db.js";

export default async function handler(req, res) {

    res.setHeader("Access-Control-Allow-Origin", "*");
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

        // ساخت جدول تراکنش‌های Wallet
        await sql`
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id SERIAL PRIMARY KEY,
                telegram_id TEXT NOT NULL,
                type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // =========================
        // GET WALLET
        // =========================

        if (req.method === "GET") {

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
        }

        // =========================
        // ADD TRANSACTION
        // =========================

        if (req.method === "POST") {

            const {
                telegram_id,
                type,
                amount,
                description
            } = req.body || {};

            if (!telegram_id || !type || amount === undefined) {
                return res.status(400).json({
                    success: false,
                    message:
                        "telegram_id, type and amount are required"
                });
            }

            const telegramId = String(telegram_id);
            const transactionAmount = Number(amount);

            if (!Number.isFinite(transactionAmount)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid amount"
                });
            }

            const users = await sql`
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

            const user = users[0];

            const currentBalance =
                Number(user.balance || 0);

            const newBalance =
                currentBalance + transactionAmount;

            if (newBalance < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient AFC balance"
                });
            }

            const updated = await sql`
                UPDATE users
                SET balance = ${newBalance}
                WHERE telegram_id = ${telegramId}
                RETURNING *
            `;

            const transaction = await sql`
                INSERT INTO wallet_transactions
                (
                    telegram_id,
                    type,
                    amount,
                    balance_after,
                    description
                )
                VALUES
                (
                    ${telegramId},
                    ${String(type)},
                    ${transactionAmount},
                    ${newBalance},
                    ${description || null}
                )
                RETURNING *
            `;

            return res.status(200).json({
                success: true,
                message: "Wallet transaction created",

                transaction: {
                    id: transaction[0].id,
                    type: transaction[0].type,
                    amount: Number(transaction[0].amount),
                    balance_after:
                        Number(transaction[0].balance_after),
                    description:
                        transaction[0].description,
                    created_at:
                        transaction[0].created_at
                },

                user: updated[0]
            });
        }

        return res.status(405).json({
            success: false,
            message: "Method not allowed"
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
