# 🚀 Render.com Backend Deploy (Alternatíva)

Ha a Railway továbbra sem működik, próbáljuk Render.com-ot - **sokkal egyszerűbb!**

## Render.com Setup Lépések

### 1. Regisztráció
1. Menj: https://render.com
2. **Sign Up** → Login GitHub-bal
3. Engedélyezd a hozzáférést

### 2. Új Web Service Létrehozása

1. Dashboard → **New +** gomb → **Web Service**
2. **Connect a repository** → Válaszd ki: `inventory-manager`
3. Render megmutat egy setup form-ot

### 3. Service Konfiguráció

Töltsd ki ezeket a mezőket:

- **Name**: `inventory-manager-backend`
- **Region**: Frankfurt (vagy legközelebbi)
- **Branch**: `main`
- **Root Directory**: `server` ⭐ **KRITIKUS!**
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: `Free` (ingyenes!)

### 4. Environment Variables

Görgess le az **Environment Variables** szekcióhoz:

Kattints **Add Environment Variable** és add hozzá:

```
NODE_ENV=production
```

Most **NE** add hozzá a MongoDB URI-t még! Először MongoDB kell.

### 5. MongoDB Hozzáadása (MongoDB Atlas - Ingyenes!)

**Opció A: Render MongoDB (egyszerűbb, de hamarabb kifogy az ingyenes tier)**

1. Render dashboard → **New +** → **PostgreSQL** ❌ NEM!
2. Sajnos Render csak PostgreSQL-t ad ingyen... ➡️ Használjunk MongoDB Atlas-t!

**Opció B: MongoDB Atlas (AJÁNLOTT - Mindig Ingyenes!)**

1. Menj: https://www.mongodb.com/cloud/atlas/register
2. Sign up (email vagy Google)
3. **Create a Free Cluster**:
   - Cloud Provider: AWS vagy Google
   - Region: Frankfurt vagy legközelebbi
   - Cluster Tier: **M0 Sandbox (FREE)**
   - Cluster Name: `inventory-manager`
4. **Create Cluster**
5. **Database Access**:
   - Add New Database User
   - Username: `admin`
   - Password: Generálj erős jelszót (MENTSD EL!)
   - Built-in Role: **Atlas admin**
6. **Network Access**:
   - Add IP Address
   - Válaszd: **Allow Access from Anywhere** (0.0.0.0/0)
   - (Production-ban később specifikus IP-t állítunk be)
7. **Connect**:
   - Kattints: **Connect** a clusterednél
   - **Drivers** → **Node.js**
   - Másold ki a connection string-et:
     ```
     mongodb+srv://admin:<password>@inventory-manager.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - **CSERÉLD KI** a `<password>` részt a valódi jelszavadra!

### 6. MongoDB URI Hozzáadása Render-hez

1. Menj vissza Render.com → Web Service → **Environment** tab
2. **Add Environment Variable**:
   - Key: `MONGODB_URI`
   - Value: `mongodb+srv://admin:JELSZAVAD@inventory-manager.xxxxx.mongodb.net/inventory_manager?retryWrites=true&w=majority`

### 7. Deploy Indítása

1. Kattints: **Create Web Service**
2. Render elkezdi a deployment-et
3. Várj 2-3 percet
4. Nézd a **Logs** tab-ot:
   - Keresd: `✅ Connected to MongoDB`
   - És: `🚀 Server running`

### 8. Backend URL Kimásolása

A deployment után:
1. Service áttekintő oldalán látod a domain-t:
   ```
   https://inventory-manager-backend.onrender.com
   ```
2. **Másold ki** és add meg nekem!

---

## ✅ Render Előnyei Railway-vel szemben:

- ✅ Egyszerűbb Root Directory beállítás
- ✅ Tisztább UI
- ✅ Megbízhatóbb ingyenes tier
- ✅ Jobb logok

## 💰 Költségek

- Render Web Service: **$0** (Free tier)
- MongoDB Atlas: **$0** (M0 Sandbox örökké ingyenes)
- **Összesen: $0/hó!** 🎉

---

**Próbáld Render.com-ot! Sokkal simábban fog menni!** 🚀

Vagy várj még 2-3 percet a Railway új deployre és nézd a logokat!
