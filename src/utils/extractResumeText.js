import fs from "fs";
import mammoth from "mammoth";

// -------------------------------------------------------------
// Dynamically import pdf-parse only when a PDF is uploaded.
// This avoids startup crashes that can happen with ESM imports
// on some Node.js versions and deployment environments.
// -------------------------------------------------------------
export const extractResumeText = async (filePath, mimeType) => {
  try {
    // ---------------------------------------------------------
    // PDF FILE
    // ---------------------------------------------------------
    if (mimeType === "application/pdf") {
      // Check file exists
      if (!fs.existsSync(filePath)) {
        throw new Error("PDF file not found.");
      }

      // Read file buffer
      const buffer = fs.readFileSync(filePath);

      // Dynamically import pdf-parse
      const pdfParseModule = await import("pdf-parse");

      // Handle both default and direct exports
      const pdfParse = pdfParseModule.default || pdfParseModule;

      // Extract text from PDF
      const data = await pdfParse(buffer);

      // Return cleaned text
      return (data.text || "").replace(/\s+/g, " ").trim();
    }

    // ---------------------------------------------------------
    // DOCX FILE
    // ---------------------------------------------------------
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // Check file exists
      if (!fs.existsSync(filePath)) {
        throw new Error("DOCX file not found.");
      }

      // Extract text from DOCX
      const result = await mammoth.extractRawText({
        path: filePath,
      });

      // Return cleaned text
      return (result.value || "").replace(/\s+/g, " ").trim();
    }

    // ---------------------------------------------------------
    // UNSUPPORTED FILE TYPE
    // ---------------------------------------------------------
    throw new Error("Unsupported file type. Only PDF and DOCX are allowed.");
  } catch (error) {
    console.error("Resume text extraction error:", error);
    throw new Error(error.message || "Failed to extract text from resume.");
  }
};