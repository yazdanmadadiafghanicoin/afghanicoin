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
    "keyboard": [
        [{"text": "⛏️ ماین کردن"}],
        [{"text": "💰 موجودی من"}]
    ],
    "resize_keyboard": True
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
                        "balance": 0
                    }

                user = users[chat_id]

                if text == "/start":
                    send_message(
                        chat_id,
                        "🪙 خوش آمدید به Afghani Coin!\n\n"
                        "👆 روی «⛏️ ماین کردن» بزنید.\n"
                        "هر کلیک = +1 AFC",
                        keyboard
                    )

                elif text == "⛏️ ماین کردن":
                    user["balance"] += 1

                    send_message(
                        chat_id,
                        "⛏️ ماین موفق!\n\n"
                        "🪙 +1 AFC\n"
                        f"💰 موجودی: {user['balance']} AFC",
                        keyboard
                    )

                elif text == "💰 موجودی من":
                    send_message(
                        chat_id,
                        "💰 موجودی شما:\n\n"
                        f"🪙 {user['balance']} AFC",
                        keyboard
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
