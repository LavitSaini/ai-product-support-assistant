
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB

export const downloadPdf = async (fileUrl) => {
  if (typeof fileUrl !== "string" || !fileUrl.trim()) {
    throw new Error("Invalid PDF URL.");
  }

  const url = new URL(fileUrl);

  // Only allow Cloudinary delivery URLs.
  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com"
  ) {
    throw new Error("Untrusted PDF download URL.");
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(
      `PDF download failed. HTTP status: ${response.status}`
    );
  }

  const contentLength = Number(
    response.headers.get("content-length")
  );

  if (contentLength && contentLength > MAX_PDF_SIZE) {
    throw new Error("PDF exceeds the maximum allowed size of 50 MB.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  if (pdfBuffer.length === 0) {
    throw new Error("Downloaded PDF is empty.");
  }

  if (pdfBuffer.length > MAX_PDF_SIZE) {
    throw new Error("PDF exceeds the maximum allowed size of 50 MB.");
  }

  // Check for PDF signature in the first 1024 bytes.
  const pdfHeader = Buffer.from("%PDF-");
  const headerFound = pdfBuffer
    .subarray(0, 1024)
    .includes(pdfHeader);

  if (!headerFound) {
    throw new Error("Downloaded file is not a valid PDF.");
  }

  return pdfBuffer;
};
