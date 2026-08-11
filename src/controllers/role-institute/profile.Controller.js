import supabase from "../../services/supabaseClient.js";

// GET INSTITUTE PROFILE
export const getInstituteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("=================================");
    console.log("Logged-in User ID:", userId);
    console.log("=================================");

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

    console.log(
      "Institute Profile:",
      data
    );

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

    console.log("=================================");
    console.log("Updating Institute Profile");
    console.log("Logged-in User ID:", userId);
    console.log("=================================");

    // Never allow frontend to change
    // the profile ID or user ID.
    const payload = {
      ...req.body,
    };

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

    // No matching profile found
    if (!data || data.length === 0) {
      console.error(
        "❌ No institute profile found for user:",
        userId
      );

      return res.status(404).json({
        success: false,
        message:
          "Institute profile not found for this user.",
      });
    }

    console.log(
      "✅ Institute Profile Updated:",
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