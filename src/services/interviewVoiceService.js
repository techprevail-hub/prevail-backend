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

    // ==========================================
    // Debugging Logs - Fix 2
    // ==========================================
    console.log("========== ElevenLabs ==========");
    console.log("Voice ID:", VOICE_ID);
    console.log("API Key Exists:", !!API_KEY);
    console.log("Text Length:", text.length);
    console.log("Text:", text.substring(0, 100) + (text.length > 100 ? "..." : ""));

    // ==========================================
    // API Call
    // ==========================================
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

    // ==========================================
    // Log Response - Fix 3
    // ==========================================
    console.log("Status:", response.status);
    console.log("Audio Size:", response.data.length, "bytes");

    // ==========================================
    // Convert audio to Base64 - Fix 1
    // Return only the audio string, not an object
    // ==========================================
    const audioBase64 = Buffer.from(response.data).toString("base64");

    // Return only the audio URL string
    return `data:audio/mpeg;base64,${audioBase64}`;

  } catch (error) {
    // ==========================================
    // Improved Error Logging - Fix 4
    // ==========================================
    console.error("========== ElevenLabs Error ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Status Text:", error.response.statusText);
      
      // Try to parse error data if it's JSON
      try {
        const errorData = JSON.parse(error.response.data.toString());
        console.error("Error Data:", errorData);
      } catch {
        console.error("Error Data:", error.response.data);
      }
    } else if (error.request) {
      console.error("No response received from ElevenLabs");
      console.error("Request:", error.request);
    } else {
      console.error("Error Message:", error.message);
    }

    // Throw the actual error instead of a generic one
    throw error;
  }
};