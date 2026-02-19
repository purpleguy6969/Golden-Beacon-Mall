# Purple Ezzai Mall - Quick Start

## 🚀 Setup (3 steps)

### Step 1 - Open Command Prompt inside the `backend` folder
1. Open File Explorer
2. Go into the `purple-ezzai-mall` folder
3. Go into the `backend` folder
4. Click the address bar → type `cmd` → press Enter

### Step 2 - Install & Initialize
```
npm install
npm run init-db
```

### Step 3 - Start the server
```
npm start
```

### Step 4 - Open the website
Open `frontend/index.html` in your browser (just double-click it)

---

## 🔑 Default Login
- **Username:** admin
- **Password:** admin123

---

## ⚠️ If you get errors

**"ENOENT / package.json not found"**
→ You are in the wrong folder. Make sure you are inside the `backend` folder, not `purple-ezzai-mall`.

**"gyp ERR / Python not found"** (old version error)
→ This version is fixed. The old version used `better-sqlite3` which needs Python.
→ This new version uses `sqlite3` which works without Python!

---

## 📁 Folder Structure
```
purple-ezzai-mall/
├── backend/          ← Run npm commands HERE
│   ├── server.js
│   ├── package.json
│   ├── .env
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   └── scripts/
└── frontend/
    ├── index.html    ← Open this in your browser
    ├── styles.css
    └── app.js
```
