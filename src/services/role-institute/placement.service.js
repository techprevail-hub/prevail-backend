import supabase from "../../services/supabaseClient.js";

export const PLACEMENT_STATUS = {
  PLACED: "placed",
  NOT_PLACED: "not_placed",
};

export const PLACEMENT_TYPE = {
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

  // ---------------------------------------------------------
  // Student ID
  // ---------------------------------------------------------
  if (!studentId) {
    throw new Error("Student ID is required");
  }

  // ---------------------------------------------------------
  // Student Name
  // ---------------------------------------------------------
  if (
    !studentName ||
    typeof studentName !== "string" ||
    !studentName.trim()
  ) {
    throw new Error("Student name is required");
  }

  // ---------------------------------------------------------
  // Course
  // ---------------------------------------------------------
  if (
    !course ||
    typeof course !== "string" ||
    !course.trim()
  ) {
    throw new Error("Course is required");
  }

  // ---------------------------------------------------------
  // Branch
  // ---------------------------------------------------------
  if (
    !branch ||
    typeof branch !== "string" ||
    !branch.trim()
  ) {
    throw new Error("Branch is required");
  }

  // ---------------------------------------------------------
  // Placement Status
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // Placement Type
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // Company
  // ---------------------------------------------------------
  if (
    !companyName ||
    typeof companyName !== "string" ||
    !companyName.trim()
  ) {
    throw new Error("Company name is required");
  }

  // ---------------------------------------------------------
  // Job Role
  // ---------------------------------------------------------
  if (
    !jobRole ||
    typeof jobRole !== "string" ||
    !jobRole.trim()
  ) {
    throw new Error("Job role is required");
  }

  // ---------------------------------------------------------
  // Package
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // Placement Date
  // ---------------------------------------------------------
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
  // ---------------------------------------------------------
  // Validate institute ID
  // ---------------------------------------------------------
  if (!instituteId) {
    throw new Error("Institute ID is required");
  }

  // ---------------------------------------------------------
  // Validate student ID
  // ---------------------------------------------------------
  if (!studentId) {
    throw new Error("Student ID is required");
  }

  /**
   * Get student from users table
   *
   * users.id is the UUID used as
   * placement_records.student_id.
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
   * Find accepted invitation for this institute.
   *
   * We use email to verify that the student
   * belongs to the logged-in institute.
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
    studentName:
      invitation.student_name || null,
    course:
      invitation.course || null,
    branch:
      invitation.branch || null,
    instituteId:
      invitation.institute_id,
  };
};

/**
 * ============================================================
 * GET ALL PLACEMENT RECORDS + DASHBOARD STATS FOR INSTITUTE
 * ============================================================
 *
 * GET /api/role-institute/placement
 *
 * Used by:
 * /dashboard/institute/placement
 *
 * This is the OVERALL placement dashboard API.
 *
 * It returns:
 *
 * {
 *   stats: {
 *     totalStudents,
 *     submitted,
 *     placed,
 *     notPlaced,
 *     notSubmitted
 *   },
 *   placements: []
 * }
 *
 * IMPORTANT:
 *
 * 1. No students table is used.
 *
 * 2. Placement records are fetched from:
 *    placement_records
 *
 * 3. Total students are calculated from:
 *    student_invitations
 *
 * 4. Only accepted student invitations are counted
 *    as current institute students.
 *
 * 5. Placement identity remains:
 *
 *    institute_id + student_id
 */
export const getInstitutePlacementsService = async (
  instituteId
) => {
  try {
    // ---------------------------------------------------------
    // Validate institute ID
    // ---------------------------------------------------------
    if (!instituteId) {
      throw new Error("Institute ID is required");
    }

    // =========================================================
    // 1. GET ALL PLACEMENT RECORDS
    // =========================================================
    const {
      data: placements,
      error: placementError,
    } = await supabase
      .from("placement_records")
      .select(PLACEMENT_FIELDS)
      .eq("institute_id", instituteId)
      .order("created_at", {
        ascending: false,
      });

    if (placementError) {
      throw new Error(
        `Failed to fetch institute placement records: ${placementError.message}`
      );
    }

    // =========================================================
    // 2. GET ACCEPTED STUDENT INVITATIONS
    // =========================================================
    //
    // We use student_invitations because the Placement
    // architecture does not use a students table.
    //
    // The invitation contains:
    // - email
    // - student_name
    // - course
    // - branch
    //
    // We will use the student's email to connect:
    //
    // placement_records.student_id
    //          ↓
    // users.id
    //          ↓
    // users.email
    //          ↓
    // student_invitations.email
    //
    // =========================================================
    const {
      data: invitations,
      error: invitationError,
    } = await supabase
      .from("student_invitations")
      .select(`
        id,
        email,
        student_name,
        course,
        branch,
        institute_id,
        status,
        accepted_at
      `)
      .eq("institute_id", instituteId)
      .eq("status", "accepted")
      .order("accepted_at", {
        ascending: false,
      });

    if (invitationError) {
      throw new Error(
        `Failed to fetch institute student invitations: ${invitationError.message}`
      );
    }

    // =========================================================
    // 3. GET USERS FOR PLACEMENT STUDENTS
    // =========================================================
    //
    // placement_records.student_id is the UUID of users.id.
    //
    // We need users.email so that we can match the placement
    // record with the corresponding student invitation.
    //
    // =========================================================
    const placementRecords = placements || [];

    let users = [];

    if (placementRecords.length > 0) {
      const studentIds = [
        ...new Set(
          placementRecords
            .map((record) => record.student_id)
            .filter(Boolean)
        ),
      ];

      if (studentIds.length > 0) {
        const {
          data: userRecords,
          error: usersError,
        } = await supabase
          .from("users")
          .select("id, email")
          .in("id", studentIds);

        if (usersError) {
          throw new Error(
            `Failed to fetch placement student information: ${usersError.message}`
          );
        }

        users = userRecords || [];
      }
    }

    // =========================================================
    // 4. CREATE EMAIL LOOKUP FROM USERS
    // =========================================================
    //
    // This lets us quickly find the student's invitation.
    //
    // users.id
    //     ↓
    // users.email
    //
    // =========================================================
    const userEmailById = new Map();

    users.forEach((user) => {
      if (user?.id && user?.email) {
        userEmailById.set(
          user.id,
          user.email.trim().toLowerCase()
        );
      }
    });

    // =========================================================
    // 5. CREATE INVITATION LOOKUP BY EMAIL
    // =========================================================
    //
    // We only need one accepted invitation for each email.
    //
    // Because the query is ordered by accepted_at descending,
    // the latest accepted invitation will be used.
    //
    // =========================================================
    const invitationByEmail = new Map();

    (invitations || []).forEach((invitation) => {
      if (!invitation?.email) {
        return;
      }

      const email = invitation.email
        .trim()
        .toLowerCase();

      if (!invitationByEmail.has(email)) {
        invitationByEmail.set(email, invitation);
      }
    });

    // =========================================================
    // 6. MERGE STUDENT INFORMATION INTO PLACEMENT RECORDS
    // =========================================================
    //
    // This is the important part.
    //
    // If placement_records already contains student_name,
    // course and branch, we keep those values.
    //
    // If they are null/empty, we take the values from
    // student_invitations.
    //
    // Therefore this works for:
    //
    // OLD placement records  → invitation data is used
    // NEW placement records  → existing placement data is used
    //
    // =========================================================
    const enrichedPlacementRecords =
      placementRecords.map((record) => {
        const studentEmail =
          userEmailById.get(record.student_id);

        const invitation = studentEmail
          ? invitationByEmail.get(studentEmail)
          : null;

        return {
          ...record,

          student_name:
            record.student_name ||
            invitation?.student_name ||
            null,

          course:
            record.course ||
            invitation?.course ||
            null,

          branch:
            record.branch ||
            invitation?.branch ||
            null,
        };
      });

    // =========================================================
    // 7. CALCULATE SUBMITTED COUNT
    // =========================================================
    //
    // Every placement_records row represents one
    // submitted placement detail.
    //
    const submitted =
      enrichedPlacementRecords.length;

    // =========================================================
    // 8. CALCULATE PLACED COUNT
    // =========================================================
    const placed =
      enrichedPlacementRecords.filter(
        (record) =>
          record.placement_status ===
          PLACEMENT_STATUS.PLACED
      ).length;

    // =========================================================
    // 9. CALCULATE NOT PLACED COUNT
    // =========================================================
    const notPlaced =
      enrichedPlacementRecords.filter(
        (record) =>
          record.placement_status ===
          PLACEMENT_STATUS.NOT_PLACED
      ).length;

    // =========================================================
    // 10. CALCULATE NOT SUBMITTED COUNT
    // =========================================================
    //
    // Only accepted student invitations are considered
    // current students of the institute.
    //
    const total =
      invitations?.length || 0;

    const notSubmitted =
      Math.max(
        total - submitted,
        0
      );

    // =========================================================
    // 11. RETURN DASHBOARD DATA
    // =========================================================
    return {
      stats: {
        totalStudents: total,
        submitted,
        placed,
        notPlaced,
        notSubmitted,
      },

      placements:
        enrichedPlacementRecords,
    };
  } catch (error) {
    console.error(
      "❌ Institute placement dashboard fetch error:",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * GET PLACEMENT DETAILS FOR ONE STUDENT
 * ============================================================
 *
 * GET /api/role-institute/placement/student/:studentId
 *
 * IMPORTANT:
 * This is NOT a separate Placement page.
 *
 * The frontend can use this API from a dialog/modal
 * on the overall Placement dashboard.
 */
export const getInstituteStudentPlacementService =
  async (
    instituteId,
    studentId
  ) => {
    try {
      /**
       * Verify that the student belongs
       * to the logged-in institute.
       */
      const student =
        await verifyInstituteStudent(
          instituteId,
          studentId
        );

      /**
       * IMPORTANT:
       *
       * Placement is identified only by:
       *
       * institute_id + student_id
       *
       * because this combination is unique.
       *
       * We do NOT use invitation_id here.
       */
      const {
        data: placement,
        error: placementError,
      } = await supabase
        .from("placement_records")
        .select(PLACEMENT_FIELDS)
        .eq("institute_id", instituteId)
        .eq(
          "student_id",
          student.studentId
        )
        .maybeSingle();

      if (placementError) {
        throw new Error(
          `Failed to fetch placement details: ${placementError.message}`
        );
      }

      return {
        studentId:
          student.studentId,

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

        invitationId:
          student.invitationId,

        placement:
          placement || null,

        submitted:
          Boolean(placement),
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
 * ============================================================
 * CREATE / UPDATE PLACEMENT DETAILS
 * ============================================================
 *
 * POST /api/role-institute/placement
 * PUT  /api/role-institute/placement
 *
 * One student can have only one placement record
 * for an institute.
 *
 * Existing record → UPDATE
 * No record      → INSERT
 *
 * IMPORTANT:
 * invitation_id is intentionally NULL.
 *
 * student_invitations.id is INTEGER,
 * while placement_records.student_id is UUID.
 */
export const saveInstitutePlacementService =
  async (
    instituteId,
    placementData
  ) => {
    try {
      // =======================================================
      // 1. VALIDATE REQUEST DATA
      // =======================================================
      validatePlacementData(
        placementData
      );

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

      // =======================================================
      // 2. VERIFY STUDENT BELONGS TO INSTITUTE
      // =======================================================
      const student =
        await verifyInstituteStudent(
          instituteId,
          studentId
        );

      // =======================================================
      // 3. PREPARE PLACEMENT RECORD
      // =======================================================
      const placementRecord = {
        institute_id:
          instituteId,

        student_id:
          student.studentId,

        /**
         * IMPORTANT:
         *
         * Do not put student_invitations.id here.
         *
         * student_invitations.id = integer
         * placement_records.student_id = UUID
         *
         * Therefore invitation_id remains NULL.
         */
        invitation_id: null,

        // -----------------------------------------------------
        // Student basic information
        // -----------------------------------------------------
        student_name:
          studentName.trim(),

        course:
          course.trim(),

        branch:
          branch.trim(),

        // -----------------------------------------------------
        // Placement status
        // -----------------------------------------------------
        placement_status:
          placementStatus,

        // -----------------------------------------------------
        // Placement type
        // -----------------------------------------------------
        placement_type:
          placementStatus ===
          PLACEMENT_STATUS.PLACED
            ? placementType
            : null,

        // -----------------------------------------------------
        // Company
        // -----------------------------------------------------
        company_name:
          placementStatus ===
          PLACEMENT_STATUS.PLACED
            ? companyName.trim()
            : null,

        // -----------------------------------------------------
        // Job role
        // -----------------------------------------------------
        job_role:
          placementStatus ===
          PLACEMENT_STATUS.PLACED
            ? jobRole.trim()
            : null,

        // -----------------------------------------------------
        // Package
        // -----------------------------------------------------
        package:
          placementStatus ===
          PLACEMENT_STATUS.PLACED
            ? Number(packageValue)
            : null,

        // -----------------------------------------------------
        // Placement date
        // -----------------------------------------------------
        placement_date:
          placementStatus ===
          PLACEMENT_STATUS.PLACED
            ? placementDate
            : null,

        // -----------------------------------------------------
        // Updated timestamp
        // -----------------------------------------------------
        updated_at:
          new Date().toISOString(),
      };

      // =======================================================
      // 4. CHECK EXISTING PLACEMENT RECORD
      // =======================================================
      //
      // IMPORTANT:
      //
      // Do NOT use invitation_id.
      //
      // Placement identity:
      //
      // institute_id + student_id
      //
      const {
        data: existingPlacement,
        error: existingError,
      } = await supabase
        .from("placement_records")
        .select("id")
        .eq(
          "institute_id",
          instituteId
        )
        .eq(
          "student_id",
          student.studentId
        )
        .maybeSingle();

      if (existingError) {
        throw new Error(
          `Failed to check existing placement record: ${existingError.message}`
        );
      }

      let savedPlacement;

      // =======================================================
      // 5. UPDATE EXISTING RECORD
      // =======================================================
      if (existingPlacement) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("placement_records")
          .update(
            placementRecord
          )
          .eq(
            "id",
            existingPlacement.id
          )
          .eq(
            "institute_id",
            instituteId
          )
          .eq(
            "student_id",
            student.studentId
          )
          .select(
            PLACEMENT_FIELDS
          )
          .single();

        if (updateError) {
          throw new Error(
            `Failed to update placement details: ${updateError.message}`
          );
        }

        savedPlacement = data;
      }

      // =======================================================
      // 6. INSERT NEW RECORD
      // =======================================================
      else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("placement_records")
          .insert([
            placementRecord,
          ])
          .select(
            PLACEMENT_FIELDS
          )
          .single();

        if (insertError) {
          throw new Error(
            `Failed to save placement details: ${insertError.message}`
          );
        }

        savedPlacement = data;
      }

      // =======================================================
      // 7. RETURN SAVED DATA
      // =======================================================
      return {
        success: true,

        message:
          existingPlacement
            ? "Placement details updated successfully."
            : "Placement details added successfully.",

        data:
          savedPlacement,
      };
    } catch (error) {
      console.error(
        "❌ Institute placement save error:",
        error
      );

      throw error;
    }
  };