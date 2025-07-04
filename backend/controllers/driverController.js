const redisClient = require('../redisClient');

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
    res.status(200).json({ message: `Location updated for driver ${driverId}` });
  } catch (err) {
    console.error(`Error updating location for driver ${driverId}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};