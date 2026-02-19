const bcrypt = require('bcrypt');
const { run, get, all, syncShops } = require('../config/database');

// @route   GET /api/admin/settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await get('SELECT * FROM settings WHERE id = 1');
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
};

// @route   PUT /api/admin/settings
exports.updateSettings = async (req, res) => {
  try {
    const { total_free_shops, total_paid_shops, paid_shop_buy_price, paid_shop_rent_monthly, discord_link } = req.body;

    if (total_free_shops !== undefined && (total_free_shops < 0 || total_free_shops > 500))
      return res.status(400).json({ success: false, message: 'Free shops: 0-500' });
    if (total_paid_shops !== undefined && (total_paid_shops < 0 || total_paid_shops > 500))
      return res.status(400).json({ success: false, message: 'Paid shops: 0-500' });
    if (paid_shop_buy_price !== undefined && paid_shop_buy_price < 0)
      return res.status(400).json({ success: false, message: 'Buy price cannot be negative' });
    if (paid_shop_rent_monthly !== undefined && paid_shop_rent_monthly < 0)
      return res.status(400).json({ success: false, message: 'Rent cannot be negative' });

    const updates = [];
    const values = [];
    if (total_free_shops !== undefined) { updates.push('total_free_shops = ?'); values.push(total_free_shops); }
    if (total_paid_shops !== undefined) { updates.push('total_paid_shops = ?'); values.push(total_paid_shops); }
    if (paid_shop_buy_price !== undefined) { updates.push('paid_shop_buy_price = ?'); values.push(paid_shop_buy_price); }
    if (paid_shop_rent_monthly !== undefined) { updates.push('paid_shop_rent_monthly = ?'); values.push(paid_shop_rent_monthly); }
    
    // Only add discord_link if the column exists (for backward compatibility)
    if (discord_link !== undefined) {
      try {
        const testCol = await get('SELECT discord_link FROM settings WHERE id = 1');
        if (testCol !== undefined) {
          updates.push('discord_link = ?');
          values.push(discord_link);
        }
      } catch (e) {
        // Column doesn't exist, skip it
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      console.log('Executing SQL:', `UPDATE settings SET ${updates.join(', ')} WHERE id = 1`);
      console.log('With values:', values);
      await run(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`, values);
    }

    if (total_free_shops !== undefined || total_paid_shops !== undefined) {
      console.log('Syncing shops...');
      await syncShops();
    }

    const updated = await get('SELECT * FROM settings WHERE id = 1');
    console.log('Settings updated successfully:', updated);
    res.status(200).json({ success: true, message: 'Settings updated!', settings: updated });
  } catch (error) {
    console.error('Settings error FULL:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: `Error updating settings: ${error.message}` });
  }
};

// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await all(`
      SELECT u.id, u.username, u.role, u.is_banned, u.ban_reason, u.ban_until, u.created_at, 
             s.shop_number, s.shop_type, s.ownership_type, s.minecraft_username
      FROM users u
      LEFT JOIN shops s ON s.claimed_by_user_id = u.id
      ORDER BY u.created_at DESC
    `);
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
};

// @route   GET /api/admin/dashboard-stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = (await get('SELECT COUNT(*) as count FROM users WHERE role = "user"')).count;
    const pendingRequests = (await get('SELECT COUNT(*) as count FROM shop_requests WHERE status = "pending"')).count;
    const pendingUnclaims = (await get('SELECT COUNT(*) as count FROM unclaim_requests WHERE status = "pending"')).count;
    const settings = await get('SELECT * FROM settings WHERE id = 1');
    const freeShops = await get('SELECT COUNT(*) as total, SUM(is_claimed) as claimed FROM shops WHERE shop_type = "free"');
    const paidShops = await get('SELECT COUNT(*) as total, SUM(is_claimed) as claimed FROM shops WHERE shop_type = "paid"');

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        pendingRequests,
        pendingUnclaims,
        freeShops: { total: freeShops.total, claimed: freeShops.claimed || 0, available: freeShops.total - (freeShops.claimed || 0) },
        paidShops: { total: paidShops.total, claimed: paidShops.claimed || 0, available: paidShops.total - (paidShops.claimed || 0) },
        prices: { buy: settings.paid_shop_buy_price, rent: settings.paid_shop_rent_monthly }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
};

// @route   GET /api/admin/shop-requests
exports.getShopRequests = async (req, res) => {
  try {
    const requests = await all(`
      SELECT sr.id, sr.minecraft_username, sr.ownership_type, sr.status, sr.requested_at, sr.processed_at,
             u.username, u.id as user_id,
             s.shop_number
      FROM shop_requests sr
      JOIN users u ON sr.user_id = u.id
      LEFT JOIN shops s ON sr.assigned_shop_id = s.id
      ORDER BY CASE WHEN sr.status = 'pending' THEN 0 ELSE 1 END, sr.requested_at DESC
    `);
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching requests' });
  }
};

// @route   GET /api/admin/unclaim-requests (NEW)
exports.getUnclaimRequests = async (req, res) => {
  try {
    const requests = await all(`
      SELECT ur.id, ur.user_id, ur.shop_id, ur.status, ur.requested_at,
             u.username,
             s.shop_number, s.shop_type, s.minecraft_username
      FROM unclaim_requests ur
      JOIN users u ON ur.user_id = u.id
      JOIN shops s ON ur.shop_id = s.id
      ORDER BY CASE WHEN ur.status = 'pending' THEN 0 ELSE 1 END, ur.requested_at DESC
    `);
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching unclaim requests' });
  }
};

// @route   POST /api/admin/approve-unclaim/:requestId (NEW)
exports.approveUnclaim = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await get('SELECT * FROM unclaim_requests WHERE id = ?', [requestId]);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request already processed' });

    const shop = await get('SELECT shop_number FROM shops WHERE id = ?', [request.shop_id]);

    await run('UPDATE shops SET is_claimed = 0, claimed_by_user_id = NULL, minecraft_username = NULL, claimed_at = NULL, ownership_type = NULL WHERE id = ?', [request.shop_id]);
    await run('UPDATE unclaim_requests SET status = "approved", processed_at = CURRENT_TIMESTAMP, processed_by_admin_id = ? WHERE id = ?', [req.user.id, requestId]);

    res.status(200).json({ success: true, message: `Shop #${shop.shop_number} unclaimed successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error approving unclaim' });
  }
};

// @route   POST /api/admin/reject-unclaim/:requestId (NEW)
exports.rejectUnclaim = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await get('SELECT * FROM unclaim_requests WHERE id = ?', [requestId]);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request already processed' });

    await run('UPDATE unclaim_requests SET status = "rejected", processed_at = CURRENT_TIMESTAMP, processed_by_admin_id = ? WHERE id = ?', [req.user.id, requestId]);

    res.status(200).json({ success: true, message: 'Unclaim request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting unclaim' });
  }
};

// @route   POST /api/admin/approve-request/:requestId
exports.approveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { shop_number } = req.body;

    const request = await get('SELECT * FROM shop_requests WHERE id = ?', [requestId]);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request already processed' });

    const existingShop = await get('SELECT id FROM shops WHERE claimed_by_user_id = ?', [request.user_id]);
    if (existingShop) {
      await run('UPDATE shop_requests SET status = "rejected", processed_at = CURRENT_TIMESTAMP, processed_by_admin_id = ? WHERE id = ?', [req.user.id, requestId]);
      return res.status(400).json({ success: false, message: 'User already has a shop!' });
    }

    let shop;
    if (shop_number) {
      shop = await get('SELECT id, shop_number, is_claimed FROM shops WHERE shop_number = ?', [shop_number]);
      if (!shop) return res.status(404).json({ success: false, message: 'Shop number not found' });
      if (shop.is_claimed) return res.status(400).json({ success: false, message: 'That shop is already claimed' });
    } else {
      shop = await get('SELECT id, shop_number FROM shops WHERE shop_type = "paid" AND is_claimed = 0 ORDER BY shop_number ASC LIMIT 1');
      if (!shop) return res.status(400).json({ success: false, message: 'No paid shops available!' });
    }

    const result = await run(
      'UPDATE shops SET is_claimed = 1, claimed_by_user_id = ?, minecraft_username = ?, claimed_at = CURRENT_TIMESTAMP, ownership_type = ? WHERE id = ? AND is_claimed = 0',
      [request.user_id, request.minecraft_username, request.ownership_type, shop.id]
    );

    if (result.changes === 0) {
      return res.status(400).json({ success: false, message: 'Failed to claim shop (might be taken)' });
    }

    await run(
      'UPDATE shop_requests SET status = "approved", processed_at = CURRENT_TIMESTAMP, processed_by_admin_id = ?, assigned_shop_id = ? WHERE id = ?',
      [req.user.id, shop.id, requestId]
    );

    res.status(200).json({ success: true, message: `Approved! Shop #${shop.shop_number} assigned.` });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ success: false, message: 'Error approving request' });
  }
};

// @route   POST /api/admin/reject-request/:requestId
exports.rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await get('SELECT * FROM shop_requests WHERE id = ?', [requestId]);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request already processed' });

    await run('UPDATE shop_requests SET status = "rejected", processed_at = CURRENT_TIMESTAMP, processed_by_admin_id = ? WHERE id = ?', [req.user.id, requestId]);

    res.status(200).json({ success: true, message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting request' });
  }
};

// @route   POST /api/admin/ban-user/:userId (NEW)
exports.banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ban_reason, ban_until } = req.body;

    if (!ban_reason) return res.status(400).json({ success: false, message: 'Ban reason is required' });

    const user = await get('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await run('UPDATE users SET is_banned = 1, ban_reason = ?, ban_until = ? WHERE id = ?', [ban_reason, ban_until || null, userId]);

    res.status(200).json({ success: true, message: `${user.username} has been banned` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error banning user' });
  }
};

// @route   POST /api/admin/unban-user/:userId (NEW)
exports.unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await get('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await run('UPDATE users SET is_banned = 0, ban_reason = NULL, ban_until = NULL WHERE id = ?', [userId]);

    res.status(200).json({ success: true, message: `${user.username} has been unbanned` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error unbanning user' });
  }
};

// @route   POST /api/admin/create-admin
exports.createAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Provide username and password' });
    if (username.length < 3 || username.length > 20)
      return res.status(400).json({ success: false, message: 'Username: 3-20 chars' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password: 6+ chars' });

    const existing = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ success: false, message: 'Username taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await run('INSERT INTO users (username, password, role) VALUES (?, ?, "admin")', [username, hashedPassword]);

    res.status(201).json({ success: true, message: `Admin "${username}" created!` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating admin' });
  }
};

// @route   POST /api/admin/reset-shops
exports.resetAllShops = async (req, res) => {
  try {
    await run('UPDATE shops SET is_claimed = 0, claimed_by_user_id = NULL, minecraft_username = NULL, claimed_at = NULL, ownership_type = NULL');
    await run('DELETE FROM shop_requests');
    await run('DELETE FROM unclaim_requests');
    res.status(200).json({ success: true, message: 'All shops reset!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error resetting shops' });
  }
};

// @route   POST /api/admin/unclaim-user-shop/:userId
exports.unclaimUserShop = async (req, res) => {
  try {
    const { userId } = req.params;
    const shop = await get('SELECT id, shop_number FROM shops WHERE claimed_by_user_id = ?', [userId]);
    if (!shop) return res.status(404).json({ success: false, message: 'User has no shop' });

    await run('UPDATE shops SET is_claimed = 0, claimed_by_user_id = NULL, minecraft_username = NULL, claimed_at = NULL, ownership_type = NULL WHERE id = ?', [shop.id]);

    res.status(200).json({ success: true, message: `Shop #${shop.shop_number} unclaimed` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error unclaiming shop' });
  }
};
