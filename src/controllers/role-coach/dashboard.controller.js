
import {
  getCoachDashboardService,
} from "../../services/role-coach/dashboard.service.js";

/* -------------------------------------------------------------------------- */
/* GET COACH DASHBOARD                                                        */
/* -------------------------------------------------------------------------- */

export const getCoachDashboard = async (req, res) => {
  const startTime = performance.now();

  try {
    /* ---------------------------------------------------------------------- */
    /* 1. GET AUTHENTICATED COACH ID                                          */
    /* ---------------------------------------------------------------------- */

    const coachId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.user?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Coach ID not found.",
      });
    }

    /* ---------------------------------------------------------------------- */
    /* 2. PREVENT UNNECESSARY BROWSER CACHING                                 */
    /* ---------------------------------------------------------------------- */

    res.set("Cache-Control", "private, no-store");

    /* ---------------------------------------------------------------------- */
    /* 3. FETCH DASHBOARD DATA                                                */
    /* ---------------------------------------------------------------------- */

    const data = await getCoachDashboardService({
      coachId,
    });

    /* ---------------------------------------------------------------------- */
    /* 4. PERFORMANCE LOGGING                                                 */
    /* ---------------------------------------------------------------------- */

    const executionTime = Number(
      (performance.now() - startTime).toFixed(2)
    );

    console.log(
      `[Coach Dashboard] Coach: ${coachId} | Execution Time: ${executionTime} ms`
    );

    /* ---------------------------------------------------------------------- */
    /* 5. SUCCESS RESPONSE                                                    */
    /* ---------------------------------------------------------------------- */

    return res.status(200).json({
      success: true,
      message: "Coach dashboard fetched successfully.",
      executionTime,
      data,
    });

  } catch (error) {
    /* ---------------------------------------------------------------------- */
    /* 6. ERROR HANDLING                                                      */
    /* ---------------------------------------------------------------------- */

    const executionTime = Number(
      (performance.now() - startTime).toFixed(2)
    );

    console.error("[Get Coach Dashboard Error]", {
      message: error.message,
      statusCode: error.statusCode || 500,
      executionTime,
    });

    const statusCode =
      Number.isInteger(error.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode < 600
        ? error.statusCode
        : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode < 500
          ? error.message
          : "Failed to fetch coach dashboard.",
    });
  }
};
