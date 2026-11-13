
/* -------------------------------------------------------------------------- */
/* Validate Coach Dashboard Request                                           */
/* -------------------------------------------------------------------------- */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate authenticated coach ID.
 */
export const validateCoachDashboard = (req, res, next) => {
  try {
    const coachId = req.user?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Coach ID is missing.",
      });
    }

    if (!UUID_REGEX.test(coachId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coach ID.",
      });
    }

    next();
  } catch (error) {
    console.error("Coach dashboard validation error:", error);

    return res.status(500).json({
      success: false,
      message: "Dashboard validation failed.",
    });
  }
};
