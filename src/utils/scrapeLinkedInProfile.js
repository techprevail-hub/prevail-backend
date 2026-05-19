// src/utils/scrapeLinkedInProfile.js

import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Scrape publicly accessible LinkedIn profile content.
 *
 * IMPORTANT:
 * - This works only if the profile is publicly accessible.
 * - LinkedIn may block some requests.
 * - If extraction fails or returns insufficient data,
 *   ask the user to paste their profile text manually.
 *
 * @param {string} profileUrl - LinkedIn profile URL
 * @returns {Promise<string>} Extracted profile text
 */
export const scrapeLinkedInProfile = async (profileUrl) => {
  try {
    // -------------------------------------------------------
    // Validate URL
    // -------------------------------------------------------
    if (!profileUrl || !profileUrl.trim()) {
      throw new Error("LinkedIn profile URL is required.");
    }

    const cleanedUrl = profileUrl.trim();

    // Basic LinkedIn URL validation
    if (
      !cleanedUrl.includes("linkedin.com/in/") &&
      !cleanedUrl.includes("linkedin.com/pub/")
    ) {
      throw new Error("Please provide a valid LinkedIn profile URL.");
    }

    // -------------------------------------------------------
    // Fetch HTML
    // -------------------------------------------------------
    const response = await axios.get(cleanedUrl, {
      headers: {
        // Browser-like headers to reduce blocking
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = response.data;

    if (!html || typeof html !== "string") {
      throw new Error("Failed to fetch LinkedIn profile HTML.");
    }

    // -------------------------------------------------------
    // Load HTML into Cheerio
    // -------------------------------------------------------
    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, noscript, svg").remove();

    // -------------------------------------------------------
    // Extract useful text
    // -------------------------------------------------------

    // Page title often contains name and headline
    const pageTitle = $("title").text().trim();

    // Meta description often contains headline/about summary
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() || "";

    // Main body text as fallback
    const bodyText = $("body").text();

    // Clean body text
    const cleanedBodyText = bodyText
      .replace(/\s+/g, " ")
      .replace(/LinkedIn/g, "")
      .trim();

    // Build structured content for AI
    const extractedText = `
LinkedIn Profile URL:
${cleanedUrl}

Page Title:
${pageTitle}

Meta Description:
${metaDescription}

Profile Content:
${cleanedBodyText.slice(0, 12000)}
`.trim();

    // -------------------------------------------------------
    // Validate extracted content
    // -------------------------------------------------------
    if (
      !cleanedBodyText ||
      cleanedBodyText.length < 100 ||
      cleanedBodyText.includes("Sign in to LinkedIn")
    ) {
      throw new Error(
        "Could not extract sufficient public profile data. Please paste your LinkedIn profile text manually."
      );
    }

    return extractedText;
  } catch (error) {
    console.error("LinkedIn scraping error:", error.message);

    // Axios-specific errors
    if (error.response?.status === 999) {
      throw new Error(
        "LinkedIn blocked automated access. Please paste your profile text manually."
      );
    }

    if (error.response?.status === 403) {
      throw new Error(
        "Access to this LinkedIn profile is restricted. Please paste your profile text manually."
      );
    }

    if (error.response?.status === 404) {
      throw new Error("LinkedIn profile not found.");
    }

    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timed out while fetching the LinkedIn profile."
      );
    }

    // Re-throw custom errors as-is
    throw error;
  }
};