import jwt from "jsonwebtoken";
import supabase from "../services/supabaseClient.js";

const verifyToken = async (req, res, next) => {
  try {
    // Log all headers for debugging
    console.log("All headers:", req.headers);
    
    // Get Authorization header
    const authHeader = req.headers.authorization;
    
    console.log("Authorization header:", authHeader);

    // Validate header format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid Authorization header format");
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing or invalid format. Expected: Bearer <token>",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];
    console.log("Extracted token:", token ? `${token.substring(0, 20)}...` : "null");

    if (!token) {
      console.log("Token is empty after extraction");
      return res.status(401).json({
        success: false,
        message: "Token not provided.",
      });
    }

    // ------------------------------------------------------------------
    // 1. Try verifying as a custom JWT (used by many existing backends)
    // ------------------------------------------------------------------
    const secret =
      process.env.JWT_SECRET ||
      process.env.JWT_SECRET_KEY ||
      process.env.SECRET_KEY ||
      process.env.ACCESS_TOKEN_SECRET ||
      process.env.TOKEN_SECRET;

    console.log("JWT Secret available:", !!secret);

    if (secret) {
      try {
        const decoded = jwt.verify(token, secret);
        console.log("JWT verification successful:", decoded);

        req.user = {
          ...decoded,
          id: decoded.id || decoded.userId || decoded.sub || null,
        };

        if (req.user.id) {
          console.log("User authenticated via JWT, ID:", req.user.id);
          return next();
        }
      } catch (jwtError) {
        console.log("JWT verification failed:", jwtError.message);
        // Ignore and fall through to Supabase verification
      }
    }

    // ------------------------------------------------------------------
    // 2. Try verifying as a Supabase access token
    // ------------------------------------------------------------------
    console.log("Attempting Supabase token verification...");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.log("Supabase verification error:", error.message);
      return res.status(401).json({
        success: false,
        message: `Invalid or expired token: ${error.message}`,
      });
    }

    if (!user) {
      console.log("No user found for token");
      return res.status(401).json({
        success: false,
        message: "No user associated with this token.",
      });
    }

    console.log("Supabase verification successful, User ID:", user.id);

    // Normalize user object so controllers can use req.user.id
    req.user = {
      id: user.id,
      email: user.email,
      ...user,
    };

    return next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    console.error("Error stack:", error.stack);

    return res.status(401).json({
      success: false,
      message: `Authentication failed: ${error.message}`,
    });
  }
};

export default verifyToken;