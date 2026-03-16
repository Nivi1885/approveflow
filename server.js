const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Make app accessible to routes
app.set('app', app);

// Routes
app.use('/api/auth', require('./auth'));
app.use('/api/requests', require('./requests'));

// Serve frontend
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', message: 'ApproveFlow API Running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
