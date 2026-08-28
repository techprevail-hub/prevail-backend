import supabase from "../../supabaseClient.js";

/**
 * PROGRESS REPORT
 *
 * Returns:
 * - Total students
 * - Students with account activated
 * - Students with resume completed
 * - Students with LinkedIn completed
 * - Students with interview practice completed
 * - Average overall progress
 * - Individual student progress
 */

export const getProgressReportService = async (
  instituteId
) => {
  try {
    if (!instituteId) {
      throw new Error(
        "Institute ID is required."
      );
    }

    /**
     * STEP 1:
     * Get all accepted students
     * for this institute
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
      .eq(
        "institute_id",
        instituteId
      )
      .eq(
        "status",
        "accepted"
      );

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
     * If no accepted students exist
     */

    if (
      !invitations ||
      invitations.length === 0
    ) {
      return {
        summary: {
          totalStudents: 0,
          accountActivated: 0,
          resumeCompleted: 0,
          linkedinCompleted: 0,
          interviewCompleted: 0,
          averageProgress: 0,
        },

        students: [],
      };
    }

    /**
     * STEP 2:
     * Get student emails
     */

    const studentEmails = invitations
      .map(
        (student) =>
          student.email
      )
      .filter(Boolean);

    /**
     * STEP 3:
     * Get users matching
     * the student invitation emails
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
        role,
        created_at
      `)
      .in(
        "email",
        studentEmails
      );

    if (usersError) {
      console.error(
        "❌ Error fetching student users:",
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
      (users || []).map(
        (user) => [
          user.email
            ?.toLowerCase(),
          user,
        ]
      )
    );

    /**
     * Get student user IDs
     */

    const studentUserIds = (
      users || []
    )
      .map(
        (user) => user.id
      )
      .filter(Boolean);

    /**
     * If no users have been created yet,
     * return students with 0 progress.
     */

    if (
      studentUserIds.length === 0
    ) {
      const students = invitations.map(
        (student) => ({
          studentId: null,
          invitationId: student.id,

          name:
            student.student_name,

          email:
            student.email,

          course:
            student.course,

          branch:
            student.branch,

          batch:
            student.batch,

          accountActivated: false,

          resumeCompleted: false,

          linkedinCompleted: false,

          interviewCompleted: false,

          completedSteps: 0,

          totalSteps: 4,

          progressPercentage: 0,
        })
      );

      return {
        summary: {
          totalStudents:
            students.length,

          accountActivated: 0,

          resumeCompleted: 0,

          linkedinCompleted: 0,

          interviewCompleted: 0,

          averageProgress: 0,
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
      .in(
        "user_id",
        studentUserIds
      );

    if (resumeError) {
      console.error(
        "❌ Error fetching resume analyses:",
        resumeError
      );

      throw new Error(
        "Failed to fetch resume progress."
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
      .in(
        "user_id",
        studentUserIds
      );

    if (linkedinError) {
      console.error(
        "❌ Error fetching LinkedIn analyses:",
        linkedinError
      );

      throw new Error(
        "Failed to fetch LinkedIn progress."
      );
    }

    /**
     * STEP 6:
     * Get completed interview sessions
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
      .in(
        "user_id",
        studentUserIds
      )
      .eq(
        "is_completed",
        true
      );

    if (interviewError) {
      console.error(
        "❌ Error fetching interview sessions:",
        interviewError
      );

      throw new Error(
        "Failed to fetch interview progress."
      );
    }

    /**
     * STEP 7:
     * Create sets for quick lookup
     */

    const usersWithResume =
      new Set(
        (resumeAnalyses || []).map(
          (analysis) =>
            analysis.user_id
        )
      );

    const usersWithLinkedin =
      new Set(
        (linkedinAnalyses || []).map(
          (analysis) =>
            analysis.user_id
        )
      );

    const usersWithInterview =
      new Set(
        (interviewSessions || []).map(
          (session) =>
            session.user_id
        )
      );

    /**
     * STEP 8:
     * Build individual student progress
     */

    const students = invitations.map(
      (student) => {
        const user =
          usersByEmail.get(
            student.email
              ?.toLowerCase()
          );

        /**
         * Student has not yet
         * created an account
         */

        if (!user) {
          return {
            studentId: null,
            invitationId:
              student.id,

            name:
              student.student_name,

            email:
              student.email,

            course:
              student.course,

            branch:
              student.branch,

            batch:
              student.batch,

            accountActivated: false,

            resumeCompleted: false,

            linkedinCompleted: false,

            interviewCompleted: false,

            completedSteps: 0,

            totalSteps: 4,

            progressPercentage: 0,
          };
        }

        /**
         * Check completed milestones
         */

        const accountActivated = true;

        const resumeCompleted =
          usersWithResume.has(
            user.id
          );

        const linkedinCompleted =
          usersWithLinkedin.has(
            user.id
          );

        const interviewCompleted =
          usersWithInterview.has(
            user.id
          );

        /**
         * Calculate completed steps
         */

        const completedSteps = [
          accountActivated,
          resumeCompleted,
          linkedinCompleted,
          interviewCompleted,
        ].filter(Boolean).length;

        const totalSteps = 4;

        /**
         * Calculate progress percentage
         */

        const progressPercentage =
          Number(
            (
              (
                completedSteps /
                totalSteps
              ) *
              100
            ).toFixed(2)
          );

        return {
          studentId:
            user.id,

          invitationId:
            student.id,

          name:
            user.name ||
            student.student_name,

          email:
            user.email,

          course:
            student.course,

          branch:
            student.branch,

          batch:
            student.batch,

          accountActivated,

          resumeCompleted,

          linkedinCompleted,

          interviewCompleted,

          completedSteps,

          totalSteps,

          progressPercentage,
        };
      }
    );

    /**
     * STEP 9:
     * Calculate summary counts
     */

    const accountActivated =
      students.filter(
        (student) =>
          student.accountActivated
      ).length;

    const resumeCompleted =
      students.filter(
        (student) =>
          student.resumeCompleted
      ).length;

    const linkedinCompleted =
      students.filter(
        (student) =>
          student.linkedinCompleted
      ).length;

    const interviewCompleted =
      students.filter(
        (student) =>
          student.interviewCompleted
      ).length;

    /**
     * STEP 10:
     * Calculate average progress
     */

    const averageProgress =
      students.length > 0
        ? Number(
            (
              students.reduce(
                (
                  total,
                  student
                ) =>
                  total +
                  student.progressPercentage,
                0
              ) /
              students.length
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

        accountActivated,

        resumeCompleted,

        linkedinCompleted,

        interviewCompleted,

        averageProgress,
      },

      students,
    };

  } catch (error) {
    console.error(
      "❌ getProgressReportService error:",
      error
    );

    throw error;
  }
};