import Replicate from "replicate";

// --------------------------------------------------
// Initialize Replicate
// --------------------------------------------------
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Generate professional AI headshots
 * using uploaded user image
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
    // Convert uploaded image to base64
    // --------------------------------------------------
    const base64Image =
      file.buffer.toString("base64");

    const dataUri = `data:${file.mimetype};base64,${base64Image}`;

    // --------------------------------------------------
    // Style-based prompts
    // --------------------------------------------------
    const stylePrompts = {
      Professional:
        "professional corporate headshot, business attire, studio lighting, clean background, realistic face",

      Corporate:
        "corporate executive portrait, formal suit, office background, ultra realistic, professional lighting",

      LinkedIn:
        "linkedin profile photo, professional face portrait, smart clothing, modern background, realistic",

      Student:
        "clean student portrait, smart casual clothing, friendly expression, realistic face, studio lighting",

      Creative:
        "creative professional portrait, stylish look, cinematic lighting, modern aesthetic",
    };

    // --------------------------------------------------
    // Final AI prompt
    // --------------------------------------------------
    const prompt =
      stylePrompts[style] ||
      stylePrompts["Professional"];

    // --------------------------------------------------
    // Generate AI headshot
    // --------------------------------------------------
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b7685d5b4f2c8d3a9",
      {
        input: {
          image: dataUri,
          prompt,
          num_outputs: 3,
          guidance_scale: 7.5,
          num_inference_steps: 30,
        },
      }
    );

    // --------------------------------------------------
    // Normalize output
    // --------------------------------------------------
    const generatedImages = Array.isArray(
      output
    )
      ? output.map((url) => ({
          image_url: url,
          style,
        }))
      : [
          {
            image_url: output,
            style,
          },
        ];

    return generatedImages;
  } catch (error) {
    console.error(
      "Replicate AI Error:",
      error
    );

    throw new Error(
      "Failed to generate AI headshots."
    );
  }
};