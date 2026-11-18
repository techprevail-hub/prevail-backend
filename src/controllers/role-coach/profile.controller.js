import fs from "fs";
import path from "path";
import supabase from "../../services/supabaseClient.js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// --------------------------------------------------
// HELPER: DELETE UPLOADED FILE
// --------------------------------------------------
const deleteUploadedFile = (filePath) => {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error deleting uploaded image:", error);
  }
};

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

    const { user, status, message } = await getCoachUser(userId);

    if (!user) {
      return res.status(status).json({
        success: false,
        message,
      });
    }

    const {
      data: existingProfile,
      error: checkError,
    } = await supabase
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
      if (error.code === "23505") {
        const {
          data: createdProfile,
          error: fetchError,
        } = await supabase
          .from("coach_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (fetchError) {
          return res.status(400).json({
            success: false,
            message: fetchError.message,
          });
        }

        return res.status(200).json({
          success: true,
          data: {
            ...createdProfile,
            name: user.name,
            email: user.email,
            role: user.role,
          },
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

    const { user, status, message } = await getCoachUser(userId);

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
// Includes optional profile image upload
// --------------------------------------------------
export const updateCoachProfile = async (req, res) => {
  let newUploadedFilePath = null;

  try {
    const userId = req.user?.id;

    if (!userId) {
      if (req.file) deleteUploadedFile(req.file.path);

      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { user, status, message } = await getCoachUser(userId);

    if (!user) {
      if (req.file) deleteUploadedFile(req.file.path);

      return res.status(status).json({
        success: false,
        message,
      });
    }

    const {
      data: existingProfile,
      error: checkError,
    } = await supabase
      .from("coach_profiles")
      .select("id, profile_image_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      if (req.file) deleteUploadedFile(req.file.path);

      return res.status(400).json({
        success: false,
        message: checkError.message,
      });
    }

    if (!existingProfile) {
      if (req.file) deleteUploadedFile(req.file.path);

      return res.status(404).json({
        success: false,
        message: "Coach profile not found. Create it first.",
      });
    }

    // Only allow these profile fields to be updated.
    const allowedFields = [
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
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        payload[field] = req.body[field];
      }
    }

    // FormData sends values as strings.
    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "experience_years"
      )
    ) {
      const experience = Number(payload.experience_years);

      if (
        !Number.isInteger(experience) ||
        experience < 0
      ) {
        if (req.file) deleteUploadedFile(req.file.path);

        return res.status(400).json({
          success: false,
          message: "Experience must be a non-negative integer.",
        });
      }

      payload.experience_years = experience;
    }

    // Convert languages JSON string into an array.
    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "languages"
      )
    ) {
      if (typeof payload.languages === "string") {
        try {
          payload.languages = JSON.parse(payload.languages);
        } catch {
          if (req.file) deleteUploadedFile(req.file.path);

          return res.status(400).json({
            success: false,
            message: "Invalid languages format.",
          });
        }
      }

      if (
        !Array.isArray(payload.languages) ||
        !payload.languages.every(
          (language) => typeof language === "string"
        )
      ) {
        if (req.file) deleteUploadedFile(req.file.path);

        return res.status(400).json({
          success: false,
          message: "Languages must be an array of strings.",
        });
      }
    }

    // Validate string fields.
    for (const field of [
      "headline",
      "bio",
      "specialization",
      "qualifications",
      "linkedin_url",
    ]) {
      if (
        Object.prototype.hasOwnProperty.call(
          payload,
          field
        ) &&
        typeof payload[field] !== "string"
      ) {
        if (req.file) deleteUploadedFile(req.file.path);

        return res.status(400).json({
          success: false,
          message: `${field} must be a string.`,
        });
      }
    }

    // --------------------------------------------------
    // HANDLE NEW PROFILE IMAGE
    // --------------------------------------------------
    if (req.file) {
      const extension = ALLOWED_IMAGE_TYPES[req.file.mimetype];

      if (
        !extension ||
        req.file.size > MAX_IMAGE_SIZE
      ) {
        deleteUploadedFile(req.file.path);

        return res.status(400).json({
          success: false,
          message: !extension
            ? "Only JPG, PNG, and WEBP images are allowed."
            : "Image size must not exceed 5 MB.",
        });
      }

      newUploadedFilePath = req.file.path;

      const backendUrl = (
        process.env.BACKEND_URL ||
        `${req.protocol}://${req.get("host")}`
      ).replace(/\/$/, "");

      payload.profile_image_url =
        `${backendUrl}/uploads/coach-profiles/${req.file.filename}`;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one valid profile field or image.",
      });
    }

    payload.updated_at = new Date().toISOString();

    // --------------------------------------------------
    // UPDATE COACH PROFILE IN DATABASE
    // --------------------------------------------------
    const {
      data,
      error,
    } = await supabase
      .from("coach_profiles")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      if (newUploadedFilePath) {
        deleteUploadedFile(newUploadedFilePath);
      }

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

    if (newUploadedFilePath) {
      deleteUploadedFile(newUploadedFilePath);
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};