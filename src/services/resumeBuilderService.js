import supabase from "./supabaseClient.js";

// ==========================================================
// Constants
// ==========================================================

const VALID_TEMPLATES = [
  "ats",
  "modern",
  "creative",
];
// ==========================================================
// Helper Functions
// ==========================================================

const validateTemplate = (template) =>
  VALID_TEMPLATES.includes(template);

const validateResumeOwnership = async (
  resumeId,
  userId
) => {
  const { data, error } = await supabase
    .from("resume_builders")
    .select("*")
    .eq("id", resumeId)
    .single();

  if (error || !data) {
    return {
      success: false,
      status: 404,
      message: "Resume not found.",
    };
  }

  if (data.user_id !== userId) {
    return {
      success: false,
      status: 403,
      message:
        "You are not authorized to access this resume.",
    };
  }

  return {
    success: true,
    data,
  };
};

// ==========================================================
// Create Resume Service
// ==========================================================

export const createResumeService = async (
  userId,
  body
) => {

  const {
    template,
    resume_title,
    resume_data,
  } = body;

  if (!template) {
    return {
      success: false,
      status: 400,
      message: "Template is required.",
    };
  }

  if (!resume_data) {
    return {
      success: false,
      status: 400,
      message: "Resume data is required.",
    };
  }

  if (!validateTemplate(template)) {
    return {
      success: false,
      status: 400,
      message: "Invalid resume template selected.",
    };
  }

  const { data, error } = await supabase
    .from("resume_builders")
    .insert([
      {
        user_id: userId,
        template,
        resume_title:
          resume_title?.trim() ||
          "Untitled Resume",
        resume_data,
        status: "draft",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(error);

    return {
      success: false,
      status: 500,
      message: "Failed to create resume.",
      error: error.message,
    };
  }

  return {
    success: true,
    status: 201,
    message: "Resume created successfully.",
    data,
  };
};

// ==========================================================
// Get All Resume Service
// ==========================================================

export const getResumeService = async (
  userId
) => {

  const { data, error } = await supabase
    .from("resume_builders")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);

    return {
      success: false,
      status: 500,
      message: "Failed to fetch resumes.",
      error: error.message,
    };
  }

  return {
    success: true,
    status: 200,
    message:
      "Resume list fetched successfully.",
    total: data.length,
    data,
  };
};

// ==========================================================
// Get Resume By ID Service
// ==========================================================

export const getResumeByIdService = async (
  resumeId,
  userId
) => {

  const resume =
    await validateResumeOwnership(
      resumeId,
      userId
    );

  if (!resume.success) {
    return resume;
  }

  return {
    success: true,
    status: 200,
    message:
      "Resume fetched successfully.",
    data: resume.data,
  };
};

// ==========================================================
// Update Resume Service
// ==========================================================

export const updateResumeService = async (
  resumeId,
  userId,
  body
) => {

  const resume = await validateResumeOwnership(
    resumeId,
    userId
  );

  if (!resume.success) {
    return resume;
  }

  const {
    resume_title,
    template,
    resume_data,
    status,
  } = body;

  if (template && !validateTemplate(template)) {
    return {
      success: false,
      status: 400,
      message: "Invalid resume template selected.",
    };
  }

  const { data, error } = await supabase
    .from("resume_builders")
    .update({
      resume_title:
        resume_title ?? resume.data.resume_title,

      template:
        template ?? resume.data.template,

      resume_data:
        resume_data ?? resume.data.resume_data,

      status:
        status ?? resume.data.status,

      updated_at: new Date().toISOString(),
    })
    .eq("id", resumeId)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      status: 500,
      message: "Failed to update resume.",
      error: error.message,
    };
  }

  return {
    success: true,
    status: 200,
    message: "Resume updated successfully.",
    data,
  };
};

// ==========================================================
// Delete Resume Service
// ==========================================================

export const deleteResumeService = async (
  resumeId,
  userId
) => {

  const resume = await validateResumeOwnership(
    resumeId,
    userId
  );

  if (!resume.success) {
    return resume;
  }

  const { error } = await supabase
    .from("resume_builders")
    .delete()
    .eq("id", resumeId);

  if (error) {
    return {
      success: false,
      status: 500,
      message: "Failed to delete resume.",
      error: error.message,
    };
  }

  return {
    success: true,
    status: 200,
    message: "Resume deleted successfully.",
  };
};