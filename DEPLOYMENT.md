# Deployment Útmutató - Készletkezelő App

Ez az útmutató végigvezet az alkalmazás szerverre való feltöltésén, hogy URL-ről elérhető legyen bárhonnan.

## 🎯 Ajánlott Módszer: Railway.app

**Miért Railway?**
- ✅ Ingyenes kezdéshez ($5 credit havonta)
- ✅ Automatikus MongoDB hosting
- ✅ Egyszerű deployment GitHub-ról
- ✅ Automatikus HTTPS
- ✅ Environment variables kezelés
- ✅ Egy helyen backend + adatbázis

---

## 📝 Railway.app Deployment Lépések

### 1. Előkészítés

#### a) Git Repository Létrehozása

Ha még nincs Git repo:

```bash
cd /Users/czinkarobin/.gemini/antigravity/scratch/inventory-manager

# Git inicializálás
git init

# .gitignore ellenőrzése (már létezik a server könyvtárban)
# Győződj meg, hogy tartalmazza:
# node_modules/
# .env

# Első commit
git add .
git commit -m "Initial commit - Inventory Manager App"
```

#### b) GitHub Repository Létrehozása

1. Menj a https://github.com és hozz létre új repository-t
2. Név: `inventory-manager`
3. Public vagy Private (választható)
4. **NE** add hozzá a README, .gitignore vagy licencet (már van)

```bash
# GitHub repo hozzáadása
git remote add origin https://github.com/FELHASZNALONEV/inventory-manager.git
git branch -M main
git push -u origin main
```

### 2. Railway Account és Projekt

1. **Regisztráció**: https://railway.app/ 
   - GitHub accounttal jelentkezz be
   
2. **Új Projekt létrehozása**:
   - "New Project" gomb
   - "Deploy from GitHub repo" kiválasztása
   - Válaszd ki: `inventory-manager` repository-t

### 3. MongoDB Hozzáadása

A Railway projektben:

1. **"New" gomb** → "Database" → **"MongoDB"**
2. Railway automatikusan létrehoz egy MongoDB instance-t
3. **Fontos**: Jegyezd fel a connection string-et (vagy Railway automatikusan beállítja)

### 4. Backend Service Konfigurálása

#### a) Railway-ben environment variables beállítása:

A backend service-nél kattints **"Variables"** tab-ra:

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=${{MongoDB.MONGO_URL}}  # Railway automatikusan beállítja
```

#### b) Start Command beállítása

Railway automatikusan felismeri a `package.json`-t, de ha kell manuálisan:
- **Root Directory**: `server`
- **Start Command**: `npm start`

#### c) Public Domain beállítása

1. Backend service-nél: **"Settings"** → **"Networking"**
2. **"Generate Domain"** → Kapsz egy URL-t, pl: `https://inventory-manager-backend.up.railway.app`
3. Ezt az URL-t használd majd a frontendben!

### 5. Frontend Deployment

A frontend statikus fájlokat is Railway-en vagy külön szolgáltatáson hosztolhatod.

#### Opció A: Railway-en (Ajánlott egyszerűségért)

1. **Új Service hozzáadása** ugyanabban a projektben
2. **GitHub repo** kiválasztása újra
3. **Root Directory**: `.` (gyökér)
4. **Build Command**: _hagyd üresen_
5. **Start Command**: 
   ```bash
   python3 -m http.server $PORT
   ```
   vagy Node.js-szel:
   ```bash
   npx http-server -p $PORT
   ```

#### Opció B: Vercel (Ingyenes, Korlátlan)

1. Menj: https://vercel.com
2. **Import Project** → GitHub repo
3. **Root Directory**: `.` (gyökér)
4. **Build Settings**: _None_ (statikus fájlok)
5. **Deploy** gomb

### 6. API URL Frissítése Frontend-ben

Frissítsd az `js/api.js` fájlt a Railway backend URL-lel:

```javascript
// js/api.js
const API_BASE_URL = 'https://BACKEND-DOMAIN.up.railway.app/api';
// Például: 'https://inventory-manager-backend.up.railway.app/api'
```

**Fontos**: Commitold és pushold ezt a változtatást GitHub-ra:
```bash
git add js/api.js
git commit -m "Update API URL for production"
git push
```

Railway automatikusan újra deployol!

### 7. CORS Beállítása Backend-en

A `server/server.js` fájlban frissítsd a CORS-t:

```javascript
// CORS konfiguráció production-höz
app.use(cors({
    origin: [
        'https://FRONTEND-DOMAIN.vercel.app',  // Ha Vercel-en van
        'https://FRONTEND-DOMAIN.up.railway.app',  // Ha Railway-en van
        'http://localhost:8080'  // Fejlesztéshez
    ],
    credentials: true
}));
```

Commitold és pushold:
```bash
git add server/server.js
git commit -m "Update CORS for production"
git push
```

---

## 🎉 Kész! Használat

Az alkalmazás elérhető:
- **Frontend**: `https://your-app.vercel.app` vagy `https://your-app.up.railway.app`
- **Backend API**: `https://your-backend.up.railway.app/api`

Nyisd meg iPaden a frontend URL-t! 📱

---

## 🔧 Alternatív Deployment Opciók

### Option 2: Render.com

**Backend:**
1. https://render.com → New → Web Service
2. Connect GitHub repo
3. Root Directory: `server`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Environment Variables → Add MongoDB URI

**Frontend:**
1. New → Static Site
2. Connect GitHub repo
3. Build Command: _none_
4. Publish Directory: `.`

### Option 3: Saját VPS (DigitalOcean, Linode)

Részletes VPS setup:

```bash
# 1. VPS-en (Ubuntu 22.04)
# SSH kapcsolódás
ssh root@your-vps-ip

# 2. Node.js telepítése
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. MongoDB telepítése
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# 4. Nginx telepítése
sudo apt-get install -y nginx

# 5. PM2 telepítése (Node.js process manager)
sudo npm install -g pm2

# 6. Alkalmazás feltöltése
cd /var/www
git clone https://github.com/FELHASZNALONEV/inventory-manager.git
cd inventory-manager/server
npm install

# 7. PM2-vel backend indítása
pm2 start server.js --name inventory-backend
pm2 startup
pm2 save

# 8. Nginx konfiguráció
sudo nano /etc/nginx/sites-available/inventory-manager
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/inventory-manager;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Nginx aktiválás
sudo ln -s /etc/nginx/sites-available/inventory-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL (HTTPS) certbot-tal
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔐 Biztonsági Javaslatok Production-höz

1. **Environment Variables**: Soha ne commitolj `.env` fájlt!
2. **MongoDB**: Használj erős jelszót
3. **CORS**: Csak engedélyezett origin-ek
4. **HTTPS**: Mindig használj SSL/TLS-t
5. **Rate Limiting**: Adj hozzá rate limiter middleware-t
6. **Input Validation**: Validáld az összes user input-ot

### Rate Limiting Hozzáadása (Opcionális)

```bash
cd server
npm install express-rate-limit
```

`server/server.js`:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 perc
    max: 100 // max 100 request
});

app.use('/api/', limiter);
```

---

## 📊 Monitoring és Logs

### Railway-en:
- **Deployments** tab → Logs megtekintése
- **Metrics** tab → CPU, RAM használat

### VPS-en:
```bash
# Backend logs
pm2 logs inventory-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

---

## ❓ Gyakori Problémák

### 1. MongoDB connection error
- Ellenőrizd a `MONGODB_URI` environment variable-t
- Győződj meg, hogy a MongoDB elérhető
- Railway-en: MongoDB service running?

### 2. CORS error
- Frissítsd a CORS origin-eket a backend-en
- Győződj meg, hogy a frontend URL szerepel

### 3. 404 Not Found (API)
- Ellenőrizd az API_BASE_URL-t a frontend-en
- Backend fut és elérhető?

### 4. Railway build fails
- Nézd meg a build logs-ot
- `package.json` meglétének ellenőrzése
- Node version kompatibilitás

---

## 🎯 Összefoglalás - Gyors Start Railway-el

```bash
# 1. GitHub repo
git init && git add . && git commit -m "Initial commit"
# Push to GitHub

# 2. Railway.app
# - New Project → Deploy from GitHub
# - Add MongoDB database
# - Set environment variables
# - Generate domain

# 3. Update frontend API URL
# js/api.js → Production backend URL

# 4. Push changes
git add . && git commit -m "Production config" && git push

# 5. Done! 🎉
```

**Költségbecslés Railway-en (2024):**
- **$0-5/hó** kis forgalom esetén (ingyenes credit fedezi)
- **$5-20/hó** közepes használatnál
- Csak a használt erőforrásért fizetsz

**Az alkalmazás azonnal elérhető lesz egy URL-ről iPadről, telefonról, bárhonnan! 🌍**
