import { Injectable, Inject } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService {
  /**
   * Constructor to initialize Redis service with the injected Redis client.
   */
  constructor(@Inject("REDIS_CLIENT") private readonly redisClient: Redis) {}

  /**
   * Retrieve the value of a given key from Redis.
   * @returns A promise that resolves to the value associated with the key, or `null` if the key does not exist.
   */
  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  /**
   * Set a key-value pair in Redis, with an optional expiration time.
   * @returns A promise that resolves when the operation is complete.
   */
  async set(
    key: string,
    value: string,
    expireInSeconds?: number
  ): Promise<void> {
    if (expireInSeconds) {
      await this.redisClient.set(key, value, "EX", expireInSeconds);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  /**
   * Delete a key and its associated value from Redis.
   * @returns A promise that resolves when the key is deleted.
   */
  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
  /**
   * Check if a key exists in Redis.
   * @returns A promise that resolves to the number of keys existing in Redis.
   * 0 if the key does not exist, 1 if it does.
   */
  async exists(key: string): Promise<number> {
    return this.redisClient.exists(key);
  }
}
