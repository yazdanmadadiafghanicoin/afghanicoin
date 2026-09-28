import sql from "./db.js";

const TASKS = [
    {
        id: "join_telegram",
        title: "عضویت در کانال تلگرام",
        description: "در کانال رسمی Afghani Coin عضو شوید",
        reward: 100,
        icon: "📢",
        url: "https://t.me/AfghaniCoin"
    },
    {
        id: "follow_news",
        title: "دنبال کردن اخبار AFC",
        description: "صفحه رسمی اخبار پروژه را ببینید",
        reward: 150,
        icon: "📰",
        url: "https://t.me/AfghaniCoin"
    },
    {
        id: "visit_afc",
        title: "بازدید از Afghani Coin",
        description: "وب‌سایت Afghani Coin را باز کنید",
        reward: 200,
        icon: "🌐",
        url: "https://afghanicoin.vercel.app/"
    },
    {
        id: "daily_task",
        title: "مأموریت روزانه",
        description: "امروز وارد Afghani Coin شوید",
        reward: 250,
        icon: "🎯",
        url: "https://afghanicoin.vercel.app/"
    }
];

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

        // ساخت جدول انجام مأموریت‌ها
        await sql`
            CREATE TABLE IF NOT EXISTS completed_tasks (
                id SERIAL PRIMARY KEY,
                telegram_id TEXT NOT NULL,
                task_id TEXT NOT NULL,
                reward INTEGER NOT NULL,
                completed_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(telegram_id, task_id)
            )
        `;

        // دریافت لیست Tasks
        if (req.method === "GET") {

            const telegramId = req.query?.telegram_id;

            if (!telegramId) {
                return res.status(400).json({
                    success: false,
                    message: "telegram_id is required"
                });
            }

            const completed = await sql`
                SELECT task_id
                FROM completed_tasks
                WHERE telegram_id = ${String(telegramId)}
            `;

            const completedIds = new Set(
                completed.map(row => row.task_id)
            );

            const tasks = TASKS.map(task => ({
                ...task,
                completed: completedIds.has(task.id)
            }));

            return res.status(200).json({
                success: true,
                tasks
            });
        }

        // دریافت پاداش Task
        if (req.method === "POST") {

            const {
                telegram_id,
                task_id
            } = req.body || {};

            if (!telegram_id || !task_id) {
                return res.status(400).json({
                    success: false,
                    message: "telegram_id and task_id are required"
                });
            }

            const telegramId = String(telegram_id);

            const task = TASKS.find(
                item => item.id === task_id
            );

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: "Task not found"
                });
            }

            // بررسی کاربر
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

            // جلوگیری از دریافت دوباره
            const existing = await sql`
                SELECT *
                FROM completed_tasks
                WHERE telegram_id = ${telegramId}
                AND task_id = ${task_id}
                LIMIT 1
            `;

            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    already_completed: true,
                    message: "Task already completed"
                });
            }

            const oldBalance = Number(
                users[0].balance || 0
            );

            const newBalance =
                oldBalance + task.reward;

            // ثبت Task قبل از پرداخت
            await sql`
                INSERT INTO completed_tasks
                (
                    telegram_id,
                    task_id,
                    reward
                )
                VALUES
                (
                    ${telegramId},
                    ${task_id},
                    ${task.reward}
                )
            `;

            // اضافه کردن AFC
            const updated = await sql`
                UPDATE users
                SET balance = ${newBalance}
                WHERE telegram_id = ${telegramId}
                RETURNING *
            `;

            return res.status(200).json({
                success: true,
                message: "Task completed successfully",
                task_id: task_id,
                reward: task.reward,
                user: updated[0]
            });
        }

        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });

    } catch (error) {

        console.error("TASK ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Task server error",
            error: error.message
        });
    }
}
