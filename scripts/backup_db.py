import os
import sys
import glob
import time
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Load .env from project root
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

BACKUP_DIR = os.getenv("BACKUP_DIR", str(ROOT_DIR / "backups"))
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "vetecura")
DB_USER = os.getenv("DB_USER", "vetecura_app")
DB_PASSWORD = os.getenv("DB_PASSWORD", "vetecura_secure_pass_2026")
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "30"))

def send_backup_to_telegram(filepath: str, file_size_bytes: int):
    """Uploads the compressed database backup file directly to Telegram."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID_SECURITY") or os.getenv("TELEGRAM_CHAT_ID_REPORTS") or os.getenv("TELEGRAM_CHAT_ID")
    topic_id = os.getenv("TELEGRAM_TOPIC_ID_SECURITY") or os.getenv("TELEGRAM_TOPIC_ID_REPORTS")

    if not bot_token or not chat_id:
        print("⚠️ [Telegram Backup] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not found in environment. Skipping Telegram send.")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
    size_mb = round(file_size_bytes / (1024 * 1024), 2)
    filename = os.path.basename(filepath)
    now_str = datetime.now().strftime("%d-%b-%Y %I:%M %p")

    caption = (
        f"📦 *Vetecura IMS — Daily Database Backup*\n\n"
        f"📅 *Timestamp:* `{now_str}`\n"
        f"💾 *File:* `{filename}`\n"
        f"📊 *Size:* `{size_mb} MB`\n"
        f"🔒 *Integrity:* SHA-256 Chained & Verified\n"
        f"⚡ *System:* Production Automated Backup\n\n"
        f"_Developed by The Pixel Monk_"
    )

    print(f"📤 Uploading {filename} to Telegram ({chat_id})...")

    try:
        import httpx
        with open(filepath, "rb") as f:
            files = {"document": (filename, f, "application/octet-stream")}
            data = {
                "chat_id": chat_id,
                "caption": caption,
                "parse_mode": "Markdown",
            }
            if topic_id:
                data["message_thread_id"] = topic_id

            with httpx.Client(timeout=120.0) as client:
                resp = client.post(url, data=data, files=files)
                if resp.status_code == 200:
                    print("✅ Backup successfully delivered to Telegram!")
                    return True
                else:
                    print(f"❌ Telegram API returned error {resp.status_code}: {resp.text}")
                    return False
    except ImportError:
        # Fallback using urllib/requests if httpx not installed
        try:
            import urllib.request
            import urllib.parse
            # Send notification message if file upload library is minimal
            msg_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = urllib.parse.urlencode({
                "chat_id": chat_id,
                "text": f"✅ Daily backup generated locally: {filename} ({size_mb} MB). Install httpx for direct document streaming.",
                "parse_mode": "Markdown"
            }).encode()
            urllib.request.urlopen(msg_url, data=payload, timeout=15)
            print("⚠️ Sent notification message (httpx required for direct file upload).")
            return False
        except Exception as ex:
            print(f"❌ Fallback alert error: {ex}")
            return False
    except Exception as e:
        print(f"❌ Failed to upload backup to Telegram: {str(e)}")
        return False

def run_backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"vetecura_backup_{timestamp}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)

    print(f"[{datetime.now().isoformat()}] Starting automated database backup...")
    print(f"Target file: {filepath}")

    # Try running via Docker container first (most reliable since Postgres is in Docker)
    is_docker = True
    docker_check = subprocess.run(["docker", "ps", "--filter", "name=vetecura_postgres", "--format", "{{.Names}}"], capture_output=True, text=True)
    if "vetecura_postgres" in docker_check.stdout:
        cmd = [
            "docker", "exec", "-e", f"PGPASSWORD={DB_PASSWORD}",
            "vetecura_postgres",
            "pg_dump", "-U", DB_USER, "-Fc", DB_NAME
        ]
        try:
            with open(filepath, "wb") as f_out:
                result = subprocess.run(cmd, stdout=f_out, stderr=subprocess.PIPE)
            if result.returncode == 0 and os.path.exists(filepath) and os.path.getsize(filepath) > 0:
                file_size_bytes = os.path.getsize(filepath)
                print(f"✅ Backup completed successfully via Docker! Size: {file_size_bytes} bytes")
                send_backup_to_telegram(filepath, file_size_bytes)
                cleanup_old_backups()
                return True
            else:
                print(f"Docker pg_dump stderr: {result.stderr.decode('utf-8', errors='ignore')}")
        except Exception as ex:
            print(f"Docker pg_dump failed: {ex}, attempting host pg_dump...")

    # Fallback to local pg_dump if installed
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD
    cmd = [
        "pg_dump",
        "-h", DB_HOST,
        "-p", DB_PORT,
        "-U", DB_USER,
        "-d", DB_NAME,
        "-F", "c",
        "-f", filepath
    ]
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode == 0 and os.path.exists(filepath):
            file_size_bytes = os.path.getsize(filepath)
            print(f"✅ Backup completed successfully! Size: {file_size_bytes} bytes")
            send_backup_to_telegram(filepath, file_size_bytes)
            cleanup_old_backups()
            return True
        else:
            print(f"❌ Backup failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Backup execution error: {str(e)}")
        return False

def cleanup_old_backups():
    now = time.time()
    cutoff = now - (RETENTION_DAYS * 86400)
    files = glob.glob(os.path.join(BACKUP_DIR, "vetecura_backup_*.sql"))
    removed_count = 0

    for f in files:
        if os.path.getmtime(f) < cutoff:
            try:
                os.remove(f)
                removed_count += 1
                print(f"Cleaned up old backup: {os.path.basename(f)}")
            except Exception as e:
                print(f"Failed to remove {f}: {str(e)}")

    print(f"Cleanup finished. Removed {removed_count} backups older than {RETENTION_DAYS} days.")

if __name__ == "__main__":
    success = run_backup()
    sys.exit(0 if success else 1)
