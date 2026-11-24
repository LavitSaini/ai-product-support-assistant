import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";

const manualQueue = new Queue("manual-processing", {
  connection: redisConnection,
});

export const enqueueManualProcessing = async (manualId) => {
  const job = await manualQueue.add(
    "process-manual",
    {
      manualId: manualId.toString(),
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    }
  );

  return job;
};

export default manualQueue;
