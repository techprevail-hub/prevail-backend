import dotenv from "dotenv";

dotenv.config();

// --------------------------------------------------
// D-ID Configuration
// --------------------------------------------------

const CLIENT_KEY = process.env.DID_CLIENT_KEY;

// --------------------------------------------------
// Return Existing Client Key
// --------------------------------------------------

export const generateClientKey = async () => {
  try {
    console.log("========== D-ID ==========");
    console.log("Returning Existing Client Key...");

    if (!CLIENT_KEY) {
      throw new Error("DID_CLIENT_KEY is missing in .env");
    }

    return CLIENT_KEY;
  } catch (error) {
    console.error("========== D-ID ERROR ==========");
    console.error(error.message);

    throw error;
  }
};