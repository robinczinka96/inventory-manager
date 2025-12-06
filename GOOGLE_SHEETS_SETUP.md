# Google Sheets Sync - Setup Guide

## 📋 Google Cloud Service Account Setup

A Google Sheets sync működéséhez egy **Service Account**-ra van szükség. Kövesd az alábbi lépéseket:

---

### 1. Google Cloud Console Megnyitása

Látogass el: **https://console.cloud.google.com**

---

### 2. Project Kiválasztása vagy Létrehozása

- Ha már van project: válaszd ki a dropdown-ból
- Ha nincs: **New Project** → Név: `StockMate Pro` → Create

---

### 3. Google Sheets API Engedélyezése

1. **APIs & Services** → **Library**
2. Keresés: `Google Sheets API`
3. Kattints rá → **Enable**

![Enable API](https://developers.google.com/static/sheets/api/images/enable-api.png)

---

### 4. Service Account Létrehozása

1. **IAM & Admin** → **Service Accounts**
2. **+ Create Service Account**
3. **Service account details**:
   - Name: `stockmate-pro-sync`
   - Description: `Service account for StockMate Pro Google Sheets integration`
   - Click **Create and Continue**
4. **Grant this service account access** (Optional):
   - Role: **Basic** → **Editor** (vagy skip)
   - Click **Continue**
5. **Grant users access** (Optional):
   - Skip → **Done**

---

### 5. JSON Key File Létrehozása

1. Service Accounts listában kattints a létrehozott `stockmate-pro-sync` névre
2. **Keys** tab → **Add Key** → **Create new key**
3. Key type: **JSON**
4. Click **Create**
5. **Letöltődik egy JSON file** (pl. `stockmate-pro-sync-abc123.json`)
6. **MENTSD EL BIZTONSÁGOSAN!** (Ne commitold Git-be!)

---

### 6. Service Account Email Másolása

A letöltött JSON file-ban található egy `client_email` mező:

```json
{
  "type": "service_account",
  "project_id": "stockmate-pro-...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "stockmate-pro-sync@stockmate-pro-....iam.gserviceaccount.com",
  ...
}
```

**Másold ki ezt az email címet!**

---

### 7. Google Sheets Megosztása

1. Nyisd meg a Google Sheets táblázatot:
   **https://docs.google.com/spreadsheets/d/1-WT1sfKybLs4BNEdp1zwJpQY19IKZ5dB6tWiXLF9zdo/edit**

2. **Share** gomb (jobb felső sarok)

3. **Add people and groups**:
   - Illeszd be a **service account email** címet (step 6)
   - Role: **Editor**
   - **UNCHECK** "Notify people" (nem kell email notification)
   - Click **Share**

![Share Sheet](https://support.google.com/a/answer/7677479?hl=en#share)

---

### 8. Render Environment Variables Beállítása

1. **Render Dashboard** → Backend service
2. **Environment** tab
3. **Add Environment Variable** (2 darab):

**Variable 1**:
- Key: `GOOGLE_SERVICE_ACCOUNT_JSON`
- Value: **Entire JSON file content** (copy-paste az egész JSON-t)

**Variable 2**:
- Key: `GOOGLE_SHEET_ID`
- Value: `1-WT1sfKybLs4BNEdp1zwJpQY19IKZ5dB6tWiXLF9zdo`

4. **Save Changes** → Backend redeploy-ol automatikusan

---

### 9. Sheet Header Ellenőrzése

A Google Sheets **első sora (Row 1)** KÖTELEZŐEN ez kell legyen:

```
Név | Vonalkód | Mennyiség | Beszerzési ár | Eladási ár | Raktár név
```

**Pontos egyezés szükséges!** (Case-sensitive)

**Data rows**: 2. sortól kezdődnek

---

## ✅ Ellenőrzés

Ha minden rendben:
- ✅ Service Account létrehozva
- ✅ JSON key letöltve
- ✅ Google Sheets megosztva a service account-nak (Editor)
- ✅ Render env variables beállítva
- ✅ Sheet header correct

**Most már működik a sync!** 🎉

---

## 🔒 Biztonság

> **SOHA NE COMMITOLD** a JSON key file-t Git-be!

- `.gitignore` tartalmazza: `*.json` (service accounts)
- Csak Render environment variables-ban tárolva
- Ha kompromittálódik: Google Cloud Console-ban revoke + új key

---

## 🆘 Hibaelhárítás

### "Permission denied"
→ Ellenőrizd: service account email **Editor** role a Sheet-en

### "Invalid credentials"
→ JSON content helyesen van-e másolva a Render env variable-ba

### "Sheet not found"
→ GOOGLE_SHEET_ID helyes? (csak az ID rész, nem a teljes URL)

### "API not enabled"
→ Google Sheets API enabled a Cloud Console-ban?
