// src/services/role-coach/earnings.service.js

import supabase from "../../services/supabaseClient.js";

const formatEarning = (payment, session, client) => ({
  id: payment.id,
  sessionId: payment.session_id,

  date: session?.session_date || null,
  startTime: session?.start_time || null,
  endTime: session?.end_time || null,

  client: client || {
    id: session?.seeker_id || null,
    name: "Client",
    email: null,
  },

  service: {
    id: session?.service_id || null,
    name: session?.service_name || null,
    sessionType: session?.session_type || null,
  },

  amount: Number(payment.amount_gross || 0),
  platformFee: Number(payment.platform_fee || 0),
  netPayout: Number(payment.amount_net || 0),

  currency: payment.currency || "INR",
  status: payment.status,

  stripePaymentIntentId:
    payment.stripe_payment_intent_id || null,

  paidAt: payment.paid_at || null,
});

/* -------------------------------------------------------------------------- */
/* EARNINGS                                                                   */
/* -------------------------------------------------------------------------- */

export const getCoachEarningsService = async ({ coachId }) => {
  const { data: sessions, error: sessionError } = await supabase
    .from("coach_sessions")
    .select(`
      id,
      seeker_id,
      service_id,
      session_date,
      start_time,
      end_time,
      service_name,
      session_type,
      currency
    `)
    .eq("coach_id", coachId)
    .order("session_date", { ascending: false });

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!sessions?.length) {
    return [];
  }

  const sessionIds = sessions.map((item) => item.id);

  const { data: payments, error: paymentError } = await supabase
    .from("session_payments")
    .select(`
      id,
      session_id,
      amount_gross,
      platform_fee,
      amount_net,
      currency,
      stripe_payment_intent_id,
      status,
      paid_at
    `)
    .in("session_id", sessionIds);

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  if (!payments?.length) {
    return [];
  }

  const sessionMap = new Map(
    sessions.map((session) => [session.id, session])
  );

  const seekerIds = [
    ...new Set(
      sessions
        .map((session) => session.seeker_id)
        .filter(Boolean)
    ),
  ];

  const { data: profiles } = await supabase
    .from("seeker_profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", seekerIds);

  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .in("id", seekerIds);

  const profileMap = new Map(
    (profiles || []).map((item) => [
      item.user_id,
      item,
    ])
  );

  const userMap = new Map(
    (users || []).map((item) => [
      item.id,
      item,
    ])
  );

  return payments
    .map((payment) => {
      const session = sessionMap.get(
        payment.session_id
      );

      if (!session) {
        return null;
      }

      const profile = profileMap.get(
        session.seeker_id
      );

      const user = userMap.get(
        session.seeker_id
      );

      const name = [
        profile?.first_name,
        profile?.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      return formatEarning(
        payment,
        session,
        {
          id: session.seeker_id,
          name: name || user?.email || "Client",
          email: user?.email || null,
        }
      );
    })
    .filter(Boolean);
};

/* -------------------------------------------------------------------------- */
/* SUMMARY                                                                    */
/* -------------------------------------------------------------------------- */

export const getCoachEarningsSummaryService = async ({
  coachId,
}) => {
  const earnings =
    await getCoachEarningsService({
      coachId,
    });

  const paid = earnings.filter(
    (item) => item.status === "paid"
  );

  const pending = earnings.filter(
    (item) => item.status === "pending"
  );

  return {
    totalEarned: paid.reduce(
      (sum, item) => sum + item.netPayout,
      0
    ),

    pendingPayout: pending.reduce(
      (sum, item) => sum + item.netPayout,
      0
    ),

    totalSessions: earnings.length,

    paidSessions: paid.length,

    pendingSessions: pending.length,

    currency:
      earnings[0]?.currency || "INR",
  };
};

/* -------------------------------------------------------------------------- */
/* MONTHLY                                                                    */
/* -------------------------------------------------------------------------- */

export const getMonthlyEarningsService = async ({
  coachId,
  months = 6,
}) => {
  const earnings =
    await getCoachEarningsService({
      coachId,
    });

  const monthly = {};

  earnings
    .filter((item) => item.status === "paid")
    .forEach((item) => {
      if (!item.date) {
        return;
      }

      const month = item.date.slice(0, 7);

      if (!monthly[month]) {
        monthly[month] = {
          month,
          totalEarned: 0,
          platformFee: 0,
          sessionCount: 0,
        };
      }

      monthly[month].totalEarned +=
        item.netPayout;

      monthly[month].platformFee +=
        item.platformFee;

      monthly[month].sessionCount += 1;
    });

  return Object.values(monthly)
    .sort((a, b) =>
      b.month.localeCompare(a.month)
    )
    .slice(0, months);
};

/* -------------------------------------------------------------------------- */
/* PAYOUT INFO                                                                */
/* -------------------------------------------------------------------------- */

export const getCoachPayoutInfoService = async ({
  coachId,
}) => {
  const { data, error } = await supabase
    .from("coach_profiles")
    .select("stripe_account_id")
    .eq("user_id", coachId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    stripeConnected:
      Boolean(data?.stripe_account_id),

    stripeAccountId:
      data?.stripe_account_id || null,
  };
};