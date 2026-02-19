const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbFolder = path.join(__dirname, '../database');
if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });

const DB_PATH = path.join(dbFolder, 'mall.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('Error opening database:', err.message);
});

db.run('PRAGMA foreign_keys = ON');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initializeDatabase() {
  console.log('Initializing database...');

  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_banned INTEGER DEFAULT 0,
      ban_reason TEXT DEFAULT NULL,
      ban_until DATETIME DEFAULT NULL,
      agreed_to_rules INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { await run('ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0'); } catch(e) {}
  try { await run('ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT NULL'); } catch(e) {}
  try { await run('ALTER TABLE users ADD COLUMN ban_until DATETIME DEFAULT NULL'); } catch(e) {}
  try { await run('ALTER TABLE users ADD COLUMN agreed_to_rules INTEGER DEFAULT 0'); } catch(e) {}

  // Shops table
  await run(`
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_number INTEGER UNIQUE NOT NULL,
      shop_type TEXT NOT NULL DEFAULT 'free',
      is_claimed INTEGER DEFAULT 0,
      claimed_by_user_id INTEGER DEFAULT NULL,
      minecraft_username TEXT DEFAULT NULL,
      claimed_at DATETIME DEFAULT NULL,
      ownership_type TEXT DEFAULT NULL,
      FOREIGN KEY (claimed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  try { await run('ALTER TABLE shops ADD COLUMN minecraft_username TEXT DEFAULT NULL'); } catch(e) {}
  try { await run('ALTER TABLE shops ADD COLUMN shop_type TEXT NOT NULL DEFAULT "free"'); } catch(e) {}
  try { await run('ALTER TABLE shops ADD COLUMN ownership_type TEXT DEFAULT NULL'); } catch(e) {}

  // Paid shop requests
  await run(`
    CREATE TABLE IF NOT EXISTS shop_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      minecraft_username TEXT NOT NULL,
      ownership_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME DEFAULT NULL,
      processed_by_admin_id INTEGER DEFAULT NULL,
      assigned_shop_id INTEGER DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_shop_id) REFERENCES shops(id) ON DELETE SET NULL
    )
  `);

  // Unclaim requests
  await run(`
    CREATE TABLE IF NOT EXISTS unclaim_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      shop_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME DEFAULT NULL,
      processed_by_admin_id INTEGER DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    )
  `);

  // Tickets table (NEW)
  await run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME DEFAULT NULL,
      admin_response TEXT DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Ban appeals table (NEW)
  await run(`
    CREATE TABLE IF NOT EXISTS ban_appeals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      appeal_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME DEFAULT NULL,
      admin_response TEXT DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Password reset requests (NEW)
  await run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      minecraft_username TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME DEFAULT NULL,
      reset_code TEXT DEFAULT NULL
    )
  `);

  // Settings
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_free_shops INTEGER NOT NULL DEFAULT 30,
      total_paid_shops INTEGER NOT NULL DEFAULT 20,
      paid_shop_buy_price INTEGER NOT NULL DEFAULT 5000,
      paid_shop_rent_monthly INTEGER NOT NULL DEFAULT 1000,
      discord_link TEXT DEFAULT 'https://discord.gg/yourserver',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { await run('ALTER TABLE settings ADD COLUMN discord_link TEXT DEFAULT "https://discord.gg/yourserver"'); } catch(e) {}

  const settings = await get('SELECT * FROM settings WHERE id = 1');
  if (!settings) {
    await run('INSERT INTO settings (id, total_free_shops, total_paid_shops, paid_shop_buy_price, paid_shop_rent_monthly) VALUES (1, 30, 20, 5000, 1000)');
    console.log('Default settings: 30 free shops, 20 paid shops');
  }

  console.log('Database initialized successfully!');
}

async function syncShops() {
  const settings = await get('SELECT total_free_shops, total_paid_shops FROM settings WHERE id = 1');
  
  const freeCount = (await get('SELECT COUNT(*) as count FROM shops WHERE shop_type = "free"')).count;
  if (freeCount < settings.total_free_shops) {
    const existing = await all('SELECT shop_number FROM shops WHERE shop_type = "free" ORDER BY shop_number');
    const existingNums = new Set(existing.map(s => s.shop_number));
    let added = 0;
    for (let i = 1; i <= 1000 && added < (settings.total_free_shops - freeCount); i++) {
      if (!existingNums.has(i)) {
        await run('INSERT INTO shops (shop_number, shop_type, is_claimed) VALUES (?, "free", 0)', [i]);
        added++;
      }
    }
    console.log(`Added ${added} free shops`);
  } else if (freeCount > settings.total_free_shops) {
    const toDelete = freeCount - settings.total_free_shops;
    // Get IDs of unclaimed free shops to delete
    const shopsToDelete = await all('SELECT id FROM shops WHERE shop_type = "free" AND is_claimed = 0 ORDER BY shop_number DESC LIMIT ' + toDelete);
    for (const shop of shopsToDelete) {
      await run('DELETE FROM shops WHERE id = ?', [shop.id]);
    }
    console.log(`Removed ${shopsToDelete.length} free shops`);
  }

  const paidCount = (await get('SELECT COUNT(*) as count FROM shops WHERE shop_type = "paid"')).count;
  if (paidCount < settings.total_paid_shops) {
    const existing = await all('SELECT shop_number FROM shops ORDER BY shop_number DESC');
    const maxNum = existing.length > 0 ? existing[0].shop_number : 0;
    let added = 0;
    for (let i = maxNum + 1; added < (settings.total_paid_shops - paidCount); i++) {
      await run('INSERT INTO shops (shop_number, shop_type, is_claimed) VALUES (?, "paid", 0)', [i]);
      added++;
    }
    console.log(`Added ${added} paid shops`);
  } else if (paidCount > settings.total_paid_shops) {
    const toDelete = paidCount - settings.total_paid_shops;
    // Get IDs of unclaimed paid shops to delete
    const shopsToDelete = await all('SELECT id FROM shops WHERE shop_type = "paid" AND is_claimed = 0 ORDER BY shop_number DESC LIMIT ' + toDelete);
    for (const shop of shopsToDelete) {
      await run('DELETE FROM shops WHERE id = ?', [shop.id]);
    }
    console.log(`Removed ${shopsToDelete.length} paid shops`);
  }
}

module.exports = { db, run, get, all, initializeDatabase, syncShops };
