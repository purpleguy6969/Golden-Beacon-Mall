const bcrypt = require('bcrypt');
require('dotenv').config();
const { initializeDatabase, syncShops, get, run } = require('../config/database');

async function initialize() {
  try {
    console.log('\n=== Golden Beacon Mall - Database Setup ===\n');

    await initializeDatabase();

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await get('SELECT id FROM users WHERE username = ?', [adminUsername]);
    if (existing) {
      console.log('✓ Admin already exists');
    } else {
      const hashed = await bcrypt.hash(adminPassword, 10);
      await run('INSERT INTO users (username, password, role) VALUES (?, ?, "admin")', [adminUsername, hashed]);
      console.log('✓ Admin created!');
      console.log(`  Username: ${adminUsername}`);
      console.log(`  Password: ${adminPassword}`);
      console.log('  ⚠️  Change password in production!\n');
    }

    await syncShops();

    const settings = await get('SELECT * FROM settings WHERE id = 1');
    const freeShops = await get('SELECT COUNT(*) as total, SUM(is_claimed) as claimed FROM shops WHERE shop_type = "free"');
    const paidShops = await get('SELECT COUNT(*) as total, SUM(is_claimed) as claimed FROM shops WHERE shop_type = "paid"');
    const userCount = (await get('SELECT COUNT(*) as count FROM users')).count;

    console.log('\n=== Database Ready ===');
    console.log(`  Free Shops:  ${freeShops.total} (${(freeShops.claimed || 0)} claimed)`);
    console.log(`  Paid Shops:  ${paidShops.total} (${(paidShops.claimed || 0)} claimed)`);
    console.log(`  Buy Price:   ${settings.paid_shop_buy_price} $`);
    console.log(`  Rent/Month:  ${settings.paid_shop_rent_monthly} $`);
    console.log(`  Users:       ${userCount}`);
    console.log('\n✅ Setup complete! Run "npm start" to launch.\n');

    process.exit(0);
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  }
}

initialize();
