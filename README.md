# Készletkezelő Webalkalmazás

iPad-optimalizált, modern készletkezelő rendszer Node.js backend-del és MongoDB adatbázissal.

## Funkciók

- 📦 **Termékek kezelése** - Vonalkóddal, névvel, mennyiséggel
- 🏭 **Raktárak kezelése** - Több raktár támogatása
- 📥 **Bevételezés** - Készlet növelés egyszerűen
- 💰 **Eladás** - Több tétel egy rendelésben
- ⚙️ **Gyártás** - Komponensekből késztermék előállítása
- 📊 **Riportok** - Részletes készlet, eladási és beszerzési riportok
- 🎨 **Modern UI** - Dark theme, glassmorphism, érintőbarát

## Telepítés

### Backend

```bash
cd server
npm install
```

Hozzon létre egy `.env` fájlt a `server` könyvtárban:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/inventory_manager
NODE_ENV=development
```

**MongoDB telepítése (ha nincs még):**
- macOS: `brew install mongodb-community`
- Vagy használjon MongoDB Atlas cloud szolgáltatást (ingyenes tier)

**MongoDB indítása (local):**
```bash
brew services start mongodb-community
```

**Backend indítása:**
```bash
npm run dev
```

### Frontend

A frontend egy egyszerű statikus alkalmazás. Nyissa meg az `index.html` fájlt böngészőben, vagy használjon egy egyszerű HTTP szervert:

```bash
# Python 3-mal
python3 -m http.server 8080

# Vagy Node.js http-server-rel
npx http-server -p 8080
```

Ezután nyissa meg: `http://localhost:8080`

## Használat

1. **Első indításkor**: Hozzon létre legalább egy raktárt
2. **Termékek hozzáadása**: Adjon hozzá termékeket vonalkóddal és árakkal
3. **Bevételezés**: Növelje a készletet
4. **Eladás**: Tegyen termékeket a kosárba és finalizálja az eladást
5. **Riportok**: Tekintse meg a készlet állapotát és az üzleti mutatókat

## Technológiák

**Backend:**
- Node.js
- Express.js
- MongoDB + Mongoose
- CORS

**Frontend:**
- Vanilla JavaScript (ES6 Modules)
- Modern CSS (Glassmorphism, Dark Theme)
- Responsive Design
- Inter Font

## API Endpoints

- `GET /api/products` - Összes termék
- `POST /api/products` - Új termék
- `GET /api/warehouses` - Összes raktár
- `POST /api/transactions/receive` - Bevételezés
- `POST /api/transactions/sale` - Eladás
- `POST /api/transactions/manufacture` - Gyártás
- `GET /api/reports/dashboard` - Dashboard KPI-ok
- `GET /api/reports/inventory` - Készlet riport
- `GET /api/reports/sales` - Eladási riport

## Fejlesztés

Backend hot-reload (nodemon):
```bash
cd server
npm run dev
```

## Workspace beállítás

Javasolt workspace beállítás a projekthez:
```bash
# Állítsa be ezt a könyvtárat workspace-ként a jobb munka érdekében
```

## Licenc

MIT
