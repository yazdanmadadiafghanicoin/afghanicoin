import sql from "./db.js";

export async function ensureWalletTable() {
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
}

export async function logWalletTransaction(
    telegramId,
    type,
    amount,
    balanceAfter,
    description
) {
    await ensureWalletTable();

    await sql`
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
            ${String(telegramId)},
            ${String(type)},
            ${Number(amount)},
            ${Number(balanceAfter)},
            ${description || null}
        )
    `;
}
