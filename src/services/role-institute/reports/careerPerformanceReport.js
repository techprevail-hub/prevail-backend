import supabase from "../supabaseClient.js";

/**
 * CAREER PERFORMANCE REPORT
 *
 * Returns:
 * - Total students
 * - Average resume score
 * - Average LinkedIn score
 * - Average interview score
 * - Overall average performance
 * - Individual student performance
 */

export const getCareerPerformanceReportService = async (
  instituteId
) => {
  try {
    if (!instituteId) {
      throw new Error("Institute ID is required.");
    }

    /**
     * STEP 1:
     * Get all accepted students for this institute
     */
    const {
      data: invitations,
      error: invitationError,
    } = await supabase
      .from("student_invitations")
      .select(`
        id,
        student_name,
        email,
        course,
        branch,
        batch,
        status,
        accepted_at
      `)
      .eq("institute_id", instituteId)
      .eq("status", "accepted");

    if (invitationError) {
      console.error(
        "❌ Error fetching institute students:",
        invitationError
      );

      throw new Error(
        "Failed to fetch institute students."
      );
    }

    /**
     * If no students are available
     */
    if (!invitations || invitations.length === 0) {
      return {
        summary: {
          totalStudents: 0,
          averageResumeScore: 0,
          averageLinkedinScore: 0,
          averageInterviewScore: 0,
          averagePerformanceScore: 0,
        },
        students: [],
      };
    }

    /**
     * STEP 2:
     * Get all student emails
     */
    const studentEmails = invitations
      .map((student) => student.email)
      .filter(Boolean);

    /**
     * STEP 3:
     * Get matching users
     *
     * The users table contains:
     * id
     * name
     * email
     * role
     */
    const {
      data: users,
      error: usersError,
    } = await supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        role
      `)
      .in("email", studentEmails);

    if (usersError) {
      console.error(
        "❌ Error fetching users:",
        usersError
      );

      throw new Error(
        "Failed to fetch student user details."
      );
    }

    /**
     * Create email -> user map
     */
    const usersByEmail = new Map(
      (users || []).map((user) => [
        user.email.toLowerCase(),
        user,
      ])
    );

    /**
     * Get all matched user IDs
     */
    const studentUserIds = (users || [])
      .map((user) => user.id)
      .filter(Boolean);

    /**
     * If students accepted invitation
     * but have not created/logged into their
     * account yet, still return them with 0 scores.
     */
    if (studentUserIds.length === 0) {
      const students = invitations.map(
        (student) => ({
          studentId: null,
          invitationId: student.id,
          name: student.student_name,
          email: student.email,
          course: student.course,
          branch: student.branch,
          batch: student.batch,
          resumeScore: 0,
          linkedinScore: 0,
          interviewScore: 0,
          overallPerformance: 0,
        })
      );

      return {
        summary: {
          totalStudents: students.length,
          averageResumeScore: 0,
          averageLinkedinScore: 0,
          averageInterviewScore: 0,
          averagePerformanceScore: 0,
        },
        students,
      };
    }

    /**
     * STEP 4:
     * Get resume analyses
     */
    const {
      data: resumeAnalyses,
      error: resumeError,
    } = await supabase
      .from("resume_analyses")
      .select(`
        id,
        user_id,
        score,
        created_at
      `)
      .in("user_id", studentUserIds)
      .order("created_at", {
        ascending: false,
      });

    if (resumeError) {
      console.error(
        "❌ Error fetching resume analyses:",
        resumeError
      );

      throw new Error(
        "Failed to fetch resume performance."
      );
    }

    /**
     * STEP 5:
     * Get LinkedIn analyses
     */
    const {
      data: linkedinAnalyses,
      error: linkedinError,
    } = await supabase
      .from("linkedin_analyses")
      .select(`
        id,
        user_id,
        score,
        created_at
      `)
      .in("user_id", studentUserIds)
      .order("created_at", {
        ascending: false,
      });

    if (linkedinError) {
      console.error(
        "❌ Error fetching LinkedIn analyses:",
        linkedinError
      );

      throw new Error(
        "Failed to fetch LinkedIn performance."
      );
    }

    /**
     * STEP 6:
     * Get interview sessions
     *
     * Only completed interviews are considered.
     */
    const {
      data: interviewSessions,
      error: interviewError,
    } = await supabase
      .from("interview_sessions")
      .select(`
        id,
        user_id,
        score,
        created_at,
        is_completed
      `)
      .in("user_id", studentUserIds)
      .eq("is_completed", true)
      .order("created_at", {
        ascending: false,
      });

    if (interviewError) {
      console.error(
        "❌ Error fetching interview sessions:",
        interviewError
      );

      throw new Error(
        "Failed to fetch interview performance."
      );
    }

    /**
     * STEP 7:
     * Create maps containing ONLY
     * the latest analysis for each student.
     */

    const latestResumeByUser = new Map();

    (resumeAnalyses || []).forEach(
      (analysis) => {
        if (
          !latestResumeByUser.has(
            analysis.user_id
          )
        ) {
          latestResumeByUser.set(
            analysis.user_id,
            analysis
          );
        }
      }
    );


    const latestLinkedinByUser = new Map();

    (linkedinAnalyses || []).forEach(
      (analysis) => {
        if (
          !latestLinkedinByUser.has(
            analysis.user_id
          )
        ) {
          latestLinkedinByUser.set(
            analysis.user_id,
            analysis
          );
        }
      }
    );


    const latestInterviewByUser = new Map();

    (interviewSessions || []).forEach(
      (session) => {
        if (
          !latestInterviewByUser.has(
            session.user_id
          )
        ) {
          latestInterviewByUser.set(
            session.user_id,
            session
          );
        }
      }
    );

    /**
     * STEP 8:
     * Build individual student report
     */
    const students = invitations.map(
      (student) => {
        const user = usersByEmail.get(
          student.email?.toLowerCase()
        );

        /**
         * Student has not yet created account
         */
        if (!user) {
          return {
            studentId: null,
            invitationId: student.id,
            name: student.student_name,
            email: student.email,
            course: student.course,
            branch: student.branch,
            batch: student.batch,
            resumeScore: 0,
            linkedinScore: 0,
            interviewScore: 0,
            overallPerformance: 0,
          };
        }

        const resume =
          latestResumeByUser.get(user.id);

        const linkedin =
          latestLinkedinByUser.get(user.id);

        const interview =
          latestInterviewByUser.get(user.id);

        const resumeScore =
          Number(resume?.score) || 0;

        const linkedinScore =
          Number(linkedin?.score) || 0;

        const interviewScore =
          Number(interview?.score) || 0;

        /**
         * Calculate overall performance.
         *
         * Only include scores that actually exist.
         * Example:
         *
         * Resume = 80
         * LinkedIn = 0
         * Interview = 70
         *
         * Overall = (80 + 70) / 2 = 75
         */
        const availableScores = [];

        if (resume) {
          availableScores.push(
            resumeScore
          );
        }

        if (linkedin) {
          availableScores.push(
            linkedinScore
          );
        }

        if (interview) {
          availableScores.push(
            interviewScore
          );
        }

        const overallPerformance =
          availableScores.length > 0
            ? Number(
                (
                  availableScores.reduce(
                    (total, score) =>
                      total + score,
                    0
                  ) /
                  availableScores.length
                ).toFixed(2)
              )
            : 0;

        return {
          studentId: user.id,
          invitationId: student.id,

          name:
            user.name ||
            student.student_name,

          email: user.email,

          course: student.course,
          branch: student.branch,
          batch: student.batch,

          resumeScore,
          linkedinScore,
          interviewScore,

          overallPerformance,
        };
      }
    );

    /**
     * STEP 9:
     * Calculate report averages
     *
     * We calculate the average only from
     * students who actually have that analysis.
     */

    const studentsWithResume =
      students.filter(
        (student) =>
          student.resumeScore > 0
      );

    const studentsWithLinkedin =
      students.filter(
        (student) =>
          student.linkedinScore > 0
      );

    const studentsWithInterview =
      students.filter(
        (student) =>
          student.interviewScore > 0
      );


    const averageResumeScore =
      studentsWithResume.length > 0
        ? Number(
            (
              studentsWithResume.reduce(
                (total, student) =>
                  total +
                  student.resumeScore,
                0
              ) /
              studentsWithResume.length
            ).toFixed(2)
          )
        : 0;


    const averageLinkedinScore =
      studentsWithLinkedin.length > 0
        ? Number(
            (
              studentsWithLinkedin.reduce(
                (total, student) =>
                  total +
                  student.linkedinScore,
                0
              ) /
              studentsWithLinkedin.length
            ).toFixed(2)
          )
        : 0;


    const averageInterviewScore =
      studentsWithInterview.length > 0
        ? Number(
            (
              studentsWithInterview.reduce(
                (total, student) =>
                  total +
                  student.interviewScore,
                0
              ) /
              studentsWithInterview.length
            ).toFixed(2)
          )
        : 0;


    /**
     * Average overall performance
     */
    const studentsWithPerformance =
      students.filter(
        (student) =>
          student.overallPerformance > 0
      );

    const averagePerformanceScore =
      studentsWithPerformance.length > 0
        ? Number(
            (
              studentsWithPerformance.reduce(
                (total, student) =>
                  total +
                  student.overallPerformance,
                0
              ) /
              studentsWithPerformance.length
            ).toFixed(2)
          )
        : 0;


    /**
     * FINAL RESPONSE
     */
    return {
      summary: {
        totalStudents:
          students.length,

        averageResumeScore,

        averageLinkedinScore,

        averageInterviewScore,

        averagePerformanceScore,
      },

      students,
    };

  } catch (error) {
    console.error(
      "❌ getCareerPerformanceReportService error:",
      error
    );

    throw error;
  }
};