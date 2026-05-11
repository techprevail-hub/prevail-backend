import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    // Check if token is provided
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token not provided.",
      });
    }

    // Extract token from header
    const token = authHeader.split(" ")[1];

    // Verify token using JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded payload to request
    req.user = decoded;

    // Continue to next middleware
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export default verifyToken;