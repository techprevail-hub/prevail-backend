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
    // Interview
    // ----------------------------------------
    const { data: interviewData, error: interviewError } = await supabase
      .from("interview_sessions")
      .select("id, score")
      .eq("user_id", userId);

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
    // Career Readiness Score
    // ----------------------------------------
    let careerReadinessScore = 0;

    if (milestones.resume) careerReadinessScore += 25;
    if (milestones.linkedin) careerReadinessScore += 20;
    if (milestones.headshot) careerReadinessScore += 15;
    if (milestones.interview) careerReadinessScore += 20;
    if (milestones.coach) careerReadinessScore += 20;

    const careerReady = careerReadinessScore === 100;

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

      milestones,

      resume: {
        completed: milestones.resume,
        score: resumeData?.[0]?.score ?? 0,
        atsScore: resumeData?.[0]?.ats_score ?? 0,
      },

      linkedin: {
        completed: milestones.linkedin,
        score: linkedinData?.[0]?.score ?? 0,
      },

      headshot: {
        completed: milestones.headshot,
        count: headshotData.length,
      },

      interview: {
        completed: milestones.interview,
        count: interviewData.length,
        score: interviewData?.[0]?.score ?? 0,
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