import axios from "axios";

// --------------------------------------------------
// ElevenLabs Configuration
// --------------------------------------------------
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

// --------------------------------------------------
// Generate Interview Voice
// --------------------------------------------------
export const generateInterviewVoice = async (text) => {
  try {
    if (!text) {
      throw new Error("Text is required.");
    }

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text,

        model_id: "eleven_multilingual_v2",

        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          "xi-api-key": API_KEY,
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    // Convert audio to Base64
    const audioBase64 = Buffer.from(response.data).toString("base64");

    return {
      audio: `data:audio/mpeg;base64,${audioBase64}`,
      mimeType: "audio/mpeg",
    };
  } catch (error) {
    console.error("ElevenLabs Error:", error.response?.data || error.message);

    throw new Error("Failed to generate interview voice.");
  }
};