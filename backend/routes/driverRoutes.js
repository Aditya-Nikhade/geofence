const express = require('express');
const router = express.Router();
const { updateLocation } = require('../controllers/driverController');

router.post('/drivers/:driverId/location', updateLocation);

module.exports = router;