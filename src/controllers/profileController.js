import supabase from "../services/supabaseClient.js";

// CREATE PROFILE
export const createProfile = async (req, res) => {

  try {

    const { data, error } = await supabase
      .from("Seeker-profiles")
      .insert([req.body])
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
export const getProfile = async (req, res) => {

  try {

    const userId = req.user.id;

    const { data, error } = await supabase
      .from("Seeker-profiles")
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
export const updateProfile = async (req, res) => {

  try {

    const userId = req.user.id;

    const payload = {
      user_id: userId,
      ...req.body,
    };

    const { data, error } = await supabase
      .from("Seeker-profiles")
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