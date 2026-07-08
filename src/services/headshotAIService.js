import axios from "axios";
import FormData from "form-data";

// --------------------------------------------------
// Initialize Magic Hour API
// --------------------------------------------------
const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;

/**
 * AI Headshot Generator
 * Using Magic Hour REST APIs
 */
export const generateHeadshotAI = async (
  file,
  style = "Professional"
) => {
  try {
    // --------------------------------------------------
    // Validate uploaded image
    // --------------------------------------------------
    if (!file) {
      throw new Error("Image file is required.");
    }

    // --------------------------------------------------
    // Step 1: Request Upload URL
    // --------------------------------------------------
    console.log("Requesting upload URL...");
    const uploadUrlResponse = await axios.post(
      "https://api.magichour.ai/v1/files/upload-urls",
      {
        files: [
          {
            name: file.originalname || "photo.jpg",
            mimeType: file.mimetype || "image/jpeg",
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MAGIC_HOUR_API_KEY}`,
        },
      }
    );

    const uploadData = uploadUrlResponse.data;
    if (!uploadData || !uploadData.uploads || uploadData.uploads.length === 0) {
      throw new Error("Failed to get upload URL");
    }

    const uploadInfo = uploadData.uploads[0];
    const { id: fileId, uploadUrl } = uploadInfo;

    console.log("Upload URL received for file:", fileId);

    // --------------------------------------------------
    // Step 2: Upload Image
    // --------------------------------------------------
    console.log("Uploading image...");
    await axios.put(uploadUrl, file.buffer, {
      headers: {
        "Content-Type": file.mimetype || "image/jpeg",
        "Content-Length": file.buffer.length,
      },
    });

    console.log("Image uploaded successfully. File ID:", fileId);

    // --------------------------------------------------
    // Step 3: Generate Headshot with AI
    // --------------------------------------------------
    const prompt = `
      Create a professional LinkedIn headshot.

      Preserve the person's exact face.
      Do not change identity.

      Professional navy business suit.
      Studio lighting.
      Soft shadows.
      Corporate background.
      DSLR quality.
      Ultra realistic.
      Natural skin texture.
      High resolution.
    `;

    console.log("Starting headshot generation with prompt:", prompt);

    const generateResponse = await axios.post(
      "https://api.magichour.ai/v1/ai-headshot-generator",
      {
        fileIds: [fileId],
        prompt: prompt,
        style: "photorealistic",
        strength: 0.9,
        guidanceScale: 7.5,
        steps: 30,
        seed: Math.floor(Math.random() * 1000000),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MAGIC_HOUR_API_KEY}`,
        },
      }
    );

    const projectId = generateResponse.data.id;
    console.log("Headshot generation started. Project ID:", projectId);

    // --------------------------------------------------
    // Step 4: Poll until complete
    // --------------------------------------------------
    console.log("Polling for completion...");
    let downloadUrl = null;
    let maxAttempts = 60; // 5 minutes
    let attempts = 0;

    while (attempts < maxAttempts) {
      const statusResponse = await axios.get(
        `https://api.magichour.ai/v1/image-projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${MAGIC_HOUR_API_KEY}`,
          },
        }
      );

      const project = statusResponse.data;
      console.log(`Status (attempt ${attempts + 1}/${maxAttempts}):`, project.status);

      if (project.status === "complete") {
        if (project.downloads && project.downloads.length > 0) {
          downloadUrl = project.downloads[0].url;
          console.log("Headshot generation completed successfully.");
          break;
        } else {
          throw new Error("No download URL found in completed project");
        }
      } else if (project.status === "failed") {
        throw new Error("Headshot generation failed");
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!downloadUrl) {
      throw new Error("Headshot generation timed out after 5 minutes");
    }

    // --------------------------------------------------
    // Step 5: Return generated image
    // --------------------------------------------------
    console.log("Headshot generated successfully.");
    return [
      {
        image_url: downloadUrl,
        style: "Professional",
      },
    ];

  } catch (error) {
    console.error("Magic Hour Headshot AI Error:", error);

    // Handle API error responses
    if (error.response) {
      console.error("API Response Error:", {
        status: error.response.status,
        data: error.response.data,
      });
      throw new Error(
        error.response.data?.message || 
        error.response.data?.error || 
        "Failed to generate AI headshots."
      );
    }

    throw new Error(
      error.message || "Failed to generate AI headshots."
    );
  }
};