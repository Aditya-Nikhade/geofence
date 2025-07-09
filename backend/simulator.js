require('dotenv').config();
const ORS = require('openrouteservice-js');
const axios = require('axios');

const apiKey = process.env.ORS_API_KEY;
if (!apiKey) {
  throw new Error('ORS_API_KEY not set in environment variables');
}

const Directions = new ORS.Directions({ api_key: apiKey });

/**
 * Get a route between two coordinates using OpenRouteService Directions API
 * @param {[number, number]} start - [lon, lat] of start
 * @param {[number, number]} end - [lon, lat] of end
 * @returns {Promise<Array<[number, number]>>} - Array of [lon, lat] coordinates
 */
async function getRoute(start, end) {
  try {
    const result = await Directions.calculate({
      coordinates: [start, end],
      profile: 'driving-car',
      format: 'geojson',
    });
    // GeoJSON LineString coordinates
    return result.features[0].geometry.coordinates;
  } catch (error) {
    console.error('Error fetching route from ORS:', error.response?.data || error.message);
    return null;
  }
}

// --- Simulation Config ---
let NUM_DRIVERS = 7;
let UPDATE_INTERVAL_MS = 3000; // 3 seconds between location updates
let ROUTE_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes per new route per driver
let BOUNDING_BOX = {
  minLon: 77.55, maxLon: 77.65, // Example: Bangalore area
  minLat: 12.90, maxLat: 13.05
};
const BACKEND_URL = 'http://localhost:5000/api/drivers'; // Adjust if needed

// --- Utility Functions ---
function randomCoord() {
  const lon = Math.random() * (BOUNDING_BOX.maxLon - BOUNDING_BOX.minLon) + BOUNDING_BOX.minLon;
  const lat = Math.random() * (BOUNDING_BOX.maxLat - BOUNDING_BOX.minLat) + BOUNDING_BOX.minLat;
  return [lon, lat];
}

async function sendLocation(driverId, coord) {
  try {
    await axios.post(`${BACKEND_URL}/${driverId}/location`, {
      longitude: coord[0],
      latitude: coord[1],
    });
  } catch (err) {
    console.error(`Failed to send location for ${driverId}:`, err.message);
  }
}

// --- Driver Simulation ---
class SimDriver {
  constructor(id) {
    this.id = id;
    this.route = [];
    this.routeIdx = 0;
    this.lastRouteTime = 0;
    this.timer = null;
    this.running = false;
  }

  async start() {
    this.running = true;
    await this.pickNewRoute();
    this.timer = setInterval(() => this.step(), UPDATE_INTERVAL_MS);
  }

  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
  }

  async pickNewRoute() {
    let tries = 0;
    while (tries < 5) { // Try more times for better chance
      const start = randomCoord();
      const end = randomCoord();
      const route = await getRoute(start, end);
      if (route && Array.isArray(route) && route.length > 1) {
        this.route = route;
        this.routeIdx = 0;
        this.lastRouteTime = Date.now();
        return true;
      }
      tries++;
    }
    console.warn(`Driver ${this.id} could not find a valid route after ${tries} attempts. Will retry shortly.`);
    this.route = [];
    this.routeIdx = 0;
    return false;
  }

  async step() {
    if (!this.running) return;
    if (!this.route || this.route.length === 0) {
      // Try to pick a new route, but if it fails, wait and retry
      const gotRoute = await this.pickNewRoute();
      if (!gotRoute) {
        setTimeout(() => this.step(), 3000); // Wait 3s before retrying
      }
      return;
    }
    // Send current location
    const coord = this.route[this.routeIdx];
    if (!coord) {
      // Defensive: shouldn't happen, but just in case
      this.route = [];
      this.routeIdx = 0;
      return;
    }
    await sendLocation(this.id, coord);
    // Move to next point
    this.routeIdx++;
    if (this.routeIdx >= this.route.length) {
      // Route finished, pick a new one (staggered to avoid API burst)
      setTimeout(() => this.pickNewRoute(), Math.random() * 5000 + 1000);
      this.route = [];
      this.routeIdx = 0;
    }
    // Refresh route every ROUTE_REFRESH_INTERVAL
    if (Date.now() - this.lastRouteTime > ROUTE_REFRESH_INTERVAL) {
      await this.pickNewRoute();
    }
  }
}

// --- Main Simulation Loop ---
async function main() {
  const drivers = [];
  for (let i = 1; i <= NUM_DRIVERS; i++) {
    const driver = new SimDriver(`D-${i}`);
    drivers.push(driver);
    // Stagger start to avoid API burst
    setTimeout(() => driver.start(), i * 2000);
  }
  process.on('SIGINT', () => {
    drivers.forEach(d => d.stop());
    process.exit();
  });
}

if (require.main === module) {
  main();
}

// --- City Simulation API ---
let drivers = [];
function setBoundingBoxForCity(coords) {
  // 0.1 deg box around city center
  const delta = 0.05;
  BOUNDING_BOX = {
    minLon: coords.lng - delta,
    maxLon: coords.lng + delta,
    minLat: coords.lat - delta,
    maxLat: coords.lat + delta,
  };
}

async function simulateCity(city, coords) {
  setBoundingBoxForCity(coords);
  // Stop previous drivers
  if (drivers.length > 0) {
    drivers.forEach(d => d.stop());
    drivers = [];
  }
  // Start new drivers
  for (let i = 1; i <= NUM_DRIVERS; i++) {
    const driver = new SimDriver(`D-${city}-${i}`);
    drivers.push(driver);
    setTimeout(() => driver.start(), i * 2000);
  }
}

module.exports = {
  simulateCity,
}; 