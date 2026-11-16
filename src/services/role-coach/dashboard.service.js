
import supabase from "../../services/supabaseClient.js";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 1000;
const BATCH_SIZE = 200;
const RECENT_SESSION_LIMIT = 10;
const RECENT_CLIENT_LIMIT = 5;
const RECENT_REVIEW_LIMIT = 5;

const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getToday = () => {
  return new Date().toISOString().slice(0, 10);
};

const getMonthStart = (date) => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  );
};

const getMonthKey = (date) => {
  return date.toISOString().slice(0, 7);
};

const getLastSixMonths = () => {
  const now = new Date();
  const currentMonth = getMonthStart(now);
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(
      Date.UTC(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() - i,
        1
      )
    );

    months.push({
      key: getMonthKey(date),
      label: date.toLocaleString("en", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    });
  }

  return months;
};

const roundAmount = (amount) => {
  return Number(Number(amount || 0).toFixed(2));
};

const chunkArray = (items, size = BATCH_SIZE) => {
  const chunks = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
};

/**
 * Fetch all matching rows in pages.
 *
 * Retained for exact historical totals.
 * Database aggregation can replace this in the next optimization phase.
 */
const fetchAllRows = async (queryBuilder) => {
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await queryBuilder().range(
      offset,
      offset + PAGE_SIZE - 1
    );

    if (error) {
      throw createError(error.message);
    }

    const batch = data || [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return rows;
};

const calculateProfileCompletion = (profile) => {
  if (!profile) return 0;

  const fields = [
    profile.profile_image_url,
    profile.headline,
    profile.bio,
    profile.specialization,
    profile.experience_years > 0
      ? profile.experience_years
      : null,
    profile.qualifications,
    profile.languages?.length ? profile.languages : null,
    profile.linkedin_url,
  ];

  const completed = fields.filter((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    );
  }).length;

  return Math.round((completed / fields.length) * 100);
};

const getSessionTimestamp = (session) => {
  const date = session.session_date;
  const time = session.start_time || "00:00:00";

  const timestamp = new Date(`${date}T${time}Z`).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const groupAmountsByCurrency = (payments) => {
  const totals = new Map();

  for (const payment of payments) {
    const currency = payment.currency || "INR";

    totals.set(
      currency,
      (totals.get(currency) || 0) +
        Number(payment.amount_net || 0)
    );
  }

  return Array.from(totals.entries()).map(
    ([currency, amount]) => ({
      currency,
      amount: roundAmount(amount),
    })
  );
};

/**
 * Calculate earnings in one pass instead of repeatedly filtering
 * the entire payments array for each month.
 */
const calculateEarningsOverview = (payments, now) => {
  const currentMonthStart = getMonthStart(now);

  const previousMonthStart = new Date(
    Date.UTC(
      currentMonthStart.getUTCFullYear(),
      currentMonthStart.getUTCMonth() - 1,
      1
    )
  );

  const months = getLastSixMonths();

  const monthlyMap = new Map(
    months.map((month) => [
      month.key,
      new Map(),
    ])
  );

  const currentTotals = new Map();
  const previousTotals = new Map();
  const lifetimeTotals = new Map();

  for (const payment of payments) {
    const amount = Number(payment.amount_net || 0);
    const currency = payment.currency || "INR";

    // Lifetime earnings
    lifetimeTotals.set(
      currency,
      (lifetimeTotals.get(currency) || 0) + amount
    );

    if (!payment.paid_at) continue;

    const paidDate = new Date(payment.paid_at);

    if (Number.isNaN(paidDate.getTime())) continue;

    const monthKey = getMonthKey(paidDate);

    // Current month
    if (paidDate >= currentMonthStart) {
      currentTotals.set(
        currency,
        (currentTotals.get(currency) || 0) + amount
      );
    }

    // Previous month
    if (
      paidDate >= previousMonthStart &&
      paidDate < currentMonthStart
    ) {
      previousTotals.set(
        currency,
        (previousTotals.get(currency) || 0) + amount
      );
    }

    // Last six months
    const monthTotals = monthlyMap.get(monthKey);

    if (monthTotals) {
      monthTotals.set(
        currency,
        (monthTotals.get(currency) || 0) + amount
      );
    }
  }

  const mapToCurrencyArray = (map) => {
    return Array.from(map.entries()).map(
      ([currency, amount]) => ({
        currency,
        amount: roundAmount(amount),
      })
    );
  };

  return {
    totalEarnings: mapToCurrencyArray(lifetimeTotals),

    currentMonth: mapToCurrencyArray(currentTotals),

    previousMonth: mapToCurrencyArray(previousTotals),

    monthlyBreakdown: months.map((month) => ({
      month: month.key,
      label: month.label,
      earnings: mapToCurrencyArray(
        monthlyMap.get(month.key)
      ),
    })),
  };
};

/* -------------------------------------------------------------------------- */
/* CLIENT AGGREGATION                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Group sessions by client in one pass.
 *
 * Avoids repeatedly filtering and sorting the full sessions array.
 */
const buildClientStatistics = (sessions) => {
  const sessionsByClient = new Map();

  for (const session of sessions) {
    const clientId = session.seeker_id;

    if (!clientId) continue;

    if (!sessionsByClient.has(clientId)) {
      sessionsByClient.set(clientId, {
        totalSessions: 0,
        completedSessions: 0,
        lastSession: null,
        lastSessionTimestamp: 0,
      });
    }

    const client = sessionsByClient.get(clientId);

    client.totalSessions += 1;

    if (session.status === "completed") {
      client.completedSessions += 1;
    }

    const timestamp = getSessionTimestamp(session);

    if (
      !client.lastSession ||
      timestamp > client.lastSessionTimestamp
    ) {
      client.lastSession = session;
      client.lastSessionTimestamp = timestamp;
    }
  }

  const recentClients = Array.from(
    sessionsByClient.entries()
  )
    .map(([clientId, stats]) => ({
      clientId,
      ...stats,
    }))
    .sort(
      (a, b) =>
        b.lastSessionTimestamp - a.lastSessionTimestamp
    )
    .slice(0, RECENT_CLIENT_LIMIT);

  return {
    sessionsByClient,
    recentClients,
    totalClients: sessionsByClient.size,
  };
};

/* -------------------------------------------------------------------------- */
/* BATCHED CLIENT DATA FETCHING                                               */
/* -------------------------------------------------------------------------- */

const fetchClientProfiles = async (clientIds) => {
  if (!clientIds.length) {
    return {
      seekerProfiles: [],
      seekerUsers: [],
    };
  }

  const uniqueIds = [...new Set(clientIds)].filter(Boolean);

  const batches = chunkArray(uniqueIds);

  const profilePromises = batches.map(async (ids) => {
    const { data, error } = await supabase
      .from("Seeker-profiles")
      .select(`
        user_id,
        full_name,
        email,
        location,
        position,
        company,
        industry,
        experience_level
      `)
      .in("user_id", ids);

    if (error) {
      throw createError(error.message);
    }

    return data || [];
  });

  const userPromises = batches.map(async (ids) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", ids);

    if (error) {
      throw createError(error.message);
    }

    return data || [];
  });

  const [profileResults, userResults] = await Promise.all([
    Promise.all(profilePromises),
    Promise.all(userPromises),
  ]);

  return {
    seekerProfiles: profileResults.flat(),
    seekerUsers: userResults.flat(),
  };
};

/* -------------------------------------------------------------------------- */
/* MAIN DASHBOARD SERVICE                                                     */
/* -------------------------------------------------------------------------- */

export const getCoachDashboardService = async ({ coachId }) => {
  if (!coachId) {
    throw createError("Coach ID is required", 400);
  }

  const now = new Date();
  const today = getToday();

  /* ------------------------------------------------------------------------ */
  /* 1. PARALLEL INITIAL QUERIES                                               */
  /* ------------------------------------------------------------------------ */

  const [
    { data: user, error: userError },
    { data: coachProfile, error: profileError },
    sessions,
    services,
    reviews,
  ] = await Promise.all([
    // User
    supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", coachId)
      .maybeSingle(),

    // Coach profile
    supabase
      .from("coach_profiles")
      .select(`
        user_id,
        profile_image_url,
        headline,
        bio,
        specialization,
        experience_years,
        qualifications,
        languages,
        linkedin_url
      `)
      .eq("user_id", coachId)
      .maybeSingle(),

    // All sessions (required for exact historical statistics)
    fetchAllRows(() =>
      supabase
        .from("coach_sessions")
        .select(`
          id,
          coach_id,
          seeker_id,
          service_id,
          session_date,
          start_time,
          end_time,
          timezone,
          duration_minutes,
          service_name,
          session_type,
          price,
          currency,
          status,
          payment_status,
          meeting_url,
          group_session_id,
          created_at
        `)
        .eq("coach_id", coachId)
        .order("session_date", { ascending: false })
        .order("start_time", { ascending: false })
        .order("id", { ascending: false })
    ),

    // Services
    fetchAllRows(() =>
      supabase
        .from("coach_services")
        .select("id, name, is_active")
        .eq("coach_id", coachId)
    ),

    // All reviews (required for exact average and total)
    fetchAllRows(() =>
      supabase
        .from("coach_reviews")
        .select("id, rating, review_text, created_at, seeker_id")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false })
    ),
  ]);

  /* ------------------------------------------------------------------------ */
  /* 2. ERROR HANDLING AND ROLE VERIFICATION                                  */
  /* ------------------------------------------------------------------------ */

  if (userError) {
    throw createError(userError.message);
  }

  if (profileError) {
    throw createError(profileError.message);
  }

  if (!user) {
    throw createError("User account not found", 404);
  }

  const actualRole = String(user.role || "")
    .trim()
    .toLowerCase();

  if (actualRole !== "coach") {
    throw createError(
      "Access denied. Only coaches can access this dashboard.",
      403
    );
  }

  /* ------------------------------------------------------------------------ */
  /* 3. SESSION STATISTICS                                                    */
  /* ------------------------------------------------------------------------ */

  const totalSessions = sessions.length;

  let completedSessions = 0;
  let cancelledSessions = 0;
  let pendingSessions = 0;
  let confirmedSessions = 0;

  const upcomingSessions = [];

  for (const session of sessions) {
    switch (session.status) {
      case "completed":
        completedSessions++;
        break;

      case "cancelled":
        cancelledSessions++;
        break;

      case "pending":
        pendingSessions++;
        break;

      case "confirmed":
        confirmedSessions++;
        break;
    }

    if (
      session.status === "confirmed" &&
      session.session_date >= today
    ) {
      upcomingSessions.push(session);
    }
  }

  // Sessions were ordered newest-first.
  // Sort only the upcoming records in chronological order.
  upcomingSessions.sort(
    (a, b) =>
      getSessionTimestamp(a) - getSessionTimestamp(b)
  );

  const limitedUpcomingSessions = upcomingSessions.slice(
    0,
    RECENT_SESSION_LIMIT
  );

  /* ------------------------------------------------------------------------ */
  /* 4. SERVICE STATISTICS                                                    */
  /* ------------------------------------------------------------------------ */

  const totalServices = services.length;

  const activeServices = services.filter(
    (service) => service.is_active === true
  ).length;

  /* ------------------------------------------------------------------------ */
  /* 5. CLIENT STATISTICS                                                     */
  /* ------------------------------------------------------------------------ */

  const {
    sessionsByClient,
    recentClients: latestClients,
    totalClients,
  } = buildClientStatistics(sessions);

  /* ------------------------------------------------------------------------ */
  /* 6. PREPARE REQUIRED CLIENT IDS                                           */
  /* ------------------------------------------------------------------------ */

  const clientIds = new Set();

  // Latest five clients
  latestClients.forEach((client) => {
    clientIds.add(client.clientId);
  });

  // Clients of upcoming sessions
  limitedUpcomingSessions.forEach((session) => {
    if (session.seeker_id) {
      clientIds.add(session.seeker_id);
    }
  });

  // Clients of latest five reviews
  reviews.slice(0, RECENT_REVIEW_LIMIT).forEach((review) => {
    if (review.seeker_id) {
      clientIds.add(review.seeker_id);
    }
  });

  /* ------------------------------------------------------------------------ */
  /* 7. PREPARE GROUP SESSION IDS                                             */
  /* ------------------------------------------------------------------------ */

  const groupSessionIds = [
    ...new Set(
      limitedUpcomingSessions
        .map((session) => session.group_session_id)
        .filter(Boolean)
    ),
  ];

  /* ------------------------------------------------------------------------ */
  /* 8. FETCH SECONDARY DATA IN PARALLEL                                      */
  /* ------------------------------------------------------------------------ */

  const sessionIds = sessions.map((session) => session.id);

  const paymentBatches = chunkArray(sessionIds);

  const paymentPromises = paymentBatches.map(async (ids) => {
    return fetchAllRows(() =>
      supabase
        .from("coach_session_payments")
        .select(`
          id,
          session_id,
          amount_net,
          currency,
          status,
          paid_at,
          created_at
        `)
        .in("session_id", ids)
        .eq("status", "paid")
    );
  });

  const groupPromise = groupSessionIds.length
    ? supabase
        .from("coach_group_sessions")
        .select(`
          id,
          capacity,
          meeting_url,
          status
        `)
        .in("id", groupSessionIds)
    : Promise.resolve({
        data: [],
        error: null,
      });

  const [
    paymentResults,
    clientData,
    groupResult,
  ] = await Promise.all([
    Promise.all(paymentPromises),
    fetchClientProfiles([...clientIds]),
    groupPromise,
  ]);

  if (groupResult.error) {
    throw createError(groupResult.error.message);
  }

  /* ------------------------------------------------------------------------ */
  /* 9. PREPARE CLIENT MAPS                                                   */
  /* ------------------------------------------------------------------------ */

  const seekerProfileMap = new Map(
    clientData.seekerProfiles.map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const seekerUserMap = new Map(
    clientData.seekerUsers.map((client) => [
      client.id,
      client,
    ])
  );

  const getClientName = (clientId) => {
    if (!clientId) return "Client";

    const profile = seekerProfileMap.get(clientId);
    const client = seekerUserMap.get(clientId);

    return (
      profile?.full_name ||
      client?.name ||
      profile?.email ||
      client?.email ||
      "Client"
    );
  };

  /* ------------------------------------------------------------------------ */
  /* 10. FORMAT RECENT CLIENTS                                                */
  /* ------------------------------------------------------------------------ */

  const recentClients = latestClients.map((client) => {
    const profile = seekerProfileMap.get(client.clientId);
    const lastSession = client.lastSession;

    return {
      id: client.clientId,

      name: getClientName(client.clientId),

      email: profile?.email ||
        seekerUserMap.get(client.clientId)?.email ||
        null,

      location: profile?.location || null,
      position: profile?.position || null,
      company: profile?.company || null,
      industry: profile?.industry || null,
      experienceLevel: profile?.experience_level || null,

      totalSessions: client.totalSessions,
      completedSessions: client.completedSessions,

      lastSession: lastSession
        ? {
            id: lastSession.id,
            date: lastSession.session_date,
            startTime: lastSession.start_time,
            status: lastSession.status,
            serviceName: lastSession.service_name,
          }
        : null,
    };
  });

  /* ------------------------------------------------------------------------ */
  /* 11. FORMAT UPCOMING SESSIONS                                             */
  /* ------------------------------------------------------------------------ */

  const groupSessions = groupResult.data || [];

  const groupSessionMap = new Map(
    groupSessions.map((group) => [
      group.id,
      group,
    ])
  );

  const formattedUpcomingSessions =
    limitedUpcomingSessions.map((session) => {
      const group = session.group_session_id
        ? groupSessionMap.get(session.group_session_id)
        : null;

      return {
        id: session.id,
        clientId: session.seeker_id,
        clientName: getClientName(session.seeker_id),

        serviceId: session.service_id,
        serviceName: session.service_name,
        sessionType: session.session_type,

        sessionDate: session.session_date,
        startTime: session.start_time,
        endTime: session.end_time,
        timezone: session.timezone,
        durationMinutes: session.duration_minutes,

        status: session.status,

        meetingUrl:
          session.meeting_url ||
          group?.meeting_url ||
          null,

        groupSessionId: session.group_session_id || null,
        groupCapacity: group?.capacity || null,
      };
    });

  /* ------------------------------------------------------------------------ */
  /* 12. CALCULATE EARNINGS                                                   */
  /* ------------------------------------------------------------------------ */

  const payments = paymentResults.flat();

  const earnings = calculateEarningsOverview(payments, now);

  /* ------------------------------------------------------------------------ */
  /* 13. REVIEW STATISTICS                                                    */
  /* ------------------------------------------------------------------------ */

  const totalReviews = reviews.length;

  const averageRating = totalReviews
    ? roundAmount(
        reviews.reduce(
          (total, review) =>
            total + Number(review.rating || 0),
          0
        ) / totalReviews
      )
    : 0;

  const recentReviews = reviews
    .slice(0, RECENT_REVIEW_LIMIT)
    .map((review) => ({
      id: review.id,
      rating: review.rating,
      reviewText: review.review_text,
      createdAt: review.created_at,
      clientName: getClientName(review.seeker_id),
    }));

  /* ------------------------------------------------------------------------ */
  /* 14. PERFORMANCE STATISTICS                                               */
  /* ------------------------------------------------------------------------ */

  const completionRate = totalSessions
    ? roundAmount(
        (completedSessions / totalSessions) * 100
      )
    : 0;

  const cancellationRate = totalSessions
    ? roundAmount(
        (cancelledSessions / totalSessions) * 100
      )
    : 0;

  /* ------------------------------------------------------------------------ */
  /* 15. FINAL RESPONSE                                                       */
  /* ------------------------------------------------------------------------ */

  return {
    coach: {
      id: user.id,
      name: user.name || "",
      email: user.email || "",

      profileImage: coachProfile?.profile_image_url || null,
      headline: coachProfile?.headline || null,
      specialization: coachProfile?.specialization || null,

      experienceYears: coachProfile?.experience_years || 0,

      profileCompletion:
        calculateProfileCompletion(coachProfile),
    },

    overview: {
      totalClients,
      totalServices,
      activeServices,

      totalSessions,
      completedSessions,
      confirmedSessions,
      pendingSessions,
      cancelledSessions,

      upcomingSessions: upcomingSessions.length,

      totalEarnings: earnings.totalEarnings,
      monthlyEarnings: earnings.currentMonth,

      averageRating,
      totalReviews,
    },

    upcomingSessions: formattedUpcomingSessions,

    recentClients,

    earningsOverview: {
      currentMonth: earnings.currentMonth,
      previousMonth: earnings.previousMonth,
      monthlyBreakdown: earnings.monthlyBreakdown,
    },

    performanceOverview: {
      completionRate,
      cancellationRate,
    },

    recentReviews,
  };
};
