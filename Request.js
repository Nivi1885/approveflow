const express = require('express');
const router = express.Router();
const Request = require('./Request');
const { protect } = require('./auth');

const TYPE_GROUP = { Finance: 'B', IT: 'B', Procurement: 'B', Legal: 'C', HR: 'C' };

// GET /api/requests/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const role = req.user.role;
    let query = {};
    if (role === 'requester') query.submittedBy = req.user.id;
    else if (role === 'approver_b') query.l1ApproverGroup = 'B';
    else if (role === 'approver_c') query.l1ApproverGroup = 'C';

    const total = await Request.countDocuments(query);
    const pending = await Request.countDocuments({ ...query, status: { $nin: ['Approved', 'Rejected'] } });
    const approved = await Request.countDocuments({ ...query, status: 'Approved' });
    const rejected = await Request.countDocuments({ ...query, status: 'Rejected' });
    const byType = await Request.aggregate([{ $match: query }, { $group: { _id: '$type', count: { $sum: 1 } } }]);
    const byStatus = await Request.aggregate([{ $match: query }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({ total, pending, approved, rejected, byType, byStatus });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/requests
router.get('/', protect, async (req, res) => {
  try {
    const role = req.user.role;
    let query = {};
    if (role === 'requester') query.submittedBy = req.user.id;
    else if (role === 'approver_b') query.l1ApproverGroup = 'B';
    else if (role === 'approver_c') query.l1ApproverGroup = 'C';

    const requests = await Request.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/requests/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const r = await Request.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json(r);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/requests
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, requestType, attachedDoc } = req.body;
    if (!title || !description || !requestType) {
      return res.status(400).json({ message: 'Title, description and type required' });
    }
    const docs = attachedDoc ? [{ name: attachedDoc.name, data: attachedDoc.data, uploadedBy: req.user.name || 'User', version: 1 }] : [];
    const r = new Request({
      title,
      description,
      requestType,
      submittedBy: req.user.id,
      submittedByName: req.user.name || 'User',
      l1ApproverGroup: TYPE_GROUP[requestType] || 'B',
      status: 'Pending Review',
      documents: docs,
      history: [{ action: 'submitted', by: req.user.name || 'User', comment: 'Request submitted', date: new Date() }]
    });
    await r.save();
    res.status(201).json(r);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/requests/:id/action
router.post('/:id/action', protect, async (req, res) => {
  try {
    const { action, comment } = req.body;
    const r = await Request.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });

    const role = req.user.role;
    let newStatus;

    if (action === 'approve') {
      if (role === 'approver_b' || role === 'approver_c') newStatus = 'Approved L1';
      else if (role === 'approver_d') newStatus = 'Approved';
      else return res.status(403).json({ message: 'Not authorized' });
    } else if (action === 'reject') {
      newStatus = 'Rejected';
    } else if (action === 'clarify') {
      newStatus = 'Needs Clarification';
    } else if (action === 'resubmit') {
      newStatus = 'Pending Review';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    r.status = newStatus;
    r.history.push({ action, by: req.user.name || 'User', comment: comment || '', date: new Date() });
    await r.save();
    res.json(r);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
