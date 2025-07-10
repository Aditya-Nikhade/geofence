const { getRedisClient } = require('../redisClient');
const Driver = require('../models/driverModel');
const DriverBenchmark = require('../models/driverBenchmarkModel');

const redisKey = 'driver_locations';

exports.updateLocation = async (req, res) => {
  const { driverId } = req.params;
  const { longitude, latitude } = req.body;

  if (!longitude || !latitude) {
    return res.status(400).json({ error: 'Missing required body parameters: longitude, latitude' });
  }

  try {
    const client = await getRedisClient();
    await client.geoAdd(
      'driver_locations',
      [{
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        member: driverId,
      }]
    );
    // Also update MongoDB benchmark collection
    await DriverBenchmark.findOneAndUpdate(
      { driverId },
      {
        driverId,
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      },
      { upsert: true, new: true }
    );
    // Update or create driver in main collection
    await Driver.findOneAndUpdate(
      { driverId },
      {
        driverId,
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
      },
      { upsert: true, new: true }
    );
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('driverUpdated', {
        driverId,
        location: {
          longitude: parseFloat(longitude),
          latitude: parseFloat(latitude),
        },
      });
    }
    res.status(200).json({ message: `Location updated for driver ${driverId}` });
  } catch (err) {
    console.error(`Error updating location for driver ${driverId}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDriver = async (req, res) => {
  const { driverId } = req.params;
  try {
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.setDriver = async (req, res) => {
  const { driverId } = req.params;
  const { name, status, longitude, latitude } = req.body;
  if (!longitude || !latitude) {
    return res.status(400).json({ error: 'Missing required fields: longitude, latitude' });
  }
  try {
    const driver = await Driver.findOneAndUpdate(
      { driverId },
      { driverId, longitude, latitude, name, status },
      { upsert: true, new: true }
    );
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.listDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};