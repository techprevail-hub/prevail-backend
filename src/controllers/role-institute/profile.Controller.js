import supabase from "../../services/supabaseClient.js";

// CREATE INSTITUTE PROFILE
export const createInstituteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(
      "Creating/Checking Institute Profile for:",
      userId
    );

    // --------------------------------------------------
    // 1. Check if institute profile already exists
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
    // 2. If profile already exists, return it
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
    // 3. Get logged-in user's information
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
    // 4. Make sure the user is an institute user
    // --------------------------------------------------
    if (user.role !== "institute") {
      return res.status(403).json({
        success: false,
        message: "User is not an institute user.",
      });
    }

    // --------------------------------------------------
    // 5. Create institute profile
    // --------------------------------------------------
    const payload = {
      user_id: userId,

      // Take institute name from logged-in user's name
      institute_name: user.name || "",

      logo_url: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      courses: [],
    };

    console.log(
      "🚀 Creating new institute profile:",
      payload
    );

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
      "✅ Institute profile created successfully:",
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


// GET INSTITUTE PROFILE
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


// UPDATE INSTITUTE PROFILE
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

    console.log(
      "Updating institute profile for:",
      userId
    );

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

    // No profile found
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Institute profile not found for this user.",
      });
    }

    console.log(
      "✅ Institute profile updated successfully:",
      data[0]
    );

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