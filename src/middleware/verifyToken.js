import jwt from "jsonwebtoken";
import supabase from "../services/supabaseClient.js";

const verifyToken = async (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    // Validate header format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing.",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
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

    if (secret) {
      try {
        const decoded = jwt.verify(token, secret);

        req.user = {
          ...decoded,
          id: decoded.id || decoded.userId || decoded.sub || null,
        };

        if (req.user.id) {
          return next();
        }
      } catch (jwtError) {
        // Ignore and fall through to Supabase verification
      }
    }

    // ------------------------------------------------------------------
    // 2. Try verifying as a Supabase access token
    // ------------------------------------------------------------------
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // Normalize user object so controllers can use req.user.id
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
      message: "Authentication failed.",
    });
  }
};

export default verifyToken;