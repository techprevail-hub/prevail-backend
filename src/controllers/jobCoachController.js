import supabase from "../services/supabaseClient.js";

import {
  generateCoachResponse,
} from "../services/jobCoachAIService.js";

// --------------------------------------------------
// POST /api/jobCoach
// --------------------------------------------------
export const coachChat =
  async (req, res) => {
    try {
      // --------------------------------------------------
      // Validate user
      // --------------------------------------------------
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user.",
        });
      }

      // --------------------------------------------------
      // Get request body
      // --------------------------------------------------
      const { message, role } =
        req.body;

      // --------------------------------------------------
      // Validate message
      // --------------------------------------------------
      if (!message) {
        return res.status(400).json({
          success: false,
          message:
            "Message is required.",
        });
      }

      // --------------------------------------------------
      // Generate AI response
      // --------------------------------------------------
      const aiResponse =
        await generateCoachResponse(
          message
        );

      // --------------------------------------------------
      // Save chat history
      // --------------------------------------------------
      const { data, error } =
        await supabase
          .from("coach_chats")
          .insert([
            {
              user_id: userId,
              role:
                role || "Student",
              user_message:
                message,
              ai_response:
                aiResponse,
            },
          ])
          .select()
          .single();

      // --------------------------------------------------
      // Handle DB error
      // --------------------------------------------------
      if (error) {
        console.error(
          "Supabase Error:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to save coach chat.",
          error: error.message,
        });
      }

      // --------------------------------------------------
      // Success response
      // --------------------------------------------------
      return res.status(200).json({
        success: true,
        message:
          "AI JobCoach response generated successfully.",
        data,
      });
    } catch (error) {
      console.error(
        "JobCoach Chat Error:",
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
// GET /api/jobCoach
// --------------------------------------------------
export const getCoachHistory =
  async (req, res) => {
    try {
      // --------------------------------------------------
      // Validate user
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
      const { data, error } =
        await supabase
          .from("coach_chats")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          });

      // --------------------------------------------------
      // Handle DB error
      // --------------------------------------------------
      if (error) {
        console.error(
          "History Fetch Error:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to fetch chat history.",
          error: error.message,
        });
      }

      // --------------------------------------------------
      // Success response
      // --------------------------------------------------
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        "Get History Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Internal server error.",
      });
    }
  };