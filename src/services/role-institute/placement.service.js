import supabase from "../../services/supabaseClient.js";

const PLACEMENT_STATUS = {
  PLACED: "placed",
  NOT_PLACED: "not_placed",
};

const PLACEMENT_TYPE = {
  CAMPUS: "campus",
  OFF_CAMPUS: "off_campus",
};

const PLACEMENT_FIELDS = `
  id,
  institute_id,
  student_id,
  invitation_id,
  student_name,
  course,
  branch,
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
 * Validate placement data
 */
const validatePlacementData = (data = {}) => {
  const {
    studentId,
    studentName,
    course,
    branch,
    placementStatus,
    placementType,
    companyName,
    jobRole,
    package: packageValue,
    placementDate,
  } = data;

  if (!studentId) {
    throw new Error("Student ID is required");
  }

  if (
    !studentName ||
    typeof studentName !== "string" ||
    !studentName.trim()
  ) {
    throw new Error("Student name is required");
  }

  if (
    !course ||
    typeof course !== "string" ||
    !course.trim()
  ) {
    throw new Error("Course is required");
  }

  if (
    !branch ||
    typeof branch !== "string" ||
    !branch.trim()
  ) {
    throw new Error("Branch is required");
  }

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

  const numericPackage = Number(packageValue);

  if (
    Number.isNaN(numericPackage) ||
    numericPackage < 0
  ) {
    throw new Error("Package must be a valid number");
  }

  if (!placementDate) {
    throw new Error("Placement date is required");
  }
};

/**
 * Verify that the student belongs to the institute.
 *
 * IMPORTANT:
 * We do NOT use the students table.
 *
 * Flow:
 *
 * studentId
 *    ↓
 * users.id
 *    ↓
 * users.email
 *    ↓
 * student_invitations.email
 *    ↓
 * student_invitations.institute_id
 */
const verifyInstituteStudent = async (
  instituteId,
  studentId
) => {
  if (!instituteId) {
    throw new Error("Institute ID is required");
  }

  if (!studentId) {
    throw new Error("Student ID is required");
  }

  /**
   * Get student from users table
   */
  const {
    data: user,
    error: userError,
  } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", studentId)
    .maybeSingle();

  if (userError) {
    throw new Error(
      `Failed to fetch student information: ${userError.message}`
    );
  }

  if (!user) {
    throw new Error("Student user record not found.");
  }

  if (!user.email) {
    throw new Error("Student email not found.");
  }

  const email = user.email.trim().toLowerCase();

  /**
   * Find accepted invitation for this institute
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
    .eq("institute_id", instituteId)
    .eq("status", "accepted")
    .order("accepted_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (invitationError) {
    throw new Error(
      `Failed to fetch student invitation: ${invitationError.message}`
    );
  }

  if (!invitation) {
    throw new Error(
      "Student does not belong to this institute."
    );
  }

  return {
    studentId: user.id,
    email,
    invitationId: invitation.id,
    studentName: invitation.student_name || null,
    course: invitation.course || null,
    branch: invitation.branch || null,
    instituteId: invitation.institute_id,
  };
};

/**
 * GET placement details for one student
 */
export const getInstituteStudentPlacementService =
  async (instituteId, studentId) => {
    try {
      const student =
        await verifyInstituteStudent(
          instituteId,
          studentId
        );

      /**
       * IMPORTANT:
       * We identify the placement only by:
       *
       * institute_id + student_id
       *
       * because this combination is unique.
       */
      const {
        data: placement,
        error: placementError,
      } = await supabase
        .from("placement_records")
        .select(PLACEMENT_FIELDS)
        .eq("institute_id", instituteId)
        .eq("student_id", student.studentId)
        .maybeSingle();

      if (placementError) {
        throw new Error(
          `Failed to fetch placement details: ${placementError.message}`
        );
      }

      return {
        studentId: student.studentId,
        studentName:
          placement?.student_name ||
          student.studentName,
        course:
          placement?.course ||
          student.course,
        branch:
          placement?.branch ||
          student.branch,
        instituteId,
        invitationId: student.invitationId,
        placement: placement || null,
        submitted: Boolean(placement),
      };
    } catch (error) {
      console.error(
        "❌ Institute student placement fetch error:",
        error
      );

      throw error;
    }
  };

/**
 * CREATE / UPDATE placement details
 *
 * One student can have only one placement record
 * for an institute.
 *
 * Existing record → UPDATE
 * No record      → INSERT
 */
export const saveInstitutePlacementService =
  async (instituteId, placementData) => {
    try {
      validatePlacementData(placementData);

      const {
        studentId,
        studentName,
        course,
        branch,
        placementStatus,
        placementType,
        companyName,
        jobRole,
        package: packageValue,
        placementDate,
      } = placementData;

      /**
       * Verify that student belongs to institute
       */
      const student =
        await verifyInstituteStudent(
          instituteId,
          studentId
        );

      /**
       * Prepare placement record
       *
       * invitation_id is intentionally NULL.
       *
       * student_invitations.id is an integer,
       * while placement_records.student_id is UUID.
       *
       * We do not use invitation_id for identifying
       * the placement record.
       */
      const placementRecord = {
        institute_id: instituteId,

        student_id: student.studentId,

        invitation_id: null,

        student_name: studentName.trim(),

        course: course.trim(),

        branch: branch.trim(),

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
            ? Number(packageValue)
            : null,

        placement_date:
          placementStatus ===
          PLACEMENT_STATUS.PLACED
            ? placementDate
            : null,

        updated_at:
          new Date().toISOString(),
      };

      /**
       * Check existing placement
       *
       * DO NOT use invitation_id here.
       */
      const {
        data: existingPlacement,
        error: existingError,
      } = await supabase
        .from("placement_records")
        .select("id")
        .eq("institute_id", instituteId)
        .eq("student_id", student.studentId)
        .maybeSingle();

      if (existingError) {
        throw new Error(
          `Failed to check existing placement record: ${existingError.message}`
        );
      }

      let savedPlacement;

      /**
       * UPDATE
       */
      if (existingPlacement) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("placement_records")
          .update(placementRecord)
          .eq("id", existingPlacement.id)
          .eq("institute_id", instituteId)
          .eq("student_id", student.studentId)
          .select(PLACEMENT_FIELDS)
          .single();

        if (updateError) {
          throw new Error(
            `Failed to update placement details: ${updateError.message}`
          );
        }

        savedPlacement = data;
      }

      /**
       * INSERT
       */
      else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("placement_records")
          .insert([placementRecord])
          .select(PLACEMENT_FIELDS)
          .single();

        if (insertError) {
          throw new Error(
            `Failed to save placement details: ${insertError.message}`
          );
        }

        savedPlacement = data;
      }

      return {
        success: true,

        message: existingPlacement
          ? "Placement details updated successfully."
          : "Placement details added successfully.",

        data: savedPlacement,
      };
    } catch (error) {
      console.error(
        "❌ Institute placement save error:",
        error
      );

      throw error;
    }
  };