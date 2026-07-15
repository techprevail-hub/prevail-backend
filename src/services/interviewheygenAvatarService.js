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
    // Validate input
    if (
      !firstQuestion ||
      typeof firstQuestion !== "string" ||
      firstQuestion.trim() === ""
    ) {
      throw new Error(
        `Invalid firstQuestion received: ${JSON.stringify(firstQuestion)}`
      );
    }

    console.log("========== HEYGEN ==========");
    console.log("API Key Exists:", !!API_KEY);
    console.log("Avatar ID:", AVATAR_ID);
    console.log("Voice ID:", VOICE_ID);
    console.log("Question Type:", typeof firstQuestion);
    console.log("Question:", firstQuestion);

    const payload = {
      type: "text_stream",
      avatar_id: AVATAR_ID,
      voice_id: VOICE_ID,
      text: firstQuestion,
    };

    console.log("Payload:");
    console.log(JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${BASE_URL}/avatar-realtime`,
      payload,
      {
        headers,
      }
    );

    console.log("========== HEYGEN RESPONSE ==========");
    console.log(response.data);

    return response.data.data;
  } catch (error) {
    console.error("========== CREATE AVATAR SESSION ERROR ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    throw error;
  }
};

// ------------------------------------------------------
// Avatar Speaks Next Question
// ------------------------------------------------------

export const appendAvatarText = async (
  streamId,
  text,
  final = false
) => {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Invalid text supplied.");
    }

    const payload = {
      delta: text,
      final,
    };

    console.log("========== APPEND TEXT ==========");
    console.log(payload);

    const response = await axios.post(
      `${BASE_URL}/avatar-realtime/${streamId}/text`,
      payload,
      {
        headers,
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("========== APPEND AVATAR ERROR ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    throw error;
  }
};

// ------------------------------------------------------
// Get Avatar Session
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
    console.error("========== GET SESSION ERROR ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
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
    console.error("========== CANCEL SESSION ERROR ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    throw error;
  }
};