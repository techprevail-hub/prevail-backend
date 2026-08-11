import supabase from "../../services/supabaseClient.js";

// CREATE INSTITUTE PROFILE
export const createInstituteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const payload = {
      user_id: userId,
      institute_name: req.body.institute_name || "",
      logo_url: req.body.logo_url || "",
      phone: req.body.phone || "",
      address: req.body.address || "",
      city: req.body.city || "",
      state: req.body.state || "",
      country: req.body.country || "",
      courses: Array.isArray(req.body.courses)
        ? req.body.courses
        : [],
    };

    console.log("Creating Institute Profile for:", userId);

    const { data, error } = await supabase
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

    console.log("Logged-in User ID:", userId);

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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