const express = require('express');
const router = express.Router();
const { getNearbyDrivers, createZone, listZones, deleteZone } = require('../controllers/geofenceController');

router.get('/geofence', getNearbyDrivers);
router.post('/zones', createZone);
router.get('/zones', listZones);
router.delete('/zones/:zoneId', deleteZone);


module.exports = router;