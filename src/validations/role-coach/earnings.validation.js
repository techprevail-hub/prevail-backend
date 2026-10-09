const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const validateEarningsFilters = ({
    from,
    to,
    status,
    page = 1,
    limit = 10,
}) => {
    if (from && !DATE_REGEX.test(from)) {
        const error = new Error("Invalid from date");
        error.statusCode = 400;
        throw error;
    }

    if (to && !DATE_REGEX.test(to)) {
        const error = new Error("Invalid to date");
        error.statusCode = 400;
        throw error;
    }

    if (from && to && from > to) {
        const error = new Error("From date cannot be later than to date");
        error.statusCode = 400;
        throw error;
    }

    const allowedStatuses = [
        "pending",
        "paid",
        "failed",
        "refunded",
    ];

    if (status && !allowedStatuses.includes(status)) {
        const error = new Error("Invalid payment status");
        error.statusCode = 400;
        throw error;
    }

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        const error = new Error("Page must be a positive integer");
        error.statusCode = 400;
        throw error;
    }

    if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit < 1 ||
        parsedLimit > 100
    ) {
        const error = new Error(
            "Limit must be between 1 and 100"
        );
        error.statusCode = 400;
        throw error;
    }

    return {
        from,
        to,
        status,
        page: parsedPage,
        limit: parsedLimit,
    };
};