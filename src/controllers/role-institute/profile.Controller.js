import supabase from "../../services/supabaseClient.js";

// GET INSTITUTE PROFILE
export const getInstituteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("institute_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
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

    // Do not allow frontend to change user_id
    delete payload.user_id;
    delete payload.id;

    const { data, error } = await supabase
      .from("institute_profile")
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
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};