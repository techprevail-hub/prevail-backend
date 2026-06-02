import { calculateProgress } from "../services/progressService.js";

export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const data = await calculateProgress(userId);

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {
    console.error("Progress Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};