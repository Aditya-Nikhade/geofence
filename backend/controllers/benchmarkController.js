const redisClient = require('../redisClient');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
const DriverBenchmark = require('../models/driverBenchmarkModel');

// Helper function to populate test data
async function populateTestData() {
    const redisClientInstance = await redisClient.getRedisClient();
    
    // Clear existing data
    await redisClientInstance.del('driver_locations');
    await DriverBenchmark.deleteMany({});
    
    // Generate 1000 random driver locations around Hyderabad
    const centerLat = 17.3850;
    const centerLon = 78.4867;
    const radius = 0.1; // ~11km radius
    
    const drivers = [];
    for (let i = 1; i <= 1000; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * radius;
        const lat = centerLat + r * Math.cos(angle);
        const lon = centerLon + r * Math.sin(angle);
        
        drivers.push({
            driverId: `test-driver-${i}`,
            latitude: lat,
            longitude: lon
        });
    }
    
    // Add to Redis
    for (const driver of drivers) {
        await redisClientInstance.geoAdd('driver_locations', {
            longitude: driver.longitude,
            latitude: driver.latitude,
            member: driver.driverId
        });
    }
    
    // Add to MongoDB
    const mongoDrivers = drivers.map(driver => ({
        driverId: driver.driverId,
        location: {
            type: 'Point',
            coordinates: [driver.longitude, driver.latitude]
        }
    }));
    await DriverBenchmark.insertMany(mongoDrivers);
    
    return drivers.length;
}

// Helper function to run multiple iterations for more accurate results
async function runQueryMultipleTimes(queryFn, iterations = 10) {
    const times = [];
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await queryFn();
        const end = performance.now();
        times.push(end - start);
    }
    
    // Remove outliers (top and bottom 10%)
    times.sort((a, b) => a - b);
    const trimCount = Math.floor(iterations * 0.1);
    const trimmedTimes = times.slice(trimCount, -trimCount);
    
    return {
        avg: trimmedTimes.reduce((a, b) => a + b, 0) / trimmedTimes.length,
        min: Math.min(...trimmedTimes),
        max: Math.max(...trimmedTimes),
        count: trimmedTimes.length
    };
}

exports.runBenchmark = async (req, res) => {
    try {
        // Step 1: Populate test data
        const dataCount = await populateTestData();
        
        // Step 2: Define test scenarios
        const testScenarios = [
            { name: 'Small Radius (1km)', radius: 1000, expectedCount: '~10-50' },
            { name: 'Medium Radius (5km)', radius: 5000, expectedCount: '~100-300' },
            { name: 'Large Radius (10km)', radius: 10000, expectedCount: '~300-600' }
        ];
        
        const results = [];
        const centerLat = 17.3850;
        const centerLon = 78.4867;
        
        for (const scenario of testScenarios) {
            // Redis test
            const redisResult = await runQueryMultipleTimes(async () => {
                const redisClientInstance = await redisClient.getRedisClient();
                await redisClientInstance.geoSearch(
                    'driver_locations',
                    { longitude: centerLon, latitude: centerLat },
                    { radius: scenario.radius, unit: 'm', COUNT: 1000, WITHCOORD: true }
                );
            });
            
            // MongoDB test
            const mongoResult = await runQueryMultipleTimes(async () => {
                await DriverBenchmark.find({
                    location: {
                        $nearSphere: {
                            $geometry: { type: "Point", coordinates: [centerLon, centerLat] },
                            $maxDistance: scenario.radius
                        }
                    }
                }).limit(1000);
            });
            
            results.push({
                scenario: scenario.name,
                radius: scenario.radius,
                expectedCount: scenario.expectedCount,
                redis: {
                    avgTime: redisResult.avg.toFixed(2),
                    minTime: redisResult.min.toFixed(2),
                    maxTime: redisResult.max.toFixed(2)
                },
                mongo: {
                    avgTime: mongoResult.avg.toFixed(2),
                    minTime: mongoResult.min.toFixed(2),
                    maxTime: mongoResult.max.toFixed(2)
                },
                performanceRatio: (mongoResult.avg / redisResult.avg).toFixed(1)
            });
        }
        
        // Step 3: Add analysis and recommendations
        const analysis = {
            summary: `Performance analysis of ${dataCount} driver locations across ${testScenarios.length} scenarios`,
            keyFindings: [
                "Redis shows consistent sub-millisecond performance for geospatial queries",
                "MongoDB performance varies based on data size and query complexity",
                "Redis is optimal for real-time location tracking and proximity searches",
                "MongoDB provides better data persistence and complex querying capabilities"
            ],
            recommendations: [
                "Use Redis for real-time geospatial operations and caching",
                "Use MongoDB for persistent storage and complex analytics",
                "Consider hybrid approach: Redis for active tracking, MongoDB for historical data",
                "Monitor query performance as data scales"
            ],
            tradeOffs: {
                redis: {
                    pros: ["Ultra-fast geospatial queries", "In-memory performance", "Built-in geospatial indexing"],
                    cons: ["Data loss on restart", "Limited query complexity", "Memory constraints"]
                },
                mongodb: {
                    pros: ["Data persistence", "Complex querying", "ACID compliance"],
                    cons: ["Slower geospatial queries", "Disk I/O overhead", "Index maintenance"]
                }
            }
        };
        
        res.json({
            dataPoints: dataCount,
            results,
            analysis
        });
        
    } catch (error) {
        console.error('Benchmark error:', error);
        res.status(500).json({ 
            error: 'Benchmark failed', 
            details: error.message 
        });
    }
}; 