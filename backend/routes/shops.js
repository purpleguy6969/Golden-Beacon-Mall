const express = require('express');
const router = express.Router();
const {
  getShopStats, claimFreeShop, requestPaidShop, getMyShop, requestUnclaim, getAllShops
} = require('../controllers/shopController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/stats', getShopStats);
router.get('/my-shop', protect, getMyShop);
router.post('/claim-free', protect, claimFreeShop);
router.post('/request-paid', protect, requestPaidShop);
router.post('/request-unclaim', protect, requestUnclaim);
router.get('/all', protect, adminOnly, getAllShops);

module.exports = router;
