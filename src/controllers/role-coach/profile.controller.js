
import supabase from "../../services/supabaseClient.js";

// --------------------------------------------------
// CHECK LOGGED-IN COACH
// --------------------------------------------------
const getCoachUser = async (userId) => {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    return {
      user: null,
      status: 404,
      message: "User not found.",
    };
  }

  if (user.role !== "coach") {
    return {
      user: null,
      status: 403,
      message: "User is not a coach.",
    };
  }

  return { user };
};

// --------------------------------------------------
// CREATE COACH PROFILE
// --------------------------------------------------
export const createCoachProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { user, status, message } =
      await getCoachUser(userId);

    if (!user) {
      return res.status(status).json({
        success: false,
        message,
      });
    }

    // Check whether a profile already exists.
    const { data: existingProfile, error: checkError } =
      await supabase
        .from("coach_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (checkError) {
      return res.status(400).json({
        success: false,
        message: checkError.message,
      });
    }

    if (existingProfile) {
      return res.status(200).json({
        success: true,
        data: {
          ...existingProfile,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        message: "Coach profile already exists.",
      });
    }

    const payload = {
      user_id: userId,
      profile_image_url: "",
      headline: "",
      bio: "",
      specialization: "",
      experience_years: 0,
      qualifications: "",
      languages: [],
      linkedin_url: "",
    };

    const { data, error } = await supabase
      .from("coach_profiles")
      .insert([payload])
      .select()
      .single();

    if (error) {
      // Handle a concurrent create request safely.
      if (error.code === "23505") {
        return res.status(200).json({
          success: true,
          message: "Coach profile already exists.",
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        ...data,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Coach profile created successfully.",
    });
  } catch (error) {
    console.error("Create Coach Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

// --------------------------------------------------
// GET LOGGED-IN COACH PROFILE
// --------------------------------------------------
export const getCoachProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { user, status, message } =
      await getCoachUser(userId);

    if (!user) {
      return res.status(status).json({
        success: false,
        message,
      });
    }

    const { data: profile, error } = await supabase
      .from("coach_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Coach profile not found. Please create your profile.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get Coach Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

// --------------------------------------------------
// UPDATE COACH PROFILE
// --------------------------------------------------
export const updateCoachProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { user, status, message } =
      await getCoachUser(userId);

    if (!user) {
      return res.status(status).json({
        success: false,
        message,
      });
    }

    const { data: existingProfile, error: checkError } =
      await supabase
        .from("coach_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

    if (checkError) {
      return res.status(400).json({
        success: false,
        message: checkError.message,
      });
    }

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message: "Coach profile not found. Create it first.",
      });
    }

    // Only allow approved profile fields.
    // Never accept id, user_id, or timestamps from the client.
    const allowedFields = [
      "profile_image_url",
      "headline",
      "bio",
      "specialization",
      "experience_years",
      "qualifications",
      "languages",
      "linkedin_url",
    ];

    const payload = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one valid profile field.",
      });
    }

    // Basic field validation.
    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "experience_years"
      ) &&
      (!Number.isInteger(payload.experience_years) ||
        payload.experience_years < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Experience must be a non-negative integer.",
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "languages") &&
      (!Array.isArray(payload.languages) ||
        !payload.languages.every(
          (language) => typeof language === "string"
        ))
    ) {
      return res.status(400).json({
        success: false,
        message: "Languages must be an array of strings.",
      });
    }

    for (const field of [
      "profile_image_url",
      "headline",
      "bio",
      "specialization",
      "qualifications",
      "linkedin_url",
    ]) {
      if (
        Object.prototype.hasOwnProperty.call(payload, field) &&
        typeof payload[field] !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string.`,
        });
      }
    }

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("coach_profiles")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Coach profile updated successfully.",
    });
  } catch (error) {
    console.error("Update Coach Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
