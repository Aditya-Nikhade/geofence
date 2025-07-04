const redisClient = require('../redisClient');
const redisKey = 'driver_locations';

exports.getNearbyDrivers = async (req, res) => {
  const { longitude, latitude, radius } = req.query;

  if (!longitude || !latitude || !radius) {
    return res.status(400).json({ error: 'Missing required query parameters: longitude, latitude, radius' });
  }

  try {
    const drivers = await redisClient.geoRadius(
      redisKey,
      {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
      },
      parseFloat(radius),
      'm',
      {
        WITHDIST: true,
        WITHCOORD: true,
        COUNT: 50,
        SORT: 'ASC',
      }
    );

    // node-redis v4 returns an array of objects with key, distance, and coordinates
    const formattedDrivers = drivers.map(driver => ({
      driverId: driver.key,
      distance: driver.distance,
      coordinates: driver.coordinates,
    }));

    res.status(200).json(formattedDrivers);
  } catch (err) {
    console.error('Geofence controller error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};