import supabase from "../../services/supabaseClient.js";

/**
 * Calculate average safely
 */
const calculateAverage = (values) => {
  const validValues = values
    .map(Number)
    .filter((value) => !Number.isNaN(value));

  if (validValues.length === 0) {
    return 0;
  }

  return Math.round(
    (validValues.reduce((sum, value) => sum + value, 0) /
      validValues.length) *
      10
  ) / 10;
};

/**
 * Calculate Career Readiness category
 *
 * 75 - 100  => Ready
 * 50 - 74   => Developing
 * 0 - 49    => Needs Support
 */
const getCareerReadinessCategory = (score) => {
  if (score >= 75) {
    return "ready";
  }

  if (score >= 50) {
    return "developing";
  }

  return "needs_support";
};

/**
 * Get latest record for every student
 */
const getLatestByStudent = (records = [], studentIdField = "user_id") => {
  const map = new Map();

  records.forEach((record) => {
    const studentId = record?.[studentIdField];

    if (!studentId) {
      return;
    }

    const existing = map.get(studentId);

    if (!existing) {
      map.set(studentId, record);
      return;
    }

    const existingDate = new Date(
      existing.created_at || existing.updated_at || 0
    ).getTime();

    const currentDate = new Date(
      record.created_at || record.updated_at || 0
    ).getTime();

    if (currentDate > existingDate) {
      map.set(studentId, record);
    }
  });

  return map;
};

/**
 * Get institute dashboard
 *
 * This service aggregates:
 * - Students
 * - Coaches
 * - Career Readiness
 * - Progress
 * - Placement
 * - NPS
 * - Students needing attention
 */
export const getInstituteDashboardService = async (instituteId) => {
  try {
    if (!instituteId) {
      throw new Error("Institute ID is required.");
    }

    // ============================================================
    // 1. GET ACCEPTED STUDENTS
    // ============================================================

    const { data: students, error: studentsError } = await supabase
      .from("student_invitations")
      .select(
        `
        id,
        student_name,
        email,
        course,
        branch,
        batch,
        status,
        created_at
        `
      )
      .eq("institute_id", instituteId)
      .eq("status", "accepted");

    if (studentsError) {
      throw new Error(
        `Failed to fetch institute students: ${studentsError.message}`
      );
    }

    const acceptedStudents = students || [];

    const totalStudents = acceptedStudents.length;

    // ============================================================
    // 2. GET STUDENT USER IDS
    // ============================================================

    const studentEmails = acceptedStudents
      .map((student) => student.email?.toLowerCase())
      .filter(Boolean);

    let users = [];

    if (studentEmails.length > 0) {
      const { data: userData, error: usersError } = await supabase
        .from("users")
        .select("id, email")
        .in("email", studentEmails);

      if (usersError) {
        throw new Error(
          `Failed to fetch student users: ${usersError.message}`
        );
      }

      users = userData || [];
    }

    const userByEmail = new Map(
      users.map((user) => [
        user.email?.toLowerCase(),
        user,
      ])
    );

    const studentUserIds = users
      .map((user) => user.id)
      .filter(Boolean);

    // ============================================================
    // 3. GET COACH COUNT
    // ============================================================

    const { count: totalCoaches, error: coachesError } =
      await supabase
        .from("coach_invitations")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("institute_id", instituteId)
        .eq("status", "accepted");

    if (coachesError) {
      throw new Error(
        `Failed to fetch coaches: ${coachesError.message}`
      );
    }

    // ============================================================
    // 4. GET RESUME ANALYSES
    // ============================================================

    let resumeAnalyses = [];

    if (studentUserIds.length > 0) {
      const { data, error } = await supabase
        .from("resume_analyses")
        .select("*")
        .in("user_id", studentUserIds)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw new Error(
          `Failed to fetch resume analyses: ${error.message}`
        );
      }

      resumeAnalyses = data || [];
    }

    // ============================================================
    // 5. GET LINKEDIN ANALYSES
    // ============================================================

    let linkedinAnalyses = [];

    if (studentUserIds.length > 0) {
      const { data, error } = await supabase
        .from("linkedin_analyses")
        .select("*")
        .in("user_id", studentUserIds)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw new Error(
          `Failed to fetch LinkedIn analyses: ${error.message}`
        );
      }

      linkedinAnalyses = data || [];
    }

    // ============================================================
    // 6. GET COMPLETED INTERVIEWS
    // ============================================================

    let interviewSessions = [];

    if (studentUserIds.length > 0) {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .in("user_id", studentUserIds)
        .eq("status", "completed")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw new Error(
          `Failed to fetch interview sessions: ${error.message}`
        );
      }

      interviewSessions = data || [];
    }

    // ============================================================
    // 7. BUILD LATEST ANALYSIS MAPS
    // ============================================================

    const latestResumeMap = getLatestByStudent(
      resumeAnalyses,
      "user_id"
    );

    const latestLinkedinMap = getLatestByStudent(
      linkedinAnalyses,
      "user_id"
    );

    const latestInterviewMap = getLatestByStudent(
      interviewSessions,
      "user_id"
    );

    // ============================================================
    // 8. CAREER READINESS
    // ============================================================

    const studentReadiness = [];

    studentUserIds.forEach((studentId) => {
      const resume = latestResumeMap.get(studentId);
      const linkedin = latestLinkedinMap.get(studentId);
      const interview = latestInterviewMap.get(studentId);

      const scores = [];

      // Resume score
      if (resume) {
        const score =
          resume.overall_score ??
          resume.score ??
          resume.resume_score;

        if (score !== null && score !== undefined) {
          const numericScore = Number(score);

          if (!Number.isNaN(numericScore)) {
            scores.push(numericScore);
          }
        }
      }

      // LinkedIn score
      if (linkedin) {
        const score =
          linkedin.overall_score ??
          linkedin.score ??
          linkedin.linkedin_score;

        if (score !== null && score !== undefined) {
          const numericScore = Number(score);

          if (!Number.isNaN(numericScore)) {
            scores.push(numericScore);
          }
        }
      }

      // Interview score
      if (interview) {
        const score =
          interview.overall_score ??
          interview.score ??
          interview.interview_score;

        if (score !== null && score !== undefined) {
          const numericScore = Number(score);

          if (!Number.isNaN(numericScore)) {
            scores.push(numericScore);
          }
        }
      }

      if (scores.length === 0) {
        return;
      }

      const score = Math.round(
        calculateAverage(scores)
      );

      studentReadiness.push({
        studentId,
        score,
        category: getCareerReadinessCategory(score),
      });
    });

    const careerReadinessScore = Math.round(
      calculateAverage(
        studentReadiness.map(
          (student) => student.score
        )
      )
    );

    const ready = studentReadiness.filter(
      (student) => student.category === "ready"
    ).length;

    const developing = studentReadiness.filter(
      (student) => student.category === "developing"
    ).length;

    const needsSupport = studentReadiness.filter(
      (student) =>
        student.category === "needs_support"
    ).length;

    // ============================================================
    // 9. PROGRESS
    // ============================================================

    const progressData = acceptedStudents.map(
      (student) => {
        const user = userByEmail.get(
          student.email?.toLowerCase()
        );

        if (!user) {
          return {
            studentId: null,
            progress: 0,
          };
        }

        const userId = user.id;

        const accountActivated = true;

        const resumeDone =
          !!latestResumeMap.get(userId);

        const linkedinDone =
          !!latestLinkedinMap.get(userId);

        const interviewDone =
          !!latestInterviewMap.get(userId);

        const completedSteps = [
          accountActivated,
          resumeDone,
          linkedinDone,
          interviewDone,
        ].filter(Boolean).length;

        const progress = Math.round(
          (completedSteps / 4) * 100
        );

        return {
          studentId: userId,
          progress,
        };
      }
    );

    const averageProgress = Math.round(
      calculateAverage(
        progressData.map(
          (student) => student.progress
        )
      )
    );

    const onTrack = progressData.filter(
      (student) => student.progress >= 75
    ).length;

    const progressNeedsAttention =
      progressData.filter(
        (student) => student.progress < 50
      ).length;

    // ============================================================
    // 10. PLACEMENT
    // ============================================================

    const { data: placements, error: placementError } =
      await supabase
        .from("placement_records")
        .select(
          `
          id,
          student_id,
          placement_status,
          placement_type,
          company_name,
          job_role,
          package,
          placement_date
          `
        )
        .eq("institute_id", instituteId);

    if (placementError) {
      throw new Error(
        `Failed to fetch placement data: ${placementError.message}`
      );
    }

    const placementRecords = placements || [];

    const placedStudents = placementRecords.filter(
      (record) =>
        record.placement_status === "placed"
    );

    const notPlacedStudents = placementRecords.filter(
      (record) =>
        record.placement_status === "not_placed"
    );

    const submitted =
      placementRecords.length;

    const notSubmitted = Math.max(
      totalStudents - submitted,
      0
    );

    const campusPlaced = placedStudents.filter(
      (record) =>
        record.placement_type === "campus"
    ).length;

    const offCampusPlaced = placedStudents.filter(
      (record) =>
        record.placement_type === "off_campus"
    ).length;

    const placementRate =
      totalStudents > 0
        ? Math.round(
            (placedStudents.length /
              totalStudents) *
              100
          )
        : 0;

    const averagePackage = calculateAverage(
      placedStudents
        .map((record) => Number(record.package))
        .filter(
          (value) =>
            !Number.isNaN(value) &&
            value > 0
        )
    );

    // ============================================================
    // 11. NPS
    // ============================================================
    //
    // NPS table/service implementation can vary.
    // This section intentionally looks for a common
    // student/institute response structure.
    //
    // If your existing NPS service uses a different
    // table structure, this part should be connected
    // to that service rather than changing NPS logic.
    // ============================================================

    let npsAverageScore = 0;

    const { data: npsResponses } = await supabase
      .from("nps_responses")
      .select("*")
      .eq("institute_id", instituteId);

    if (npsResponses?.length) {
      const scores = npsResponses
        .map(
          (response) =>
            response.score ??
            response.nps_score ??
            response.rating
        )
        .map(Number)
        .filter(
          (score) =>
            !Number.isNaN(score) &&
            score >= 0 &&
            score <= 10
        );

      if (scores.length > 0) {
        npsAverageScore = Math.round(
          calculateAverage(scores) * 10
        ) / 10;
      }
    }

    // ============================================================
    // 12. STUDENTS NEEDING ATTENTION
    // ============================================================

    const studentsNeedingAttention = [];

    acceptedStudents.forEach((student) => {
      const user = userByEmail.get(
        student.email?.toLowerCase()
      );

      if (!user) {
        return;
      }

      const userId = user.id;

      const readiness = studentReadiness.find(
        (item) =>
          item.studentId === userId
      );

      const progress = progressData.find(
        (item) =>
          item.studentId === userId
      );

      const placement = placementRecords.find(
        (record) =>
          record.student_id === userId
      );

      const reasons = [];

      // Career readiness issue
      if (
        readiness &&
        readiness.score < 50
      ) {
        reasons.push(
          "Career readiness needs support"
        );
      }

      // Progress issue
      if (
        progress &&
        progress.progress < 50
      ) {
        reasons.push(
          "Career progress needs attention"
        );
      }

      // Placement not submitted
      if (!placement) {
        reasons.push(
          "Placement details not submitted"
        );
      }

      if (reasons.length > 0) {
        studentsNeedingAttention.push({
          studentId: userId,
          name: student.student_name,
          email: student.email,
          course: student.course,
          branch: student.branch,
          reasons,
        });
      }
    });

    // ============================================================
    // 13. FINAL DASHBOARD RESPONSE
    // ============================================================

    return {
      overview: {
        totalStudents,
        totalCoaches: totalCoaches || 0,
        careerReadiness: careerReadinessScore,
        averageProgress,
        placementRate,
        averagePackage,
        needsAttention:
          studentsNeedingAttention.length,
      },

      careerReadiness: {
        overall: careerReadinessScore,
        ready,
        developing,
        needsSupport,
      },

      progress: {
        averageProgress,
        onTrack,
        needsAttention:
          progressNeedsAttention,
      },

      placement: {
        placementRate,
        placedStudents:
          placedStudents.length,
        averagePackage,
        campusPlaced,
        offCampusPlaced,
        submitted,
        notPlaced:
          notPlacedStudents.length,
        notSubmitted,
      },

      nps: {
        averageScore: npsAverageScore,
      },

      studentsNeedingAttention,

      coursePerformance: [],
    };
  } catch (error) {
    console.error(
      "❌ getInstituteDashboardService error:",
      error
    );

    throw error;
  }
};