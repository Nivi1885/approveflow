const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  action: String,
  by: String,
  comment: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

const documentSchema = new mongoose.Schema({
  name: String,
  data: String,
  uploadedBy: String,
  version: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now }
});

const requestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  requestType: { type: String, required: true, enum: ['Finance','IT','Procurement','Legal','HR'] },
  submittedBy: { type: String, required: true },
  submittedByName: { type: String, default: '' },
  l1ApproverGroup: { type: String, enum: ['B','C'], required: true },
  status: {
    type: String,
    default: 'Pending Review',
    enum: ['Pending Review','Under Review','Needs Clarification','Approved L1','Pending Final','Approved','Rejected']
  },
  documents: [documentSchema],
  history: [historySchema]
}, { timestamps: true });

requestSchema.pre('save', async function(next) {
  if (this.isNew && !this.requestId) {
    const count = await mongoose.model('Request').countDocuments();
    this.requestId = 'REQ-' + String(1001 + count).padStart(4, '0');
  }
  next();
});

module.exports = mongoose.model('Request', requestSchema);
