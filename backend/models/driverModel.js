const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driverId: { type: String, required: true, unique: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  // Add more fields as needed (e.g., status, lastUpdated, etc.)
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema); 