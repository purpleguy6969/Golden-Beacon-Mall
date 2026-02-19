const express = require('express');
const router = express.Router();
const {
  createBanAppeal,
  getMyAppeals,
  getAllAppeals,
  approveAppeal,
  rejectAppeal
} = require('../controllers/banAppealController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/create', protect, createBanAppeal);
router.get('/my-appeals', protect, getMyAppeals);
router.get('/all', protect, adminOnly, getAllAppeals);
router.post('/approve/:appealId', protect, adminOnly, approveAppeal);
router.post('/reject/:appealId', protect, adminOnly, rejectAppeal);

module.exports = router;
