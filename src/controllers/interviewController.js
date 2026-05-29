import supabase from "../services/supabaseClient.js";

import {
  generateInterviewQuestions,
  generateFinalFeedback,
} from "../services/interviewAIService.js";

// --------------------------------------------------
// START INTERVIEW
// POST /api/interview/start
// --------------------------------------------------
export const startInterview = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    const { interview_type } = req.body;

    if (!interview_type) {
      return res.status(400).json({
        success: false,
        message: "Interview type is required.",
      });
    }

    const questions = await generateInterviewQuestions(interview_type);
    const firstQuestion = questions[0];

    const { data, error } = await supabase
      .from("interview_sessions")
      .insert([
        {
          user_id: userId,
          interview_type,
          questions,
          answers: [],
          current_question: firstQuestion,
          current_index: 0,
          total_questions: 10,
          is_completed: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to start interview.",
      });
    }

    return res.status(200).json({
      success: true,
      session_id: data.id,
      question: firstQuestion,
      question_number: 1,
      total_questions: 10,
    });
  } catch (error) {
    console.error("Start Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

// --------------------------------------------------
// ANSWER INTERVIEW QUESTION
// POST /api/interview/answer
// --------------------------------------------------
export const answerInterview = async (req, res) => {
  try {
    const { session_id, answer } = req.body;

    if (!session_id || !answer) {
      return res.status(400).json({
        success: false,
        message: "Session ID and answer are required.",
      });
    }

    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found.",
      });
    }

    const questions = session.questions || [];
    const answers = session.answers || [];
    const currentIndex = session.current_index || 0;

    answers.push({
      question: questions[currentIndex],
      answer,
    });

    const nextIndex = currentIndex + 1;

    // ------------------------------------------
    // Interview Completed
    // ------------------------------------------
    if (nextIndex >= session.total_questions) {
      const result = await generateFinalFeedback(
        session.interview_type,
        answers
      );

      const score = Number(result.score) || 0;
      const feedback = result.feedback || "No feedback generated.";

      await supabase
        .from("interview_sessions")
        .update({
          answers,
          user_answer: JSON.stringify(answers),
          final_feedback: feedback,
          ai_feedback: feedback,
          score,
          is_completed: true,
        })
        .eq("id", session_id);

      return res.status(200).json({
        success: true,
        completed: true,
        score,
        final_feedback: feedback,
      });
    }

    // ------------------------------------------
    // Save Progress
    // ------------------------------------------
    await supabase
      .from("interview_sessions")
      .update({
        answers,
        current_index: nextIndex,
        current_question: questions[nextIndex],
      })
      .eq("id", session_id);

    return res.status(200).json({
      success: true,
      completed: false,
      question: questions[nextIndex],
      question_number: nextIndex + 1,
      total_questions: session.total_questions,
    });
  } catch (error) {
    console.error("Answer Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

// --------------------------------------------------
// GET INTERVIEW HISTORY
// GET /api/interview
// --------------------------------------------------
export const getInterviewHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    const { data, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Fetch History Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch interview history.",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// --------------------------------------------------
// UPDATE INTERVIEW SESSION
// PUT /api/interview/:id
// --------------------------------------------------
export const updateInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { interview_type, user_answer } = req.body;

    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        interview_type,
        user_answer,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update Interview Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update interview session.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Interview session updated successfully.",
      data,
    });
  } catch (error) {
    console.error("Update Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

// --------------------------------------------------
// DELETE INTERVIEW SESSION
// DELETE /api/interview/:id
// --------------------------------------------------
export const deleteInterview = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("interview_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete Interview Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete interview session.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Interview session deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};