// const { createClient } = require('redis');
// require('dotenv').config();

// const redisUrl = process.env.REDIS_URL;

// const redisClient = createClient({
//   url: redisUrl,
//   socket: redisUrl && redisUrl.startsWith('rediss://') ? { tls: true } : undefined,
// });

// redisClient.on('error', (err) => console.error('Redis Client Error', err));

// (async () => {
//   await redisClient.connect();
// })();

// module.exports = redisClient;

// /geofence/backend/redisClient.js --- REVISED

const { createClient } = require('redis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL;

// Create the client instance but do not connect yet
const client = createClient({
  url: redisUrl,
  socket: redisUrl && redisUrl.startsWith('rediss://') ? { tls: true } : undefined,
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.on('ready', () => console.log('Redis client is ready.'));
client.on('end', () => console.log('Redis connection closed.'));

// This variable ensures we only try to connect once.
let connectionPromise = null;

// This is the function the rest of our app will use.
async function getRedisClient() {
  // If the connection process hasn't been started, start it.
  if (!connectionPromise) {
    console.log('Connecting to Redis...');
    connectionPromise = client.connect();
  }
  // Wait for the connection process to complete.
  await connectionPromise;
  // Return the now-connected client.
  return client;
}

// Export the function that provides the connected client.
module.exports = { getRedisClient };