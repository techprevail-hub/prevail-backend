
import supabase from "../../services/supabaseClient.js";

import {
  createSeekerBookingService,
  getAvailableSlotsService,
  getSeekerBookingsService,
  getSeekerBookingByIdService,
} from "../../services/role-seeker/booking.service.js";

// ======================================================
// ALLOWED ROLES
// ======================================================

const ALLOWED_SEEKER_ROLES = ["job_seeker", "student"];

// ======================================================
// VERIFY USER AND ROLE
// ======================================================

const getAllowedSeeker = async (userId) => {
  if (!userId) {
    const error = new Error("User not authenticated.");
    error.statusCode = 401;
    throw error;
  }

  const { data: appUser, error: userError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    console.error("Error verifying seeker role:", userError);

    const error = new Error("Failed to verify user role.");
    error.statusCode = 500;
    throw error;
  }

  if (!appUser || !ALLOWED_SEEKER_ROLES.includes(appUser.role)) {
    const error = new Error(
      "Only job seekers and students can access seeker booking features."
    );
    error.statusCode = 403;
    throw error;
  }

  return appUser;
};

// ======================================================
// STANDARD ERROR RESPONSE
// ======================================================

const sendErrorResponse = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage,
  });
};

// ======================================================
// CREATE BOOKING — JOB SEEKER / STUDENT
// ======================================================

export const createSeekerBooking = async (req, res) => {
  try {
    const appUser = await getAllowedSeeker(req.user?.id);

    const {
      coachId,
      serviceId,
      sessionDate,
      startTime,
      timezone,
    } = req.body || {};

    if (
      !coachId ||
      !serviceId ||
      !sessionDate ||
      !startTime
    ) {
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
    return sendErrorResponse(
      res,
      error,
      "Failed to create booking."
    );
  }
};

// ======================================================
// GET AVAILABLE SLOTS — JOB SEEKER / STUDENT
// ======================================================

export const getAvailableSlots = async (req, res) => {
  try {
    await getAllowedSeeker(req.user?.id);

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
    return sendErrorResponse(
      res,
      error,
      "Failed to fetch available slots."
    );
  }
};

// ======================================================
// GET MY BOOKINGS — JOB SEEKER / STUDENT
// ======================================================

export const getMyBookings = async (req, res) => {
  try {
    const appUser = await getAllowedSeeker(req.user?.id);

    // Optional filter: pending, confirmed, completed, cancelled, no_show
    const { status } = req.query;

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
    return sendErrorResponse(
      res,
      error,
      "Failed to fetch your bookings."
    );
  }
};

// ======================================================
// GET SINGLE BOOKING DETAILS — JOB SEEKER / STUDENT
// ======================================================

export const getMyBookingById = async (req, res) => {
  try {
    const appUser = await getAllowedSeeker(req.user?.id);

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
    return sendErrorResponse(
      res,
      error,
      "Failed to fetch booking details."
    );
  }
};
