import os
import json
import urllib.request
import urllib.parse
import urllib.error
import time


TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")

if not TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN is not set")


# =========================
# SETTINGS
# =========================

API = f"https://api.telegram.org/bot{TOKEN}"

BACKEND_URL = "https://afghanicoin.vercel.app"

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
# CREATE USER
# =========================

def create_user(telegram_id):

    try:

        url = (
            f"{BACKEND_URL}/api/user"
            f"?telegram_id="
            f"{urllib.parse.quote(str(telegram_id))}"
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

            print(
                "USER API RESULT:",
                result
            )

            return result

    except urllib.error.HTTPError as error:

        try:
            body = error.read().decode()
        except Exception:
            body = ""

        print(
            "CREATE USER HTTP ERROR:",
            error.code,
            body
        )

        return None

    except Exception as error:

        print(
            "CREATE USER ERROR:",
            error
        )

        return None


# =========================
# REFERRAL
# =========================

def register_referral(
    referrer_id,
    invited_id
):

    try:

        referrer_id = str(referrer_id).strip()
        invited_id = str(invited_id).strip()

        data = {
            "referrer_telegram_id": referrer_id,
            "invited_telegram_id": invited_id
        }

        body = json.dumps(
            data
        ).encode()

        url = (
            f"{BACKEND_URL}/api/invite"
        )

        print(
            "================================"
        )

        print(
            "REFERRAL REQUEST"
        )

        print(
            "Referrer:",
            referrer_id
        )

        print(
            "Invited:",
            invited_id
        )

        print(
            "URL:",
            url
        )

        print(
            "================================"
        )

        request = urllib.request.Request(
            url,
            data=body,
            headers={
                "Content-Type":
                    "application/json"
            },
            method="POST"
        )

        with urllib.request.urlopen(
            request,
            timeout=20
        ) as response:

            response_body = response.read().decode()

            result = json.loads(
                response_body
            )

            print(
                "REFERRAL API RESULT:",
                result
            )

            return result

    except urllib.error.HTTPError as error:

        try:
            error_body = error.read().decode()
        except Exception:
            error_body = ""

        print(
            "================================"
        )

        print(
            "REFERRAL HTTP ERROR"
        )

        print(
            "Status:",
            error.code
        )

        print(
            "Response:",
            error_body
        )

        print(
            "================================"
        )

        # تلاش برای برگرداندن JSON خطا
        try:
            return json.loads(error_body)
        except Exception:
            return {
                "success": False,
                "message": f"Referral HTTP error {error.code}",
                "error_body": error_body
            }

    except Exception as error:

        print(
            "REFERRAL ERROR:",
            error
        )

        return {
            "success": False,
            "message": str(error)
        }


# =========================
# WEB APP BUTTON
# =========================

def web_app_keyboard():

    return {

        "inline_keyboard": [

            [

                {
                    "text":
                        "🪙 ورود به Afghani Coin",

                    "web_app": {
                        "url":
                            WEB_APP_URL
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

    telegram_id = str(
        telegram_id
    ).strip()

    print(
        "================================"
    )

    print(
        "START COMMAND"
    )

    print(
        "Telegram ID:",
        telegram_id
    )

    print(
        "Original referral:",
        referral_code
    )

    print(
        "================================"
    )


    # =========================
    # CREATE USER
    # =========================

    create_user(
        telegram_id
    )


    # =========================
    # PROCESS REFERRAL
    # =========================

    referral_result = None

    if referral_code:

        referral_code = (
            str(referral_code)
            .strip()
        )

        # URL decode
        referral_code = urllib.parse.unquote(
            referral_code
        )

        print(
            "Referral code before cleanup:",
            referral_code
        )

        # حذف ref_
        if referral_code.lower().startswith(
            "ref_"
        ):

            referral_code = (
                referral_code[4:]
            )

        referral_code = (
            referral_code.strip()
        )

        print(
            "Referral ID after cleanup:",
            referral_code
        )


        # =========================
        # VALID REFERRAL
        # =========================

        if (
            referral_code
            and
            referral_code != telegram_id
        ):

            referral_result = register_referral(
                referral_code,
                telegram_id
            )

        else:

            print(
                "REFERRAL NOT PROCESSED:"
            )

            print(
                "Empty referral or self referral"
            )


    # =========================
    # WELCOME MESSAGE
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


    # =========================
    # REFERRAL RESULT
    # =========================

    if referral_result:

        print(
            "FINAL REFERRAL RESULT:",
            referral_result
        )

        if referral_result.get(
            "success"
        ):

            message_text += (

                "\n\n"
                "🎉 دعوت با موفقیت ثبت شد!\n"
                "🎁 پاداش ورود شما: 100 AFC"

            )

        elif referral_result.get(
            "already_invited"
        ):

            message_text += (

                "\n\n"
                "ℹ️ این حساب قبلاً "
                "با یک لینک دعوت ثبت شده است."

            )

        else:

            message_text += (

                "\n\n"
                "ℹ️ ثبت دعوت انجام نشد."

            )


    # =========================
    # SEND
    # =========================

    send_message(
        chat_id,
        message_text,
        web_app_keyboard()
    )


# =========================
# HANDLE TELEGRAM UPDATE
# =========================

def handle_update(update):

    message = update.get(
        "message"
    )

    if not message:

        return


    chat_id = (
        message
        .get("chat", {})
        .get("id")
    )

    if not chat_id:

        return


    telegram_user = (
        message
        .get("from", {})
    )

    telegram_id = (
        telegram_user
        .get("id")
    )

    if not telegram_id:

        return


    text = (
        message
        .get("text", "")
        .strip()
    )


    # =========================
    # /start
    # =========================

    if text.lower().startswith(
        "/start"
    ):

        parts = text.split()

        referral_code = None

        if len(parts) > 1:

            referral_code = parts[1]

        print(
            "START TEXT:",
            text
        )

        print(
            "START PARTS:",
            parts
        )

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

            "offset":
                offset,

            "timeout":
                25

        }

    )


# =========================
# MAIN BOT
# =========================

def main():

    offset = 0

    print(
        "================================"
    )

    print(
        "Afghani Coin Bot is running..."
    )

    print(
        "Backend:",
        BACKEND_URL
    )

    print(
        "================================"
    )


    while True:

        try:

            result = get_updates(
                offset
            )

            updates = (
                result
                .get("result", [])
            )


            for update in updates:

                offset = (
                    update["update_id"]
                    + 1
                )

                print(
                    "NEW TELEGRAM UPDATE:",
                    update
                )

                handle_update(
                    update
                )


        except Exception as error:

            print(
                "BOT ERROR:",
                error
            )

            time.sleep(5)


# =========================
# START
# =========================

if __name__ == "__main__":

    main()
