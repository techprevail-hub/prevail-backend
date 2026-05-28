import supabase from "../services/supabaseClient.js";

import {
  generateInterviewQuestion,
  evaluateInterviewAnswer,
} from "../services/interviewAIService.js";

// --------------------------------------------------
// START INTERVIEW
// POST /api/interview/start
// --------------------------------------------------
export const startInterview =
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
      // Get interview type
      // --------------------------------------------------
      const { interview_type } =
        req.body;

      if (!interview_type) {
        return res.status(400).json({
          success: false,
          message:
            "Interview type is required.",
        });
      }

      // --------------------------------------------------
      // Generate first question
      // --------------------------------------------------
      const question =
        await generateInterviewQuestion(
          interview_type
        );

      // --------------------------------------------------
      // Save session
      // --------------------------------------------------
      const { data, error } =
        await supabase
          .from("interview_sessions")
          .insert([
            {
              user_id: userId,
              interview_type,
              current_question:
                question,
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
            "Failed to save interview session.",
        });
      }

      // --------------------------------------------------
      // Success response
      // --------------------------------------------------
      return res.status(200).json({
        success: true,
        session_id: data.id,
        question,
      });
    } catch (error) {
      console.error(
        "Start Interview Error:",
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
// ANSWER INTERVIEW QUESTION
// POST /api/interview/answer
// --------------------------------------------------
export const answerInterview =
  async (req, res) => {
    try {
      // --------------------------------------------------
      // Validate request body
      // --------------------------------------------------
      const {
        session_id,
        question,
        answer,
        interview_type,
      } = req.body;

      if (
        !session_id ||
        !question ||
        !answer
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields.",
        });
      }

      // --------------------------------------------------
      // Evaluate answer
      // --------------------------------------------------
      const feedback =
        await evaluateInterviewAnswer(
          question,
          answer,
          interview_type
        );

      // --------------------------------------------------
      // Update session
      // --------------------------------------------------
      const { error } =
        await supabase
          .from("interview_sessions")
          .update({
            user_answer: answer,
            ai_feedback: feedback,
          })
          .eq("id", session_id);

      // --------------------------------------------------
      // Handle DB error
      // --------------------------------------------------
      if (error) {
        console.error(
          "Update Session Error:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to update session.",
        });
      }

      // --------------------------------------------------
      // Success response
      // --------------------------------------------------
      return res.status(200).json({
        success: true,
        feedback,
      });
    } catch (error) {
      console.error(
        "Answer Interview Error:",
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
// GET INTERVIEW HISTORY
// GET /api/interview
// --------------------------------------------------
export const getInterviewHistory =
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
          .from("interview_sessions")
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
          "Fetch History Error:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to fetch interview history.",
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