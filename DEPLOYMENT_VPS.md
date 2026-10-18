# Vetecura IMS — Ubuntu 24.04 VPS Deployment Guide (ThePixelMonk)

या गाईडचा वापर करून तुम्ही तुमच्या **Iotamine Ubuntu 24.04 VPS (IP: 203.174.22.86)** वर आधीच्या २ प्रोजेक्ट्सना धक्का न लावता Vetecura IMS सहज सुरू करू शकता.

---

## १. सर्व्हरवर लॉगिन करा (SSH Login)
तुमच्या कॉम्प्युटरच्या Terminal / PowerShell मध्ये खालील कमांड टाका:
```bash
ssh root@203.174.22.86
```
*(पासवर्ड विचारल्यावर तुमच्या सर्व्हरचा root पासवर्ड टाका)*

---

## २. सर्व्हरवर प्रोजेक्ट फोल्डर तयार करा आणि कोड आणा
सर्व्हरवर `vetecura` डिरेक्टरी तयार करा:
```bash
mkdir -p /var/www/vetecura
cd /var/www/vetecura
```

जर तुम्ही GitHub वर कोड टाकला असेल तर थेट क्लोन करू शकता:
```bash
git clone <YOUR_GITHUB_REPO_URL> .
```
*(किंवा तुमच्या कॉम्प्युटरवरून SCP / FileZilla द्वारे फाइल्स अपलोड करू शकता)*

---

## ३. `.env` फाइल तयार करा
प्रोजेक्ट फोल्डरमध्ये `.env` फाइल तयार करा:
```bash
nano .env
```
त्यामध्ये खालील गोष्टी पेस्ट करा आणि सेव्ह करा (`Ctrl + O`, `Enter`, `Ctrl + X`):
```ini
POSTGRES_DB=vetecura
POSTGRES_USER=vetecura_app
DB_PASSWORD=vetecura_secure_prod_pass_2026
SECRET_KEY=vetecura_super_secret_jwt_key_2026_thepixelmonk

# Telegram Settings
TELEGRAM_BOT_TOKEN="8688187742:AAG6aq-umUJpuQ6lS-IP3s11ENWPnWOrpy4"
TELEGRAM_CHAT_ID_OPERATIONS="-5484338930"
TELEGRAM_CHAT_ID_ALERTS="-5136252998"
TELEGRAM_CHAT_ID_SECURITY="-5507131939"
TELEGRAM_CHAT_ID="-5507131939"
```

---

## ४. डॉकर कंटेनर्स सुरू करा (Single Command Deployment)
आता फक्त ही एकच कमांड द्या:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**काय होईल?**
- Postgres 15, Redis 7, FastAPI Backend, Next.js Web Admin, Mobile PWA Scanner आणि Telegram Worker बॅकग्राऊंडमध्ये सुरक्षितपणे सुरू होतील.
- आधीच्या २ प्रोजेक्ट्सच्या कोणत्याही पोर्टला (Port 80/443) हात न लावता हे **पोर्ट 8080** वर चालेल.

---

## ५. सुरुवातीचा डेटाबेस सीड करा (Seed Initial Users & Racks)
सिस्टीम पहिल्यांदा सुरू झाल्यावर डीफॉल्ट ऑपरेटर खाती तयार करण्यासाठी ही कमांड चालवा:
```bash
docker exec -it vetecura_backend python -m src.db.seed
```

---

## ६. सिस्टीम उघडा (Access Your Live System)
आता तुमच्या ब्राउझरमध्ये थेट खालील लिंक उघडा:
- **Web Admin Dashboard:** `http://203.174.22.86:8080/`
- **Mobile PWA Scanner:** `http://203.174.22.86:8080/pwa/`
- **API Swagger Documentation:** `http://203.174.22.86:8080/docs`

---

## ७. डेली बॅकअपचा क्रॉन जॉब (Daily Telegram Backup Cron)
दररोज रात्री १२:०० वाजता संपूर्ण डेटाबेसचा बॅकअप टेलिग्रामवर आपोआप येण्यासाठी सर्व्हरवर क्रॉन सेट करा:
```bash
crontab -e
```
खालील ओळ जोडा:
```bash
0 0 * * * cd /var/www/vetecura && docker exec -t vetecura_backend python scripts/backup_db.py >> /var/log/vetecura_backup.log 2>&1
```

---
*Developed & Deployed by The Pixel Monk*
