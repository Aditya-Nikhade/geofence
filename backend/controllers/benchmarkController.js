const redisClient = require('../redisClient');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
const DriverBenchmark = require('../models/driverBenchmarkModel');

exports.runBenchmark = async (req, res) => {
    // Example values; you can make these configurable if needed
    const lat = 17.38;
    const lon = 78.48;
    const radius = 5000; // meters
    const count = 50;

    // --- Redis Benchmark ---
    const redisStartTime = performance.now();
    const redisClientInstance = await redisClient.getRedisClient();
    await redisClientInstance.geoSearch(
        'driver_locations',
        { longitude: lon, latitude: lat },
        { radius: radius, unit: 'm', COUNT: count, WITHCOORD: true }
    );
    const redisEndTime = performance.now();
    const redisDuration = (redisEndTime - redisStartTime).toFixed(2);

    // --- MongoDB Benchmark ---
    const mongoStartTime = performance.now();
    await DriverBenchmark.find({
        location: {
            $nearSphere: {
                $geometry: { type: "Point", coordinates: [lon, lat] },
                $maxDistance: radius
            }
        }
    }).limit(count);
    const mongoEndTime = performance.now();
    const mongoDuration = (mongoEndTime - mongoStartTime).toFixed(2);
    
    res.json({
        query: `Find ${count} drivers within ${radius/1000}km`,
        redisTime: parseFloat(redisDuration),
        mongoTime: parseFloat(mongoDuration)
    });
}; 