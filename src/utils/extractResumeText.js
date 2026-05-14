import fs from "fs";
import mammoth from "mammoth";
import { createRequire } from "module";

// Use CommonJS require inside ESM.
// This is the most reliable way to load pdf-parse in Node.js ES modules.
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export const extractResumeText = async (fileSource, mimeType) => {
  try {
    if (!fileSource) {
      throw new Error("File source is missing.");
    }

    // ---------------------------------------------------------
    // PDF FILE
    // ---------------------------------------------------------
    if (mimeType === "application/pdf") {
      let buffer;

      // Multer memory storage
      if (Buffer.isBuffer(fileSource)) {
        buffer = fileSource;
      } else {
        // Multer disk storage
        const normalizedPath = String(fileSource).replace(/\\/g, "/");
        buffer = fs.readFileSync(normalizedPath);
      }

      // Extract text from PDF
      const data = await pdfParse(buffer);

      const text = (data?.text || "")
        .replace(/\s+/g, " ")
        .trim();

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

      // Multer memory storage
      if (Buffer.isBuffer(fileSource)) {
        result = await mammoth.extractRawText({
          buffer: fileSource,
        });
      } else {
        // Multer disk storage
        const normalizedPath = String(fileSource).replace(/\\/g, "/");
        result = await mammoth.extractRawText({
          path: normalizedPath,
        });
      }

      const text = (result?.value || "")
        .replace(/\s+/g, " ")
        .trim();

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