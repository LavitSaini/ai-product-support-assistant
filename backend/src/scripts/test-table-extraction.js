import "dotenv/config";
import connectDB from "../config/db.js";
import ManualPage from "../models/ManualPage.model.js";
import { extractTablesFromPage } from "../utils/table-extraction.util.js";

const testTableExtraction = async () => {
  await connectDB(process.env.MONGODB_URI);

  // Find the latest extracted page 4.
  const page = await ManualPage.findOne({
    pageNumber: 4,
  }).sort({ updatedAt: -1 });

  if (!page) {
    throw new Error("Extracted page 4 was not found.");
  }

  const tables = extractTablesFromPage({
    pageNumber: page.pageNumber,
    pageWidth: page.pageWidth,
    pageHeight: page.pageHeight,
    items: page.layoutItems,
  });

  console.log("\nDetected tables:");
  console.dir(tables, { depth: null });

  if (tables.length === 0) {
    console.log("\nNo tables detected on this page.");
  }
};

testTableExtraction().catch((error) => {
  console.error("Table extraction test failed:", error);
  process.exitCode = 1;
});
