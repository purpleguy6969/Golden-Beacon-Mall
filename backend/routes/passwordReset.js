const express = require('express');
const router = express.Router();
const {
  requestPasswordReset,
  getAllResetRequests,
  approveReset,
  rejectReset
} = require('../controllers/passwordResetController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/request', requestPasswordReset);
router.get('/all', protect, adminOnly, getAllResetRequests);
router.post('/approve/:requestId', protect, adminOnly, approveReset);
router.post('/reject/:requestId', protect, adminOnly, rejectReset);

module.exports = router;
