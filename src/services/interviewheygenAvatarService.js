import axios from "axios";

// ------------------------------------------------------
// HeyGen Configuration
// ------------------------------------------------------

const API_KEY = process.env.HEYGEN_API_KEY;
const AVATAR_ID = process.env.HEYGEN_AVATAR_ID;
const VOICE_ID = process.env.HEYGEN_VOICE_ID;

const BASE_URL = "https://api.heygen.com/v3";

const headers = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

// ------------------------------------------------------
// Create Avatar Session
// ------------------------------------------------------

export const createAvatarSession = async (firstQuestion) => {
  try {
    console.log("========== HEYGEN ==========");
    console.log("Avatar ID:", AVATAR_ID);
    console.log("Voice ID:", VOICE_ID);
    console.log("API Key Exists:", !!API_KEY);

    const response = await axios.post(
      `${BASE_URL}/avatar-realtime`,
      {
        type: "text_stream",

        avatar_id: AVATAR_ID,

        voice_id: VOICE_ID,

        text: firstQuestion,
      },
      {
        headers,
      }
    );

    console.log("Avatar Session Created");
    console.log(response.data);

    return response.data.data;
  } catch (error) {
    console.error("========== Create Avatar Session Error ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
};

// ------------------------------------------------------
// Speak Next Question
// ------------------------------------------------------

export const appendAvatarText = async (
  streamId,
  text,
  final = false
) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/avatar-realtime/${streamId}/text`,
      {
        delta: text,
        final,
      },
      {
        headers,
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("========== Append Avatar Error ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
};

// ------------------------------------------------------
// Get Avatar Session Status
// ------------------------------------------------------

export const getAvatarSession = async (streamId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/avatar-realtime/${streamId}`,
      {
        headers,
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("========== Get Avatar Session Error ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
};

// ------------------------------------------------------
// Cancel Avatar Session
// ------------------------------------------------------

export const cancelAvatarSession = async (streamId) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/avatar-realtime/${streamId}/cancel`,
      {},
      {
        headers,
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("========== Cancel Avatar Session Error ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
};