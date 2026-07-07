import pdf from "pdf-parse";

/**
 * ==========================================================
 * Extract Text From LinkedIn PDF
 * ==========================================================
 */

export const extractTextFromLinkedInPDF = async (buffer) => {
  try {
    if (!buffer) {
      throw new Error("PDF buffer is required.");
    }

    const data = await pdf(buffer);

    const extractedText = data.text
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!extractedText) {
      throw new Error("No text found inside the uploaded PDF.");
    }

    console.log("==========================================");
    console.log("LinkedIn PDF Text Extracted Successfully");
    console.log("Pages:", data.numpages);
    console.log("Characters:", extractedText.length);
    console.log("==========================================");

    return extractedText;
  } catch (error) {
    console.error("PDF Reader Error:", error.message);
    throw error;
  }
};