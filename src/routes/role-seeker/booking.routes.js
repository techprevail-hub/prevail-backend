import express from "express";
import verifyToken from "../../middleware/verifyToken.js";
import {
  createSeekerBooking,
} from "../../controllers/role-seeker/booking.controller.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", createSeekerBooking);

export default router;