const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  action: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: String,
  comment: String,
  timestamp: { type: Date, default: Date.now }
});

const DocumentSchema = new mongoose.Schema({
  name: String,
  data: String, // base64
  uploadedBy: String,
  version: { type: Number, default: 1 },
  uploadedAt: { type: Date, default: Date.now }
});

const RequestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  requestType: { type: String, enum: ['Finance', 'IT', 'Procurement', 'Legal', 'HR'], required: true },
  status: {
    type: String,
    enum: ['Pending Review', 'Under Review', 'Needs Clarification', 'Approved L1', 'Pending Final', 'Approved', 'Rejected'],
    default: 'Pending Review'
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedByName: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  documents: [DocumentSchema],
  activity: [ActivitySchema],
  latestComment: String
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema);
