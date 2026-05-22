/**
 * FREE AI Headshot Generator
 * Using Pollinations AI
 */

export const generateHeadshotAI = async (
  file,
  style
) => {
  try {
    // --------------------------------------------------
    // Validate uploaded image
    // --------------------------------------------------
    if (!file) {
      throw new Error("Image file is required.");
    }

    // --------------------------------------------------
    // Style prompts
    // --------------------------------------------------
    const prompts = {
      Professional:
        "professional business headshot portrait realistic studio lighting",

      Corporate:
        "corporate executive portrait professional office realistic",

      LinkedIn:
        "linkedin profile photo realistic portrait professional",

      Student:
        "professional student portrait realistic clean background",

      Creative:
        "creative cinematic portrait realistic modern lighting",
    };

    // --------------------------------------------------
    // Select prompt
    // --------------------------------------------------
    const prompt =
      prompts[style] ||
      prompts["Professional"];

    // --------------------------------------------------
    // Generate FREE AI image URL
    // --------------------------------------------------
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}`;

    // --------------------------------------------------
    // Return generated image
    // --------------------------------------------------
    return [
      {
        image_url: imageUrl,
        style,
      },
    ];
  } catch (error) {
    console.error(
      "Pollinations AI Error:",
      error
    );

    throw new Error(
      error.message ||
        "Failed to generate AI headshots."
    );
  }
};