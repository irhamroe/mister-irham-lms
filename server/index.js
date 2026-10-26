const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const setupSocket = require('./socket');

// Routes
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const journalRoutes = require('./routes/journals');
const gradeRoutes = require('./routes/grades');
const assignmentRoutes = require('./routes/assignments');
const cbtRoutes = require('./routes/cbt');
const managementRoutes = require('./routes/management');
const questionBankRoutes = require('./routes/question_bank');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

setupSocket(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Attach io to request object if routes need to emit directly
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/cbt', cbtRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/management', managementRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'LMS Pintar & CBT Live Monitor',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal server: ' + err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 LMS Backend & CBT Live Monitor Server Ready!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`⚡ Socket.io real-time engine activated!`);
  console.log(`===============================================`);
});
