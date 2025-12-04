# 🚀 GitHub Push Útmutató

## Manual Push Lépések

Mivel a Git credentials nincs konfigurálva a rendszeren, kérlek kövesd ezeket a lépéseket:

### 1. Terminálban futtasd:

```bash
cd /Users/czinkarobin/.gemini/antigravity/scratch/inventory-manager

# Ellenőrizd a remote-ot
git remote -v

# Ha még nincs beállítva, add hozzá:
git remote add origin https://github.com/robinczinka96/inventory-manager.git

# Push GitHub-ra
git push -u origin main
```

### 2. GitHub Authentication

Amikor rákérdez a felhasználónévre és jelszóra:

- **Username**: `robinczinka96`
- **Password**: **NE** a GitHub jelszavadat add meg!
  
  Helyette használj **Personal Access Token**-t:

#### Personal Access Token Létrehozása:

1. GitHub-on menj: **Settings** (profil ikon → Settings)
2. Bal oldalt lent: **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token** → **Generate new token (classic)**
5. Note: `inventory-manager-deploy`
6. Scopes: pipáld be a **`repo`** checkbox-ot (teljes repo hozzáférés)
7. **Generate token**
8. **MÁSOLD KI ÉS MENTSD** a token-t (csak egyszer látható!)

#### Token Használata:

Amikor a terminal jelszót kér, **a tokent** illeszd be (nem a jelszót)!

### 3. Alternatíva: SSH Kulcs (Ajánlott hosszútávra)

Ha SSH kulcsot szeretnél használni:

```bash
# SSH kulcs generálása
ssh-keygen -t ed25519 -C "email@example.com"

# Nyilvános kulcs másolása
cat ~/.ssh/id_ed25519.pub

# Add hozzá GitHub-hoz:
# GitHub Settings → SSH and GPG keys → New SSH key
```

Majd módosítsd a remote-ot SSH-ra:
```bash
git remote set-url origin git@github.com:robinczinka96/inventory-manager.git
git push -u origin main
```

---

## ✅ Miután sikerült a push:

1. **Frissítsd a Railway projektet**:
   - Railway dashboard → Service
   - Redeploy vagy automatikusan újra deployol
   
2. **Ellenőrizd a `railway.json` hatását**:
   - Railway most a `server` könyvtárból fog buildeni és indítani
   
3. **Add meg a Railway backend URL-t** nekem, frissítem a `config.js`-t!

---

**Próbáld meg a push-t, és jelezd ha sikerült!** 🚀
