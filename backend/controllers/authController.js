const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { run, get } = require('../config/database');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

exports.register = async (req, res) => {
  try {
    const { username, password, agreed_to_rules } = req.body;

    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Provide username and password' });
    if (!agreed_to_rules)
      return res.status(400).json({ success: false, message: 'You must agree to the rules' });
    if (username.length < 3 || username.length > 20)
      return res.status(400).json({ success: false, message: 'Username: 3-20 chars' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password: 6+ chars' });

    const existing = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing)
      return res.status(400).json({ success: false, message: 'Username taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (username, password, role, agreed_to_rules) VALUES (?, ?, "user", 1)',
      [username, hashedPassword]
    );

    const token = generateToken(result.lastID);

    res.status(201).json({
      success: true,
      message: 'Account created! Welcome to Golden Beacon Mall.',
      token,
      user: { id: result.lastID, username, role: 'user', is_banned: 0 }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Provide username and password' });

    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Check if user is banned
    if (user.is_banned) {
      const now = new Date();
      const banUntil = user.ban_until ? new Date(user.ban_until) : null;
      
      if (banUntil && now < banUntil) {
        return res.status(403).json({ 
          success: false, 
          message: `You are banned until ${banUntil.toLocaleDateString()}. Reason: ${user.ban_reason || 'No reason provided'}`,
          isBanned: true
        });
      } else if (!banUntil) {
        return res.status(403).json({ 
          success: false, 
          message: `You are permanently banned. Reason: ${user.ban_reason || 'No reason provided'}`,
          isBanned: true
        });
      } else {
        // Ban expired, unban the user
        await run('UPDATE users SET is_banned = 0, ban_reason = NULL, ban_until = NULL WHERE id = ?', [user.id]);
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user.id, username: user.username, role: user.role, is_banned: user.is_banned }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await get('SELECT id, username, role, is_banned FROM users WHERE id = ?', [req.user.id]);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
