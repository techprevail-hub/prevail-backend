import fs from "fs";
import mammoth from "mammoth";

export const extractResumeText = async (fileSource, mimeType) => {
  try {
    if (!fileSource) {
      throw new Error("File source is missing.");
    }

    // ---------------------------------------------------------
    // PDF FILE
    // ---------------------------------------------------------
    if (mimeType === "application/pdf") {
      // Read buffer from memory or file path
      let buffer;

      if (Buffer.isBuffer(fileSource)) {
        // Multer memory storage
        buffer = fileSource;
      } else {
        // Multer disk storage
        const normalizedPath = String(fileSource).replace(/\\/g, "/");
        buffer = fs.readFileSync(normalizedPath);
      }

      // Dynamically import pdf-parse
      const pdfParseModule = await import("pdf-parse");

      // Get the actual parsing function
      const pdfParse =
        pdfParseModule?.default ||
        pdfParseModule?.PDFParse ||
        pdfParseModule;

      // Ensure it is a function
      if (typeof pdfParse !== "function") {
        throw new Error("pdf-parse module could not be loaded correctly.");
      }

      // Extract text
      const data = await pdfParse(buffer);

      const text = (data?.text || "").replace(/\s+/g, " ").trim();

      if (!text) {
        throw new Error("No text could be extracted from the PDF.");
      }

      return text;
    }

    // ---------------------------------------------------------
    // DOCX FILE
    // ---------------------------------------------------------
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      let result;

      if (Buffer.isBuffer(fileSource)) {
        // Memory storage
        result = await mammoth.extractRawText({
          buffer: fileSource,
        });
      } else {
        // Disk storage
        const normalizedPath = String(fileSource).replace(/\\/g, "/");
        result = await mammoth.extractRawText({
          path: normalizedPath,
        });
      }

      const text = (result?.value || "").replace(/\s+/g, " ").trim();

      if (!text) {
        throw new Error("No text could be extracted from the DOCX file.");
      }

      return text;
    }

    // ---------------------------------------------------------
    // Unsupported file type
    // ---------------------------------------------------------
    throw new Error("Unsupported file type. Only PDF and DOCX are allowed.");
  } catch (error) {
    console.error("Resume text extraction error:", error);
    throw new Error(
      error.message || "Failed to extract text from the uploaded resume."
    );
  }
};