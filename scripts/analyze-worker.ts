import { Worker } from "bullmq";
import { analyzeHighlightJob } from "@/lib/highlights/analyze";
import { analysisQueueName } from "@/lib/highlights/queue";
import { getRedisConnectionOptions } from "@/lib/highlights/redisConnection";
import { env } from "@/lib/env";

if (!env.redisUrl) {
  throw new Error("REDIS_URL is required to run the analysis worker");
}

const worker = new Worker(
  analysisQueueName,
  async (job) => {
    await analyzeHighlightJob(String(job.data.jobId));
  },
  { connection: getRedisConnectionOptions() }
);

worker.on("completed", (job) => {
  console.log(`[worker] completed ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker] failed ${job?.id}: ${error.message}`);
});
