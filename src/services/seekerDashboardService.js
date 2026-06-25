import supabase from "./supabaseClient.js";

export const getDashboardData = async (userId) => {
  try {
    // ----------------------------------------
    // User Details
    // ----------------------------------------
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    // ----------------------------------------
    // Resume
    // ----------------------------------------
    const { data: resumeData, error: resumeError } = await supabase
      .from("resume_analyses")
      .select("score, ats_score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (resumeError) throw resumeError;

    // ----------------------------------------
    // LinkedIn
    // ----------------------------------------
    const { data: linkedinData, error: linkedinError } = await supabase
      .from("linkedin_analyses")
      .select("score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (linkedinError) throw linkedinError;

    // ----------------------------------------
    // Headshot
    // ----------------------------------------
    const { data: headshotData, error: headshotError } = await supabase
      .from("headshot")
      .select("id")
      .eq("user_id", userId);

    if (headshotError) throw headshotError;

    // ----------------------------------------
    // Interview - Get the latest interview score
    // ----------------------------------------
    const { data: interviewData, error: interviewError } = await supabase
      .from("interview_sessions")
      .select("id, score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (interviewError) throw interviewError;

    // ----------------------------------------
    // Coach
    // ----------------------------------------
    const { data: coachData, error: coachError } = await supabase
      .from("coach_chats")
      .select("id")
      .eq("user_id", userId);

    if (coachError) throw coachError;

    // ----------------------------------------
    // Milestones
    // ----------------------------------------
    const milestones = {
      resume: resumeData.length > 0,
      linkedin: linkedinData.length > 0,
      headshot: headshotData.length > 0,
      interview: interviewData.length > 0,
      coach: coachData.length > 0,
    };

    // ----------------------------------------
    // Scores
    // ----------------------------------------
    const resumeScore = resumeData?.[0]?.score ?? 0;
    const linkedinScore = linkedinData?.[0]?.score ?? 0;
    const interviewScore = interviewData?.[0]?.score ?? 0;

    const headshotScore = milestones.headshot ? 100 : 0;
    const coachScore = milestones.coach ? 100 : 0;

    // ----------------------------------------
    // Career Readiness Score (Weighted)
    // ----------------------------------------
    const careerReadinessScore = Math.round(
      resumeScore * 0.40 +
      linkedinScore * 0.25 +
      interviewScore * 0.20 +
      headshotScore * 0.075 +
      coachScore * 0.075
    );

    const careerReady = careerReadinessScore >= 90;

    // ----------------------------------------
    // Dashboard Progress
    // ----------------------------------------
    const progress = {
      completed: Object.values(milestones).filter(Boolean).length,
      total: Object.keys(milestones).length,
      percentage: careerReadinessScore,
    };

    // ----------------------------------------
    // Overall Performance Score
    // ----------------------------------------
    const overallScore = Math.round(
      resumeScore * 0.4 +
      linkedinScore * 0.3 +
      interviewScore * 0.2 +
      headshotScore * 0.05 +
      coachScore * 0.05
    );

    // ----------------------------------------
    // Return Dashboard Data
    // ----------------------------------------
    return {
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      },

      careerReadinessScore,
      careerReady,

      overallScore,

      progress,

      milestones,

      resume: {
        completed: milestones.resume,
        score: resumeScore,
        atsScore: resumeData?.[0]?.ats_score ?? 0,
      },

      linkedin: {
        completed: milestones.linkedin,
        score: linkedinScore,
      },

      headshot: {
        completed: milestones.headshot,
        count: headshotData.length,
      },

      interview: {
        completed: milestones.interview,
        count: interviewData.length,
        score: interviewScore,
      },

      coach: {
        completed: milestones.coach,
        count: coachData.length,
      },
    };
  } catch (error) {
    console.error("Dashboard Service Error:", error);
    throw error;
  }
};