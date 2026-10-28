
import supabase from "../../services/supabaseClient.js";

import {
  createSeekerBookingService,
  getAvailableSlotsService,
  getSeekerBookingsService,
  getSeekerBookingByIdService,
} from "../../services/role-seeker/booking.service.js";

// ======================================================
// CREATE BOOKING — JOB SEEKER
// ======================================================

export const createSeekerBooking = async (req, res) => {
  try {
    const seekerId = req.user?.id;

    if (!seekerId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

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
      seekerId: appUser.id,
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

// ======================================================
// GET AVAILABLE SLOTS — JOB SEEKER
// ======================================================

export const getAvailableSlots = async (req, res) => {
  try {
    const seekerId = req.user?.id;

    if (!seekerId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

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
        message: "Only job seekers can view booking availability.",
      });
    }

    const { coachId, serviceId, date } = req.query;

    if (
      typeof coachId !== "string" ||
      typeof serviceId !== "string" ||
      typeof date !== "string" ||
      !coachId.trim() ||
      !serviceId.trim() ||
      !date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "coachId, serviceId, and date are required.",
      });
    }

    const slotsData = await getAvailableSlotsService({
      coachId,
      serviceId,
      date,
    });

    return res.status(200).json({
      success: true,
      message: "Available slots fetched successfully.",
      data: slotsData,
    });
  } catch (error) {
    console.error("Get available slots error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch available slots.",
    });
  }
};

// ======================================================
// GET MY BOOKINGS — JOB SEEKER
// ======================================================

export const getMyBookings = async (req, res) => {
  try {
    const seekerId = req.user?.id;

    if (!seekerId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

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
        message: "Only job seekers can view their bookings.",
      });
    }

    // Optional filter: pending, confirmed, completed, cancelled, no_show
    const status = req.query.status;

    if (
      status !== undefined &&
      (typeof status !== "string" || !status.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status.",
      });
    }

    const bookingsData = await getSeekerBookingsService({
      seekerId: appUser.id,
      status: status || null,
    });

    return res.status(200).json({
      success: true,
      message: "Your bookings fetched successfully.",
      data: bookingsData,
    });
  } catch (error) {
    console.error("Get seeker bookings error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch your bookings.",
    });
  }
};

// ======================================================
// GET SINGLE BOOKING DETAILS — JOB SEEKER
// ======================================================

export const getMyBookingById = async (req, res) => {
  try {
    const seekerId = req.user?.id;

    if (!seekerId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

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
        message: "Only job seekers can view booking details.",
      });
    }

    const { bookingId } = req.params;

    if (
      typeof bookingId !== "string" ||
      !bookingId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
    }

    const bookingData = await getSeekerBookingByIdService({
      seekerId: appUser.id,
      bookingId,
    });

    return res.status(200).json({
      success: true,
      message: "Booking details fetched successfully.",
      data: bookingData,
    });
  } catch (error) {
    console.error("Get seeker booking details error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch booking details.",
    });
  }
};
