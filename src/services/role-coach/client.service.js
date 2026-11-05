
import supabase from "../../services/supabaseClient.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const formatClient = ({ profile, user, sessions }) => {
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

  // Name is stored in the users table.
  const fullName =
    user?.name ||
    [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ") ||
    user?.email ||
    "Client";

  const nameParts = fullName.trim().split(/\s+/);

  const firstName =
    profile?.first_name || nameParts[0] || "";

  const lastName =
    profile?.last_name || nameParts.slice(1).join(" ");

  return {
    id: profile?.user_id || user?.id,

    firstName,
    lastName,
    name: fullName,

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

export const getCoachClientsService = async ({ coachId }) => {
  if (!coachId) {
    throw createError("Coach ID is required");
  }

  // 1. Get coach sessions
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
    throw createError(sessionsError.message, 500);
  }

  if (!sessions?.length) {
    return [];
  }

  // 2. Get unique client IDs
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

  // 3. Fetch seeker profiles.
  // Use * because the exact profile column structure is not established.
  const { data: profiles, error: profileError } = await supabase
    .from("Seeker-profiles")
    .select("*")
    .in("user_id", clientIds);

  if (profileError) {
    throw createError(profileError.message, 500);
  }

  // 4. Fetch user information from users table.
  // The user's name is stored here.
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", clientIds);

  if (usersError) {
    throw createError(usersError.message, 500);
  }

  // 5. Create lookup maps
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

  // 6. Group sessions by seeker
  const sessionsByClient = sessions.reduce((map, session) => {
    if (!map.has(session.seeker_id)) {
      map.set(session.seeker_id, []);
    }

    map.get(session.seeker_id).push(session);

    return map;
  }, new Map());

  // 7. Return formatted clients
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

  // 1. Verify that this seeker has sessions with this coach.
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
    throw createError(sessionsError.message, 500);
  }

  if (!sessions?.length) {
    throw createError(
      "Client not found for this coach",
      404
    );
  }

  // 2. Fetch seeker profile without assuming column names.
  const { data: profile, error: profileError } = await supabase
    .from("Seeker-profiles")
    .select("*")
    .eq("user_id", clientId)
    .maybeSingle();

  if (profileError) {
    throw createError(profileError.message, 500);
  }

  // 3. Fetch user information from users table.
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("id", clientId)
    .maybeSingle();

  if (userError) {
    throw createError(userError.message, 500);
  }

  // 4. Format client response.
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
