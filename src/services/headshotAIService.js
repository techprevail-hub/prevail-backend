import { GoogleGenAI } from "@google/genai";

// --------------------------------------------------
// Initialize Gemini Image AI
// --------------------------------------------------
const ai = new GoogleGenAI({
  apiKey:
    process.env.GEMINI_IMAGE_API_KEY,
});

/**
 * AI Headshot Generator
 * Using Gemini Image Generation
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
      throw new Error(
        "Image file is required."
      );
    }

    // --------------------------------------------------
    // Convert image to base64
    // --------------------------------------------------
    const base64Image =
      file.buffer.toString("base64");

    // --------------------------------------------------
    // Improved realistic prompts
    // --------------------------------------------------
    const prompts = {
      Professional: `
      Convert this selfie into a professional business headshot.
      Preserve the original face and identity.
      DSLR portrait photography,
      studio lighting,
      realistic skin texture,
      sharp focus,
      high quality,
      professional outfit,
      LinkedIn style profile photo.
      `,

      Corporate: `
      Convert this image into a realistic corporate executive portrait.
      Preserve the original face and hairstyle.
      Formal business attire,
      office background,
      premium professional lighting,
      DSLR quality headshot.
      `,

      LinkedIn: `
      Generate a LinkedIn-ready professional profile photo.
      Preserve the person's face and identity.
      Natural lighting,
      clean blurred background,
      realistic portrait photography.
      `,

      Student: `
      Create a clean student professional portrait.
      Preserve the original facial identity.
      Smart casual clothing,
      realistic face,
      natural lighting,
      DSLR quality.
      `,

      Creative: `
      Generate a cinematic creative portrait.
      Preserve the person's face.
      Dramatic lighting,
      artistic portrait photography,
      premium realistic look.
      `,

      Casual: `
      Generate a realistic casual portrait photo.
      Preserve the original face.
      Natural smile,
      soft lighting,
      clean background,
      lifestyle photography.
      `,
    };

    // --------------------------------------------------
    // Select prompt
    // --------------------------------------------------
    const prompt =
      prompts[style] ||
      prompts["Professional"];

    console.log(
      "Selected Prompt:",
      prompt
    );

    // --------------------------------------------------
    // Generate image using Gemini
    // --------------------------------------------------
    const response =
      await ai.models.generateContent({
        model:
          "gemini-2.5-flash-image",

        contents: [
          {
            role: "user",

            parts: [
              {
                text: prompt,
              },

              {
                inlineData: {
                  mimeType:
                    file.mimetype,

                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

    // --------------------------------------------------
    // Extract generated image
    // --------------------------------------------------
    let generatedImage = null;

    const parts =
      response?.candidates?.[0]?.content
        ?.parts || [];

    for (const part of parts) {
      if (
        part.inlineData &&
        part.inlineData.data
      ) {
        generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    // --------------------------------------------------
    // Handle failure
    // --------------------------------------------------
    if (!generatedImage) {
      throw new Error(
        "No image generated."
      );
    }

    console.log(
      "Gemini image generated successfully."
    );

    // --------------------------------------------------
    // Return generated image
    // --------------------------------------------------
    return [
      {
        image_url: generatedImage,
        style,
      },
    ];
  } catch (error) {
    console.error(
      "Gemini Headshot AI Error:",
      error
    );

    throw new Error(
      error.message ||
        "Failed to generate AI headshots."
    );
  }
};