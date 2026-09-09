import supabase from "../../services/supabaseClient.js";

const PLACEMENT_STATUS = {
  PLACED: "placed",
  NOT_PLACED: "not_placed",
};

const PLACEMENT_TYPE = {
  CAMPUS: "campus",
  OFF_CAMPUS: "off_campus",
};

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

  if (!Object.values(PLACEMENT_STATUS).includes(placementStatus)) {
    throw new Error(
      "Invalid placement status. Allowed values are placed or not_placed"
    );
  }

  if (placementStatus === PLACEMENT_STATUS.NOT_PLACED) {
    return;
  }

  if (!placementType) {
    throw new Error("Placement type is required");
  }

  if (!Object.values(PLACEMENT_TYPE).includes(placementType)) {
    throw new Error(
      "Invalid placement type. Allowed values are campus or off_campus"
    );
  }

  if (!companyName || !companyName.trim()) {
    throw new Error("Company name is required");
  }

  if (!jobRole || !jobRole.trim()) {
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

const verifyInstituteStudent = async (
  instituteId,
  studentId,
  invitationId
) => {
  if (!instituteId) {
    throw new Error("Institute ID is required");
  }

  if (!studentId) {
    throw new Error("Student ID is required");
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select("id, user_id, institute_id")
    .eq("id", studentId)
    .eq("institute_id", instituteId)
    .maybeSingle();

  if (studentError) {
    throw new Error(
      `Failed to verify student: ${studentError.message}`
    );
  }

  if (!student) {
    throw new Error(
      "Student does not belong to this institute."
    );
  }

  if (invitationId) {
    const {
      data: invitation,
      error: invitationError,
    } = await supabase
      .from("student_invitations")
      .select("id, institute_id, email, status")
      .eq("id", invitationId)
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (invitationError) {
      throw new Error(
        `Failed to verify invitation: ${invitationError.message}`
      );
    }

    if (!invitation) {
      throw new Error(
        "Student invitation does not belong to this institute."
      );
    }

    return {
      student,
      invitation,
    };
  }

  const {
    data: user,
    error: userError,
  } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", student.user_id)
    .maybeSingle();

  if (userError) {
    throw new Error(
      `Failed to fetch student user information: ${userError.message}`
    );
  }

  if (!user) {
    throw new Error("Student user record not found.");
  }

  const email = user.email?.toLowerCase();

  if (!email) {
    throw new Error("Student email not found.");
  }

  const {
    data: invitation,
    error: invitationError,
  } = await supabase
    .from("student_invitations")
    .select("id, institute_id, email, status")
    .eq("email", email)
    .eq("institute_id", instituteId)
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (invitationError) {
    throw new Error(
      `Failed to fetch student invitation: ${invitationError.message}`
    );
  }

  if (!invitation) {
    throw new Error(
      "Accepted student invitation not found."
    );
  }

  return {
    student,
    invitation,
  };
};

export const getInstituteStudentPlacementService = async (
  instituteId,
  studentId
) => {
  try {
    const {
      student,
      invitation,
    } = await verifyInstituteStudent(
      instituteId,
      studentId
    );

    const {
      data: placement,
      error: placementError,
    } = await supabase
      .from("placement_records")
      .select(`
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
        created_at
      `)
      .eq("institute_id", instituteId)
      .eq("student_id", student.id)
      .eq("invitation_id", invitation.id)
      .limit(1)
      .maybeSingle();

    if (placementError) {
      throw new Error(
        `Failed to fetch placement details: ${placementError.message}`
      );
    }

    return {
      studentId: student.id,
      instituteId,
      invitationId: invitation.id,
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

export const saveInstitutePlacementService = async (
  instituteId,
  placementData
) => {
  try {
    validatePlacementData(placementData);

    const {
      studentId,
      invitationId,
      placementStatus,
      placementType,
      companyName,
      jobRole,
      package: packageValue,
      placementDate,
    } = placementData;

    const {
      student,
      invitation,
    } = await verifyInstituteStudent(
      instituteId,
      studentId,
      invitationId
    );

    const finalInvitationId =
      invitationId || invitation.id;

    const {
      data: existingPlacement,
      error: existingError,
    } = await supabase
      .from("placement_records")
      .select("id")
      .eq("institute_id", instituteId)
      .eq("student_id", student.id)
      .eq("invitation_id", finalInvitationId)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Failed to check existing placement record: ${existingError.message}`
      );
    }

    const placementRecord = {
      institute_id: instituteId,
      student_id: student.id,
      invitation_id: finalInvitationId,
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

    let savedPlacement;

    if (existingPlacement) {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("placement_records")
        .update(placementRecord)
        .eq("id", existingPlacement.id)
        .select(`
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
          created_at
        `)
        .single();

      if (updateError) {
        throw new Error(
          `Failed to update placement details: ${updateError.message}`
        );
      }

      savedPlacement = data;
    } else {
      const {
        data,
        error: insertError,
      } = await supabase
        .from("placement_records")
        .insert([placementRecord])
        .select(`
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
          created_at
        `)
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