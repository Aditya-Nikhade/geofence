const mongoose = require('mongoose');

const driverBenchmarkSchema = new mongoose.Schema({
  driverId: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
});

driverBenchmarkSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('DriverBenchmark', driverBenchmarkSchema); 