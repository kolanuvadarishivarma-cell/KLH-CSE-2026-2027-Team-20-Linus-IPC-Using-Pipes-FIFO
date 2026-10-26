const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const demoRoutes = require('./routes/demo');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*', // Allow frontend development server
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  const binaryPath = path.resolve(__dirname, 'linux/copy_on_write');
  const binaryExists = fs.existsSync(binaryPath);
  const isLinux = os.platform() === 'linux';

  res.json({
    status: 'healthy',
    backend: 'connected',
    platform: os.platform(),
    isLinux,
    compilerAvailable: true,
    binaryCompiled: binaryExists,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Demo routes
app.use('/api/demo', demoRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Bind to localhost
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[COW Demonstrator Backend] Running on http://127.0.0.1:${PORT}`);
  console.log(`[Platform] ${os.platform()} (${os.type()} ${os.release()})`);
  console.log(`[C Binary] ${path.resolve(__dirname, 'linux/copy_on_write')}`);
});
