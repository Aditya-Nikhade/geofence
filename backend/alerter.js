require('dotenv').config();
const mongoose = require('mongoose');
const redisClient = require('./redisClient');
const { io } = require('socket.io-client');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;

// --- MongoDB Setup ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/geofence';
mongoose.connect(MONGO_URI);
mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

// --- Zone Schema (GeoJSON Polygon) ---
const Zone = require('./models/zoneModel');

// --- Socket.IO Client ---
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL);
socket.on('connect', () => console.log('Alerter connected to Socket.IO server'));

// --- Previous driver locations (in-memory) ---
const prevLocations = {};

// --- FIX #1: Use GEOSEARCH to get all drivers efficiently ---
async function getAllDriverLocations() {
  const redis = redisClient.client; // Use the raw client from your wrapper
  const key = 'driver_locations';
  
  try {
    // Search a massive radius from a central point to get all drivers.
    // This is more efficient than zRange + geoPos loop.
    const results = await redis.geoSearch(key,
      { longitude: 78.48, latitude: 17.38 }, // A central point in your map area
      { radius: 500, unit: 'km', RETURN: ['WITHCOORD'] } // 500km radius should be enough
    );

    // The result is an array of objects: { member, coordinates: [lon, lat] }
    return results.map(item => ({
      driverId: item.member,
      longitude: item.coordinates[0],
      latitude: item.coordinates[1]
    }));
  } catch (err) {
    console.error("Error getting all driver locations from Redis:", err);
    return [];
  }
}

async function checkZones() {
  try {
    const drivers = await getAllDriverLocations();
    const zones = await Zone.find({});

    if (drivers.length === 0 || zones.length === 0) {
      // No need to process if there are no drivers or zones
      return;
    }

    for (const driver of drivers) {
      // Ensure we have a valid point for the driver
      if (driver.longitude === null || driver.latitude === null) continue;
      
      const point = [driver.longitude, driver.latitude];

      for (const zone of zones) {
        const zoneId = zone._id.toString();
        
        // --- FIX #2: Correct State Management Logic ---
        // Initialize state for the driver if it's the first time we've seen them
        if (!prevLocations[driver.driverId]) {
          prevLocations[driver.driverId] = {};
        }

        const wasInside = prevLocations[driver.driverId][zoneId] || false;
        const isInsideNow = booleanPointInPolygon(point, zone.geojson);

        if (!wasInside && isInsideNow) {
          // --- EVENT: Entered zone ---
          console.log(`ALERT: Driver ${driver.driverId} ENTERED ${zone.name}`);
          socket.emit('geofenceAlert', {
            driverId: driver.driverId,
            zoneName: zone.name,
            status: 'entered',
            timestamp: new Date().toISOString(),
          });
        } else if (wasInside && !isInsideNow) {
          // --- EVENT: Exited zone ---
          console.log(`ALERT: Driver ${driver.driverId} EXITED ${zone.name}`);
          socket.emit('geofenceAlert', {
            driverId: driver.driverId,
            zoneName: zone.name,
            status: 'exited',
            timestamp: new Date().toISOString(),
          });
        }

        // Update the driver's current state for this zone
        prevLocations[driver.driverId][zoneId] = isInsideNow;
      }
    }
  } catch (err) {
    console.error('Alerter error during checkZones:', err);
  }
}

// It's better to wait for connections to be ready before starting the interval
mongoose.connection.once('connected', () => {
  socket.once('connect', () => {
    console.log("Connections to MongoDB and Socket.IO are ready. Starting alerter loop.");
    setInterval(checkZones, 5000); // Check every 5 seconds
  });
});
