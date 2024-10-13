import { registerAs } from "@nestjs/config";

const redisConfig = registerAs("redis", () => {
  const redisPort = process.env.REDIS_PORT
    ? parseInt(process.env.REDIS_PORT, 10)
    : 6379;
  const redisDb = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0;

  if (isNaN(redisPort)) {
    throw new Error(`Invalid REDIS_PORT: ${process.env.REDIS_PORT}`);
  }

  if (isNaN(redisDb)) {
    throw new Error(`Invalid REDIS_DB: ${process.env.REDIS_DB}`);
  }

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: redisPort,
    password: process.env.REDIS_PASSWORD || undefined,
    db: redisDb,
  };
});

export default redisConfig;
