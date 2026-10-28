
import express from "express";
import verifyToken from "../../middleware/verifyToken.js";

import {
  createSeekerBooking,
  getAvailableSlots,
  getMyBookings,
  getMyBookingById,
} from "../../controllers/role-seeker/booking.controller.js";

const router = express.Router();

router.use(verifyToken);

router.get("/availability", getAvailableSlots);
router.get("/my", getMyBookings);
router.get("/my/:bookingId", getMyBookingById);
router.post("/", createSeekerBooking);

export default router;
