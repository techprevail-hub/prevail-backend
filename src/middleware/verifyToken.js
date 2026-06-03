import supabase from "../services/supabaseClient.js";

const verifyToken = async (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        code: "TOKEN_MISSING",
        message: "Authorization token is missing.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        code: "TOKEN_MISSING",
        message: "Token not provided.",
      });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {

      console.error(
        "Supabase Token Verification Error:",
        error.message
      );

      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message:
          "Session expired. Please login again.",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "TOKEN_INVALID",
        message:
          "Invalid authentication token.",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      ...user,
    };

    next();

  } catch (error) {

    console.error(
      "Verify Token Error:",
      error
    );

    return res.status(401).json({
      success: false,
      code: "AUTH_FAILED",
      message:
        "Authentication failed.",
    });
  }
};

export default verifyToken;