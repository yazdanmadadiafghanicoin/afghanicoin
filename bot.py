import os
import time
import json
import urllib.request
import urllib.parse

TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
API = f"https://api.telegram.org/bot{TOKEN}"

users = {}


def telegram(method, data=None):
    url = f"{API}/{method}"

    if data:
        encoded = urllib.parse.urlencode(data).encode()
        request = urllib.request.Request(url, data=encoded)
    else:
        request = urllib.request.Request(url)

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())


def send_message(chat_id, text, keyboard=None):
    data = {
        "chat_id": chat_id,
        "text": text
    }

    if keyboard:
        data["reply_markup"] = json.dumps(keyboard)

    telegram("sendMessage", data)


keyboard = {
    "inline_keyboard": [
        [
            {
                "text": "⛏️ استخراج Afghani Coin",
                "web_app": {
                    "url": "لینک سایتت را اینجا بگذار"
                }
            }
        ],
        [
            {
                "text": "💰 موجودی من",
                "callback_data": "balance"
            }
        ]
    ]
}


def main():
    offset = 0

    print("Afghani Coin Bot is running...")

    while True:
        try:
            result = telegram(
                "getUpdates",
                {
                    "offset": offset,
                    "timeout": 25
                }
            )

            for update in result.get("result", []):
                offset = update["update_id"] + 1

                message = update.get("message")

                if not message:
                    continue

                chat_id = message["chat"]["id"]
                text = message.get("text", "")

                if chat_id not in users:
                    users[chat_id] = {
                        "balance": 0,
                        "last_mine": 0
                    }

                user = users[chat_id]

                if text == "/start":
                    send_message(
                        chat_id,
                        "🪙 خوش آمدید به Afghani Coin!\n\n"
                        "برای شروع روی «⛏️ استخراج Afghani Coin» بزنید.",
                        keyboard
                    )

                elif text == "⛏️ استخراج Afghani Coin":
                    now = time.time()

                    if now - user["last_mine"] < 60:
                        remaining = int(
                            60 - (now - user["last_mine"])
                        )

                        send_message(
                            chat_id,
                            f"⏳ لطفاً {remaining} ثانیه صبر کنید."
                        )

                    else:
                        user["balance"] += 1
                        user["last_mine"] = now

                        send_message(
                            chat_id,
                            "⛏️ استخراج موفق!\n\n"
                            "🪙 +1 Afghani Coin\n"
                            f"💰 موجودی: {user['balance']} AFC"
                        )

                elif text == "💰 موجودی من":
                    send_message(
                        chat_id,
                        f"💰 موجودی شما:\n\n"
                        f"🪙 {user['balance']} AFC"
                    )

                else:
                    send_message(
                        chat_id,
                        "برای شروع /start را بزنید.",
                        keyboard
                    )

        except Exception as error:
            print("Error:", error)
            time.sleep(5)


if __name__ == "__main__":
    main()
