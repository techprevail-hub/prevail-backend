import supabase from "../services/supabaseClient.js";

import {
  generateInterviewQuestions,
  generateFinalFeedback,
} from "../services/interviewAIService.js";
import { createNotificationService } from "../services/notificationService.js";

// Helper function to evaluate individual answer
const evaluateAnswer = async (question, answer, interviewType) => {
  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({
      apiKey: process.env.INTERVIEW_GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional AI interviewer. Evaluate the answer and return a score out of 10 and brief feedback. Format: Score: X/10 - Feedback here`,
        },
        {
          role: "user",
          content: `Interview Type: ${interviewType}\nQuestion: ${question}\nAnswer: ${answer}`,
        },
      ],
      model: "llama-3.1-8b-instant",
    });

    const response = completion.choices?.[0]?.message?.content || "";
    
    // Extract score and feedback
    const scoreMatch = response.match(/Score:\s*(\d+(?:\.\d+)?)\/10/i);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;
    const feedback = response.replace(/Score:\s*\d+(?:\.\d+)?\/10\s*-?\s*/i, "").trim();
    
    return { score, feedback: feedback || "Your answer has been recorded." };
  } catch (error) {
    console.error("Evaluate Answer Error:", error);
    return { score: 5, feedback: "Answer recorded. Detailed feedback will be available soon." };
  }
};

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
      .update({
        answers,
        answers_data: answersData,
        user_answer: JSON.stringify(answers),
        final_feedback: feedback,
        ai_feedback: feedback,
        score,
        is_completed: true,
        current_index: nextIndex,
      })
      .eq("id", session_id);

    // Create Notification
    await createNotificationService(
      session.user_id,
      "Mock Interview Complete",
      `Your interview report is ready. Final Score: ${score}/100`,
      "system",
      "interview",
      "/dashboard/interview"
    );

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
    const answersData = session.answers_data || [];
    const currentIndex = session.current_index || 0;
    const currentQuestion = questions[currentIndex];

    // Evaluate the answer
    const evaluation = await evaluateAnswer(currentQuestion, answer, session.interview_type);

    answers.push({
      question: currentQuestion,
      answer,
    });

    // Store detailed answer with feedback
    answersData.push({
      question_number: currentIndex + 1,
      question: currentQuestion,
      answer: answer,
      feedback: evaluation.feedback,
      score: evaluation.score,
      timestamp: new Date().toISOString(),
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
          answers_data: answersData,
          user_answer: JSON.stringify(answers),
          final_feedback: feedback,
          ai_feedback: feedback,
          score,
          is_completed: true,
          current_index: nextIndex,
        })
        .eq("id", session_id);

      return res.status(200).json({
        success: true,
        completed: true,
        score,
        final_feedback: feedback,
        feedback: evaluation.feedback,
      });
    }

    // ------------------------------------------
    // Save Progress
    // ------------------------------------------
    await supabase
      .from("interview_sessions")
      .update({
        answers,
        answers_data: answersData,
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
      feedback: evaluation.feedback,
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
// GET SINGLE INTERVIEW SESSION DETAILS
// GET /api/interview/session/:id
// --------------------------------------------------
export const getInterviewSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    const { data, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found.",
      });
    }

    // Format the response for frontend to show all 10 questions
    const questionsData = data.answers_data && data.answers_data.length > 0 
      ? data.answers_data 
      : data.answers.map((ans, idx) => ({
          question_number: idx + 1,
          question: ans.question,
          answer: ans.answer,
          feedback: null,
          score: null,
        }));

    const sessionData = {
      session_id: data.id,
      interview_type: data.interview_type,
      sub_type: data.sub_type || null,
      completed_at: data.created_at,
      is_completed: data.is_completed,
      score: data.score,
      final_feedback: data.final_feedback,
      questions: data.questions.map((question, index) => {
        const answerData = questionsData.find(
          (a) => a.question_number === index + 1 || a.question === question
        );
        return {
          question_number: index + 1,
          question: question,
          answer: answerData?.answer || null,
          feedback: answerData?.feedback || null,
          score: answerData?.score || null,
        };
      }),
    };

    return res.status(200).json({
      success: true,
      data: sessionData,
    });
  } catch (error) {
    console.error("Get Session Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
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
    const { user_answer, question } = req.body;

    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found.",
      });
    }

    let answersData = session.answers_data || [];
    
    const questionIndex = answersData.findIndex(
      (a) => a.question === question
    );

    if (questionIndex !== -1) {
      const evaluation = await evaluateAnswer(question, user_answer, session.interview_type);
      
      answersData[questionIndex] = {
        ...answersData[questionIndex],
        answer: user_answer,
        feedback: evaluation.feedback,
        score: evaluation.score,
      };
    }

    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        answers_data: answersData,
        answers: answersData.map(a => ({ question: a.question, answer: a.answer })),
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