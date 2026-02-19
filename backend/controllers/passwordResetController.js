const bcrypt = require('bcrypt');
const { run, get, all } = require('../config/database');

// @route   POST /api/password-reset/request
exports.requestPasswordReset = async (req, res) => {
  try {
    const { username, minecraft_username } = req.body;

    if (!username || !minecraft_username) {
      return res.status(400).json({ success: false, message: 'Username and Minecraft username are required' });
    }

    // Check if user exists
    const user = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check for existing pending request
    const existingRequest = await get(
      'SELECT id FROM password_resets WHERE username = ? AND status = "pending"',
      [username]
    );
    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'You already have a pending reset request' });
    }

    await run(
      'INSERT INTO password_resets (username, minecraft_username, status) VALUES (?, ?, "pending")',
      [username, minecraft_username]
    );

    res.status(201).json({
      success: true,
      message: 'Password reset requested! Go to the Minecraft server and talk to an admin to verify your identity.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ success: false, message: 'Error requesting password reset' });
  }
};

// @route   GET /api/password-reset/all (Admin)
exports.getAllResetRequests = async (req, res) => {
  try {
    const requests = await all(`
      SELECT * FROM password_resets
      ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, requested_at DESC
    `);
    res.status(200).json({ success: false, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching reset requests' });
  }
};

// @route   POST /api/password-reset/approve/:requestId (Admin)
exports.approveReset = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const request = await get('SELECT * FROM password_resets WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    // Update user password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await run('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, request.username]);

    // Mark request as approved
    await run(
      'UPDATE password_resets SET status = "approved", processed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [requestId]
    );

    res.status(200).json({
      success: true,
      message: `Password reset for ${request.username}. New password: ${new_password}`
    });
  } catch (error) {
    console.error('Approve reset error:', error);
    res.status(500).json({ success: false, message: 'Error approving reset' });
  }
};

// @route   POST /api/password-reset/reject/:requestId (Admin)
exports.rejectReset = async (req, res) => {
  try {
    const { requestId } = req.params;

    await run(
      'UPDATE password_resets SET status = "rejected", processed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [requestId]
    );

    res.status(200).json({ success: true, message: 'Reset request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting reset' });
  }
};
