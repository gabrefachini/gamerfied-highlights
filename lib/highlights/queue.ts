import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";

export const analysisQueueName = "gamerfied-highlights-analysis";

let queue: Queue | null = null;

export function getAnalysisQueue() {
  if (!env.redisUrl) return null;
  if (queue) return queue;

  const connection = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null
  });

  queue = new Queue(analysisQueueName, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: { age: 24 * 60 * 60, count: 100 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 500 }
    }
  });

  return queue;
}

export async function enqueueAnalysis(jobId: string) {
  const analysisQueue = getAnalysisQueue();
  if (!analysisQueue) return false;
  await analysisQueue.add("analyze-demo", { jobId }, { jobId });
  return true;
}
