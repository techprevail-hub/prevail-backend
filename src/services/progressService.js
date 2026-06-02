import supabase from "./supabaseClient.js";

export const calculateProgress = async (userId) => {
  try {
    // ----------------------------------------
    // Fetch latest Resume Analysis
    // ----------------------------------------
    const { data: resumeData, error: resumeError } =
      await supabase
        .from("resume_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

    if (resumeError) {
      throw new Error(
        `Resume fetch failed: ${resumeError.message}`
      );
    }

    // ----------------------------------------
    // Fetch latest LinkedIn Analysis
    // ----------------------------------------
    const { data: linkedinData, error: linkedinError } =
      await supabase
        .from("linkedin_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

    if (linkedinError) {
      throw new Error(
        `LinkedIn fetch failed: ${linkedinError.message}`
      );
    }

    // ----------------------------------------
    // Fetch latest Headshot
    // ----------------------------------------
    const { data: headshotData, error: headshotError } =
      await supabase
        .from("headshot")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

    if (headshotError) {
      throw new Error(
        `Headshot fetch failed: ${headshotError.message}`
      );
    }

    // ----------------------------------------
    // Fetch latest Interview Session
    // ----------------------------------------
    const { data: interviewData, error: interviewError } =
      await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

    if (interviewError) {
      throw new Error(
        `Interview fetch failed: ${interviewError.message}`
      );
    }

    // ----------------------------------------
    // Completion Status
    // ----------------------------------------
    const milestones = {
      resume: (resumeData || []).length > 0,
      linkedin: (linkedinData || []).length > 0,
      headshot: (headshotData || []).length > 0,
      interview: (interviewData || []).length > 0,
    };

    // ----------------------------------------
    // Career Readiness Score
    // ----------------------------------------
    let careerReadinessScore = 0;

    if (milestones.resume) careerReadinessScore += 25;
    if (milestones.linkedin) careerReadinessScore += 25;
    if (milestones.headshot) careerReadinessScore += 25;
    if (milestones.interview) careerReadinessScore += 25;

    // ----------------------------------------
    // Career Ready Status
    // ----------------------------------------
    const careerReady =
      careerReadinessScore >= 75;

    // ----------------------------------------
    // Progress Timeline
    // ----------------------------------------
    const progressTimeline = [
      {
        title: "Resume Built",
        completed: milestones.resume,
      },
      {
        title: "LinkedIn Optimized",
        completed: milestones.linkedin,
      },
      {
        title: "Professional Headshot Created",
        completed: milestones.headshot,
      },
      {
        title: "Mock Interview Completed",
        completed: milestones.interview,
      },
      {
        title: "Career Ready",
        completed: careerReady,
      },
    ];

    // ----------------------------------------
    // Return Response
    // ----------------------------------------
    return {
      careerReadinessScore,
      careerReady,

      milestones,

      progressTimeline,

      latestResume:
        resumeData?.[0] || null,

      latestLinkedIn:
        linkedinData?.[0] || null,

      latestHeadshot:
        headshotData?.[0] || null,

      latestInterview:
        interviewData?.[0] || null,
    };

  } catch (error) {
    console.error(
      "Progress Service Error:",
      error
    );

    throw error;
  }
};