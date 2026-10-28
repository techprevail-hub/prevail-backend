
import supabase from "../../services/supabaseClient.js";

const getClientDetails = async (seekerIds) => {
  if (!seekerIds.length) {
    return new Map();
  }

  const { data: profiles, error: profileError } = await supabase
    .from("Seeker_profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", seekerIds);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, email")
    .in("id", seekerIds);

  if (userError) {
    throw new Error(userError.message);
  }

  const profileMap = new Map(
    (profiles || []).map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const userMap = new Map(
    (users || []).map((user) => [user.id, user])
  );

  return new Map(
    seekerIds.map((seekerId) => {
      const profile = profileMap.get(seekerId);
      const user = userMap.get(seekerId);

      const fullName = [
        profile?.first_name,
        profile?.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      return [
        seekerId,
        {
          id: seekerId,
          name: fullName || user?.email || "Client",
          email: user?.email || null,
        },
      ];
    })
  );
};

/* -------------------------------------------------------------------------- */
/* GET COACH REVIEWS                                                          */
/* -------------------------------------------------------------------------- */

export const getCoachReviewsService = async ({
  coachId,
  page = 1,
  limit = 10,
  rating,
  search,
}) => {
  if (!coachId) {
    throw new Error("Coach ID is required");
  }

  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(limit) || 10)
  );

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("coach_reviews")
    .select(
      "id, session_id, coach_id, seeker_id, rating, review_text, created_at",
      { count: "exact" }
    )
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });

  if (rating !== undefined && rating !== null && rating !== "") {
    const ratingValue = Number(rating);

    if (
      !Number.isInteger(ratingValue) ||
      ratingValue < 1 ||
      ratingValue > 5
    ) {
      throw new Error("Rating must be between 1 and 5");
    }

    query = query.eq("rating", ratingValue);
  }

  if (search?.trim()) {
    query = query.ilike(
      "review_text",
      `%${search.trim()}%`
    );
  }

  const { data: reviews, error, count } = await query.range(
    from,
    to
  );

  if (error) {
    throw new Error(error.message);
  }

  const seekerIds = [
    ...new Set(
      (reviews || [])
        .map((review) => review.seeker_id)
        .filter(Boolean)
    ),
  ];

  const clients = await getClientDetails(seekerIds);

  const formattedReviews = (reviews || []).map((review) => ({
    id: review.id,
    sessionId: review.session_id,
    rating: review.rating,
    reviewText: review.review_text || "",
    createdAt: review.created_at,
    client: clients.get(review.seeker_id) || {
      id: review.seeker_id,
      name: "Client",
      email: null,
    },
  }));

  const total = count || 0;

  return {
    reviews: formattedReviews,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/* -------------------------------------------------------------------------- */
/* COACH REVIEWS SUMMARY                                                      */
/* -------------------------------------------------------------------------- */

export const getCoachReviewsSummaryService = async ({
  coachId,
}) => {
  if (!coachId) {
    throw new Error("Coach ID is required");
  }

  const { data: reviews, error } = await supabase
    .from("coach_reviews")
    .select("rating")
    .eq("coach_id", coachId);

  if (error) {
    throw new Error(error.message);
  }

  const ratings = reviews || [];
  const totalReviews = ratings.length;

  const ratingDistribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  let totalRating = 0;

  for (const review of ratings) {
    const value = Number(review.rating);

    if (value >= 1 && value <= 5) {
      ratingDistribution[value] += 1;
      totalRating += value;
    }
  }

  return {
    averageRating:
      totalReviews > 0
        ? Number((totalRating / totalReviews).toFixed(2))
        : 0,

    totalReviews,

    ratingDistribution,
  };
};
