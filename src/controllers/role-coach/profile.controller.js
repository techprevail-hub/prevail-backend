
import crypto from "crypto";

import supabase, {
  supabaseAdmin,
} from "../../services/supabaseClient.js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const BUCKET_NAME = "coach-profiles";

const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// --------------------------------------------------
// HELPER: GET LOGGED-IN COACH
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
// HELPER: DELETE IMAGE FROM SUPABASE STORAGE
// --------------------------------------------------

const deleteStorageImage = async (storagePath) => {
  if (!storagePath || !supabaseAdmin) return;

  try {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error(
        "Failed to delete coach profile image from Supabase:",
        error.message
      );
    }
  } catch (error) {
    console.error(
      "Error deleting coach profile image:",
      error
    );
  }
};

// --------------------------------------------------
// HELPER: EXTRACT STORAGE PATH FROM PUBLIC URL
// Only deletes images belonging to our Supabase bucket.
// Old Render URLs are safely ignored.
// --------------------------------------------------

const getStoragePathFromPublicUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") {
    return null;
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!supabaseUrl) return null;

    const imageUrlObject = new URL(imageUrl);
    const supabaseUrlObject = new URL(supabaseUrl);

    // Ensure the URL belongs to this Supabase project.
    if (imageUrlObject.origin !== supabaseUrlObject.origin) {
      return null;
    }

    const publicPathPrefix =
      `/storage/v1/object/public/${BUCKET_NAME}/`;

    if (!imageUrlObject.pathname.startsWith(publicPathPrefix)) {
      return null;
    }

    const storagePath = decodeURIComponent(
      imageUrlObject.pathname.slice(publicPathPrefix.length)
    );

    return storagePath || null;
  } catch (error) {
    console.error("Could not parse old profile image URL:", error);
    return null;
  }
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
// Optimized: fetch user and profile in parallel
// --------------------------------------------------

export const getCoachProfile = async (req, res) => {
  const startedAt = performance.now();

  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Both queries use the same userId, so they can run together.
    const [userResult, profileResult] = await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, role")
        .eq("id", userId)
        .maybeSingle(),

      supabase
        .from("coach_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const { data: user, error: userError } = userResult;
    const { data: profile, error: profileError } = profileResult;

    if (userError) {
      console.error("Coach user query error:", userError);

      return res.status(400).json({
        success: false,
        message: userError.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role !== "coach") {
      return res.status(403).json({
        success: false,
        message: "User is not a coach.",
      });
    }

    if (profileError) {
      console.error("Coach profile query error:", profileError);

      return res.status(400).json({
        success: false,
        message: profileError.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Coach profile not found. Please create your profile.",
      });
    }

    console.log(
      `GET coach profile completed in ${(
        performance.now() - startedAt
      ).toFixed(2)} ms`
    );

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
// Profile images are stored in Supabase Storage.
// --------------------------------------------------

export const updateCoachProfile = async (req, res) => {
  let newStoragePath = null;

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

    const { data: existingProfile, error: checkError } =
      await supabase
        .from("coach_profiles")
        .select("id, profile_image_url")
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
        Object.prototype.hasOwnProperty.call(req.body || {}, field)
      ) {
        payload[field] = req.body[field];
      }
    }

    // ----------------------------------------------
    // VALIDATE EXPERIENCE
    // ----------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "experience_years"
      )
    ) {
      const experience = Number(payload.experience_years);

      if (!Number.isInteger(experience) || experience < 0) {
        return res.status(400).json({
          success: false,
          message: "Experience must be a non-negative integer.",
        });
      }

      payload.experience_years = experience;
    }

    // ----------------------------------------------
    // PARSE AND VALIDATE LANGUAGES
    // ----------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(payload, "languages")
    ) {
      if (typeof payload.languages === "string") {
        try {
          payload.languages = JSON.parse(payload.languages);
        } catch {
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
        return res.status(400).json({
          success: false,
          message: "Languages must be an array of strings.",
        });
      }
    }

    // ----------------------------------------------
    // VALIDATE STRING FIELDS
    // ----------------------------------------------

    for (const field of [
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

    // ----------------------------------------------
    // UPLOAD NEW PROFILE IMAGE TO SUPABASE STORAGE
    // ----------------------------------------------

    if (req.file) {
      const extension = ALLOWED_IMAGE_TYPES[req.file.mimetype];

      if (!extension) {
        return res.status(400).json({
          success: false,
          message: "Only JPG, PNG, and WEBP images are allowed.",
        });
      }

      if (req.file.size > MAX_IMAGE_SIZE) {
        return res.status(400).json({
          success: false,
          message: "Image size must not exceed 5 MB.",
        });
      }

      if (!req.file.buffer) {
        return res.status(400).json({
          success: false,
          message:
            "Image buffer not found. Please use multer memoryStorage.",
        });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          message:
            "Supabase Storage configuration is missing. Please configure SUPABASE_SERVICE_ROLE_KEY on the backend.",
        });
      }

      // Each image gets a unique path inside the coach's folder.
      newStoragePath =
        `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(newStoragePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        newStoragePath = null;

        console.error(
          "Supabase coach image upload error:",
          uploadError
        );

        return res.status(500).json({
          success: false,
          message: uploadError.message || "Image upload failed.",
        });
      }

      // Generate a permanent public URL for the uploaded image.
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(newStoragePath);

      if (!publicUrlData?.publicUrl) {
        await deleteStorageImage(newStoragePath);
        newStoragePath = null;

        return res.status(500).json({
          success: false,
          message: "Could not generate profile image URL.",
        });
      }

      payload.profile_image_url = publicUrlData.publicUrl;
    }

    // ----------------------------------------------
    // CHECK FOR AT LEAST ONE UPDATE FIELD
    // ----------------------------------------------

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide at least one valid profile field or image.",
      });
    }

    payload.updated_at = new Date().toISOString();

    // ----------------------------------------------
    // UPDATE COACH PROFILE IN DATABASE
    // ----------------------------------------------

    const { data, error } = await supabase
      .from("coach_profiles")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      // If database update fails, remove the newly uploaded image.
      if (newStoragePath) {
        await deleteStorageImage(newStoragePath);
        newStoragePath = null;
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // ----------------------------------------------
    // DELETE PREVIOUS SUPABASE IMAGE AFTER DB SUCCESS
    // ----------------------------------------------

    // Existing Render URLs are ignored safely.
    // Only images from this Supabase bucket are deleted.
    if (newStoragePath && existingProfile.profile_image_url) {
      const oldStoragePath = getStoragePathFromPublicUrl(
        existingProfile.profile_image_url
      );

      if (oldStoragePath && oldStoragePath !== newStoragePath) {
        await deleteStorageImage(oldStoragePath);
      }
    }

    // The new image is now saved successfully.
    newStoragePath = null;

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

    // Clean up newly uploaded image if something fails.
    if (newStoragePath) {
      await deleteStorageImage(newStoragePath);
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
