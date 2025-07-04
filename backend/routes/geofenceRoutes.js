const express = require('express');
const router = express.Router();
const { getNearbyDrivers } = require('../controllers/geofenceController');

router.get('/geofence', getNearbyDrivers);

module.exports = router;