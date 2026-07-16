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

import {
  startVideoInterviewService,
  saveVideoTranscriptService,
  completeVideoInterviewService,
  getVideoInterviewService,
} from "../services/InterviewVideoService.js";

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

    // =========================================
    // Professional Video Interview
    // =========================================
    if (interview_mode === "video") {
      console.log("Using D-ID Professional Interview");

      try {
        const result = await startVideoInterviewService({
          userId,
          interview_type,
          sub_type,
          duration,
          company,
          job_title,
          job_description,
          tech_stack,
          difficulty,
          candidate_experience,
          resume_text,
        });

        return res.status(200).json({
          success: true,
          ...result,
        });
      } catch (videoError) {
        console.error("Video Interview Service Error:", videoError);
        return res.status(500).json({
          success: false,
          message: videoError.message || "Failed to start video interview.",
          details: videoError.response?.data || null,
        });
      }
    }

    // =========================================
    // Text & Voice Interview Flow
    // =========================================

    if (!interview_type) {
      return res.status(400).json({
        success: false,
        message: "Interview type is required.",
      });
    }

    // Generate questions based on interview mode (only for Text/Voice)
    let questions = [];
    let firstQuestion = "";
    let totalQuestions = 10;

    console.log("Generating quick interview questions...");
    questions = await generateInterviewQuestions(interview_type);
    firstQuestion = questions[0] || "";
    totalQuestions = 10;

    if (!firstQuestion) {
      throw new Error("No questions generated for the interview.");
    }

    // Generate voice for the first question if voice mode is enabled
    let voiceText = null;
    let audioUrl = null;

    if (interview_mode === "voice") {
      console.log("Generating first question voice...");
      const voiceData = await generateVoiceForQuestion(firstQuestion, 1, totalQuestions);
      console.log("Voice data:", voiceData);
      voiceText = voiceData.voiceText;
      audioUrl = voiceData.audioUrl;
    }

    // ==========================================
    // Build insert data for Text/Voice
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
    });

    // =========================================
    // Professional Video Interview - Early Return
    // =========================================
    if (session.interview_mode === "video") {
      console.log("Professional Video Interview - Saving transcript...");
      
      // For video interviews, we just save the transcript/conversation
      // The D-ID agent handles all question/answer flow
      try {
        const result = await saveVideoTranscriptService({
          session_id,
          transcript: session.transcript || [],
          conversation: session.conversation || [],
          messages: session.messages || [],
          user_id: session.user_id,
        });

        return res.status(200).json({
          success: true,
          message: "Transcript saved for video interview.",
          session_id,
          ...result,
        });
      } catch (videoError) {
        console.error("Video Interview Save Error:", videoError);
        return res.status(500).json({
          success: false,
          message: videoError.message || "Failed to save video interview transcript.",
        });
      }
    }

    // =========================================
    // Text & Voice Interview Flow
    // =========================================

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

    // Generate voice for the next question if voice mode
    if (session.interview_mode === "voice") {
      console.log(`Generating voice for question ${nextIndex + 1}...`);
      const voiceData = await generateVoiceForQuestion(nextQuestion, nextIndex + 1, session.total_questions);
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
// COMPLETE VIDEO INTERVIEW
// POST /api/interview/complete-video
// --------------------------------------------------
export const completeVideoInterview = async (req, res) => {
  try {
    console.log("========== COMPLETE VIDEO INTERVIEW ==========");
    console.log("BODY:", req.body);

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    const {
      session_id,
      transcript,
      conversation,
      messages,
      score,
      final_feedback,
      interview_summary,
      strengths,
      improvements,
      ended_by,
    } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    console.log("Completing video interview with data:", {
      session_id,
      transcript_length: transcript?.length || 0,
      conversation_length: conversation?.length || 0,
      messages_length: messages?.length || 0,
      score,
      has_feedback: !!final_feedback,
      ended_by,
    });

    // =========================================
    // STEP 1: Update session with all data
    // =========================================
    
    // Build update data with all fields
    const updateData = {
      is_completed: true,
      interview_status: "completed",
      ended_at: new Date(),
      ended_by: ended_by || "candidate",
    };

    // Add transcript if provided
    if (transcript !== undefined && Array.isArray(transcript)) {
      updateData.transcript = transcript;
      console.log(`✅ Adding ${transcript.length} transcript entries`);
    }

    // Add conversation if provided
    if (conversation !== undefined && Array.isArray(conversation)) {
      updateData.conversation = conversation;
      console.log(`✅ Adding ${conversation.length} conversation entries`);
    }

    // Add messages if provided
    if (messages !== undefined && Array.isArray(messages)) {
      updateData.messages = messages;
      console.log(`✅ Adding ${messages.length} messages`);
    }

    // Add score if provided
    if (score !== undefined && score !== null) {
      updateData.score = Number(score);
      console.log(`✅ Adding score: ${score}`);
    }

    // Add final feedback if provided
    if (final_feedback) {
      updateData.final_feedback = final_feedback;
      updateData.ai_feedback = final_feedback;
      console.log(`✅ Adding final feedback: ${final_feedback.substring(0, 50)}...`);
    }

    // Add interview summary if provided
    if (interview_summary) {
      updateData.interview_summary = interview_summary;
      console.log(`✅ Adding interview summary: ${interview_summary.substring(0, 50)}...`);
    }

    // Add strengths if provided
    if (strengths && Array.isArray(strengths)) {
      updateData.strengths = strengths;
      console.log(`✅ Adding ${strengths.length} strengths`);
    }

    // Add improvements if provided
    if (improvements && Array.isArray(improvements)) {
      updateData.improvements = improvements;
      console.log(`✅ Adding ${improvements.length} improvements`);
    }

    // Calculate duration if we have timestamps
    if (transcript && Array.isArray(transcript) && transcript.length > 0) {
      const firstTimestamp = transcript[0]?.timestamp;
      const lastTimestamp = transcript[transcript.length - 1]?.timestamp;
      
      if (firstTimestamp && lastTimestamp) {
        const startTime = new Date(firstTimestamp).getTime();
        const endTime = new Date(lastTimestamp).getTime();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        
        if (durationSeconds > 0) {
          updateData.actual_duration_seconds = durationSeconds;
          updateData.actual_duration = Math.floor(durationSeconds / 60);
          console.log(`✅ Calculated duration: ${updateData.actual_duration} minutes (${durationSeconds} seconds)`);
        }
      }
    }

    // Update the session
    const { data: updatedSession, error: updateError } = await supabase
      .from("interview_sessions")
      .update(updateData)
      .eq("id", session_id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Supabase update error:", updateError);
      console.error("Error details:", updateError.details);
      console.error("Error hint:", updateError.hint);
      
      return res.status(500).json({
        success: false,
        message: "Failed to update interview session.",
        error: updateError.message,
        details: updateError.details,
      });
    }

    console.log("✅ Session updated successfully");

    // =========================================
    // STEP 2: Call the service to complete
    // =========================================
    
    try {
      const serviceResult = await completeVideoInterviewService({
        session_id,
        transcript,
        conversation,
        messages,
        score,
        final_feedback,
        interview_summary,
        strengths,
        improvements,
        ended_by: ended_by || "candidate",
        user_id: userId,
      });
      
      console.log("✅ Service completed successfully:", serviceResult);
    } catch (serviceError) {
      console.error("⚠️ Service completion warning:", serviceError);
      // Don't fail the request if service has issues, the session is already updated
    }

    // =========================================
    // STEP 3: Create notification
    // =========================================

    try {
      // Determine if interview had a score or not
      const finalScore = score || updatedSession.score || 0;
      const notificationMessage = finalScore > 0 
        ? `Your video interview has been completed with a score of ${finalScore}/10.`
        : `Your video interview has been completed successfully.`;
      
      await createNotificationService(
        userId,
        "Video Interview Complete",
        notificationMessage,
        "system",
        "interview",
        `/dashboard/seeker/interview/${session_id}`
      );
      
      console.log("✅ Notification created");
    } catch (notificationError) {
      console.error("⚠️ Notification creation warning:", notificationError);
      // Don't fail the request if notification fails
    }

    // =========================================
    // STEP 4: Return success response
    // =========================================

    return res.status(200).json({
      success: true,
      message: "Video interview completed successfully.",
      session_id: session_id,
      data: {
        is_completed: true,
        interview_status: "completed",
        completed_at: new Date().toISOString(),
        score: updatedSession.score,
        final_feedback: updatedSession.final_feedback,
        interview_summary: updatedSession.interview_summary,
        transcript_count: updatedSession.transcript?.length || 0,
        conversation_count: updatedSession.conversation?.length || 0,
        messages_count: updatedSession.messages?.length || 0,
        duration_minutes: updatedSession.actual_duration || null,
        ended_by: updatedSession.ended_by,
      },
    });

  } catch (error) {
    console.error("========== COMPLETE VIDEO INTERVIEW ERROR ==========");
    console.error(error);
    console.error("Error stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to complete video interview.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// --------------------------------------------------
// GET VIDEO INTERVIEW
// GET /api/interview/video/:id
// --------------------------------------------------
export const getVideoInterview = async (req, res) => {
  try {
    console.log("========== GET VIDEO INTERVIEW ==========");
    console.log("Params:", req.params);

    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    const result = await getVideoInterviewService({
      session_id: id,
      user_id: userId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("========== GET VIDEO INTERVIEW ERROR ==========");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve video interview.",
    });
  }
};

// --------------------------------------------------
// UPDATE VIDEO CONVERSATION
// PUT /api/interview/video/conversation
// --------------------------------------------------
export const updateVideoConversation = async (req, res) => {
  try {
    console.log("========== UPDATE VIDEO CONVERSATION ==========");
    console.log("BODY:", req.body);

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    const {
      session_id,
      transcript,
      conversation,
      messages,
    } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    // Verify ownership
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("id, interview_mode, is_completed, user_id")
      .eq("id", session_id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !session) {
      console.error("Session not found or unauthorized:", fetchError);
      return res.status(404).json({
        success: false,
        message: "Interview session not found or unauthorized.",
      });
    }

    // Check if session is already completed
    if (session.is_completed) {
      return res.status(400).json({
        success: false,
        message: "Cannot update a completed interview.",
      });
    }

    // Build update data
    const updateData = {};

    if (transcript !== undefined) {
      if (!Array.isArray(transcript)) {
        return res.status(400).json({
          success: false,
          message: "Transcript must be an array.",
        });
      }
      updateData.transcript = transcript;
    }

    if (conversation !== undefined) {
      if (!Array.isArray(conversation)) {
        return res.status(400).json({
          success: false,
          message: "Conversation must be an array.",
        });
      }
      updateData.conversation = conversation;
    }

    if (messages !== undefined) {
      if (!Array.isArray(messages)) {
        return res.status(400).json({
          success: false,
          message: "Messages must be an array.",
        });
      }
      updateData.messages = messages;
    }

    // If no data to update, return early
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided to update.",
      });
    }

    const { data, error } = await supabase
      .from("interview_sessions")
      .update(updateData)
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Update Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update conversation.",
      });
    }

    console.log("✅ Video conversation updated successfully");

    return res.status(200).json({
      success: true,
      message: "Video conversation updated successfully.",
      data: {
        session_id: data.id,
        transcript: data.transcript,
        conversation: data.conversation,
        messages: data.messages,
        updated_at: data.updated_at,
      },
    });
  } catch (error) {
    console.error("========== UPDATE VIDEO CONVERSATION ERROR ==========");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update video conversation.",
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

    // Check if it's a video interview
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !session) {
      console.error("Session not found:", fetchError);
      return res.status(404).json({
        success: false,
        message: "Interview session not found.",
      });
    }

    // =========================================
    // Professional Video Interview Response
    // =========================================
    if (session.interview_mode === "video") {
      return res.status(200).json({
        success: true,
        data: {
          session_id: session.id,
          interview_type: session.interview_type,
          sub_type: session.sub_type,
          interview_mode: session.interview_mode,
          session_type: session.session_type || "did-agent",
          interview_status: session.interview_status || "completed",
          is_completed: session.is_completed,
          interview_duration: session.interview_duration,
          actual_duration: session.actual_duration,
          actual_duration_seconds: session.actual_duration_seconds,
          started_at: session.started_at,
          completed_at: session.completed_at,
          ended_at: session.ended_at,
          ended_by: session.ended_by,
          company_name: session.company_name,
          job_title: session.job_title,
          job_description: session.job_description,
          tech_stack: session.tech_stack,
          difficulty: session.difficulty,
          candidate_experience: session.candidate_experience,
          agent_id: session.agent_id,
          transcript: session.transcript || [],
          conversation: session.conversation || [],
          messages: session.messages || [],
          score: session.score,
          final_feedback: session.final_feedback,
          interview_summary: session.interview_summary,
          strengths: session.strengths || [],
          improvements: session.improvements || [],
          created_at: session.created_at,
          updated_at: session.updated_at,
        },
      });
    }

    // =========================================
    // Text & Voice Interview Response
    // =========================================
    
    // Format the response for frontend to show all questions
    const questionsData = session.answers_data && session.answers_data.length > 0 
      ? session.answers_data 
      : session.answers.map((ans, idx) => ({
          question_number: idx + 1,
          question: ans.question,
          answer: ans.answer,
          feedback: null,
          score: null,
        }));

    const sessionData = {
      session_id: session.id,
      interview_type: session.interview_type,
      sub_type: session.sub_type || null,
      interview_mode: session.interview_mode || "text",
      completed_at: session.created_at,
      is_completed: session.is_completed,
      score: session.score,
      final_feedback: session.final_feedback,
      interview_status: session.interview_status || "completed",
      interview_duration: session.interview_duration || null,
      strengths: session.strengths || [],
      improvements: session.improvements || [],
      interview_summary: session.interview_summary || null,
      questions: session.questions.map((question, index) => {
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

    // =========================================
    // Professional Video Interview - Update transcript instead
    // =========================================
    if (session.interview_mode === "video") {
      // For video interviews, we update the transcript/conversation
      // The D-ID agent handles all question/answer flow
      try {
        const updateData = {};
        
        // If the user is updating a specific answer, we add it to messages
        if (user_answer) {
          const newMessage = {
            role: "user",
            content: user_answer,
            timestamp: new Date().toISOString(),
          };
          
          const messages = session.messages || [];
          messages.push(newMessage);
          updateData.messages = messages;
          
          // Also add to conversation
          const conversation = session.conversation || [];
          conversation.push(newMessage);
          updateData.conversation = conversation;
        }
        
        // If there's a question, add it as assistant message
        if (question) {
          const newMessage = {
            role: "assistant",
            content: question,
            timestamp: new Date().toISOString(),
          };
          
          const messages = session.messages || [];
          messages.push(newMessage);
          updateData.messages = messages;
          
          // Also add to conversation
          const conversation = session.conversation || [];
          conversation.push(newMessage);
          updateData.conversation = conversation;
        }
        
        const { data, error } = await supabase
          .from("interview_sessions")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("Update Interview Error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to update video interview session.",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Video interview updated successfully.",
          data,
        });
      } catch (videoError) {
        console.error("Video Interview Update Error:", videoError);
        return res.status(500).json({
          success: false,
          message: videoError.message || "Failed to update video interview.",
        });
      }
    }

    // =========================================
    // Text & Voice Interview Update
    // =========================================

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