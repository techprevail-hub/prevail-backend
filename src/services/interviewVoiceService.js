import axios from "axios";

/**
 * --------------------------------------------------
 * ElevenLabs Text To Speech Service
 * --------------------------------------------------
 */

const API_KEY = process.env.ELEVENLABS_API_KEY;

const VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID;

/**
 * Generate interview voice
 */
export const generateInterviewVoice =
  async (text) => {
    try {
      if (!text) {
        throw new Error(
          "Text is required."
        );
      }

      const response =
        await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,

          {
            text,

            model_id:
              "eleven_multilingual_v2",

            voice_settings: {
              stability: 0.6,

              similarity_boost: 0.8,

              style: 0.4,

              use_speaker_boost: true,
            },
          },

          {
            responseType: "arraybuffer",

            headers: {
              "xi-api-key": API_KEY,

              "Content-Type":
                "application/json",

              Accept: "audio/mpeg",
            },
          }
        );

      // Convert audio to Base64

      const base64 =
        Buffer.from(
          response.data
        ).toString("base64");

      return `data:audio/mpeg;base64,${base64}`;
    } catch (error) {
      console.error(
        "Interview Voice Error:",
        error.response?.data ||
          error.message
      );

      throw new Error(
        "Failed to generate interview voice."
      );
    }
  };