import Replicate from "replicate";

// --------------------------------------------------
// Initialize Replicate
// --------------------------------------------------
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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
    // Convert image to base64
    // --------------------------------------------------
    const base64 =
      file.buffer.toString("base64");

    const dataUri = `data:${file.mimetype};base64,${base64}`;

    // --------------------------------------------------
    // Style prompts
    // --------------------------------------------------
    const prompts = {
      Professional:
        "professional business headshot, realistic portrait, studio lighting",

      Corporate:
        "corporate executive portrait, formal suit, office background",

      LinkedIn:
        "professional linkedin profile photo, realistic face portrait",

      Student:
        "student professional portrait, smart casual clothing",

      Creative:
        "creative modern portrait, cinematic lighting",
    };

    const prompt =
      prompts[style] ||
      prompts["Professional"];

    // --------------------------------------------------
    // Generate image
    // --------------------------------------------------
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt,
        },
      }
    );

    // --------------------------------------------------
    // Normalize response
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