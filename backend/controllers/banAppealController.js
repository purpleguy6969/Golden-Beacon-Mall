const { run, get, all } = require('../config/database');

// @route   POST /api/ban-appeals/create
exports.createBanAppeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appeal_text } = req.body;

    if (!appeal_text || appeal_text.length < 20) {
      return res.status(400).json({ success: false, message: 'Appeal must be at least 20 characters' });
    }

    if (appeal_text.length > 1000) {
      return res.status(400).json({ success: false, message: 'Appeal must be under 1000 characters' });
    }

    // Check if user is actually banned
    const user = await get('SELECT is_banned FROM users WHERE id = ?', [userId]);
    if (!user || !user.is_banned) {
      return res.status(400).json({ success: false, message: 'You are not banned' });
    }

    // Check for existing pending appeal
    const existingAppeal = await get('SELECT id FROM ban_appeals WHERE user_id = ? AND status = "pending"', [userId]);
    if (existingAppeal) {
      return res.status(400).json({ success: false, message: 'You already have a pending appeal' });
    }

    await run(
      'INSERT INTO ban_appeals (user_id, appeal_text, status) VALUES (?, ?, "pending")',
      [userId, appeal_text]
    );

    res.status(201).json({ success: true, message: 'Ban appeal submitted! An admin will review it.' });
  } catch (error) {
    console.error('Create ban appeal error:', error);
    res.status(500).json({ success: false, message: 'Error creating appeal' });
  }
};

// @route   GET /api/ban-appeals/my-appeals
exports.getMyAppeals = async (req, res) => {
  try {
    const userId = req.user.id;
    const appeals = await all(
      'SELECT * FROM ban_appeals WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.status(200).json({ success: true, appeals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching appeals' });
  }
};

// @route   GET /api/ban-appeals/all (Admin)
exports.getAllAppeals = async (req, res) => {
  try {
    const appeals = await all(`
      SELECT ba.*, u.username, u.ban_reason, u.ban_until
      FROM ban_appeals ba
      JOIN users u ON ba.user_id = u.id
      ORDER BY CASE WHEN ba.status = 'pending' THEN 0 ELSE 1 END, ba.created_at DESC
    `);
    res.status(200).json({ success: true, appeals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching appeals' });
  }
};

// @route   POST /api/ban-appeals/approve/:appealId (Admin)
exports.approveAppeal = async (req, res) => {
  try {
    const { appealId } = req.params;
    const { admin_response } = req.body;

    const appeal = await get('SELECT user_id FROM ban_appeals WHERE id = ?', [appealId]);
    if (!appeal) {
      return res.status(404).json({ success: false, message: 'Appeal not found' });
    }

    // Unban the user
    await run('UPDATE users SET is_banned = 0, ban_reason = NULL, ban_until = NULL WHERE id = ?', [appeal.user_id]);

    // Update appeal
    await run(
      'UPDATE ban_appeals SET status = "approved", admin_response = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [admin_response || 'Appeal approved', appealId]
    );

    res.status(200).json({ success: true, message: 'Appeal approved and user unbanned' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error approving appeal' });
  }
};

// @route   POST /api/ban-appeals/reject/:appealId (Admin)
exports.rejectAppeal = async (req, res) => {
  try {
    const { appealId } = req.params;
    const { admin_response } = req.body;

    await run(
      'UPDATE ban_appeals SET status = "rejected", admin_response = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [admin_response || 'Appeal rejected', appealId]
    );

    res.status(200).json({ success: true, message: 'Appeal rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting appeal' });
  }
};
