const express = require('express');
const router = express.Router();
const { updateLocation, getDriver, setDriver, listDrivers } = require('../controllers/driverController');

router.post('/drivers/:driverId/location', updateLocation);
// --- Driver metadata routes ---
router.get('/drivers/:driverId', getDriver);
router.post('/drivers/:driverId', setDriver);
router.get('/drivers', listDrivers);

module.exports = router;