const express = require('express');
const router = express.Router();
const Request = require('./Request');
const auth = require('./auth');

// Get all requests (filtered by role)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'requester') query.submittedBy = req.user.id;
    const requests = await Request.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single request
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create request
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, requestType, document: docFile } = req.body;
    const docs = docFile ? [{ name: docFile.name, data: docFile.data, uploadedBy: req.user.name, version: 1 }] : [];
    const request = new Request({
      title, description, requestType,
      submittedBy: req.user.id,
      submittedByName: req.user.name,
      status: 'Pending Review',
      documents: docs,
      activity: [{ action: 'Submitted', performedByName: req.user.name, comment: 'Request submitted' }]
    });
    await request.save();
    const io = req.app.get('io');
    io.emit('requestUpdate', request);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Action: approve, reject, clarify
router.put('/:id/action', auth, async (req, res) => {
  try {
    const { action, comment, document } = req.body;
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    let newStatus = request.status;
    if (action === 'approve') {
      newStatus = request.status === 'Under Review' ? 'Approved L1' : 
                  request.status === 'Approved L1' ? 'Approved' : 'Pending Final';
    } else if (action === 'reject') {
      newStatus = 'Rejected';
    } else if (action === 'clarify') {
      newStatus = 'Needs Clarification';
    }

    request.status = newStatus;
    request.latestComment = comment || '';
    request.activity.push({ action, performedByName: req.user.name, comment: comment || '' });

    if (document) {
      const lastVersion = request.documents.length > 0 ? request.documents[request.documents.length - 1].version : 0;
      request.documents.push({ name: document.name, data: document.data, uploadedBy: req.user.name, version: lastVersion + 1 });
    }

    await request.save();
    const io = req.app.get('io');
    io.emit('requestUpdate', request);
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dashboard stats
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const total = await Request.countDocuments();
    const pending = await Request.countDocuments({ status: { $in: ['Pending Review', 'Under Review', 'Needs Clarification', 'Approved L1', 'Pending Final'] } });
    const approved = await Request.countDocuments({ status: 'Approved' });
    const rejected = await Request.countDocuments({ status: 'Rejected' });
    const byType = await Request.aggregate([{ $group: { _id: '$requestType', count: { $sum: 1 } } }]);
    const byStatus = await Request.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({ total, pending, approved, rejected, byType, byStatus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
