import os
import json
import urllib.request
import urllib.parse
import urllib.error
import time

# ==============================
# Afghani Coin Bot
# ==============================

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")

if not TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN is not set")

API = f"https://api.telegram.org/bot{TOKEN}"

BACKEND_URL = "https://afghanicoin.vercel.app"
WEB_APP_URL = "https://afghanicoin.vercel.app/"


# ==============================
# Telegram API
# ==============================

def telegram(method, data=None):

    url = f"{API}/{method}"

    try:

        if data:
            encoded = urllib.parse.urlencode(data).encode("utf-8")

            request = urllib.request.Request(
                url,
                data=encoded,
                method="POST"
            )

        else:
            request = urllib.request.Request(
                url,
                method="GET"
            )

        with urllib.request.urlopen(request, timeout=40) as response:

            result = json.loads(
                response.read().decode("utf-8")
            )

            return result

    except urllib.error.HTTPError as error:

        try:
            body = error.read().decode("utf-8")
        except Exception:
            body = ""

        print(
            "Telegram HTTP Error:",
            error.code,
            body,
            flush=True
        )

        return {
            "ok": False,
            "error_code": error.code,
            "description": body
        }

    except Exception as error:

        print(
            "Telegram API Error:",
            error,
            flush=True
        )

        return {
            "ok": False,
            "description": str(error)
        }


# ==============================
# Send Message
# ==============================

def send_message(chat_id, text, keyboard=None):

    data = {
        "chat_id": chat_id,
        "text": text
    }

    if keyboard:

        data["reply_markup"] = json.dumps(
            keyboard,
            ensure_ascii=False
        )

    result = telegram(
        "sendMessage",
        data
    )

    print(
        "sendMessage result:",
        result,
        flush=True
    )

    return result


# ==============================
# Create / Get User
# ==============================

def create_user(telegram_id):

    try:

        encoded_id = urllib.parse.quote(
            str(telegram_id)
        )

        url = (
            f"{BACKEND_URL}"
            f"/api/user?telegram_id={encoded_id}"
        )

        request = urllib.request.Request(
            url,
            method="GET"
        )

        with urllib.request.urlopen(
            request,
            timeout=30
        ) as response:

            result = json.loads(
                response.read().decode("utf-8")
            )

            print(
                "USER API:",
                result,
                flush=True
            )

            return result

    except urllib.error.HTTPError as error:

        try:
            body = error.read().decode("utf-8")
        except Exception:
            body = ""

        print(
            "USER API HTTP ERROR:",
            error.code,
            body,
            flush=True
        )

        return None

    except Exception as error:

        print(
            "CREATE USER ERROR:",
            error,
            flush=True
        )

        return None


# ==============================
# Register Referral
# ==============================

def register_referral(
    referrer_id,
    invited_id
):

    try:

        referrer_id = str(referrer_id).strip()
        invited_id = str(invited_id).strip()

        print(
            "================================",
            flush=True
        )

        print(
            "REGISTER REFERRAL",
            flush=True
        )

        print(
            "Referrer:",
            referrer_id,
            flush=True
        )

        print(
            "Invited:",
            invited_id,
            flush=True
        )

        print(
            "================================",
            flush=True
        )

        if not referrer_id:
            print(
                "Referral cancelled: empty referrer",
                flush=True
            )
            return None

        if not invited_id:
            print(
                "Referral cancelled: empty invited user",
                flush=True
            )
            return None

        if referrer_id == invited_id:

            print(
                "Referral cancelled: self referral",
                flush=True
            )

            return {
                "success": False,
                "message": "You cannot invite yourself"
            }

        data = {
            "referrer_telegram_id": referrer_id,
            "invited_telegram_id": invited_id
        }

        body = json.dumps(
            data
        ).encode("utf-8")

        url = (
            f"{BACKEND_URL}"
            f"/api/invite"
        )

        print(
            "Referral URL:",
            url,
            flush=True
        )

        print(
            "Referral data:",
            data,
            flush=True
        )

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
            timeout=30
        ) as response:

            response_body = response.read().decode(
                "utf-8"
            )

            print(
                "Referral HTTP status:",
                response.status,
                flush=True
            )

            print(
                "Referral response:",
                response_body,
                flush=True
            )

            result = json.loads(
                response_body
            )

            return result

    except urllib.error.HTTPError as error:

        try:
            body = error.read().decode(
                "utf-8"
            )
        except Exception:
            body = ""

        print(
            "REFERRAL HTTP ERROR:",
            error.code,
            flush=True
        )

        print(
            "REFERRAL ERROR BODY:",
            body,
            flush=True
        )

        return None

    except Exception as error:

        print(
            "REFERRAL ERROR:",
            error,
            flush=True
        )

        return None


# ==============================
# Web App Button
# ==============================

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


# ==============================
# Extract Referral
# ==============================

def extract_referral(text):

    if not text:
        return None

    text = str(text).strip()

    print(
        "Original start text:",
        repr(text),
        flush=True
    )

    # Normal:
    # /start ref_598630982

    if text.lower().startswith("/start"):

        parts = text.split(
            maxsplit=1
        )

        if len(parts) < 2:

            print(
                "No referral parameter found.",
                flush=True
            )

            return None

        referral = parts[1].strip()

        print(
            "Extracted referral:",
            referral,
            flush=True
        )

        return referral

    return None


# ==============================
# Process Start Command
# ==============================

def start_command(
    chat_id,
    telegram_id,
    text
):

    print(
        "================================",
        flush=True
    )

    print(
        "START COMMAND",
        flush=True
    )

    print(
        "Telegram ID:",
        telegram_id,
        flush=True
    )

    print(
        "Chat ID:",
        chat_id,
        flush=True
    )

    print(
        "Text:",
        repr(text),
        flush=True
    )

    print(
        "================================",
        flush=True
    )

    # First create / get user
    create_user(
        telegram_id
    )

    # Extract referral
    referral_code = extract_referral(
        text
    )

    referral_result = None

    if referral_code:

        referral_code = str(
            referral_code
        ).strip()

        # Remove ref_
        if referral_code.lower().startswith(
            "ref_"
        ):

            referral_code = referral_code[4:]

        # Remove possible spaces
        referral_code = referral_code.strip()

        print(
            "Final referral ID:",
            referral_code,
            flush=True
        )

        if referral_code:

            if referral_code != str(
                telegram_id
            ):

                referral_result = register_referral(
                    referral_code,
                    telegram_id
                )

            else:

                print(
                    "Referral ignored: self referral",
                    flush=True
                )

    else:

        print(
            "No referral code.",
            flush=True
        )

    # ==========================
    # Main Message
    # ==========================

    message_text = (
        "🪙 Afghani Coin\n\n"
        "خوش آمدید به Afghani Coin! 🇦🇫\n\n"
        "برای شروع استخراج روی دکمه زیر بزنید.\n\n"
        "⚡ Mine\n"
        "🚀 Upgrade\n"
        "🎁 Daily Reward\n"
        "👥 Invite Friends\n"
        "🏆 Leaderboard\n"
        "💼 Wallet"
    )

    # ==========================
    # Referral Result
    # ==========================

    if referral_result:

        print(
            "FINAL REFERRAL RESULT:",
            referral_result,
            flush=True
        )

        if referral_result.get(
            "success"
        ):

            message_text += (
                "\n\n"
                "🎉 دعوت با موفقیت ثبت شد!\n"
                "🎁 پاداش شما: 100 AFC"
            )

        elif referral_result.get(
            "already_invited"
        ):

            message_text += (
                "\n\n"
                "ℹ️ این حساب قبلاً با یک "
                "لینک دعوت ثبت شده است."
            )

        else:

            message_text += (
                "\n\n"
                "ℹ️ ثبت دعوت انجام نشد."
            )

    else:

        print(
            "Referral result is empty.",
            flush=True
        )

    send_message(
        chat_id,
        message_text,
        web_app_keyboard()
    )


# ==============================
# Handle Telegram Update
# ==============================

def handle_update(update):

    print(
        "================================",
        flush=True
    )

    print(
        "NEW UPDATE:",
        json.dumps(
            update,
            ensure_ascii=False
        ),
        flush=True
    )

    print(
        "================================",
        flush=True
    )

    message = update.get(
        "message"
    )

    if not message:

        print(
            "Update has no message.",
            flush=True
        )

        return

    chat = message.get(
        "chat",
        {}
    )

    chat_id = chat.get(
        "id"
    )

    if not chat_id:

        print(
            "No chat ID.",
            flush=True
        )

        return

    telegram_user = message.get(
        "from",
        {}
    )

    telegram_id = telegram_user.get(
        "id"
    )

    if not telegram_id:

        print(
            "No Telegram user ID.",
            flush=True
        )

        return

    text = message.get(
        "text",
        ""
    )

    text = str(text).strip()

    print(
        "Incoming text:",
        repr(text),
        flush=True
    )

    # ==========================
    # START
    # ==========================

    if text.lower().startswith(
        "/start"
    ):

        start_command(
            chat_id,
            telegram_id,
            text
        )

        return

    # ==========================
    # Other Messages
    # ==========================

    send_message(
        chat_id,
        (
            "🪙 Afghani Coin\n\n"
            "برای ورود به Afghani Coin "
            "روی دکمه زیر بزنید:"
        ),
        web_app_keyboard()
    )


# ==============================
# Get Updates
# ==============================

def get_updates(offset):

    return telegram(
        "getUpdates",
        {
            "offset": offset,
            "timeout": 25
        }
    )


# ==============================
# Main
# ==============================

def main():

    print(
        "================================",
        flush=True
    )

    print(
        "🇦🇫 Afghani Coin Bot Started",
        flush=True
    )

    print(
        "Backend:",
        BACKEND_URL,
        flush=True
    )

    print(
        "Web App:",
        WEB_APP_URL,
        flush=True
    )

    print(
        "================================",
        flush=True
    )

    offset = 0

    while True:

        try:

            result = get_updates(
                offset
            )

            if not result.get(
                "ok",
                False
            ):

                print(
                    "getUpdates failed:",
                    result,
                    flush=True
                )

                time.sleep(5)

                continue

            updates = result.get(
                "result",
                []
            )

            print(
                "Updates received:",
                len(updates),
                flush=True
            )

            for update in updates:

                try:

                    update_id = update.get(
                        "update_id"
                    )

                    if update_id is not None:

                        offset = (
                            update_id + 1
                        )

                    handle_update(
                        update
                    )

                except Exception as error:

                    print(
                        "Update processing error:",
                        error,
                        flush=True
                    )

        except Exception as error:

            print(
                "MAIN BOT ERROR:",
                error,
                flush=True
            )

            time.sleep(5)


# ==============================
# Run
# ==============================

if __name__ == "__main__":

    main()
