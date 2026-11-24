import "dotenv/config";
import { Worker } from "bullmq";

import redisConnection from "../config/redis.js";
import connectDB from "../config/db.js";

import Manual from "../models/Manual.model.js";
import ManualPage from "../models/ManualPage.model.js";

import { downloadPdf } from "../utils/download.util.js";
import { extractPdfPages } from "../utils/pdf.util.js";

import { extractTablesFromPage } from "../utils/table-extraction.util.js";

const QUEUE_NAME = "manual-processing";

const processManual = async (job) => {
  const { manualId } = job.data;

  console.log(`Starting manual processing: ${manualId}`);

  const manual = await Manual.findById(manualId);

  if (!manual) {
    throw new Error(`Manual not found: ${manualId}`);
  }

  try {
    // 1. Update manual status
    await Manual.findByIdAndUpdate(manualId, {
      status: "processing",
      processingError: null,
    });

    await job.updateProgress(10);

    console.log(`Manual found: ${manual.title}`);

    // 2. Download PDF from Cloudinary
    console.log("Downloading PDF from Cloudinary...");

    const pdfBuffer = await downloadPdf(manual.fileUrl);

    console.log(`PDF downloaded successfully: ${pdfBuffer.length} bytes`);

    await job.updateProgress(30);

    // 3. Extract PDF pages
    console.log("Extracting PDF pages...");

    const extractionResult = await extractPdfPages(pdfBuffer);

    const { totalPages, pages } = extractionResult;

    if (!totalPages || pages.length !== totalPages) {
      throw new Error("PDF page extraction returned incomplete results.");
    }

    console.log(`Total pages extracted: ${totalPages}`);

    await job.updateProgress(70);

    console.log("Reconstructing tables from PDF pages...");

    const operations = pages.map((page) => {
      const tables = extractTablesFromPage({
        pageNumber: page.pageNumber,
        pageWidth: page.pageWidth,
        pageHeight: page.pageHeight,
        items: page.items,
      });

      console.log(
        `Page ${page.pageNumber}: ${tables.length} table(s) detected.`,
      );

      return {
        updateOne: {
          filter: {
            manualId: manual._id,
            pageNumber: page.pageNumber,
          },
          update: {
            $set: {
              productId: manual.productId,
              content: page.content,
              layoutItems: page.items,
              pageWidth: page.pageWidth,
              pageHeight: page.pageHeight,
              tables,
            },
          },
          upsert: true,
        },
      };
    });

    console.log("Saving pages and reconstructed tables to MongoDB...");

    if (operations.length > 0) {
      await ManualPage.bulkWrite(operations);
    }

    // Remove stale pages if the manual has fewer pages than before.
    await ManualPage.deleteMany({
      manualId: manual._id,
      pageNumber: { $gt: totalPages },
    });

    await job.updateProgress(90);

    // 5. Mark manual as completed
    await Manual.findByIdAndUpdate(manualId, {
      status: "completed",
      pageCount: totalPages,
      processedAt: new Date(),
      processingError: null,
    });

    await job.updateProgress(100);

    console.log(`Manual processing completed: ${manual.title}`);

    return {
      manualId: manual._id.toString(),
      totalPages,
      message: "PDF extracted and pages saved successfully.",
    };
  } catch (error) {
    console.error("Manual processing failed:", error.message);

    const maxAttempts = Number(job.opts.attempts || 1);
    const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

    // Keep the manual available for retry if attempts remain.
    await Manual.findByIdAndUpdate(manualId, {
      status: isFinalAttempt ? "failed" : "processing",
      processingError: error.message,
    });

    throw error;
  }
};

const startWorker = async () => {
  await connectDB(process.env.MONGODB_URI);

  const worker = new Worker(QUEUE_NAME, processManual, {
    connection: redisConnection,
    concurrency: 1,
  });

  worker.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed.`);
    console.log(result);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error("Worker error:", error.message);
  });

  console.log("Manual processing worker is running.");

  return worker;
};

startWorker().catch((error) => {
  console.error("Worker startup error:", error);
  process.exit(1);
});
