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
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user.",
        });
      }

      const { interview_type } =
        req.body;

      if (!interview_type) {
        return res.status(400).json({
          success: false,
          message:
            "Interview type is required.",
        });
      }

      const question =
        await generateInterviewQuestion(
          interview_type
        );

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

      const feedback =
        await evaluateInterviewAnswer(
          question,
          answer,
          interview_type
        );

      const { error } =
        await supabase
          .from("interview_sessions")
          .update({
            user_answer: answer,
            ai_feedback: feedback,
          })
          .eq("id", session_id);

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
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user.",
        });
      }

      const { data, error } =
        await supabase
          .from("interview_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          });

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

// --------------------------------------------------
// UPDATE INTERVIEW SESSION
// PUT /api/interview/:id
// --------------------------------------------------
export const updateInterview =
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        interview_type,
        user_answer,
      } = req.body;

      const { data, error } =
        await supabase
          .from("interview_sessions")
          .update({
            interview_type,
            user_answer,
          })
          .eq("id", id)
          .select()
          .single();

      if (error) {
        console.error(
          "Update Interview Error:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to update interview session.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Interview session updated successfully.",
        data,
      });
    } catch (error) {
      console.error(
        "Update Interview Error:",
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
// DELETE INTERVIEW SESSION
// DELETE /api/interview/:id
// --------------------------------------------------
export const deleteInterview =
  async (req, res) => {
    try {
      const { id } = req.params;

      const { error } =
        await supabase
          .from("interview_sessions")
          .delete()
          .eq("id", id);

      if (error) {
        console.error(
          "Delete Interview Error:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to delete interview session.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Interview session deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete Interview Error:",
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