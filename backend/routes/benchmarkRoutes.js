const express = require('express');
const router = express.Router();
const benchmarkController = require('../controllers/benchmarkController');

router.get('/benchmark', benchmarkController.runBenchmark);

module.exports = router; 