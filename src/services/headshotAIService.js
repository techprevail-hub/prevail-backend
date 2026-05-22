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
    // Better realistic prompts
    // --------------------------------------------------
    const prompts = {
      Professional:
        "ultra realistic professional business headshot portrait of a young person, studio lighting, DSLR quality, realistic skin texture",

      Corporate:
        "realistic corporate executive portrait, formal business attire, office background, ultra realistic face",

      LinkedIn:
        "linkedin profile photo, professional realistic portrait, clean background, natural lighting",

      Student:
        "young student professional portrait, realistic face, smart casual clothing, natural lighting",

      Creative:
        "creative cinematic realistic portrait, dramatic lighting, modern photography style",

      Casual:
        "casual realistic portrait photo, natural smile, soft lighting",
    };

    // --------------------------------------------------
    // Select style prompt
    // --------------------------------------------------
    const prompt =
      prompts[style] ||
      prompts["Professional"];

    console.log(
      "Selected Prompt:",
      prompt
    );

    // --------------------------------------------------
    // Better AI image URL
    // --------------------------------------------------
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}?width=1024&height=1024&seed=${Date.now()}`;

    console.log(
      "Generated Image URL:",
      imageUrl
    );

    // --------------------------------------------------
    // Return generated images
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