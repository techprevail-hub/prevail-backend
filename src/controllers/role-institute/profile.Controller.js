import supabase from "../../services/supabaseClient.js";
import path from "path";

// --------------------------------------------------
// CREATE INSTITUTE PROFILE
// --------------------------------------------------
export const createInstituteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(
      "Creating/Checking Institute Profile for:",
      userId
    );

    // Check if profile already exists
    const {
      data: existingProfile,
      error: profileCheckError,
    } = await supabase
      .from("institute_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileCheckError) {
      console.error(
        "❌ Error checking institute profile:",
        profileCheckError
      );

      return res.status(400).json({
        success: false,
        message: profileCheckError.message,
      });
    }

    // Profile already exists
    if (existingProfile) {
      console.log(
        "✅ Institute profile already exists:",
        existingProfile.id
      );

      return res.status(200).json({
        success: true,
        data: existingProfile,
        message: "Institute profile already exists.",
      });
    }

    // Get user information
    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error(
        "❌ Error fetching user:",
        userError
      );

      return res.status(400).json({
        success: false,
        message: userError.message,
      });
    }

    // Make sure user is an institute
    if (user.role !== "institute") {
      return res.status(403).json({
        success: false,
        message: "User is not an institute user.",
      });
    }

    // Create empty institute profile
    const payload = {
      user_id: userId,
      institute_name: user.name || "",
      email: user.email || "",
      logo_url: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      courses: [],
    };

    const {
      data,
      error,
    } = await supabase
      .from("institute_profile")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error(
        "❌ Error creating institute profile:",
        error
      );

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.log(
      "✅ Institute profile created:",
      data
    );

    return res.status(201).json({
      success: true,
      data,
      message: "Institute profile created successfully.",
    });

  } catch (error) {
    console.error(
      "❌ Create Institute Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// --------------------------------------------------
// UPLOAD INSTITUTE PROFILE LOGO
// --------------------------------------------------
export const uploadInstituteLogo = async (req, res) => {
  try {
    const userId = req.user.id;

    // Make sure file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    console.log(
      "📷 Uploading institute logo for:",
      userId
    );

    // --------------------------------------------------
    // Check institute profile
    // --------------------------------------------------
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("institute_profile")
      .select("id, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error(
        "❌ Error checking institute profile:",
        profileError
      );

      return res.status(400).json({
        success: false,
        message: profileError.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message:
          "Institute profile not found for this user.",
      });
    }

    // --------------------------------------------------
    // Create unique file name
    // --------------------------------------------------
    const extension = path
      .extname(req.file.originalname)
      .toLowerCase();

    const fileName =
      `${userId}-${Date.now()}${extension}`;

    const filePath =
      `logos/${fileName}`;

    console.log(
      "📁 Uploading file:",
      filePath
    );

    // --------------------------------------------------
    // Upload file to Supabase Storage
    // --------------------------------------------------
    const {
      error: uploadError,
    } = await supabase.storage
      .from("institute-profiles")
      .upload(
        filePath,
        req.file.buffer,
        {
          contentType: req.file.mimetype,
          upsert: false,
        }
      );

    if (uploadError) {
      console.error(
        "❌ Supabase Storage Upload Error:",
        uploadError
      );

      return res.status(400).json({
        success: false,
        message: uploadError.message,
      });
    }

    // --------------------------------------------------
    // Get public URL
    // --------------------------------------------------
    const {
      data: publicUrlData,
    } = supabase.storage
      .from("institute-profiles")
      .getPublicUrl(filePath);

    const logoUrl =
      publicUrlData?.publicUrl;

    if (!logoUrl) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to generate image URL.",
      });
    }

    console.log(
      "✅ Logo URL:",
      logoUrl
    );

    // --------------------------------------------------
    // Save URL in institute_profile
    // --------------------------------------------------
    const {
      data: updatedProfile,
      error: updateError,
    } = await supabase
      .from("institute_profile")
      .update({
        logo_url: logoUrl,
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error(
        "❌ Error saving logo URL:",
        updateError
      );

      return res.status(400).json({
        success: false,
        message: updateError.message,
      });
    }

    console.log(
      "✅ Institute logo saved successfully."
    );

    return res.status(200).json({
      success: true,
      message:
        "Institute logo uploaded successfully.",
      data: updatedProfile,
      logo_url: logoUrl,
    });

  } catch (error) {
    console.error(
      "❌ Upload Institute Logo Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error.",
    });
  }
};


// --------------------------------------------------
// GET INSTITUTE PROFILE
// --------------------------------------------------
export const getInstituteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(
      "Logged-in User ID:",
      userId
    );

    const {
      data,
      error,
    } = await supabase
      .from("institute_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "❌ Error fetching institute profile:",
        error
      );

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: data || null,
    });

  } catch (error) {
    console.error(
      "❌ Get Institute Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// --------------------------------------------------
// UPDATE INSTITUTE PROFILE
// --------------------------------------------------
export const updateInstituteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const payload = {
      ...req.body,
    };

    // Do not allow frontend to change
    // profile ID or user ID.
    delete payload.id;
    delete payload.user_id;

    const {
      data,
      error,
    } = await supabase
      .from("institute_profile")
      .update(payload)
      .eq("user_id", userId)
      .select();

    if (error) {
      console.error(
        "❌ Error updating institute profile:",
        error
      );

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Institute profile not found for this user.",
      });
    }

    return res.status(200).json({
      success: true,
      data: data[0],
    });

  } catch (error) {
    console.error(
      "❌ Update Institute Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};