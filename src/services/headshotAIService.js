// src/services/headshotAIService.js

/**
 * Temporary AI Headshot Generator Service
 *
 * Later you can integrate:
 * - Replicate AI
 * - Stability AI
 * - ClipDrop
 *
 * For now this service:
 * ✅ simulates AI generation
 * ✅ returns demo professional headshots
 * ✅ helps complete backend/frontend flow
 */

export const generateHeadshotAI = async (
  file,
  style
) => {
  try {
    // --------------------------------------------------
    // Validate uploaded file
    // --------------------------------------------------
    if (!file) {
      throw new Error("Image file is required.");
    }

    // --------------------------------------------------
    // Simulate AI processing delay
    // --------------------------------------------------
    await new Promise((resolve) =>
      setTimeout(resolve, 2000)
    );

    // --------------------------------------------------
    // Temporary generated images
    // Replace later with real AI-generated images
    // --------------------------------------------------
    const generatedImages = [
      {
        image_url:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
        style,
      },
      {
        image_url:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        style,
      },
      {
        image_url:
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
        style,
      },
    ];

    return generatedImages;
  } catch (error) {
    console.error(
      "Headshot AI Service Error:",
      error
    );

    throw new Error(
      "Failed to generate AI headshots."
    );
  }
};