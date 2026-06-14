import type { QueueOptions } from "bullmq";
import { env } from "@/lib/env";

export function getRedisConnectionOptions(): QueueOptions["connection"] {
  const redisUrl = new URL(env.redisUrl);
  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
    password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
    db: redisUrl.pathname && redisUrl.pathname !== "/" ? Number(redisUrl.pathname.slice(1)) : undefined,
    maxRetriesPerRequest: null
  };
}
