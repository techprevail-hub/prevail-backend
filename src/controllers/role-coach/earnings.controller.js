import {
    getCoachEarningsService,
    getCoachEarningsSummaryService,
    getMonthlyEarningsService,
    getCoachPayoutInfoService,
} from "../../services/role-coach/earnings.service.js";

import {
    validateEarningsFilters,
} from "../../validations/role-coach/earnings.validation.js";


export const getCoachEarnings = async (req, res) => {
    try {
        const coachId = req.user?.id;

        if (!coachId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const filters = validateEarningsFilters(req.query);

        const result = await getCoachEarningsService({
            coachId,
            ...filters,
        });

        return res.status(200).json({
            success: true,
            message: "Coach earnings fetched successfully",
            data: result,
        });
    } catch (error) {
        console.error("Get coach earnings error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch coach earnings",
        });
    }
};


export const getCoachEarningsSummary = async (req, res) => {
    try {
        const coachId = req.user?.id;

        if (!coachId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const data = await getCoachEarningsSummaryService({
            coachId,
        });

        return res.status(200).json({
            success: true,
            message: "Coach earnings summary fetched successfully",
            data,
        });
    } catch (error) {
        console.error("Get earnings summary error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch earnings summary",
        });
    }
};


export const getMonthlyEarnings = async (req, res) => {
    try {
        const coachId = req.user?.id;

        if (!coachId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const months = Number(req.query.months || 6);

        if (
            !Number.isInteger(months) ||
            months < 1 ||
            months > 12
        ) {
            return res.status(400).json({
                success: false,
                message: "Months must be between 1 and 12",
            });
        }

        const data = await getMonthlyEarningsService({
            coachId,
            months,
        });

        return res.status(200).json({
            success: true,
            message: "Monthly earnings fetched successfully",
            data,
        });
    } catch (error) {
        console.error("Get monthly earnings error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch monthly earnings",
        });
    }
};


export const getCoachPayoutInfo = async (req, res) => {
    try {
        const coachId = req.user?.id;

        if (!coachId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const data = await getCoachPayoutInfoService({
            coachId,
        });

        return res.status(200).json({
            success: true,
            message: "Payout information fetched successfully",
            data,
        });
    } catch (error) {
        console.error("Get payout information error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch payout information",
        });
    }
};