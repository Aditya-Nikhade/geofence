const redisClient = require('../redisClient');
const redisKey = 'driver_locations';
const mongoose = require('mongoose');

// Zone model (reuse from alerter.js)
const Zone = require('../models/zoneModel');

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

exports.createZone = async (req, res) => {
  const { name, geojson, type } = req.body;
  if (!name || !geojson || geojson.type !== 'Polygon' || !geojson.coordinates) {
    return res.status(400).json({ error: 'Invalid zone data' });
  }
  try {
    const zone = new Zone({ name, geojson, type: type || 'Pickup' });
    await zone.save();
    res.status(201).json(zone);
  } catch (err) {
    console.error('Error creating zone:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.listZones = async (req, res) => {
  try {
    const zones = await Zone.find({});
    res.json(zones);
  } catch (err) {
    console.error('Error listing zones:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const deletedZone = await Zone.findByIdAndDelete(zoneId);
    if (!deletedZone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.status(200).json({ message: 'Zone deleted successfully' });
  } catch (err) {
    console.error('Error deleting zone:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};