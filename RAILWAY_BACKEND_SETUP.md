# 🚀 Backend Deploy Útmutató - Railway.app

## Gyors Backend Deploy Lépések

### 1️⃣ Railway Regisztráció

1. Menj: **https://railway.app**
2. Kattints: **Login with GitHub**
3. Engedélyezd a Railway hozzáférést

### 2️⃣ Új Projekt Létrehozása

1. Dashboard-on kattints: **New Project**
2. Válaszd: **Deploy from GitHub repo**
3. Keresd meg és válaszd ki: **inventory-manager** repository-t
4. Railway megkezdi a deploy-t, DE még konfigurálni kell!

### 3️⃣ Service Beállítások Módosítása

A deploy valószínűleg hibával fog leállni először, ez NORMÁLIS! Így javítsd:

#### A) Root Directory Beállítása

1. Kattints a deployolt service-re
2. Menj: **Settings** tab
3. Görgess le: **Service** section
4. **Root Directory** → Állítsd be: `server`
5. Kattints: **Save**

#### B) Build & Start Commands

Még mindig a Settings-ben:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- Ezeknek auto-detektálva kellene lenniük, de ellenőrizd!

### 4️⃣ MongoDB Hozzáadása

1. A projekt dashboard-on (nem a service-ben!) kattints: **New** gomb
2. Válaszd: **Database** → **Add MongoDB**
3. Railway automatikusan létrehoz egy MongoDB instance-t
4. **FONTOS**: Ezt a MongoDB-t fogja a backend használni

### 5️⃣ Environment Variables

A backend service-nél:

1. Kattints: **Variables** tab
2. Add hozzá ezeket:

```
NODE_ENV=production
PORT=3000
MONGODB_URI=${{MongoDB.MONGO_URL}}
```

**Fontos**: A `${{MongoDB.MONGO_URL}}` automatikusan behelyettesítődik a MongoDB connection string-gel!

Ha nem működik az auto-reference, akkor:
1. Menj a MongoDB service-hez
2. Kattints: **Variables** tab  
3. Másold ki a `MONGO_URL` értékét
4. Illeszd be a backend `MONGODB_URI` variable-hez

### 6️⃣ Backend Domain Generálása

1. Backend service → **Settings** tab
2. Görgess le: **Networking** section
3. Kattints: **Generate Domain**
4. Kapsz egy URL-t, például:
   ```
   inventory-manager-production-xxxx.up.railway.app
   ```
5. **MÁSOLD KI** ezt az URL-t! 📋

### 7️⃣ Re-deploy Triggerelése

1. Menj: **Deployments** tab
2. Ha nem indul automatikusan, kattints: **Deploy** → **Redeploy**
3. Nézd a logokat: várj amíg `✅ Connected to MongoDB` és `🚀 Server running` látható

---

## ✅ Backend URL Használata

Miután a backend sikeresen fut Railway-en:

### Az URL formátuma:
```
https://inventory-manager-production-xxxx.up.railway.app
```

### API endpoint példa:
```
https://inventory-manager-production-xxxx.up.railway.app/api/health
```

Ezt az URL-t fogod használni a frontend-ben!

---

## 🔧 Frontend Config Frissítése

Másold ki a Railway backend domain-t, és mondd meg nekem, én frissítem a kódot! 

Vagy manuálisan:

```javascript
// js/config.js - 7. sor
production: {
    API_URL: 'https://RAILWAY-BACKEND-URL/api'
    // Például: 'https://inventory-manager-production-xxxx.up.railway.app/api'
}
```

Majd push-old GitHub-ra:
```bash
git add js/config.js
git commit -m "Update production API URL"
git push
```

Vercel automatikusan redeploy-ol!

---

## ❓ Troubleshooting

### Build Fail: "Cannot find module"
- Ellenőrizd, hogy Root Directory = `server`
- package.json létezik a server könyvtárban?

### MongoDB Connection Error
- Environment variables helyesek?
- `MONGODB_URI` tartalmazza a MongoDB URL-t?

### 404 Not Found
- Start Command = `npm start`?
- server.js létezik?

### CORS Error a Frontend-ről
- A backend automatikusan engedi az összes origin-t (development-ben)
- Production-ben állítsuk be később specifikusan

---

## 💰 Költségek

Railway **$5 ingyenes credit havonta**:
- Backend: ~$3-5/hó
- MongoDB: ~$2-3/hó  
- **Összesen: $5-8/hó** (az első hónap ingyenes creditből megy!)

---

**Kérdés: Sikerült létrehozni a Railway projektet? Add meg a backend URL-t, és frissítem a kódot!** 🚀
