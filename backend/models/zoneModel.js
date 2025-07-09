const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['No Entry', 'Pickup', 'Dropoff'], default: 'Pickup' },
  geojson: {
    type: { type: String, enum: ['Polygon'], required: true },
    coordinates: { type: [[[Number]]], required: true }, // [lng, lat]
  },
});

module.exports = mongoose.model('Zone', zoneSchema); 