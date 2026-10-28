// src/controllers/role-seeker/booking.controller.js

import supabase from "../../services/supabaseClient.js";
import {
  createSeekerBookingService,
} from "../../services/role-coach/session.service.js";

export const createSeekerBooking = async (req, res) => {
  try {
    const seekerId = req.user?.id;

    if (!seekerId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

    // Verify the application role without modifying verifyToken.js
    const { data: appUser, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", seekerId)
      .maybeSingle();

    if (userError) {
      console.error("Error verifying seeker role:", userError);

      return res.status(500).json({
        success: false,
        message: "Failed to verify user role.",
      });
    }

    if (!appUser || appUser.role !== "job_seeker") {
      return res.status(403).json({
        success: false,
        message: "Only job seekers can book a coach session.",
      });
    }

    const {
      coachId,
      serviceId,
      sessionDate,
      startTime,
      timezone,
    } = req.body || {};

    if (!coachId || !serviceId || !sessionDate || !startTime) {
      return res.status(400).json({
        success: false,
        message:
          "coachId, serviceId, sessionDate, and startTime are required.",
      });
    }

    const booking = await createSeekerBookingService({
      seekerId,
      coachId,
      serviceId,
      sessionDate,
      startTime,
      timezone,
    });

    return res.status(201).json({
      success: true,
      message: "Booking request created successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Create seeker booking error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create booking.",
    });
  }
};