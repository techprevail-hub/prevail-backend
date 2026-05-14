import fs from "fs";
import mammoth from "mammoth";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// -------------------------------------------------------------
// Load pdf-parse safely.
// Depending on the installed version, the actual parser function
// may be exported in different ways.
// -------------------------------------------------------------
const pdfParseModule = require("pdf-parse");

// Try all common export patterns
const pdfParse =
  pdfParseModule?.default?.default ||
  pdfParseModule?.default ||
  (typeof pdfParseModule === "function" ? pdfParseModule : null);

export const extractResumeText = async (fileSource, mimeType) => {
  try {
    if (!fileSource) {
      throw new Error("File source is missing.");
    }

    // ---------------------------------------------------------
    // PDF FILE
    // ---------------------------------------------------------
    if (mimeType === "application/pdf") {
      // Ensure pdf-parse loaded correctly
      if (typeof pdfParse !== "function") {
        throw new Error(
          "pdf-parse could not be loaded correctly. Please reinstall it using: npm install pdf-parse@1.1.1"
        );
      }

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