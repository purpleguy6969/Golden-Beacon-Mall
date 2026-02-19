const express = require('express');
const router = express.Router();
const {
  createTicket,
  getMyTickets,
  getAllTickets,
  respondToTicket,
  closeTicket
} = require('../controllers/ticketController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/create', protect, createTicket);
router.get('/my-tickets', protect, getMyTickets);
router.get('/all', protect, adminOnly, getAllTickets);
router.post('/respond/:ticketId', protect, adminOnly, respondToTicket);
router.post('/close/:ticketId', protect, adminOnly, closeTicket);

module.exports = router;
