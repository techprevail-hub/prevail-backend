import supabase from "../../services/supabaseClient.js";

// CREATE PROFILE
export const createInstituteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const payload = {
      user_id: userId,
      ...req.body,
    };

    const { data, error } = await supabase
      .from("institute_profile")
      .insert([payload])
      .select();

    if (error) {
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// GET PROFILE
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


// UPDATE PROFILE
export const updateInstituteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const payload = {
      user_id: userId,
      ...req.body,
    };

    const { data, error } = await supabase
      .from("institute_profile")
      .upsert(payload, {
        onConflict: "user_id",
      })
      .select();

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