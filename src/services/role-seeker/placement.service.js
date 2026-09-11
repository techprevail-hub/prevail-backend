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
 * student_invitations.id
 *    ↓
 * placement_records.invitation_id
 *
 * student_invitations.institute_id
 *    ↓
 * placement_records.institute_id
 */
const getStudentContext = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  /**
   * 1. Get authenticated user.
   *
   * user.id is the UUID that will be stored
   * in placement_records.student_id.
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
   * 2. Find the student's accepted invitation.
   *
   * student_invitations does NOT contain a student UUID.
   *
   * Therefore:
   * - invitation.id = integer
   * - invitation.institute_id = institute UUID
   * - invitation.email = student's email
   *
   * We use the invitation only to identify
   * the student's institute and invitation record.
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

  /**
   * IMPORTANT:
   *
   * studentId = user.id      → UUID
   * invitationId = invitation.id → INT
   *
   * Do NOT interchange these two values.
   */
  return {
    studentId: user.id,
    instituteId: invitation.institute_id,
    invitationId: invitation.id,
    userId: user.id,
    email,
  };
};

/**
 * Validate placement data.
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

  if (!placementStatus) {
    throw new Error("Placement status is required");
  }

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
   * placement-specific fields are not required.
   */
  if (
    placementStatus ===
    PLACEMENT_STATUS.NOT_PLACED
  ) {
    return;
  }

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
 * Student can only access their own placement record.
 */
export const getStudentPlacementService = async (
  userId
) => {
  try {
    const {
      studentId,
      instituteId,
      invitationId,
    } = await getStudentContext(userId);

    /**
     * studentId is users.id (UUID).
     *
     * This is the important fix.
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
      instituteId,
      invitationId,
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
      invitationId,
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
     * 3. Check existing placement record.
     *
     * student_id = users.id (UUID)
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
     * student_id:
     *   users.id → UUID
     *
     * invitation_id:
     *   student_invitations.id → INT
     */
    const placementRecord = {
      institute_id: instituteId,

      student_id: studentId,

      invitation_id: invitationId,

      placement_status: placementStatus,

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
        data: updatedPlacement,
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
      data: newPlacement,
    };
  } catch (error) {
    console.error(
      "❌ Error in saveStudentPlacementService:",
      error
    );

    throw error;
  }
};