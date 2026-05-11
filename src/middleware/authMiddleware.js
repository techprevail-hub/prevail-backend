import supabase from "../services/supabaseClient.js";

const authMiddleware = async (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });

    }

    const token = authHeader.split(" ")[1];

    if (!token) {

      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });

    }

    // ✅ Verify token using Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {

      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });

    }

    // ✅ Attach user to request
    req.user = user;

    next();

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

export default authMiddleware;