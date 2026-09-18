import supabase from "../../services/supabaseClient.js";

/* =========================================================
   Helpers
========================================================= */

const average = (values) => {
  const valid = values
    .map(Number)
    .filter((v) => !Number.isNaN(v));

  if (!valid.length) return 0;

  return Math.round(
    (valid.reduce((a, b) => a + b, 0) / valid.length) * 10
  ) / 10;
};

const latestByUser = (records = []) => {
  const map = new Map();

  records.forEach((record) => {
    if (!record.user_id || map.has(record.user_id)) return;
    map.set(record.user_id, record);
  });

  return map;
};

const readinessCategory = (score) => {
  if (score >= 75) return "ready";
  if (score >= 50) return "developing";
  return "needs_support";
};

/* =========================================================
   NPS
========================================================= */

const npsScore = (value, type) => {
  const n = Number(value);

  if (Number.isNaN(n)) return null;

  if (type === "recommendation" && n >= 0 && n <= 10) {
    return n;
  }

  if (type === "rating" && n >= 1 && n <= 5) {
    return n * 2;
  }

  return null;
};

const calculateNpsAverage = (responses, questions) => {
  if (!responses?.length || !questions?.length) return 0;

  const questionMap = new Map(
    questions.map((q) => [q.id, q.question_type])
  );

  const responseScores = [];

  responses.forEach((response) => {
    const scores = [];

    Object.entries(response.answers || {}).forEach(
      ([questionId, value]) => {
        const score = npsScore(
          value,
          questionMap.get(questionId)
        );

        if (score !== null) scores.push(score);
      }
    );

    if (scores.length) {
      responseScores.push(average(scores));
    }
  });

  return average(responseScores);
};

/* =========================================================
   Month-wise Trend
========================================================= */

const getTrendData = (
  students,
  userByEmail,
  userIds,
  resumes,
  linkedins,
  interviews
) => {
  const now = new Date();
  const result = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    const endDate = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const getLatest = (records) => {
      const map = new Map();

      records.forEach((record) => {
        if (
          !record.user_id ||
          !record.created_at ||
          new Date(record.created_at) > endDate
        ) {
          return;
        }

        const existing = map.get(record.user_id);

        if (
          !existing ||
          new Date(record.created_at) >
            new Date(existing.created_at)
        ) {
          map.set(record.user_id, record);
        }
      });

      return map;
    };

    const latestResume = getLatest(resumes);
    const latestLinkedin = getLatest(linkedins);
    const latestInterview = getLatest(interviews);

    /* ---------------- Progress ---------------- */

    const progressValues = students
      .map((student) => {
        const user = userByEmail.get(
          student.email?.toLowerCase()
        );

        if (!user) return null;

        const completed = [
          true,
          !!latestResume.get(user.id),
          !!latestLinkedin.get(user.id),
          !!latestInterview.get(user.id),
        ].filter(Boolean).length;

        return Math.round(
          (completed / 4) * 100
        );
      })
      .filter((value) => value !== null);

    /* ---------------- Career Readiness ---------------- */

    const readinessValues = userIds
      .map((userId) => {
        const scores = [
          latestResume.get(userId)?.score,
          latestLinkedin.get(userId)?.score,
          latestInterview.get(userId)?.score,
        ]
          .filter(
            (score) =>
              score !== null &&
              score !== undefined &&
              !Number.isNaN(Number(score))
          )
          .map(Number);

        return scores.length
          ? Math.round(average(scores))
          : null;
      })
      .filter((value) => value !== null);

    result.push({
      month: date.toLocaleString("en-US", {
        month: "short",
      }),
      progress: Math.round(
        average(progressValues)
      ),
      careerReadiness: Math.round(
        average(readinessValues)
      ),
    });
  }

  return result;
};

/* =========================================================
   Dashboard
========================================================= */

export const getInstituteDashboardService = async (
  instituteId
) => {
  if (!instituteId) {
    throw new Error("Institute ID is required.");
  }

  try {
    /* =====================================================
       Students
    ===================================================== */

    const { data: students, error: studentError } =
      await supabase
        .from("student_invitations")
        .select(
          "id, student_name, email, course, branch, batch"
        )
        .eq("institute_id", instituteId)
        .eq("status", "accepted");

    if (studentError) {
      throw new Error(
        `Failed to fetch students: ${studentError.message}`
      );
    }

    const acceptedStudents = students || [];
    const totalStudents = acceptedStudents.length;

    /* =====================================================
       Users
    ===================================================== */

    const emails = acceptedStudents
      .map((student) =>
        student.email?.toLowerCase()
      )
      .filter(Boolean);

    let users = [];

    if (emails.length) {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .in("email", emails);

      if (error) {
        throw new Error(
          `Failed to fetch users: ${error.message}`
        );
      }

      users = data || [];
    }

    const userByEmail = new Map(
      users.map((user) => [
        user.email?.toLowerCase(),
        user,
      ])
    );

    const userIds = users
      .map((user) => user.id)
      .filter(Boolean);

    /* =====================================================
       Coaches
    ===================================================== */

    const { count: totalCoaches, error: coachError } =
      await supabase
        .from("coach_invitations")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("institute_id", instituteId)
        .eq("status", "accepted");

    if (coachError) {
      throw new Error(
        `Failed to fetch coaches: ${coachError.message}`
      );
    }

    /* =====================================================
       Career Data
    ===================================================== */

    let resumes = [];
    let linkedins = [];
    let interviews = [];

    if (userIds.length) {
      const [
        resumeResult,
        linkedinResult,
        interviewResult,
      ] = await Promise.all([
        supabase
          .from("resume_analyses")
          .select(
            "user_id, score, created_at"
          )
          .in("user_id", userIds)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("linkedin_analyses")
          .select(
            "user_id, score, created_at"
          )
          .in("user_id", userIds)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("interview_sessions")
          .select(
            "user_id, score, created_at, is_completed"
          )
          .in("user_id", userIds)
          .eq("is_completed", true)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (resumeResult.error) {
        throw new Error(
          `Failed to fetch resume analyses: ${resumeResult.error.message}`
        );
      }

      if (linkedinResult.error) {
        throw new Error(
          `Failed to fetch LinkedIn analyses: ${linkedinResult.error.message}`
        );
      }

      if (interviewResult.error) {
        throw new Error(
          `Failed to fetch interview sessions: ${interviewResult.error.message}`
        );
      }

      resumes = resumeResult.data || [];
      linkedins = linkedinResult.data || [];
      interviews = interviewResult.data || [];
    }

    const latestResume = latestByUser(resumes);
    const latestLinkedin = latestByUser(linkedins);
    const latestInterview = latestByUser(interviews);

    /* =====================================================
       Career Readiness
    ===================================================== */

    const readiness = [];

    userIds.forEach((userId) => {
      const scores = [
        latestResume.get(userId)?.score,
        latestLinkedin.get(userId)?.score,
        latestInterview.get(userId)?.score,
      ]
        .filter(
          (score) =>
            score !== null &&
            score !== undefined &&
            !Number.isNaN(Number(score))
        )
        .map(Number);

      if (!scores.length) return;

      const score = Math.round(
        average(scores)
      );

      readiness.push({
        studentId: userId,
        score,
        category: readinessCategory(score),
      });
    });

    const careerReadiness = Math.round(
      average(
        readiness.map((item) => item.score)
      )
    );

    const ready = readiness.filter(
      (item) => item.category === "ready"
    ).length;

    const developing = readiness.filter(
      (item) => item.category === "developing"
    ).length;

    const needsSupport = readiness.filter(
      (item) => item.category === "needs_support"
    ).length;

    /* =====================================================
       Progress
    ===================================================== */

    const progress = acceptedStudents.map(
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

        const completed = [
          true,
          !!latestResume.get(user.id),
          !!latestLinkedin.get(user.id),
          !!latestInterview.get(user.id),
        ].filter(Boolean).length;

        return {
          studentId: user.id,
          progress: Math.round(
            (completed / 4) * 100
          ),
        };
      }
    );

    const averageProgress = Math.round(
      average(
        progress.map((item) => item.progress)
      )
    );

    const onTrack = progress.filter(
      (item) => item.progress >= 75
    ).length;

    const progressNeedsAttention =
      progress.filter(
        (item) => item.progress < 50
      ).length;

    /* =====================================================
       Trend Data
    ===================================================== */

    const trendData = getTrendData(
      acceptedStudents,
      userByEmail,
      userIds,
      resumes,
      linkedins,
      interviews
    );

    /* =====================================================
       Placement
    ===================================================== */

    const {
      data: placements,
      error: placementError,
    } = await supabase
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

    const placementRecords =
      placements || [];

    const placed =
      placementRecords.filter(
        (placement) =>
          placement.placement_status === "placed"
      );

    const notPlaced =
      placementRecords.filter(
        (placement) =>
          placement.placement_status === "not_placed"
      );

    const submitted =
      placementRecords.length;

    const notSubmitted = Math.max(
      totalStudents - submitted,
      0
    );

    const campusPlaced =
      placed.filter(
        (placement) =>
          placement.placement_type === "campus"
      ).length;

    const offCampusPlaced =
      placed.filter(
        (placement) =>
          placement.placement_type === "off_campus"
      ).length;

    const placementRate = totalStudents
      ? Math.round(
          (placed.length /
            totalStudents) *
            100
        )
      : 0;

    const averagePackage = average(
      placed
        .map((placement) =>
          Number(placement.package)
        )
        .filter(
          (value) =>
            !Number.isNaN(value) &&
            value > 0
        )
    );

    /* =====================================================
       NPS
    ===================================================== */

    const { data: surveys, error: surveyError } =
      await supabase
        .from("nps_surveys")
        .select("id, question_ids")
        .eq("institute_id", instituteId);

    if (surveyError) {
      throw new Error(
        `Failed to fetch NPS surveys: ${surveyError.message}`
      );
    }

    const {
      data: responses,
      error: responseError,
    } = await supabase
      .from("survey_responses")
      .select("answers")
      .eq("institute_id", instituteId);

    if (responseError) {
      throw new Error(
        `Failed to fetch NPS responses: ${responseError.message}`
      );
    }

    const questionIds = [
      ...new Set(
        (surveys || []).flatMap(
          (survey) =>
            survey.question_ids || []
        )
      ),
    ];

    let questions = [];

    if (questionIds.length) {
      const { data, error } = await supabase
        .from("survey_questions")
        .select(
          "id, question_type"
        )
        .in("id", questionIds);

      if (error) {
        throw new Error(
          `Failed to fetch NPS questions: ${error.message}`
        );
      }

      questions = data || [];
    }

    const npsAverageScore =
      calculateNpsAverage(
        responses || [],
        questions
      );

    /* =====================================================
       Students Needing Attention
    ===================================================== */

    const studentsNeedingAttention = [];

    acceptedStudents.forEach(
      (student) => {
        const user =
          userByEmail.get(
            student.email?.toLowerCase()
          );

        if (!user) return;

        const reasons = [];

        const studentReadiness =
          readiness.find(
            (item) =>
              item.studentId === user.id
          );

        const studentProgress =
          progress.find(
            (item) =>
              item.studentId === user.id
          );

        const placement =
          placementRecords.find(
            (item) =>
              item.student_id === user.id
          );

        if (
          studentReadiness &&
          studentReadiness.score < 50
        ) {
          reasons.push(
            "Career readiness needs support"
          );
        }

        if (
          studentProgress &&
          studentProgress.progress < 50
        ) {
          reasons.push(
            "Career progress needs attention"
          );
        }

        if (!placement) {
          reasons.push(
            "Placement details not submitted"
          );
        }

        if (reasons.length) {
          studentsNeedingAttention.push({
            studentId: user.id,
            name: student.student_name,
            email: student.email,
            course: student.course,
            branch: student.branch,
            reasons,
          });
        }
      }
    );

    /* =====================================================
       Final Response
    ===================================================== */

    return {
      overview: {
        totalStudents,
        totalCoaches: totalCoaches || 0,
        careerReadiness,
        averageProgress,
        placementRate,
        averagePackage,
        needsAttention:
          studentsNeedingAttention.length,
      },

      careerReadiness: {
        overall: careerReadiness,
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
        placedStudents: placed.length,
        averagePackage,
        campusPlaced,
        offCampusPlaced,
        submitted,
        notPlaced: notPlaced.length,
        notSubmitted,
      },

      nps: {
        averageScore: npsAverageScore,
      },

      studentsNeedingAttention,

      coursePerformance: [],

      trendData,
    };
  } catch (error) {
    console.error(
      "❌ getInstituteDashboardService error:",
      error
    );

    throw error;
  }
};