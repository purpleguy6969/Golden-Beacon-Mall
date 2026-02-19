const { run, get, all } = require('../config/database');

// @route   POST /api/tickets/create
exports.createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    if (subject.length < 5 || subject.length > 100) {
      return res.status(400).json({ success: false, message: 'Subject must be 5-100 characters' });
    }

    if (message.length < 10 || message.length > 1000) {
      return res.status(400).json({ success: false, message: 'Message must be 10-1000 characters' });
    }

    await run(
      'INSERT INTO tickets (user_id, subject, message, status) VALUES (?, ?, ?, "open")',
      [userId, subject, message]
    );

    res.status(201).json({ success: true, message: 'Ticket created! An admin will respond soon.' });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ success: false, message: 'Error creating ticket' });
  }
};

// @route   GET /api/tickets/my-tickets
exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const tickets = await all(
      'SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching tickets' });
  }
};

// @route   GET /api/tickets/all (Admin)
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await all(`
      SELECT t.*, u.username
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      ORDER BY CASE WHEN t.status = 'open' THEN 0 ELSE 1 END, t.created_at DESC
    `);
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching tickets' });
  }
};

// @route   POST /api/tickets/respond/:ticketId (Admin)
exports.respondToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { response } = req.body;

    if (!response || response.length < 5) {
      return res.status(400).json({ success: false, message: 'Response must be at least 5 characters' });
    }

    const ticket = await get('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    await run(
      'UPDATE tickets SET admin_response = ?, status = "closed", closed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [response, ticketId]
    );

    res.status(200).json({ success: true, message: 'Response sent and ticket closed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error responding to ticket' });
  }
};

// @route   POST /api/tickets/close/:ticketId (Admin)
exports.closeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    await run('UPDATE tickets SET status = "closed", closed_at = CURRENT_TIMESTAMP WHERE id = ?', [ticketId]);
    res.status(200).json({ success: true, message: 'Ticket closed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error closing ticket' });
  }
};
