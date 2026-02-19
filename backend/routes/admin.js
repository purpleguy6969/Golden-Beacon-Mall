const express = require('express');
const router = express.Router();
const {
  getSettings, updateSettings, getAllUsers, getDashboardStats, createAdmin,
  resetAllShops, unclaimUserShop, getShopRequests, approveRequest, rejectRequest,
  getUnclaimRequests, approveUnclaim, rejectUnclaim, banUser, unbanUser
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/users', getAllUsers);
router.get('/dashboard-stats', getDashboardStats);
router.get('/shop-requests', getShopRequests);
router.get('/unclaim-requests', getUnclaimRequests);
router.post('/approve-request/:requestId', approveRequest);
router.post('/reject-request/:requestId', rejectRequest);
router.post('/approve-unclaim/:requestId', approveUnclaim);
router.post('/reject-unclaim/:requestId', rejectUnclaim);
router.post('/ban-user/:userId', banUser);
router.post('/unban-user/:userId', unbanUser);
router.post('/create-admin', createAdmin);
router.post('/reset-shops', resetAllShops);
router.post('/unclaim-user-shop/:userId', unclaimUserShop);

module.exports = router;
