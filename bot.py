import os
import json
import urllib.request
import urllib.parse
import time

TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
API = f"https://api.telegram.org/bot{TOKEN}"

WEB_APP_URL = "https://yazdanmadadiafghanicoin.github.io/afghanicoin/"


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


# فقط دکمه ورود به صفحه ماینینگ
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

                if text == "/start":
                    send_message(
                        chat_id,
                        "🪙 خوش آمدید به Afghani Coin!\n\n"
                        "برای شروع استخراج روی دکمه زیر بزنید:",
                        keyboard
                    )

                else:
                    send_message(
                        chat_id,
                        "برای شروع استخراج، /start را بزنید.",
                        keyboard
                    )

        except Exception as error:
            print("Error:", error)
            time.sleep(5)


if __name__ == "__main__":
    main()
