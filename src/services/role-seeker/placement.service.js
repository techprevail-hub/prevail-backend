import supabase from "../../services/supabaseClient.js";

/**
 * Placement status constants
 */
export const PLACEMENT_STATUS = {
  PLACED: "placed",
  NOT_PLACED: "not_placed",
};

/**
 * Placement type constants
 */
export const PLACEMENT_TYPE = {
  CAMPUS: "campus",
  OFF_CAMPUS: "off_campus",
};

/**
 * Fields returned from placement_records
 */
const PLACEMENT_FIELDS = `
  id,
  institute_id,
  student_id,
  invitation_id,
  placement_status,
  placement_type,
  company_name,
  job_role,
  package,
  placement_date,
  created_at,
  updated_at
`;

/**
 * Get authenticated student's context.
 *
 * We DO NOT use the students table.
 *
 * Mapping:
 *
 * users.id
 *    ↓
 * placement_records.student_id
 *
 * users.email
 *    ↓
 * student_invitations.email
 *
 * student_invitations.institute_id
 *    ↓
 * placement_records.institute_id
 *
 * student_invitations.student_name
 *    ↓
 * Student name shown in Placement form
 *
 * student_invitations.course
 *    ↓
 * Course shown in Placement form
 *
 * student_invitations.branch
 *    ↓
 * Branch shown in Placement form
 */
const getStudentContext = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  /**
   * 1. Get authenticated user.
   */
  const {
    data: user,
    error: userError,
  } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    throw new Error(
      `Failed to fetch user information: ${userError.message}`
    );
  }

  if (!user) {
    throw new Error("User record not found");
  }

  if (!user.email) {
    throw new Error("User email not found");
  }

  /**
   * Normalize email.
   */
  const email = user.email.trim().toLowerCase();

  /**
   * 2. Get accepted student invitation.
   *
   * Course and branch are also fetched here.
   */
  const {
    data: invitation,
    error: invitationError,
  } = await supabase
    .from("student_invitations")
    .select(`
      id,
      email,
      institute_id,
      student_name,
      course,
      branch,
      status,
      accepted_at
    `)
    .ilike("email", email)
    .eq("status", "accepted")
    .order("accepted_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (invitationError) {
    throw new Error(
      `Failed to fetch student information: ${invitationError.message}`
    );
  }

  if (!invitation) {
    throw new Error(
      "Accepted student invitation not found"
    );
  }

  return {
    /**
     * users.id is UUID.
     *
     * Used as placement_records.student_id.
     */
    studentId: user.id,

    /**
     * Institute UUID from invitation.
     */
    instituteId: invitation.institute_id,

    /**
     * Invitation ID.
     *
     * This is INTEGER and is only returned as context.
     */
    invitationId: invitation.id,

    /**
     * Student information.
     */
    studentName: invitation.student_name || null,
    course: invitation.course || null,
    branch: invitation.branch || null,

    userId: user.id,
    email,
  };
};

/**
 * Validate placement data.
 *
 * Only placementStatus is required initially.
 *
 * If status = not_placed:
 * placement-specific fields are not required.
 *
 * If status = placed:
 * all placement-specific fields are required.
 */
const validatePlacementData = (data = {}) => {
  const {
    placementStatus,
    placementType,
    companyName,
    jobRole,
    package: packageValue,
    placementDate,
  } = data;

  /**
   * Placement status is always required.
   */
  if (!placementStatus) {
    throw new Error("Placement status is required");
  }

  /**
   * Validate placement status.
   */
  if (
    !Object.values(PLACEMENT_STATUS).includes(
      placementStatus
    )
  ) {
    throw new Error(
      "Invalid placement status. Allowed values are placed or not_placed"
    );
  }

  /**
   * If student is not placed,
   * no additional fields are required.
   */
  if (
    placementStatus ===
    PLACEMENT_STATUS.NOT_PLACED
  ) {
    return;
  }

  /**
   * From here onward student is PLACED.
   */

  if (!placementType) {
    throw new Error("Placement type is required");
  }

  if (
    !Object.values(PLACEMENT_TYPE).includes(
      placementType
    )
  ) {
    throw new Error(
      "Invalid placement type. Allowed values are campus or off_campus"
    );
  }

  if (
    !companyName ||
    typeof companyName !== "string" ||
    !companyName.trim()
  ) {
    throw new Error("Company name is required");
  }

  if (
    !jobRole ||
    typeof jobRole !== "string" ||
    !jobRole.trim()
  ) {
    throw new Error("Job role is required");
  }

  if (
    packageValue === undefined ||
    packageValue === null ||
    packageValue === ""
  ) {
    throw new Error("Package is required");
  }

  if (!placementDate) {
    throw new Error("Placement date is required");
  }
};

/**
 * GET STUDENT PLACEMENT DETAILS
 *
 * GET /api/role-seeker/placement
 *
 * Returns:
 * - Student name
 * - Course
 * - Branch
 * - Institute
 * - Existing placement record
 * - Submitted status
 */
export const getStudentPlacementService = async (
  userId
) => {
  try {
    const {
      studentId,
      instituteId,
      invitationId,
      studentName,
      course,
      branch,
    } = await getStudentContext(userId);

    /**
     * Find existing placement record.
     */
    const {
      data: placement,
      error: placementError,
    } = await supabase
      .from("placement_records")
      .select(PLACEMENT_FIELDS)
      .eq("student_id", studentId)
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (placementError) {
      throw new Error(
        `Failed to fetch placement details: ${placementError.message}`
      );
    }

    return {
      studentId,
      studentName,
      course,
      branch,
      instituteId,
      invitationId,

      /**
       * Existing placement record.
       *
       * null means student has not submitted
       * placement information yet.
       */
      placement: placement || null,

      submitted: Boolean(placement),
    };
  } catch (error) {
    console.error(
      "❌ Error in getStudentPlacementService:",
      error
    );

    throw error;
  }
};

/**
 * CREATE OR UPDATE STUDENT PLACEMENT DETAILS
 *
 * Existing record → UPDATE
 * No record → INSERT
 */
export const saveStudentPlacementService = async (
  userId,
  placementData
) => {
  try {
    /**
     * 1. Validate placement data.
     */
    validatePlacementData(placementData);

    /**
     * 2. Get authenticated student's context.
     */
    const {
      studentId,
      instituteId,
      studentName,
    } = await getStudentContext(userId);

    const {
      placementStatus,
      placementType,
      companyName,
      jobRole,
      package: packageValue,
      placementDate,
    } = placementData;

    /**
     * 3. Check whether placement already exists.
     *
     * There must be only one placement record
     * for one student + institute.
     */
    const {
      data: existingPlacement,
      error: existingError,
    } = await supabase
      .from("placement_records")
      .select("id")
      .eq("student_id", studentId)
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Failed to check existing placement: ${existingError.message}`
      );
    }

    /**
     * 4. Prepare placement record.
     *
     * IMPORTANT:
     *
     * invitation_id is kept NULL because
     * student_invitations.id is INTEGER while
     * placement_records.invitation_id is UUID.
     *
     * Student name/course/branch are NOT stored here.
     * They come from student_invitations.
     */
    const placementRecord = {
      institute_id: instituteId,

      student_id: studentId,

      invitation_id: null,

      placement_status: placementStatus,

      /**
       * Only save placement-specific fields
       * when status is "placed".
       */
      placement_type:
        placementStatus ===
        PLACEMENT_STATUS.PLACED
          ? placementType
          : null,

      company_name:
        placementStatus ===
        PLACEMENT_STATUS.PLACED
          ? companyName.trim()
          : null,

      job_role:
        placementStatus ===
        PLACEMENT_STATUS.PLACED
          ? jobRole.trim()
          : null,

      package:
        placementStatus ===
        PLACEMENT_STATUS.PLACED
          ? packageValue
          : null,

      placement_date:
        placementStatus ===
        PLACEMENT_STATUS.PLACED
          ? placementDate
          : null,
    };

    /**
     * 5. UPDATE existing placement.
     */
    if (existingPlacement) {
      const {
        data: updatedPlacement,
        error: updateError,
      } = await supabase
        .from("placement_records")
        .update({
          ...placementRecord,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPlacement.id)
        .eq("student_id", studentId)
        .eq("institute_id", instituteId)
        .select(PLACEMENT_FIELDS)
        .single();

      if (updateError) {
        throw new Error(
          `Failed to update placement details: ${updateError.message}`
        );
      }

      return {
        success: true,
        message:
          "Placement details updated successfully.",
        data: {
          ...updatedPlacement,

          /**
           * Student name is added for frontend response.
           */
          student_name: studentName,
        },
      };
    }

    /**
     * 6. INSERT new placement.
     */
    const {
      data: newPlacement,
      error: insertError,
    } = await supabase
      .from("placement_records")
      .insert([
        {
          ...placementRecord,
          updated_at: new Date().toISOString(),
        },
      ])
      .select(PLACEMENT_FIELDS)
      .single();

    if (insertError) {
      throw new Error(
        `Failed to save placement details: ${insertError.message}`
      );
    }

    return {
      success: true,
      message:
        "Placement details submitted successfully.",
      data: {
        ...newPlacement,
        student_name: studentName,
      },
    };
  } catch (error) {
    console.error(
      "❌ Error in saveStudentPlacementService:",
      error
    );

    throw error;
  }
};