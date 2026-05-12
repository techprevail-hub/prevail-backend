import jwt from "jsonwebtoken";
import supabase from "../services/supabaseClient.js";

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing or invalid format.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not provided.",
      });
    }

    // First, try to verify with Supabase (handles refresh automatically)
    console.log("Verifying token with Supabase...");
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.log("Supabase verification failed:", error.message);
      
      // Check if it's an expiration error
      if (error.message.includes("expired")) {
        return res.status(401).json({
          success: false,
          message: "Token has expired. Please login again.",
          code: "TOKEN_EXPIRED"
        });
      }
      
      return res.status(401).json({
        success: false,
        message: `Invalid token: ${error.message}`,
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No user associated with this token.",
      });
    }

    console.log("Token verified successfully for user:", user.id);

    req.user = {
      id: user.id,
      email: user.email,
      ...user,
    };

    return next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(401).json({
      success: false,
      message: `Authentication failed: ${error.message}`,
    });
  }
};

export default verifyToken;