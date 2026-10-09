import express from "express";

import {
    getCoachEarnings,
    getCoachEarningsSummary,
    getMonthlyEarnings,
    getCoachPayoutInfo,
} from "../../controllers/role-coach/earnings.controller.js";

import verifyToken from "../../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

router.get(
    "/summary",
    getCoachEarningsSummary
);

router.get(
    "/monthly",
    getMonthlyEarnings
);

router.get(
    "/payout",
    getCoachPayoutInfo
);

router.get(
    "/",
    getCoachEarnings
);

export default router;