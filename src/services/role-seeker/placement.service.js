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
 * New placement flow:
 * Student is identified through:
 *
 * users → students
 *
 * We do NOT require student_invitations
 * for placement records.
 */
const getStudentContext = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select("id, user_id, institute_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (studentError) {
    throw new Error(
      `Failed to fetch student information: ${studentError.message}`
    );
  }

  if (!student) {
    throw new Error("Student record not found");
  }

  return {
    studentId: student.id,
    userId: student.user_id,
    instituteId: student.institute_id,
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
  if (placementStatus === PLACEMENT_STATUS.NOT_PLACED) {
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
 * The student can only access their own
 * placement record.
 */
export const getStudentPlacementService = async (
  userId
) => {
  try {
    const {
      studentId,
      instituteId,
    } = await getStudentContext(userId);

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
 * New flow:
 *
 * Student
 *    ↓
 * placement_records
 *
 * If record exists → UPDATE
 * If record does not exist → INSERT
 */
export const saveStudentPlacementService = async (
  userId,
  placementData
) => {
  try {
    /**
     * Validate placement information.
     */
    validatePlacementData(placementData);

    const {
      studentId,
      instituteId,
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
     * Check if student already has
     * a placement record.
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
     * Prepare placement record.
     *
     * invitation_id is intentionally NOT used.
     */
    const placementRecord = {
      institute_id: instituteId,
      student_id: studentId,

      placement_status: placementStatus,

      placement_type:
        placementStatus === PLACEMENT_STATUS.PLACED
          ? placementType
          : null,

      company_name:
        placementStatus === PLACEMENT_STATUS.PLACED
          ? companyName.trim()
          : null,

      job_role:
        placementStatus === PLACEMENT_STATUS.PLACED
          ? jobRole.trim()
          : null,

      package:
        placementStatus === PLACEMENT_STATUS.PLACED
          ? packageValue
          : null,

      placement_date:
        placementStatus === PLACEMENT_STATUS.PLACED
          ? placementDate
          : null,
    };

    /**
     * UPDATE existing record
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
     * INSERT new record
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