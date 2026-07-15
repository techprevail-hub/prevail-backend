import axios from "axios";

// --------------------------------------------------
// D-ID Configuration
// --------------------------------------------------

const API_KEY = process.env.DID_API_KEY;

const BASE_URL = "https://api.d-id.com";

const headers = {
  Authorization: `Basic ${API_KEY}`,
  "Content-Type": "application/json",
};

// --------------------------------------------------
// Generate Client Key
// --------------------------------------------------

export const generateClientKey = async () => {
  try {
    console.log("========== D-ID ==========");
    console.log("Generating Client Key...");

    const response = await axios.post(
      `${BASE_URL}/agents/client-key`,
      {
        allowed_domains: [
          "http://localhost:3000",
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ],
      },
      {
        headers,
      }
    );

    console.log("Client Key Generated Successfully");

    return response.data.client_key;
  } catch (error) {
    console.error("========== D-ID ERROR ==========");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
};