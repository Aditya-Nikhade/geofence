const redisClient = require('../redisClient');
const driverModel = require('../models/driverModel');

const redisKey = 'driver_locations';

exports.updateLocation = async (req, res) => {
  const { driverId } = req.params;
  const { longitude, latitude } = req.body;

  if (!longitude || !latitude) {
    return res.status(400).json({ error: 'Missing required body parameters: longitude, latitude' });
  }

  try {
    await redisClient.geoAdd(redisKey, {
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      member: driverId,
    });
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

exports.getDriver = (req, res) => {
  const { driverId } = req.params;
  const driver = driverModel.getDriver(driverId);
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  res.json(driver);
};

exports.setDriver = (req, res) => {
  const { driverId } = req.params;
  const { name, status } = req.body;
  if (!name || !status) {
    return res.status(400).json({ error: 'Missing required fields: name, status' });
  }
  const driver = driverModel.setDriver(driverId, { name, status });
  res.json(driver);
};

exports.listDrivers = (req, res) => {
  res.json(driverModel.listDrivers());
};