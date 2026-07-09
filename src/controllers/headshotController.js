import supabase from "../services/supabaseClient.js";
import { generateHeadshotAI } from "../services/headshotAIService.js";
import { createNotificationService } from "../services/notificationService.js";

/**
 * POST /api/headshot
 * Generate AI headshots
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
    // Logged-in user
    // --------------------------------------------------
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    // --------------------------------------------------
    // Selected style
    // --------------------------------------------------
    const style = req.body.style || "Professional";

    // --------------------------------------------------
    // Upload original image to Supabase Storage
    // --------------------------------------------------
    let originalImageUrl = null;
    
    try {
      const fileExtension = req.file.originalname.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExtension}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('headshot-originals')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Supabase Upload Error:", uploadError);
      } else {
        // Get public URL for the uploaded image
        const { data: urlData } = supabase.storage
          .from('headshot-originals')
          .getPublicUrl(fileName);
        
        originalImageUrl = urlData.publicUrl;
        console.log("Original image uploaded successfully:", originalImageUrl);
      }
    } catch (uploadError) {
      console.error("Upload Error:", uploadError);
    }

    // --------------------------------------------------
    // Generate AI images
    // --------------------------------------------------
    const generatedImages = await generateHeadshotAI(req.file, style);

    // --------------------------------------------------
    // Save in Supabase - Store the FULL URL
    // --------------------------------------------------
    const insertData = {
      user_id: userId,
      style,
      original_image: req.file.originalname,
      original_image_url: originalImageUrl || req.file.originalname, // Store URL or fallback to filename
      generated_images: generatedImages,
    };

    const { data, error } = await supabase
      .from("headshot")
      .insert([insertData])
      .select()
      .single();

    // --------------------------------------------------
    // Handle database error
    // --------------------------------------------------
    if (error) {
      console.error("Supabase Insert Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save generated headshots.",
        error: error.message,
      });
    }

    // Create Notification
    await createNotificationService(
      userId,
      "Headshot Generated Successfully",
      `Your ${style} AI headshot is ready to view.`,
      "system",
      "headshot",
      "/dashboard/seeker/headshot"
    );

    // Success response
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

/**
 * GET /api/headshot
 * Fetch headshot history
 */
export const getHeadshotHistory = async (req, res) => {
  try {
    // --------------------------------------------------
    // Logged-in user
    // --------------------------------------------------
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    // --------------------------------------------------
    // Fetch history
    // --------------------------------------------------
    const { data, error } = await supabase
      .from("headshot")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    // --------------------------------------------------
    // Handle errors
    // --------------------------------------------------
    if (error) {
      console.error("Fetch History Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch headshot history.",
        error: error.message,
      });
    }

    // --------------------------------------------------
    // Success response
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get History Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};