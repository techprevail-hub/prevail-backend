import supabase from "../services/supabaseClient.js";

import {
  generateInterviewQuestions,
  generateProfessionalInterview,
  generateFinalFeedback,
  evaluateIndividualAnswer,
} from "../services/interviewAIService.js";

import { createNotificationService } from "../services/notificationService.js";

import { generateInterviewVoice } from "../services/interviewVoiceService.js";

import { generateClientKey } from "../services/interviewdidService.js";

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

// Helper function to generate voice for question
const generateVoiceForQuestion = async (question, questionNumber, totalQuestions, stageName = null) => {
  try {
    let voiceText = "";
    if (stageName) {
      voiceText = `
${stageName}.

Question ${questionNumber}.

${question}
`;
    } else {
      voiceText = `
Question ${questionNumber}.

${question}
`;
    }
    
    console.log("Generating voice for question:", questionNumber);
    console.log("Voice text:", voiceText);
    
    const audioUrl = await generateInterviewVoice(voiceText);
    
    console.log("Voice generated successfully. Audio URL:", audioUrl);
    console.log("Audio URL length:", audioUrl ? audioUrl.length : 0);
    
    return { voiceText, audioUrl };
  } catch (error) {
    console.error("Generate Voice Error:");
    console.error(error);
    throw error;
  }
};

// --------------------------------------------------
// GET CLIENT KEY FOR D-ID
// GET /api/interview/client-key
// --------------------------------------------------
export const getClientKey = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    console.log("Generating D-ID client key for user:", userId);
    
    const clientKey = await generateClientKey();

    console.log("Client key generated successfully");

    return res.status(200).json({
      success: true,
      clientKey,
    });
  } catch (error) {
    console.error("========== GET CLIENT KEY ERROR ==========");
    console.error(error);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }

    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate client key.",
      details: error.response?.data || null,
    });
  }
};

// --------------------------------------------------
// START INTERVIEW
// POST /api/interview/start
// --------------------------------------------------
export const startInterview = async (req, res) => {
  try {
    console.log("========== START INTERVIEW ==========");
    console.log("BODY:", req.body);
    console.log("Headers Content-Type:", req.headers["content-type"]);
    console.log("User ID:", req.user?.id);

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    const {
      interview_type,
      sub_type,
      interview_mode,
      duration,
      company,
      job_title,
      job_description,
      tech_stack,
      difficulty,
      candidate_experience,
      resume_text,
    } = req.body;

    console.log("Parsed values:", { 
      interview_type, 
      sub_type, 
      interview_mode,
      duration,
      company,
      job_title,
      difficulty,
      candidate_experience,
      hasResume: !!resume_text,
    });

    if (!interview_type) {
      return res.status(400).json({
        success: false,
        message: "Interview type is required.",
      });
    }

    // Generate questions based on interview mode
    let questions = [];
    let stages = [];
    let firstQuestion = "";
    let currentStage = "Introduction";
    let totalQuestions = 10;
    let interviewDuration = duration || 15;

    if (interview_mode === "video") {
      console.log("Generating professional video interview...");
      
      // Pass all parameters to the service
      const interview = await generateProfessionalInterview(
        interview_type,
        sub_type,
        interviewDuration,
        company,
        job_title,
        job_description,
        tech_stack,
        difficulty || "Junior",
        candidate_experience || "Fresher",
        resume_text || ""
      );

      stages = interview.stages;
      questions = interview.stages.flatMap(stage => stage.questions);
      firstQuestion = stages[0]?.questions[0] || "";
      currentStage = stages[0]?.name || "Introduction";
      totalQuestions = interview.totalQuestions || questions.length;
      interviewDuration = interview.duration || duration || 15;

      console.log(`Generated ${totalQuestions} questions across ${stages.length} stages`);
    } else {
      console.log("Generating quick interview questions...");
      questions = await generateInterviewQuestions(interview_type);
      firstQuestion = questions[0] || "";
      totalQuestions = 10;
    }

    if (!firstQuestion) {
      throw new Error("No questions generated for the interview.");
    }

    // Generate voice for the first question if voice mode is enabled
    let voiceText = null;
    let audioUrl = null;

    if (interview_mode === "voice" || interview_mode === "video") {
      console.log("Generating first question voice...");
      const voiceData = await generateVoiceForQuestion(
        firstQuestion, 
        1, 
        totalQuestions,
        interview_mode === "video" ? currentStage : null
      );
      console.log("Voice data:", voiceData);
      voiceText = voiceData.voiceText;
      audioUrl = voiceData.audioUrl;
    }

    // ==========================================
    // Build insert data with all fields
    // ==========================================
    const insertData = {
      user_id: userId,
      interview_type,
      sub_type: sub_type || null,
      interview_mode: interview_mode || "text",
      questions,
      answers: [],
      answers_data: [],
      current_question: firstQuestion,
      current_index: 0,
      total_questions: totalQuestions,
      is_completed: false,
    };

    // Add video-specific fields
    if (interview_mode === "video") {
      insertData.interview_duration = interviewDuration;
      insertData.interview_status = "in_progress";
      insertData.started_at = new Date();
      insertData.current_stage = currentStage;
      insertData.current_stage_index = 0;
      insertData.interview_stages = stages;
      insertData.strengths = [];
      insertData.improvements = [];
      
      // ==========================================
      // Save all metadata fields to database
      // ==========================================
      insertData.company_name = company || null;
      insertData.job_title = job_title || null;
      insertData.job_description = job_description || null;
      insertData.tech_stack = tech_stack || null;
      insertData.difficulty = difficulty || null;
      insertData.candidate_experience = candidate_experience || null;
      insertData.resume_text = resume_text || null;
    }

    // Log the insert data before saving
    console.log("========== INSERT DATA ==========");
    console.log(JSON.stringify(insertData, null, 2));

    // Save interview session in Supabase
    const { data, error } = await supabase
      .from("interview_sessions")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);
      console.error("Error code:", error.code);

      return res.status(500).json({
        success: false,
        message: "Failed to start interview.",
        error: error.message,
        details: error.details,
        code: error.code,
      });
    }

    // Build response
    const response = {
      success: true,
      session_id: data.id,
      question: firstQuestion,
      voiceText: voiceText,
      audioUrl: audioUrl,
      interview_mode: data.interview_mode,
      question_number: 1,
      total_questions: totalQuestions,
    };

    // Add video-specific response fields
    if (interview_mode === "video") {
      response.current_stage = currentStage;
      response.current_stage_index = 0;
      response.interview_duration = interviewDuration;
      response.total_stages = stages.length;
      response.company = company || null;
      response.job_title = job_title || null;
      response.difficulty = difficulty || null;
      response.candidate_experience = candidate_experience || null;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("========== START INTERVIEW ERROR ==========");
    console.error(error);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }

    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message,
      details: error.response?.data || null,
    });
  }
};

// --------------------------------------------------
// ANSWER INTERVIEW QUESTION
// POST /api/interview/answer
// --------------------------------------------------
export const answerInterview = async (req, res) => {
  try {
    console.log("========== ANSWER INTERVIEW ==========");
    console.log("BODY:", req.body);
    console.log("Headers Content-Type:", req.headers["content-type"]);

    const { session_id, answer } = req.body;

    console.log("Parsed values:", { session_id, answer: answer ? answer.substring(0, 50) + "..." : "empty" });

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
      console.error("Session not found:", fetchError);
      return res.status(404).json({
        success: false,
        message: "Interview session not found.",
      });
    }

    console.log("Session found:", {
      id: session.id,
      interview_type: session.interview_type,
      interview_mode: session.interview_mode,
      current_index: session.current_index,
      total_questions: session.total_questions,
      is_completed: session.is_completed,
      company_name: session.company_name,
      job_title: session.job_title,
    });

    // If interview is already completed, return error
    if (session.is_completed) {
      return res.status(400).json({
        success: false,
        message: "Interview has already been completed.",
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

    // Store detailed answer with extended fields
    answersData.push({
      question_number: currentIndex + 1,
      question: currentQuestion,
      answer: answer,
      feedback: evaluation.feedback,
      score: evaluation.score,
      timestamp: new Date().toISOString(),
      audio_url: null,
      duration: null,
    });

    const nextIndex = currentIndex + 1;

    // Check if interview is completed
    if (nextIndex >= session.total_questions) {
      // Generate final feedback with richer data
      const result = await generateFinalFeedback(
        session.interview_type,
        answers
      );

      const score = Number(result.score) || 0;
      const feedback = result.feedback || "No feedback generated.";
      const summary = result.summary || "Interview completed.";
      const strengths = result.strengths || [];
      const improvements = result.improvements || [];

      const updateData = {
        answers,
        answers_data: answersData,
        user_answer: JSON.stringify(answers),
        final_feedback: feedback,
        ai_feedback: feedback,
        score,
        is_completed: true,
        current_index: nextIndex,
        interview_status: "completed",
        ended_at: new Date(),
        interview_summary: summary,
        strengths: strengths,
        improvements: improvements,
      };

      await supabase
        .from("interview_sessions")
        .update(updateData)
        .eq("id", session_id);

      // Create Notification for Interview Completion
      await createNotificationService(
        session.user_id,
        "Mock Interview Complete",
        `Your interview report is ready. Final Score: ${score}/10`,
        "system",
        "interview",
        "/dashboard/seeker/interview"
      );

      return res.status(200).json({
        success: true,
        completed: true,
        score,
        final_feedback: feedback,
        summary: summary,
        strengths: strengths,
        improvements: improvements,
        feedback: evaluation.feedback,
      });
    }

    // Prepare next question
    const nextQuestion = questions[nextIndex];
    let nextVoiceText = null;
    let nextAudioUrl = null;
    let nextStage = session.current_stage || "Introduction";
    let nextStageIndex = session.current_stage_index || 0;

    // Handle stage progression for video interviews
    if (session.interview_mode === "video" && session.interview_stages) {
      const stages = session.interview_stages;
      const currentStageIndex = session.current_stage_index || 0;
      const currentStageQuestions = stages[currentStageIndex]?.questions || [];
      const questionIndexInStage = nextIndex - (stages.slice(0, currentStageIndex).reduce((sum, s) => sum + s.questions.length, 0));

      // If we've completed all questions in the current stage, move to next stage
      if (questionIndexInStage >= currentStageQuestions.length && currentStageIndex < stages.length - 1) {
        nextStageIndex = currentStageIndex + 1;
        nextStage = stages[nextStageIndex].name;
        console.log(`Moving to next stage: ${nextStage}`);
      } else {
        nextStage = stages[currentStageIndex]?.name || "Introduction";
        nextStageIndex = currentStageIndex;
      }
    }

    // Generate voice for the next question if voice or video mode
    if (session.interview_mode === "voice" || session.interview_mode === "video") {
      console.log(`Generating voice for question ${nextIndex + 1}...`);
      const voiceData = await generateVoiceForQuestion(
        nextQuestion, 
        nextIndex + 1, 
        session.total_questions,
        session.interview_mode === "video" ? nextStage : null
      );
      console.log("Voice data:", voiceData);
      nextVoiceText = voiceData.voiceText;
      nextAudioUrl = voiceData.audioUrl;
    }

    // Save progress
    const updateData = {
      answers,
      answers_data: answersData,
      current_index: nextIndex,
      current_question: nextQuestion,
    };

    if (session.interview_mode === "video") {
      updateData.current_stage = nextStage;
      updateData.current_stage_index = nextStageIndex;
    }

    await supabase
      .from("interview_sessions")
      .update(updateData)
      .eq("id", session_id);

    // Build response
    const response = {
      success: true,
      completed: false,
      question: nextQuestion,
      voiceText: nextVoiceText,
      audioUrl: nextAudioUrl,
      question_number: nextIndex + 1,
      total_questions: session.total_questions,
      feedback: evaluation.feedback,
    };

    // Add video-specific response fields
    if (session.interview_mode === "video") {
      response.current_stage = nextStage;
      response.current_stage_index = nextStageIndex;
      response.total_stages = session.interview_stages?.length || 0;
    }

    return res.status(200).json(response);
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

    // Format the response for frontend to show all questions
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
      interview_mode: data.interview_mode || "text",
      completed_at: data.created_at,
      is_completed: data.is_completed,
      score: data.score,
      final_feedback: data.final_feedback,
      interview_status: data.interview_status || "completed",
      interview_duration: data.interview_duration || null,
      current_stage: data.current_stage || null,
      current_stage_index: data.current_stage_index || 0,
      interview_stages: data.interview_stages || [],
      company_name: data.company_name || null,
      job_title: data.job_title || null,
      job_description: data.job_description || null,
      tech_stack: data.tech_stack || null,
      difficulty: data.difficulty || null,
      candidate_experience: data.candidate_experience || null,
      resume_text: data.resume_text || null,
      strengths: data.strengths || [],
      improvements: data.improvements || [],
      interview_summary: data.interview_summary || null,
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