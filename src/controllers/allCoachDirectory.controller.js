
import supabase from "../services/supabaseClient.js";

// --------------------------------------------------
// GET ALL COACHES
// GET /api/coaches?page=1&limit=12
// --------------------------------------------------
export const getAllCoaches = async (req, res) => {
  const startedAt = Date.now();

  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    // Keep the page size bounded to avoid large responses.
    const limit = Math.min(
      24,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 12)
    );

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. Fetch only the requested page of coach accounts.
    const { data: users, error: usersError, count } =
      await supabase
        .from("users")
        .select("id, name", { count: "exact" })
        .eq("role", "coach")
        .order("name", { ascending: true })
        .range(from, to);

    if (usersError) {
      throw usersError;
    }

    const coaches = users || [];
    const coachIds = coaches.map((coach) => coach.id);

    // No need to query profiles/services if the page is empty.
    if (coachIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // 2. Fetch profiles and active services in parallel.
    const [profilesResult, servicesResult] = await Promise.all([
      supabase
        .from("coach_profiles")
        .select(
          "user_id, profile_image_url, headline, bio, specialization, experience_years, qualifications, languages, linkedin_url"
        )
        .in("user_id", coachIds),

      supabase
        .from("coach_services")
        .select(
          "id, coach_id, name, description, session_type, duration_minutes, price, currency, is_free"
        )
        .in("coach_id", coachIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

    if (profilesResult.error) {
      throw profilesResult.error;
    }

    if (servicesResult.error) {
      throw servicesResult.error;
    }

    // 3. Index profiles by user_id for fast lookups.
    const profilesByCoachId = new Map(
      (profilesResult.data || []).map((profile) => [
        profile.user_id,
        profile,
      ])
    );

    // 4. Group services by coach_id.
    const servicesByCoachId = new Map();

    for (const service of servicesResult.data || []) {
      const formattedService = {
        id: service.id,
        name: service.name,
        description: service.description,
        sessionType: service.session_type,
        durationMinutes: service.duration_minutes,
        price: Number(service.price),
        currency: service.currency,
        isFree: service.is_free,
      };

      const existing = servicesByCoachId.get(service.coach_id) || [];
      existing.push(formattedService);
      servicesByCoachId.set(service.coach_id, existing);
    }

    // 5. Combine account, profile and service data.
    const result = coaches.map((coach) => {
      const profile = profilesByCoachId.get(coach.id);

      return {
        id: coach.id,
        name: coach.name || "",
        profileCompleted: Boolean(
          profile &&
          profile.headline?.trim() &&
          profile.specialization?.trim() &&
          profile.bio?.trim()
        ),
        profile: profile
          ? {
              profileImageUrl: profile.profile_image_url || "",
              headline: profile.headline || "",
              bio: profile.bio || "",
              specialization: profile.specialization || "",
              experienceYears: profile.experience_years || 0,
              qualifications: profile.qualifications || "",
              languages: profile.languages || [],
              linkedinUrl: profile.linkedin_url || "",
            }
          : null,
        services: servicesByCoachId.get(coach.id) || [],
      };
    });

    // Log timing so we can measure actual API performance.
    console.info(
      `[getAllCoaches] ${Date.now() - startedAt}ms | page=${page} | returned=${result.length}`
    );

    return res.status(200).json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("[getAllCoaches] Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch coaches.",
    });
  }
};
