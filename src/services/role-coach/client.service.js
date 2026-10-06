// src/services/role-coach/client.service.js

import supabase from "../../services/supabaseClient.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const formatClient = ({
  profile,
  user,
  sessions,
}) => {
  const sortedSessions = [...sessions].sort((a, b) => {
    const dateA = new Date(
      `${a.session_date}T${a.start_time || "00:00:00"}`
    ).getTime();

    const dateB = new Date(
      `${b.session_date}T${b.start_time || "00:00:00"}`
    ).getTime();

    return dateB - dateA;
  });

  const lastSession = sortedSessions[0] || null;

  return {
    id: profile?.user_id || user?.id,
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    name: [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ") || user?.email || "Client",
    email: user?.email || null,
    headline: profile?.headline || null,
    careerStage: profile?.career_stage || null,
    targetRole: profile?.target_role || null,
    targetIndustry: profile?.target_industry || null,
    location: profile?.location || null,
    avatarUrl: profile?.avatar_url || null,

    totalSessions: sessions.length,
    completedSessions: sessions.filter(
      (session) => session.status === "completed"
    ).length,
    cancelledSessions: sessions.filter(
      (session) => session.status === "cancelled"
    ).length,

    lastSession: lastSession
      ? {
          id: lastSession.id,
          sessionDate: lastSession.session_date,
          startTime: lastSession.start_time,
          endTime: lastSession.end_time,
          status: lastSession.status,
        }
      : null,
  };
};

/* -------------------------------------------------------------------------- */
/* GET CLIENTS                                                                */
/* -------------------------------------------------------------------------- */

export const getCoachClientsService = async ({
  coachId,
}) => {
  if (!coachId) {
    throw createError("Coach ID is required");
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("coach_sessions")
    .select(`
      id,
      seeker_id,
      session_date,
      start_time,
      end_time,
      status
    `)
    .eq("coach_id", coachId)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (sessionsError) {
    throw createError(
      sessionsError.message,
      500
    );
  }

  if (!sessions?.length) {
    return [];
  }

  // Get unique clients
  const clientIds = [
    ...new Set(
      sessions
        .map((session) => session.seeker_id)
        .filter(Boolean)
    ),
  ];

  if (!clientIds.length) {
    return [];
  }

  // Get seeker profiles
  const { data: profiles, error: profileError } =
    await supabase
      .from("seeker_profiles")
      .select(`
        user_id,
        first_name,
        last_name,
        headline,
        career_stage,
        target_role,
        target_industry,
        location,
        avatar_url
      `)
      .in("user_id", clientIds);

  if (profileError) {
    throw createError(
      profileError.message,
      500
    );
  }

  // Get user information
  const { data: users, error: usersError } =
    await supabase
      .from("users")
      .select("id, email")
      .in("id", clientIds);

  if (usersError) {
    throw createError(
      usersError.message,
      500
    );
  }

  const profileMap = new Map(
    (profiles || []).map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const userMap = new Map(
    (users || []).map((user) => [
      user.id,
      user,
    ])
  );

  // Group sessions by seeker
  const sessionsByClient = sessions.reduce(
    (map, session) => {
      if (!map.has(session.seeker_id)) {
        map.set(session.seeker_id, []);
      }

      map.get(session.seeker_id).push(session);
      return map;
    },
    new Map()
  );

  return clientIds.map((clientId) =>
    formatClient({
      profile: profileMap.get(clientId),
      user: userMap.get(clientId),
      sessions: sessionsByClient.get(clientId) || [],
    })
  );
};

/* -------------------------------------------------------------------------- */
/* GET CLIENT BY ID                                                           */
/* -------------------------------------------------------------------------- */

export const getCoachClientByIdService = async ({
  coachId,
  clientId,
}) => {
  if (!coachId) {
    throw createError("Coach ID is required");
  }

  if (!clientId) {
    throw createError("Client ID is required");
  }

  // Make sure this seeker actually has a session with this coach
  const { data: sessions, error: sessionsError } = await supabase
    .from("coach_sessions")
    .select(`
      id,
      seeker_id,
      session_date,
      start_time,
      end_time,
      status,
      service_name,
      service_id
    `)
    .eq("coach_id", coachId)
    .eq("seeker_id", clientId)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (sessionsError) {
    throw createError(
      sessionsError.message,
      500
    );
  }

  if (!sessions?.length) {
    throw createError(
      "Client not found for this coach",
      404
    );
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("seeker_profiles")
      .select(`
        user_id,
        first_name,
        last_name,
        headline,
        bio,
        career_stage,
        target_role,
        target_industry,
        location,
        linkedin_url,
        avatar_url
      `)
      .eq("user_id", clientId)
      .maybeSingle();

  if (profileError) {
    throw createError(
      profileError.message,
      500
    );
  }

  const { data: user, error: userError } =
    await supabase
      .from("users")
      .select("id, email")
      .eq("id", clientId)
      .maybeSingle();

  if (userError) {
    throw createError(
      userError.message,
      500
    );
  }

  const client = formatClient({
    profile,
    user,
    sessions,
  });

  return {
    ...client,
    sessions: sessions.map((session) => ({
      id: session.id,
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
      status: session.status,
      serviceId: session.service_id,
      serviceName: session.service_name,
    })),
  };
};