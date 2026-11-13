import supabase from "../../services/supabaseClient.js";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const PAGE_SIZE = 1000;
const PAYMENT_BATCH_SIZE = 200;

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

/**
 * Fetch every matching row in pages.
 * Supabase/PostgREST normally limits returned rows.
 */
const fetchAllRows = async (queryBuilder) => {
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await queryBuilder()
      .range(offset, offset + PAGE_SIZE - 1);

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

const chunkArray = (items, size) => {
  const chunks = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
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
    if (Array.isArray(value)) return value.length > 0;

    return (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    );
  }).length;

  return Math.round((completed / fields.length) * 100);
};

const groupAmountsByCurrency = (payments) => {
  const totals = new Map();

  payments.forEach((payment) => {
    const currency = payment.currency || "INR";
    const current = totals.get(currency) || 0;

    totals.set(
      currency,
      current + Number(payment.amount_net || 0)
    );
  });

  return Array.from(totals.entries()).map(
    ([currency, amount]) => ({
      currency,
      amount: roundAmount(amount),
    })
  );
};

const getSessionTimestamp = (session) => {
  return new Date(
    `${session.session_date}T${session.start_time || "00:00:00"}Z`
  ).getTime();
};

/* -------------------------------------------------------------------------- */
/* MAIN DASHBOARD SERVICE                                                     */
/* -------------------------------------------------------------------------- */

export const getCoachDashboardService = async ({ coachId }) => {
  if (!coachId) {
    throw createError("Coach ID is required", 400);
  }

  const today = getToday();
  const now = new Date();
  const currentMonthStart = getMonthStart(now);

  const previousMonthStart = new Date(
    Date.UTC(
      currentMonthStart.getUTCFullYear(),
      currentMonthStart.getUTCMonth() - 1,
      1
    )
  );

  const sixMonthsStart = new Date(
    Date.UTC(
      currentMonthStart.getUTCFullYear(),
      currentMonthStart.getUTCMonth() - 5,
      1
    )
  );

  /* ------------------------------------------------------------------------ */
  /* 1. COACH INFORMATION AND ROLE VERIFICATION                               */
  /* ------------------------------------------------------------------------ */

  const [
    { data: user, error: userError },
    { data: coachProfile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", coachId)
      .maybeSingle(),

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
  ]);

  if (userError) {
    throw createError(userError.message);
  }

  if (profileError) {
    throw createError(profileError.message);
  }

  if (!user) {
    throw createError("User account not found", 404);
  }

  // Verify the actual role from the database.
  // Do not depend on req.user.role from the JWT.
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
  /* 2. FETCH ALL COACH BOOKINGS                                              */
  /* ------------------------------------------------------------------------ */

  const sessions = await fetchAllRows(() =>
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
  );

  const totalSessions = sessions.length;

  const completedSessions = sessions.filter(
    (session) => session.status === "completed"
  ).length;

  const cancelledSessions = sessions.filter(
    (session) => session.status === "cancelled"
  ).length;

  const pendingSessions = sessions.filter(
    (session) => session.status === "pending"
  ).length;

  const confirmedSessions = sessions.filter(
    (session) => session.status === "confirmed"
  ).length;

  const upcomingSessions = sessions
    .filter(
      (session) =>
        session.status === "confirmed" &&
        session.session_date >= today
    )
    .sort(
      (a, b) =>
        getSessionTimestamp(a) - getSessionTimestamp(b)
    );

  /* ------------------------------------------------------------------------ */
  /* 3. SERVICES                                                              */
  /* ------------------------------------------------------------------------ */

  const services = await fetchAllRows(() =>
    supabase
      .from("coach_services")
      .select("id, name, is_active")
      .eq("coach_id", coachId)
  );

  const totalServices = services.length;

  const activeServices = services.filter(
    (service) => service.is_active === true
  ).length;

  /* ------------------------------------------------------------------------ */
  /* 4. CLIENTS                                                               */
  /* ------------------------------------------------------------------------ */

  const clientIds = [
    ...new Set(
      sessions
        .map((session) => session.seeker_id)
        .filter(Boolean)
    ),
  ];

  let seekerProfiles = [];
  let seekerUsers = [];

  if (clientIds.length) {
    const profileResults = await Promise.all(
      chunkArray(clientIds, PAYMENT_BATCH_SIZE).map(
        async (ids) => {
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
        }
      )
    );

    seekerProfiles = profileResults.flat();

    const userResults = await Promise.all(
      chunkArray(clientIds, PAYMENT_BATCH_SIZE).map(
        async (ids) => {
          const { data, error } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", ids);

          if (error) {
            throw createError(error.message);
          }

          return data || [];
        }
      )
    );

    seekerUsers = userResults.flat();
  }

  const seekerProfileMap = new Map(
    seekerProfiles.map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const seekerUserMap = new Map(
    seekerUsers.map((client) => [
      client.id,
      client,
    ])
  );

  const sessionsByClient = new Map();

  sessions.forEach((session) => {
    if (!session.seeker_id) return;

    if (!sessionsByClient.has(session.seeker_id)) {
      sessionsByClient.set(session.seeker_id, []);
    }

    sessionsByClient.get(session.seeker_id).push(session);
  });

  const recentClients = Array.from(sessionsByClient.entries())
    .map(([clientId, clientSessions]) => {
      const sorted = [...clientSessions].sort(
        (a, b) =>
          getSessionTimestamp(b) - getSessionTimestamp(a)
      );

      const profile = seekerProfileMap.get(clientId);
      const clientUser = seekerUserMap.get(clientId);

      return {
        id: clientId,

        name:
          profile?.full_name ||
          clientUser?.name ||
          profile?.email ||
          clientUser?.email ||
          "Client",

        email: profile?.email || clientUser?.email || null,
        location: profile?.location || null,
        position: profile?.position || null,
        company: profile?.company || null,
        industry: profile?.industry || null,
        experienceLevel: profile?.experience_level || null,

        totalSessions: clientSessions.length,

        completedSessions: clientSessions.filter(
          (session) => session.status === "completed"
        ).length,

        lastSession: sorted[0]
          ? {
              id: sorted[0].id,
              date: sorted[0].session_date,
              startTime: sorted[0].start_time,
              status: sorted[0].status,
              serviceName: sorted[0].service_name,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const dateA = a.lastSession
        ? new Date(
            `${a.lastSession.date}T${a.lastSession.startTime || "00:00:00"}Z`
          ).getTime()
        : 0;

      const dateB = b.lastSession
        ? new Date(
            `${b.lastSession.date}T${b.lastSession.startTime || "00:00:00"}Z`
          ).getTime()
        : 0;

      return dateB - dateA;
    });

  /* ------------------------------------------------------------------------ */
  /* 5. GROUP SESSION DETAILS                                                 */
  /* ------------------------------------------------------------------------ */

  const groupSessionIds = [
    ...new Set(
      upcomingSessions
        .map((session) => session.group_session_id)
        .filter(Boolean)
    ),
  ];

  let groupSessions = [];

  if (groupSessionIds.length) {
    const { data, error } = await supabase
      .from("coach_group_sessions")
      .select(`
        id,
        capacity,
        meeting_url,
        status
      `)
      .in("id", groupSessionIds);

    if (error) {
      throw createError(error.message);
    }

    groupSessions = data || [];
  }

  const groupSessionMap = new Map(
    groupSessions.map((group) => [
      group.id,
      group,
    ])
  );

  const formattedUpcomingSessions = upcomingSessions
    .slice(0, 10)
    .map((session) => {
      const group = session.group_session_id
        ? groupSessionMap.get(session.group_session_id)
        : null;

      return {
        id: session.id,
        clientId: session.seeker_id,

        clientName:
          seekerProfileMap.get(session.seeker_id)?.full_name ||
          seekerUserMap.get(session.seeker_id)?.name ||
          seekerProfileMap.get(session.seeker_id)?.email ||
          seekerUserMap.get(session.seeker_id)?.email ||
          "Client",

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
  /* 6. PAYMENTS AND NET EARNINGS                                             */
  /* ------------------------------------------------------------------------ */

  const sessionIds = sessions.map(
    (session) => session.id
  );

  let payments = [];

  if (sessionIds.length) {
    const paymentResults = await Promise.all(
      chunkArray(sessionIds, PAYMENT_BATCH_SIZE).map(
        async (ids) =>
          fetchAllRows(() =>
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
          )
      )
    );

    payments = paymentResults.flat();
  }

  const totalEarnings = groupAmountsByCurrency(payments);

  const currentMonthPayments = payments.filter(
    (payment) =>
      payment.paid_at &&
      new Date(payment.paid_at) >= currentMonthStart
  );

  const previousMonthPayments = payments.filter(
    (payment) => {
      if (!payment.paid_at) return false;

      const paidDate = new Date(payment.paid_at);

      return (
        paidDate >= previousMonthStart &&
        paidDate < currentMonthStart
      );
    }
  );

  const currentMonthEarnings =
    groupAmountsByCurrency(currentMonthPayments);

  const previousMonthEarnings =
    groupAmountsByCurrency(previousMonthPayments);

  const monthlyBreakdown = getLastSixMonths().map(
    (month) => {
      const monthPayments = payments.filter((payment) => {
        if (!payment.paid_at) return false;

        return (
          getMonthKey(new Date(payment.paid_at)) === month.key
        );
      });

      return {
        month: month.key,
        label: month.label,
        earnings: groupAmountsByCurrency(monthPayments),
      };
    }
  );

  /* ------------------------------------------------------------------------ */
  /* 7. REVIEWS                                                               */
  /* ------------------------------------------------------------------------ */

  const reviews = await fetchAllRows(() =>
    supabase
      .from("coach_reviews")
      .select("id, rating, review_text, created_at, seeker_id")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
  );

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

  const recentReviews = reviews.slice(0, 5).map((review) => {
    const profile = seekerProfileMap.get(review.seeker_id);
    const client = seekerUserMap.get(review.seeker_id);

    return {
      id: review.id,
      rating: review.rating,
      reviewText: review.review_text,
      createdAt: review.created_at,

      clientName:
        profile?.full_name ||
        client?.name ||
        profile?.email ||
        client?.email ||
        "Client",
    };
  });

  /* ------------------------------------------------------------------------ */
  /* 8. PERFORMANCE                                                           */
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
  /* 9. FINAL RESPONSE                                                        */
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
      totalClients: clientIds.length,
      totalServices,
      activeServices,
      totalSessions,
      completedSessions,
      confirmedSessions,
      pendingSessions,
      cancelledSessions,
      upcomingSessions: upcomingSessions.length,
      totalEarnings,
      monthlyEarnings: currentMonthEarnings,
      averageRating,
      totalReviews,
    },

    upcomingSessions: formattedUpcomingSessions,

    recentClients: recentClients.slice(0, 5),

    earningsOverview: {
      currentMonth: currentMonthEarnings,
      previousMonth: previousMonthEarnings,
      monthlyBreakdown,
    },

    performanceOverview: {
      completionRate,
      cancellationRate,
    },

    recentReviews,
  };
};