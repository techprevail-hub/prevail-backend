import { fal } from "@fal-ai/client";
console.log("FAL KEY:", process.env.FAL_KEY);

// --------------------------------------------------
// Configure Fal AI
// --------------------------------------------------
fal.config({
  credentials: process.env.FAL_KEY,
});

/**
 * Generate professional AI headshots
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

    console.log("Image received");

    // --------------------------------------------------
    // Convert uploaded image to base64
    // --------------------------------------------------
    const base64 =
      file.buffer.toString("base64");

    const imageUrl = `data:${file.mimetype};base64,${base64}`;

    console.log(
      "Image converted to base64"
    );

    // --------------------------------------------------
    // Style-based prompts
    // --------------------------------------------------
    const prompts = {
      Professional:
        "Professional business headshot, realistic face, studio lighting, sharp focus, ultra realistic",

      Corporate:
        "Corporate executive portrait, formal suit, office background, realistic face",

      LinkedIn:
        "LinkedIn professional profile photo, realistic portrait, clean background",

      Student:
        "Professional student portrait, smart casual clothing, realistic face",

      Creative:
        "Creative cinematic portrait, modern lighting, realistic facial details",
    };

    const prompt =
      prompts[style] ||
      prompts["Professional"];

    console.log("Using Prompt:", prompt);

    // --------------------------------------------------
    // Generate AI image using Fal.ai
    // --------------------------------------------------
    const result = await fal.subscribe(
      "fal-ai/flux-pro/kontext",
      {
        input: {
          prompt,
          image_url: imageUrl,
        },

        logs: true,
      }
    );

    console.log(
      "Fal AI Result:",
      result
    );

    // --------------------------------------------------
    // Extract generated images
    // --------------------------------------------------
    const generatedImages =
      result.data.images.map((img) => ({
        image_url: img.url,
        style,
      }));

    return generatedImages;
  } catch (error) {
    console.error(
      "Fal AI Full Error:",
      error
    );

    throw new Error(
      error.message ||
        "Failed to generate AI headshots."
    );
  }
};