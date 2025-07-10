// /geofence/backend/alerter.js --- REVISED

require('dotenv').config();
const mongoose = require('mongoose');
// Import the new function from our revised redisClient
const { getRedisClient } = require('./redisClient');
const { io } = require('socket.io-client');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;

const Zone = require('./models/zoneModel');

const prevLocations = {};

// A central async function to manage the entire startup process
async function main() {
  console.log('Alerter service starting...');

  try {
    // --- 1. Connect to Redis and get the client ---
    const redisClient = await getRedisClient();
    console.log('✅ Alerter successfully connected to Redis.');

    // --- 2. Connect to MongoDB ---
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/geofence';
    await mongoose.connect(MONGO_URI);
    console.log('✅ Alerter successfully connected to MongoDB.');

    // --- 3. Connect to Socket.IO ---
    const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';
    const socket = io(SOCKET_URL);
    // We wrap the connection in a Promise to be able to 'await' it
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ Alerter successfully connected to Socket.IO server.');
        resolve();
      });
      socket.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err);
        reject(err);
      });
    });

    // --- All connections are ready, NOW we can start the main loop ---
    console.log('All systems go. Starting alerter loop.');
    setInterval(() => checkZones(redisClient, socket), 5000);

  } catch (error) {
    console.error('FATAL: Alerter failed to start due to a connection error:', error.message);
    process.exit(1); // Exit if critical connections fail
  }
}

// Pass the connected redisClient as an argument
async function getAllDriverLocations(redisClient) {
  // --- BUG FIX #1: Use redisClient directly, not redisClient.client ---
  const key = 'driver_locations';
  try {
    const results = await redisClient.geoSearch(key,
      { longitude: 78.48, latitude: 17.38 },
      { radius: 500, unit: 'km', RETURN: ['WITHCOORD'] }
    );
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

// Pass connected clients as arguments for clarity and testability
async function checkZones(redisClient, socket) {
  try {
    const drivers = await getAllDriverLocations(redisClient);
    const zones = await Zone.find({});

    if (drivers.length === 0 || zones.length === 0) return;

    for (const driver of drivers) {
      // ... (The rest of your checkZones logic remains the same) ...
      if (driver.longitude === null || driver.latitude === null) continue;
      const point = [driver.longitude, driver.latitude];
      for (const zone of zones) {
        const zoneId = zone._id.toString();
        if (!prevLocations[driver.driverId]) {
          prevLocations[driver.driverId] = {};
        }
        const wasInside = prevLocations[driver.driverId][zoneId] || false;
        const isInsideNow = booleanPointInPolygon(point, zone.geojson);
        if (!wasInside && isInsideNow) {
          console.log(`ALERT: Driver ${driver.driverId} ENTERED ${zone.name}`);
          socket.emit('geofenceAlert', {
            driverId: driver.driverId,
            zoneName: zone.name,
            status: 'entered',
            timestamp: new Date().toISOString(),
          });
        } else if (wasInside && !isInsideNow) {
          console.log(`ALERT: Driver ${driver.driverId} EXITED ${zone.name}`);
          socket.emit('geofenceAlert', {
            driverId: driver.driverId,
            zoneName: zone.name,
            status: 'exited',
            timestamp: new Date().toISOString(),
          });
        }
        prevLocations[driver.driverId][zoneId] = isInsideNow;
      }
    }
  } catch (err) {
    console.error('Alerter error during checkZones:', err);
  }
}

// --- Start the entire application by calling our main function ---
main();