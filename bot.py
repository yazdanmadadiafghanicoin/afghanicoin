import os
import json
import urllib.request
import urllib.parse
import time


# =========================
# SETTINGS
# =========================

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")

if not TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN is not set")

API = f"https://api.telegram.org/bot{TOKEN}"

BACKEND_URL = "https://afghanicoin.vercel.app"

# نسخه اصلی فعلی
WEB_APP_URL = "https://afghanicoin.vercel.app/"


# =========================
# TELEGRAM API
# =========================

def telegram(method, data=None):

    url = f"{API}/{method}"

    if data:
        encoded = urllib.parse.urlencode(data).encode()

        request = urllib.request.Request(
            url,
            data=encoded
        )
    else:
        request = urllib.request.Request(url)

    with urllib.request.urlopen(
        request,
        timeout=30
    ) as response:

        return json.loads(
            response.read().decode()
        )


# =========================
# SEND MESSAGE
# =========================

def send_message(chat_id, text, keyboard=None):

    data = {
        "chat_id": chat_id,
        "text": text
    }

    if keyboard:
        data["reply_markup"] = json.dumps(keyboard)

    return telegram("sendMessage", data)


# =========================
# CREATE / GET USER
# =========================

def create_user(telegram_id):

    try:

        url = (
            f"{BACKEND_URL}/api/user"
            f"?telegram_id={urllib.parse.quote(str(telegram_id))}"
        )

        request = urllib.request.Request(
            url,
            method="GET"
        )

        with urllib.request.urlopen(
            request,
            timeout=20
        ) as response:

            result = json.loads(
                response.read().decode()
            )

            print("User API:", result)

            return result

    except Exception as error:

        print("Create user error:", error)

        return None


# =========================
# REGISTER REFERRAL
# =========================

def register_referral(referrer_id, invited_id):

    try:

        data = {
            "referrer_telegram_id": str(referrer_id),
            "invited_telegram_id": str(invited_id)
        }

        body = json.dumps(data).encode()

        url = f"{BACKEND_URL}/api/invite"

        request = urllib.request.Request(
            url,
            data=body,
            headers={
                "Content-Type": "application/json"
            },
            method="POST"
        )

        with urllib.request.urlopen(
            request,
            timeout=20
        ) as response:

            result = json.loads(
                response.read().decode()
            )

            print("Referral API:", result)

            return result

    except Exception as error:

        print("Referral error:", error)

        return None


# =========================
# WEB APP KEYBOARD
# =========================

def web_app_keyboard():

    return {
        "inline_keyboard": [
            [
                {
                    "text": "🪙 ورود به Afghani Coin",
                    "web_app": {
                        "url": WEB_APP_URL
                    }
                }
            ]
        ]
    }


# =========================
# START COMMAND
# =========================

def start_command(
    chat_id,
    telegram_id,
    referral_code=None
):

    # ایجاد کاربر در دیتابیس
    create_user(telegram_id)

    # =========================
    # REFERRAL
    # =========================

    referral_result = None

    if referral_code:

        referral_code = str(referral_code).strip()

        if referral_code != str(telegram_id):

            referral_result = register_referral(
                referral_code,
                telegram_id
            )

    # =========================
    # MESSAGE
    # =========================

    message_text = (
        "🪙 Afghani Coin\n\n"
        "خوش آمدید به Afghani Coin!\n\n"
        "برای شروع استخراج روی دکمه زیر بزنید.\n\n"
        "⚡ Mine\n"
        "🚀 Upgrade\n"
        "🎁 Daily Reward\n"
        "👥 Invite Friends\n"
        "🏆 Leaderboard"
    )

    # دعوت موفق
    if referral_result:

        if referral_result.get("success"):

            message_text += (
                "\n\n"
                "🎉 شما از طریق لینک دعوت وارد شدید!\n"
                "🎁 پاداش شما: 100 AFC"
            )

        elif referral_result.get("already_invited"):

            message_text += (
                "\n\n"
                "ℹ️ این حساب قبلاً با یک لینک دعوت ثبت شده است."
            )

    send_message(
        chat_id,
        message_text,
        web_app_keyboard()
    )


# =========================
# HANDLE UPDATE
# =========================

def handle_update(update):

    message = update.get("message")

    if not message:
        return

    chat_id = message.get(
        "chat",
        {}
    ).get("id")

    if not chat_id:
        return

    telegram_user = message.get(
        "from",
        {}
    )

    telegram_id = telegram_user.get("id")

    if not telegram_id:
        return

    text = message.get(
        "text",
        ""
    ).strip()

    # =========================
    # START
    # =========================

    if text.startswith("/start"):

        parts = text.split()

        referral_code = None

        if len(parts) > 1:
            referral_code = parts[1]

        start_command(
            chat_id,
            telegram_id,
            referral_code
        )

        return

    # =========================
    # OTHER MESSAGES
    # =========================

    send_message(
        chat_id,

        "🪙 Afghani Coin\n\n"
        "برای ورود به Afghani Coin "
        "روی دکمه زیر بزنید:",

        web_app_keyboard()
    )


# =========================
# GET UPDATES
# =========================

def get_updates(offset):

    return telegram(
        "getUpdates",
        {
            "offset": offset,
            "timeout": 25
        }
    )


# =========================
# START BOT
# =========================

def main():

    offset = 0

    print(
        "Afghani Coin Bot is running..."
    )

    while True:

        try:

            result = get_updates(offset)

            updates = result.get(
                "result",
                []
            )

            for update in updates:

                offset = (
                    update["update_id"] + 1
                )

                handle_update(update)

        except Exception as error:

            print(
                "Bot Error:",
                error
            )

            time.sleep(5)


# =========================
# RUN
# =========================

if __name__ == "__main__":
    main()
