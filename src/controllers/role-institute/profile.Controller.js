import supabase from "../../services/supabaseClient.js";

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

    // --------------------------------------------------
    // Check if profile already exists
    // --------------------------------------------------
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

    // --------------------------------------------------
    // Profile already exists
    // --------------------------------------------------
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

    // --------------------------------------------------
    // Get logged-in user
    // --------------------------------------------------
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

    // --------------------------------------------------
    // Check institute role
    // --------------------------------------------------
    if (user.role !== "institute") {
      return res.status(403).json({
        success: false,
        message: "User is not an institute user.",
      });
    }

    // --------------------------------------------------
    // Create institute profile
    // --------------------------------------------------
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

    return res.status(201).json({
      success: true,
      data,
      message:
        "Institute profile created successfully.",
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

    console.log(
      "Updating Institute Profile for:",
      userId
    );

    // --------------------------------------------------
    // Check if profile exists
    // --------------------------------------------------
    const {
      data: existingProfile,
      error: profileError,
    } = await supabase
      .from("institute_profile")
      .select("*")
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

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message:
          "Institute profile not found for this user.",
      });
    }

    // --------------------------------------------------
    // Get normal profile fields
    // --------------------------------------------------
    const payload = {
      ...req.body,
    };

    // --------------------------------------------------
    // Never allow these fields from frontend
    // --------------------------------------------------
    delete payload.id;
    delete payload.user_id;
    delete payload.logo_url;

    // --------------------------------------------------
    // If a new logo was uploaded
    // --------------------------------------------------
    if (req.file) {
      console.log(
        "📷 New institute logo:",
        req.file.filename
      );

      const logoUrl =
        `${req.protocol}://${req.get("host")}/uploads/institute-profiles/${req.file.filename}`;

      payload.logo_url = logoUrl;

      console.log(
        "🔗 Logo URL:",
        logoUrl
      );
    }

    // --------------------------------------------------
    // Update profile
    // --------------------------------------------------
    const {
      data,
      error,
    } = await supabase
      .from("institute_profile")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();

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

    console.log(
      "✅ Institute profile updated successfully."
    );

    return res.status(200).json({
      success: true,
      message:
        "Institute profile updated successfully.",
      data,
    });

  } catch (error) {
    console.error(
      "❌ Update Institute Profile Error:",
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