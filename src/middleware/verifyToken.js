import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is missing.",
      });
    }

    // Check Bearer token format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format.",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    // Check token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Normalize the user object so all controllers can use req.user.id
    req.user = {
      ...decoded,
      id: decoded.id || decoded.userId || decoded.sub || null,
    };

    // If no usable user ID is found, reject the request
    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token.",
      });
    }

    // Continue to the next middleware
    next();
  } catch (error) {
    console.error("JWT verification error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export default verifyToken;