// Simple in-memory driver store
const drivers = {};

function getDriver(driverId) {
  return drivers[driverId] || null;
}

function setDriver(driverId, data) {
  drivers[driverId] = { driverId, ...data };
  return drivers[driverId];
}

function listDrivers() {
  return Object.values(drivers);
}

module.exports = {
  getDriver,
  setDriver,
  listDrivers,
}; 