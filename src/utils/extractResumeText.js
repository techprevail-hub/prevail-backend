import fs from "fs";
import mammoth from "mammoth";

export const extractResumeText = async (filePath, mimeType) => {
  try {
    // ---------------------------------------------------------
    // Basic validation
    // ---------------------------------------------------------
    if (!filePath) {
      throw new Error("File path is missing.");
    }

    // Normalize Windows and Linux paths
    const normalizedPath = filePath.replace(/\\/g, "/");

    console.log("Extracting resume text from:", normalizedPath);
    console.log("MIME Type:", mimeType);

    // ---------------------------------------------------------
    // PDF FILE
    // ---------------------------------------------------------
    if (mimeType === "application/pdf") {
      // Dynamically import pdf-parse
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = pdfParseModule.default || pdfParseModule;

      // Read the file directly.
      // Do NOT check fs.existsSync() because in some deployment
      // environments the path can be temporary and still readable.
      const buffer = fs.readFileSync(normalizedPath);

      // Extract text from PDF
      const data = await pdfParse(buffer);

      const text = (data.text || "").replace(/\s+/g, " ").trim();

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
      const result = await mammoth.extractRawText({
        path: normalizedPath,
      });

      const text = (result.value || "").replace(/\s+/g, " ").trim();

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