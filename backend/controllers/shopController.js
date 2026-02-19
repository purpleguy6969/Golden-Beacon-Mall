const { run, get, all } = require('../config/database');

// @route   GET /api/shops/stats
exports.getShopStats = async (req, res) => {
  try {
    const settings = await get('SELECT * FROM settings WHERE id = 1');
    const freeShops = await get('SELECT COUNT(*) as total, SUM(is_claimed) as claimed FROM shops WHERE shop_type = "free"');
    const paidShops = await get('SELECT COUNT(*) as total, SUM(is_claimed) as claimed FROM shops WHERE shop_type = "paid"');

    res.status(200).json({
      success: true,
      stats: {
        free: {
          total: freeShops.total,
          claimed: freeShops.claimed || 0,
          available: freeShops.total - (freeShops.claimed || 0)
        },
        paid: {
          total: paidShops.total,
          claimed: paidShops.claimed || 0,
          available: paidShops.total - (paidShops.claimed || 0),
          buyPrice: settings.paid_shop_buy_price,
          rentMonthly: settings.paid_shop_rent_monthly
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
};

// @route   POST /api/shops/claim-free (NOW REQUIRES MINECRAFT USERNAME)
exports.claimFreeShop = async (req, res) => {
  try {
    const userId = req.user.id;
    const { minecraft_username } = req.body;

    if (!minecraft_username || minecraft_username.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Minecraft username is required!' });
    }

    // Check user doesn't already have a shop
    const existingShop = await get('SELECT id FROM shops WHERE claimed_by_user_id = ?', [userId]);
    if (existingShop) {
      return res.status(400).json({ success: false, message: 'You already have a shop!' });
    }

    // Find lowest free shop
    const shop = await get('SELECT id, shop_number FROM shops WHERE shop_type = "free" AND is_claimed = 0 ORDER BY shop_number ASC LIMIT 1');
    if (!shop) {
      return res.status(400).json({ success: false, message: 'No free shops available right now!' });
    }

    const result = await run(
      'UPDATE shops SET is_claimed = 1, claimed_by_user_id = ?, minecraft_username = ?, claimed_at = CURRENT_TIMESTAMP, ownership_type = "free" WHERE id = ? AND is_claimed = 0',
      [userId, minecraft_username.trim(), shop.id]
    );

    if (result.changes === 0) {
      return res.status(400).json({ success: false, message: 'That shop was just taken! Try again.' });
    }

    res.status(200).json({
      success: true,
      message: `Successfully claimed Free Shop #${shop.shop_number}!`,
      shop: { id: shop.id, shop_number: shop.shop_number, type: 'free' }
    });
  } catch (error) {
    console.error('Claim free shop error:', error);
    res.status(500).json({ success: false, message: 'Error claiming shop' });
  }
};

// @route   POST /api/shops/request-paid
exports.requestPaidShop = async (req, res) => {
  try {
    const userId = req.user.id;
    const { minecraft_username, ownership_type } = req.body;

    if (!minecraft_username || !ownership_type) {
      return res.status(400).json({ success: false, message: 'Please provide Minecraft username and ownership type' });
    }

    if (!['buy', 'rent'].includes(ownership_type)) {
      return res.status(400).json({ success: false, message: 'Ownership type must be "buy" or "rent"' });
    }

    const existingShop = await get('SELECT id FROM shops WHERE claimed_by_user_id = ?', [userId]);
    if (existingShop) {
      return res.status(400).json({ success: false, message: 'You already have a shop!' });
    }

    const pendingRequest = await get('SELECT id FROM shop_requests WHERE user_id = ? AND status = "pending"', [userId]);
    if (pendingRequest) {
      return res.status(400).json({ success: false, message: 'You already have a pending request!' });
    }

    await run(
      'INSERT INTO shop_requests (user_id, minecraft_username, ownership_type, status) VALUES (?, ?, ?, "pending")',
      [userId, minecraft_username, ownership_type]
    );

    res.status(201).json({
      success: true,
      message: `Request submitted! An admin will review it soon. Ownership: ${ownership_type === 'buy' ? 'Purchase' : 'Monthly Rent'}`
    });
  } catch (error) {
    console.error('Request paid shop error:', error);
    res.status(500).json({ success: false, message: 'Error submitting request' });
  }
};

// @route   GET /api/shops/my-shop
exports.getMyShop = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await get(`
      SELECT s.id, s.shop_number, s.shop_type, s.ownership_type, s.minecraft_username, s.claimed_at
      FROM shops s
      WHERE s.claimed_by_user_id = ?
    `, [userId]);

    if (!shop) {
      const pendingReq = await get('SELECT id, ownership_type, requested_at FROM shop_requests WHERE user_id = ? AND status = "pending"', [userId]);
      const pendingUnclaim = await get('SELECT id, requested_at FROM unclaim_requests WHERE user_id = ? AND status = "pending"', [userId]);
      return res.status(200).json({ success: true, shop: null, pendingRequest: pendingReq || null, pendingUnclaim: pendingUnclaim || null });
    }

    const pendingUnclaim = await get('SELECT id, requested_at FROM unclaim_requests WHERE user_id = ? AND status = "pending"', [userId]);
    res.status(200).json({ success: true, shop, pendingRequest: null, pendingUnclaim: pendingUnclaim || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching your shop' });
  }
};

// @route   POST /api/shops/request-unclaim (NEW - request to leave shop)
exports.requestUnclaim = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await get('SELECT id, shop_number FROM shops WHERE claimed_by_user_id = ?', [userId]);

    if (!shop) {
      return res.status(400).json({ success: false, message: "You don't have a shop to leave" });
    }

    const pendingRequest = await get('SELECT id FROM unclaim_requests WHERE user_id = ? AND status = "pending"', [userId]);
    if (pendingRequest) {
      return res.status(400).json({ success: false, message: 'You already have a pending unclaim request!' });
    }

    await run(
      'INSERT INTO unclaim_requests (user_id, shop_id, status) VALUES (?, ?, "pending")',
      [userId, shop.id]
    );

    res.status(201).json({
      success: true,
      message: `Unclaim request submitted for Shop #${shop.shop_number}. Waiting for admin approval.`
    });
  } catch (error) {
    console.error('Request unclaim error:', error);
    res.status(500).json({ success: false, message: 'Error requesting unclaim' });
  }
};

// @route   GET /api/shops/all (Admin)
exports.getAllShops = async (req, res) => {
  try {
    const shops = await all(`
      SELECT s.id, s.shop_number, s.shop_type, s.is_claimed, s.ownership_type, s.minecraft_username, s.claimed_at, u.username as claimed_by
      FROM shops s
      LEFT JOIN users u ON s.claimed_by_user_id = u.id
      ORDER BY s.shop_number ASC
    `);
    res.status(200).json({ success: true, shops });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching shops' });
  }
};
