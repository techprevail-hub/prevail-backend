import supabase from "../services/supabaseClient.js";

const authMiddleware = async (
  req,
  res,
  next
) => {
  try {

    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        code: "TOKEN_MISSING",
        message:
          "Authorization token missing.",
      });
    }

    const token =
      authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message:
          "Session expired. Please login again.",
      });
    }

    req.user = user;

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      code: "AUTH_FAILED",
      message:
        "Authentication failed.",
    });

  }
};

export default authMiddleware;