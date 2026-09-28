import sql from "./db.js";
import { ensureWalletTable } from "./wallet-log.js";

export default async function handler(req, res) {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

        await ensureWalletTable();

        const telegramId = req.query?.telegram_id;

        if (!telegramId) {
            return res.status(400).json({
                success: false,
                message: "telegram_id is required"
            });
        }

        const id = String(telegramId);

        // پیدا کردن کاربر
        const users = await sql`
            SELECT
                id,
                telegram_id,
                username,
                balance,
                energy,
                level,
                power,
                created_at
            FROM users
            WHERE telegram_id = ${id}
            LIMIT 1
        `;

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = users[0];

        // تراکنش‌های Wallet
        const transactions = await sql`
            SELECT
                id,
                type,
                amount,
                balance_after,
                description,
                created_at
            FROM wallet_transactions
            WHERE telegram_id = ${id}
            ORDER BY created_at DESC
            LIMIT 100
        `;

        // تاریخچه استخراج
        let miningHistory = [];

        try {

            miningHistory = await sql`
                SELECT
                    id,
                    mined,
                    power,
                    balance_after,
                    energy_after,
                    created_at
                FROM mining_history
                WHERE telegram_id = ${id}
                ORDER BY created_at DESC
                LIMIT 100
            `;

        } catch (error) {

            console.log("Mining history unavailable:", error.message);

        }

        // جمع پاداش‌ها
        let totalRewards = 0;

        for (const item of transactions) {

            if (Number(item.amount) > 0) {
                totalRewards += Number(item.amount);
            }

        }

        // تعداد استخراج‌ها
        const miningCount = miningHistory.length;

        return res.status(200).json({

            success: true,

            wallet: {

                telegram_id: user.telegram_id,

                username:
                    user.username ||
                    `Miner ${String(user.id).padStart(3, "0")}`,

                balance: Number(user.balance || 0),

                energy: Number(user.energy || 0),

                level: Number(user.level || 1),

                power: Number(user.power || 1),

               
