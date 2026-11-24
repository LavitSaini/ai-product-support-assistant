import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Group text items that belong to approximately the same line.
 */
const groupItemsIntoLines = (items) => {
  const sortedItems = [...items].sort((a, b) => {
    // PDF coordinates start from the bottom-left.
    // Higher Y means visually higher on the page.
    if (Math.abs(b.y - a.y) > 3) {
      return b.y - a.y;
    }

    return a.x - b.x;
  });

  const lines = [];

  for (const item of sortedItems) {
    let existingLine = lines.find((line) => Math.abs(line.y - item.y) <= 3);

    if (!existingLine) {
      existingLine = {
        y: item.y,
        items: [],
      };

      lines.push(existingLine);
    }

    existingLine.items.push(item);
  }

  return lines.map((line) => {
    line.items.sort((a, b) => a.x - b.x);

    return {
      y: line.y,
      items: line.items,
      text: line.items
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    };
  });
};

/**
 * Extract text and positional information from every PDF page.
 */
export const extractPdfPages = async (pdfBuffer) => {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error("Invalid or empty PDF buffer.");
  }

  const pdfData = new Uint8Array(pdfBuffer);

  const loadingTask = getDocument({
    data: pdfData,
  });

  let pdfDocument;

  try {
    pdfDocument = await loadingTask.promise;

    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);

      const viewport = page.getViewport({ scale: 1 });

      const textContent = await page.getTextContent();

      const items = textContent.items
        .filter(
          (item) =>
            typeof item.str === "string" &&
            item.str.trim().length > 0 &&
            Array.isArray(item.transform),
        )
        .map((item) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
          fontName: item.fontName,
        }));

      const lines = groupItemsIntoLines(items);

      const content = lines
        .map((line) => line.text)
        .filter(Boolean)
        .join("\n");

      pages.push({
        pageNumber,
        content,
        lines,
        items,
        pageWidth: viewport.width,
        pageHeight: viewport.height,
      });

      page.cleanup();
    }

    return {
      totalPages: pdfDocument.numPages,
      pages,
    };
  } finally {
    try {
      if (pdfDocument) {
        await pdfDocument.cleanup();
      }
    } finally {
      await loadingTask.destroy();
    }
  }
};
