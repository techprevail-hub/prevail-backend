// src/controllers/headshotController.js

import supabase from "../services/supabaseClient.js";
import { generateHeadshotAI } from "../services/headshotAIService.js";

/**
 * POST /api/headshot
 * Upload image and generate AI professional headshots
 */
export const generateHeadshot = async (req, res) => {
  try {
    // --------------------------------------------------
    // Validate uploaded image
    // --------------------------------------------------
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    // --------------------------------------------------
    // Get logged-in user
    // --------------------------------------------------
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    // --------------------------------------------------
    // Get style from request
    // --------------------------------------------------
    const style = req.body.style || "Professional";

    // --------------------------------------------------
    // Generate AI headshots
    // --------------------------------------------------
    const generatedImages = await generateHeadshotAI(
      req.file,
      style
    );

    // --------------------------------------------------
    // Save data in Supabase
    // --------------------------------------------------
    const { data, error } = await supabase
      .from("headshot_generations")
      .insert([
        {
          user_id: userId,
          style,
          original_image: req.file.filename,
          generated_images: generatedImages,
        },
      ])
      .select()
      .single();

    // --------------------------------------------------
    // Handle Supabase errors
    // --------------------------------------------------
    if (error) {
      console.error("Supabase Insert Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save generated headshots.",
        error: error.message,
      });
    }

    // --------------------------------------------------
    // Return success response
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "AI headshots generated successfully.",
      data,
    });
  } catch (error) {
    console.error("Generate Headshot Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};