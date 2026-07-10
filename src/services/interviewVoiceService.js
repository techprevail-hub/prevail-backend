import axios from "axios";

// --------------------------------------------------
// Deepgram Configuration
// --------------------------------------------------
const API_KEY = process.env.DEEPGRAM_API_KEY;

// --------------------------------------------------
// Generate Interview Voice (Text → Speech)
// --------------------------------------------------
export const generateInterviewVoice = async (text) => {
  try {
    if (!text) {
      throw new Error("Text is required.");
    }

    console.log("========== Deepgram TTS ==========");
    console.log("API Key Exists:", !!API_KEY);

    const response = await axios.post(
      "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en",
      {
        text,
      },
      {
        headers: {
          Authorization: `Token ${API_KEY}`,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        responseType: "arraybuffer",
      }
    );

    console.log("Status:", response.status);

    const audioBase64 = Buffer.from(response.data).toString("base64");

    return `data:audio/mpeg;base64,${audioBase64}`;
  } catch (error) {
    console.error("========== Deepgram Error ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error(error.response.data.toString());
    } else {
      console.error(error.message);
    }

    throw error;
  }
};