const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
app.set('io', io); // Make io accessible in controllers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] New client connected: ${socket.id}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected (${socket.id}): ${reason}`);
  });

  socket.on('error', (err) => {
    console.error(`[Socket.IO] Error (${socket.id}):`, err);
  });

  // Log any custom events (e.g., 'geofenceAlert')
  socket.on('geofenceAlert', (data) => {
    console.log(`[Socket.IO] Received geofenceAlert:`, data);
  });
});
const driverRoutes = require('./routes/driverRoutes');
const geofenceRoutes = require('./routes/geofenceRoutes');
const benchmarkRoutes = require('./routes/benchmarkRoutes');
const simulator = require('./simulator');
const Driver = require('./models/driverModel');
app.use(cors());
app.use(express.json());
app.use('/api', driverRoutes);
app.use('/api', geofenceRoutes);
app.use('/api', benchmarkRoutes);
app.post('/api/simulate', async (req, res) => {
    const { city, coords } = req.body;
    try {
        // Remove all drivers from DB before simulating new city
        await Driver.deleteMany({});
        // You may want to clear previous drivers or zones here if needed
        await simulator.simulateCity(city, coords);
        res.json({ success: true });
    } catch (err) {
        console.error('Simulation error:', err);
        res.status(500).json({ error: 'Simulation failed' });
    }
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/geofence';
mongoose.connect(MONGO_URI);
mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});