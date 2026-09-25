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

WEB_APP_URL = "https://afghanicoin.vercel.app/"
)


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

def send_message(
    chat_id,
    text,
    keyboard=None
):

    data = {
        "chat_id": chat_id,
        "text": text
    }

    if keyboard:

        data["reply_markup"] = json.dumps(
            keyboard
        )

    return telegram(
        "sendMessage",
        data
    )


# =========================
# WEB APP BUTTON
# =========================

keyboard = {

    "inline_keyboard": [

        [

            {
                "text": "⛏️ استخراج Afghani Coin",

                "web_app": {
                    "url": WEB_APP_URL
                }

            }

        ]

    ]

}


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

            result = telegram(
                "getUpdates",
                {
                    "offset": offset,
                    "timeout": 25
                }
            )

            updates = result.get(
                "result",
                []
            )

            for update in updates:

                offset = (
                    update["update_id"] + 1
                )

                message = update.get(
                    "message"
                )

                if not message:
                    continue

                chat_id = message.get(
                    "chat",
                    {}
                ).get(
                    "id"
                )

                if not chat_id:
                    continue

                text = message.get(
                    "text",
                    ""
                ).strip()


                # =====================
                # START
                # =====================

                if text == "/start":

                    send_message(

                        chat_id,

                        "🪙 خوش آمدید به Afghani Coin!\n\n"
                        "⛏️ برای شروع استخراج روی دکمه زیر بزنید.\n\n"
                        "⚡ Mine\n"
                        "🚀 Upgrade\n"
                        "🎁 Daily Reward\n"
                        "👥 Invite Friends\n"
                        "🏆 Leaderboard",

                        keyboard

                    )


                # =====================
                # OTHER MESSAGES
                # =====================

                else:

                    send_message(

                        chat_id,

                        "🪙 برای ورود به Afghani Coin "
                        "روی دکمه زیر بزنید:",

                        keyboard

                    )


        except Exception as error:

            print(
                "Error:",
                error
            )

            time.sleep(5)


# =========================
# RUN
# =========================

if __name__ == "__main__":

    main()
