const express = require('express');
const router = express.Router();
const { get } = require('../config/database');

// @route   GET /api/public/discord
router.get('/discord', async (req, res) => {
  try {
    const settings = await get('SELECT discord_link FROM settings WHERE id = 1');
    res.status(200).json({ 
      success: true, 
      discord_link: settings?.discord_link || null 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching Discord link' });
  }
});

module.exports = router;
