
import supabase from "../supabaseClient.js";

const PAID_STATUSES = new Set(["paid", "succeeded", "completed"]);

const getMonthKey = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
};

const getMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
};

const createMonthlyBuckets = (period) => {
  const result = [];
  const now = new Date();

  for (let i = period - 1; i >= 0; i--) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
    );

    const key = getMonthKey(date);

    result.push({
      month: key,
      label: getMonthLabel(key),
      sessions: 0,
      earnings: 0,
    });
  }

  return result;
};

const getSessionCategory = (session) => {
  const status = String(session.status || "").toLowerCase();
  const sessionDate = new Date(session.session_date);
  const isFuture =
    !Number.isNaN(sessionDate.getTime()) &&
    sessionDate > new Date();

  if (["completed", "complete"].includes(status)) {
    return "completed";
  }

  if (["cancelled", "canceled"].includes(status)) {
    return "cancelled";
  }

  if (["no_show", "no-show"].includes(status)) {
    return "noShow";
  }

  if (["pending", "confirmed", "scheduled", "booked"].includes(status)) {
    return isFuture ? "upcoming" : "other";
  }

  return "other";
};

export const getCoachAnalyticsService = async ({
  coachId,
  period = 6,
}) => {
  const now = new Date();
  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - period + 1, 1)
  );

  const start = startDate.toISOString();
  const end = now.toISOString();

  // Fetch only sessions belonging to the authenticated coach.
  const { data: sessions, error: sessionsError } = await supabase
    .from("coach_sessions")
    .select("id, session_date, status, service_name")
    .eq("coach_id", coachId)
    .gte("session_date", start)
    .lte("session_date", end);

  if (sessionsError) throw sessionsError;

  const sessionRows = sessions || [];
  const sessionIds = sessionRows.map((session) => session.id);

  // Load payment records for the coach's sessions.
  let paymentRows = [];

  if (sessionIds.length > 0) {
    const { data, error } = await supabase
      .from("coach_session_payments")
      .select(
        "session_id, amount_gross, amount_net, currency, status, paid_at"
      )
      .in("session_id", sessionIds);

    if (error) throw error;
    paymentRows = data || [];
  }

  // Only count payments that have actually been paid.
  const paidPayments = paymentRows.filter((payment) => {
    const status = String(payment.status || "").toLowerCase();
    const paidDate = payment.paid_at
      ? new Date(payment.paid_at)
      : null;

    return (
      PAID_STATUSES.has(status) &&
      paidDate &&
      !Number.isNaN(paidDate.getTime()) &&
      paidDate >= startDate &&
      paidDate <= now
    );
  });

  // Fetch reviews for this coach within the selected period.
  const { data: reviews, error: reviewsError } = await supabase
    .from("coach_reviews")
    .select("rating, created_at")
    .eq("coach_id", coachId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (reviewsError) throw reviewsError;

  const reviewRows = reviews || [];
  const validRatings = reviewRows
    .map((review) => Number(review.rating))
    .filter((rating) => rating >= 1 && rating <= 5);

  const ratingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  validRatings.forEach((rating) => {
    ratingDistribution[rating] += 1;
  });

  const averageRating = validRatings.length
    ? Number(
        (
          validRatings.reduce((sum, rating) => sum + rating, 0) /
          validRatings.length
        ).toFixed(2)
      )
    : 0;

  const sessionBreakdown = {
    total: sessionRows.length,
    completed: 0,
    upcoming: 0,
    cancelled: 0,
    noShow: 0,
    other: 0,
  };

  const monthlyBuckets = createMonthlyBuckets(period);
  const monthlyMap = new Map(
    monthlyBuckets.map((bucket) => [bucket.month, bucket])
  );

  const serviceCounts = new Map();

  sessionRows.forEach((session) => {
    const category = getSessionCategory(session);
    sessionBreakdown[category] += 1;

    const monthKey = getMonthKey(session.session_date);
    const bucket = monthlyMap.get(monthKey);

    if (bucket) bucket.sessions += 1;

    const serviceName = session.service_name || "Other";
    serviceCounts.set(
      serviceName,
      (serviceCounts.get(serviceName) || 0) + 1
    );
  });

  let totalGrossEarnings = 0;
  let totalNetEarnings = 0;
  const currencies = new Set();

  paidPayments.forEach((payment) => {
    const gross = Number(payment.amount_gross) || 0;
    const net = Number(payment.amount_net) || 0;

    totalGrossEarnings += gross;
    totalNetEarnings += net;

    if (payment.currency) {
      currencies.add(String(payment.currency).toUpperCase());
    }

    const monthKey = getMonthKey(payment.paid_at);
    const bucket = monthlyMap.get(monthKey);

    if (bucket) bucket.earnings += net;
  });

  const topServices = Array.from(serviceCounts.entries())
    .map(([name, count]) => ({ name, sessions: count }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  return {
    period: {
      months: period,
      startDate: start,
      endDate: end,
    },

    summary: {
      totalSessions: sessionBreakdown.total,
      completedSessions: sessionBreakdown.completed,
      upcomingSessions: sessionBreakdown.upcoming,
      cancelledSessions: sessionBreakdown.cancelled,
      totalReviews: validRatings.length,
      averageRating,
      totalGrossEarnings: Number(totalGrossEarnings.toFixed(2)),
      totalNetEarnings: Number(totalNetEarnings.toFixed(2)),
      currency:
        currencies.size === 1 ? [...currencies][0] : null,
      mixedCurrencies: currencies.size > 1,
    },

    sessionBreakdown,

    ratingDistribution,

    monthlyTrend: monthlyBuckets.map((bucket) => ({
      ...bucket,
      earnings: Number(bucket.earnings.toFixed(2)),
    })),

    topServices,
  };
};
