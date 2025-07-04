const { createClient } = require('redis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL;

const redisClient = createClient({
  url: redisUrl,
  socket: redisUrl && redisUrl.startsWith('rediss://') ? { tls: true } : undefined,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;