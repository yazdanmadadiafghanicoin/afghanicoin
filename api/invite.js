import sql from "./db.js";
import { logWalletTransaction } from "./wallet-log.js";

const NEW_USER_REWARD = 100;
const REFERRER_REWARD = 200;

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

        await sql`
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_telegram_id TEXT NOT NULL,
                invited_telegram_id TEXT UNIQUE NOT NULL,
                reward_referrer INTEGER DEFAULT 200,
                reward_invited INTEGER DEFAULT 100,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // =========================
        // GET INVITES
        // =========================

        if (req.method === "GET") {

            const telegramId =
                req.query?.telegram_id;

            if (!telegramId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "telegram_id is required"
                });
            }

            const invitedUsers = await sql`
                SELECT
                    invited_telegram_id,
                    reward_invited,
                    created_at
                FROM referrals
                WHERE referrer_telegram_id =
                    ${String(telegramId)}
                ORDER BY created_at DESC
            `;

            const totalInvites =
                invitedUsers.length;

            const totalReward =
                totalInvites *
                REFERRER_REWARD;

            return res.status(200).json({

                success: true,

                totalInvites:
                    totalInvites,

                totalReward:
                    totalReward,

                invitedUsers:
                    invitedUsers

            });
        }

        // =========================
        // CREATE REFERRAL
        // =========================

        if (req.method === "POST") {

            const {
                referrer_telegram_id,
                invited_telegram_id
            } = req.body || {};

            if (
                !referrer_telegram_id ||
                !invited_telegram_id
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "referrer_telegram_id and invited_telegram_id are required"
                });
            }

            const referrer =
                String(
                    referrer_telegram_id
                );

            const invited =
                String(
                    invited_telegram_id
                );

            if (referrer === invited) {

                return res.status(400).json({
                    success: false,
                    message:
                        "You cannot invite yourself"
                });
            }

            const referrerUser = await sql`
                SELECT *
                FROM users
                WHERE telegram_id =
                    ${referrer}
                LIMIT 1
            `;

            if (referrerUser.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Referrer user not found"
                });
            }

            const invitedUser = await sql`
                SELECT *
                FROM users
                WHERE telegram_id =
                    ${invited}
                LIMIT 1
            `;

            if (invitedUser.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Invited user not found"
                });
            }

            const existing = await sql`
                SELECT *
                FROM referrals
                WHERE invited_telegram_id =
                    ${invited}
                LIMIT 1
            `;

            if (existing.length > 0) {

                return res.status(400).json({
                    success: false,
                    already_invited: true,
                    message:
                        "This user has already been invited"
                });
            }

            // ثبت Referral
            await sql`
                INSERT INTO referrals
                (
                    referrer_telegram_id,
                    invited_telegram_id,
                    reward_referrer,
                    reward_invited
                )
                VALUES
                (
                    ${referrer},
                    ${invited},
                    ${REFERRER_REWARD},
                    ${NEW_USER_REWARD}
                )
            `;

            // =========================
            // REFERRER
            // =========================

            const oldReferrerBalance =
                Number(
                    referrerUser[0].balance || 0
                );

            const newReferrerBalance =
                oldReferrerBalance +
                REFERRER_REWARD;

            await sql`
                UPDATE users
                SET balance =
                    ${newReferrerBalance}
                WHERE telegram_id =
                    ${referrer}
            `;

            await logWalletTransaction(
                referrer,
                "invite",
                REFERRER_REWARD,
                newReferrerBalance,
                "پاداش دعوت دوست"
            );

            // =========================
            // INVITED USER
            // =========================

            const oldInvitedBalance =
                Number(
                    invitedUser[0].balance || 0
                );

            const newInvitedBalance =
                oldInvitedBalance +
                NEW_USER_REWARD;

            const updatedInvited = await sql`
                UPDATE users
                SET balance =
                    ${newInvitedBalance}
                WHERE telegram_id =
                    ${invited}
                RETURNING *
            `;

            await logWalletTransaction(
                invited,
                "invite_bonus",
                NEW_USER_REWARD,
                newInvitedBalance,
                "پاداش ورود با دعوت"
            );

            return res.status(200).json({

                success: true,

                message:
                    "Referral registered successfully",

                referrer_reward:
                    REFERRER_REWARD,

                invited_reward:
                    NEW_USER_REWARD,

                user:
                    updatedInvited[0]

            });
        }

        return res.status(405).json({
            success: false,
            message:
                "Method not allowed"
        });

    } catch (error) {

        console.error(
            "INVITE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Invite server error",

            error:
                error.message

        });
    }
                    }
