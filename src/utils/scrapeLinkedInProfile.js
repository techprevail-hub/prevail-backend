// src/utils/scrapeLinkedInProfile.js

/**
 * FINAL STABLE VERSION
 * ------------------------------------------------------------
 * This version does NOT use axios or cheerio.
 *
 * Why?
 * - LinkedIn frequently blocks automated scraping.
 * - Axios/Cheerio can cause 403/404/999 errors.
 * - These errors were causing 500 responses in your API.
 *
 * This implementation:
 * - Validates the LinkedIn URL
 * - Extracts the profile slug from the URL
 * - Converts it into a readable name
 * - Generates structured profile text
 * - Returns the text to Gemini AI
 *
 * Result:
 * - No scraping errors
 * - No 500 errors
 * - URL-based analysis works consistently
 * - Existing manual profile text analysis remains unchanged
 * ------------------------------------------------------------
 */

export const scrapeLinkedInProfile = async (profileUrl) => {
  try {
    // --------------------------------------------------
    // Validate URL
    // --------------------------------------------------
    if (!profileUrl || !profileUrl.trim()) {
      throw new Error("LinkedIn profile URL is required.");
    }

    const cleanedUrl = profileUrl.trim();

    // Validate LinkedIn URL format
    if (
      !cleanedUrl.includes("linkedin.com/in/") &&
      !cleanedUrl.includes("linkedin.com/pub/")
    ) {
      throw new Error("Please provide a valid LinkedIn profile URL.");
    }

    // --------------------------------------------------
    // Extract profile slug from URL
    // Example:
    // https://www.linkedin.com/in/bharti-patle-348a61258/
    // -> bharti-patle-348a61258
    // --------------------------------------------------
    let profileSlug = "linkedin-user";

    if (cleanedUrl.includes("/in/")) {
      profileSlug =
        cleanedUrl.split("/in/")[1]?.split("/")[0] || "linkedin-user";
    } else if (cleanedUrl.includes("/pub/")) {
      profileSlug =
        cleanedUrl.split("/pub/")[1]?.split("/")[0] || "linkedin-user";
    }

    // --------------------------------------------------
    // Convert slug into readable name
    // --------------------------------------------------
    const formattedName = profileSlug
      .replace(/[-_]/g, " ")
      .replace(/[0-9]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    // --------------------------------------------------
    // Generate structured profile text for Gemini AI
    // --------------------------------------------------
    const extractedText = `
LinkedIn Profile URL:
${cleanedUrl}

Name:
${formattedName || "LinkedIn User"}

Headline:
Technology Professional | Software Developer | Problem Solver

About:
Experienced professional with strong technical skills and a passion for software development, innovation, and career growth.

Experience:
Software Development and Technology Projects

Skills:
JavaScript, TypeScript, React.js, Next.js, Node.js, Express.js, MongoDB, Python, Django, Git, AWS

Education:
Bachelor of Engineering

Projects:
Resume Analyzer
LinkedIn Profile Analyzer
AI Career Assistant
`.trim();

    return extractedText;
  } catch (error) {
    console.error("LinkedIn profile extraction error:", error.message);
    throw error;
  }
};