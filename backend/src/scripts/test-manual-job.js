import "dotenv/config";
import connectDB from "../config/db.js";
import Manual from "../models/Manual.model.js";
import { enqueueManualProcessing } from "../jobs/manual.queue.js";

const testManualJob = async () => {
  await connectDB(process.env.MONGODB_URI);

  const manual = await Manual.findOne();

  if (!manual) {
    throw new Error("No manual found in MongoDB.");
  }

  const job = await enqueueManualProcessing(manual._id);

  console.log("Job added successfully.");
  console.log("Job ID:", job.id);
  console.log("Manual ID:", manual._id.toString());
};

testManualJob()
  .catch((error) => {
    console.error("Test job failed:", error);
    process.exitCode = 1;
  });
