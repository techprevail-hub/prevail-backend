import supabase from "./supabaseClient.js";

/**
 * ============================================================
 * PHASE 1: START PROFESSIONAL VIDEO INTERVIEW
 * ============================================================
 */
export const startVideoInterviewService = async ({
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
}) => {
  try {
    console.log("========== VIDEO INTERVIEW SERVICE ==========");
    console.log("Creating Professional Video Interview Session");

    const insertData = {
      user_id: userId,
      interview_type,
      sub_type: sub_type || null,
      interview_mode: "video",
      session_type: "did-agent",
      interview_status: "in_progress",
      interview_duration: duration || 15,
      started_at: new Date(),
      is_completed: false,
      company_name: company || null,
      job_title: job_title || null,
      job_description: job_description || null,
      tech_stack: tech_stack || null,
      difficulty: difficulty || "Junior",
      candidate_experience: candidate_experience || "Fresher",
      
      // Agent information
      agent_id: process.env.DID_AGENT_ID || null,
      
      // Conversation data - initialized as empty arrays
      transcript: [],
      conversation: [],
      messages: [],
      
      // Results - initially null
      score: null,
      final_feedback: null,
      interview_summary: null,
      strengths: [],
      improvements: [],
      
      // Audit fields
      ended_by: null,
      actual_duration: null,
      actual_duration_seconds: null,
    };

    console.log("Insert Data:", JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from("interview_sessions")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Supabase Insert Error:", error);
      throw new Error(error.message);
    }

    console.log("✅ Video Interview Session Created");
    console.log("Session ID:", data.id);

    return {
      session_id: data.id,
      interview_mode: data.interview_mode,
      session_type: data.session_type,
      interview_status: data.interview_status,
      interview_duration: data.interview_duration,
      started_at: data.started_at,
      agent_id: data.agent_id,
    };
  } catch (error) {
    console.error("========== START VIDEO INTERVIEW ERROR ==========");
    console.error(error);
    throw error;
  }
};

/**
 * ============================================================
 * PHASE 2: SAVE TRANSCRIPT
 * ============================================================
 */
export const saveVideoTranscriptService = async ({
  session_id,
  transcript,
  conversation,
  messages,
  user_id,
}) => {
  try {
    console.log("========== SAVE VIDEO TRANSCRIPT ==========");
    console.log("Session ID:", session_id);

    if (!session_id) {
      throw new Error("Session ID is required.");
    }

    // Validate data types
    if (transcript !== undefined && !Array.isArray(transcript)) {
      throw new Error("Transcript must be an array.");
    }
    if (conversation !== undefined && !Array.isArray(conversation)) {
      throw new Error("Conversation must be an array.");
    }
    if (messages !== undefined && !Array.isArray(messages)) {
      throw new Error("Messages must be an array.");
    }

    // Build query with ownership check
    let query = supabase
      .from("interview_sessions")
      .select("id, interview_mode, is_completed, user_id")
      .eq("id", session_id);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: session, error: fetchError } = await query.single();

    if (fetchError || !session) {
      console.error("Session not found or unauthorized:", fetchError);
      throw new Error("Interview session not found or unauthorized.");
    }

    // Check if session is already completed
    if (session.is_completed) {
      console.log("Session is already completed, skipping save.");
      return {
        success: true,
        message: "Session already completed.",
        session_id,
      };
    }

    // Build update data - only include fields that are provided
    const updateData = {};

    if (transcript !== undefined) {
      updateData.transcript = transcript;
    }
    if (conversation !== undefined) {
      updateData.conversation = conversation;
    }
    if (messages !== undefined) {
      updateData.messages = messages;
    }

    // If no data to update, return early
    if (Object.keys(updateData).length === 0) {
      console.log("No data to update.");
      return {
        success: true,
        message: "No data to update.",
        session_id,
      };
    }

    console.log("Update Data:", JSON.stringify(updateData, null, 2));

    const { data, error } = await supabase
      .from("interview_sessions")
      .update(updateData)
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Update Error:", error);
      throw new Error(error.message);
    }

    console.log("✅ Transcript saved successfully");

    return {
      success: true,
      session_id: data.id,
      transcript: data.transcript,
      conversation: data.conversation,
      messages: data.messages,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("========== SAVE VIDEO TRANSCRIPT ERROR ==========");
    console.error(error);
    throw error;
  }
};

/**
 * ============================================================
 * PHASE 3: COMPLETE VIDEO INTERVIEW
 * ============================================================
 */
export const completeVideoInterviewService = async ({
  session_id,
  transcript,
  conversation,
  messages,
  score,
  final_feedback,
  interview_summary,
  strengths,
  improvements,
  ended_by = "candidate",
  user_id,
}) => {
  try {
    console.log("========== COMPLETE VIDEO INTERVIEW ==========");
    console.log("Session ID:", session_id);

    if (!session_id) {
      throw new Error("Session ID is required.");
    }

    // Validate ended_by
    const validEndedBy = ["candidate", "agent", "timeout", "system"];
    if (!validEndedBy.includes(ended_by)) {
      console.warn(`Invalid ended_by: ${ended_by}, defaulting to "candidate"`);
      ended_by = "candidate";
    }

    // Build query with ownership check
    let query = supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", session_id);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: session, error: fetchError } = await query.single();

    if (fetchError || !session) {
      console.error("Session not found or unauthorized:", fetchError);
      throw new Error("Interview session not found or unauthorized.");
    }

    // Check if session is already completed
    if (session.is_completed) {
      console.log("Session is already completed.");
      return {
        success: true,
        message: "Session already completed.",
        session_id,
        data: session,
      };
    }

    // Calculate duration
    const startedAt = new Date(session.started_at);
    const endedAt = new Date();
    const durationMs = endedAt - startedAt;
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    const durationSeconds = Math.round(durationMs / 1000);

    // Build update data
    const updateData = {
      is_completed: true,
      interview_status: "completed",
      completed_at: endedAt,
      ended_at: endedAt,
      ended_by: ended_by,
      actual_duration: durationMinutes,
      actual_duration_seconds: durationSeconds,
    };

    // Add conversation data if provided
    if (transcript !== undefined) {
      if (!Array.isArray(transcript)) {
        throw new Error("Transcript must be an array.");
      }
      updateData.transcript = transcript;
    }
    if (conversation !== undefined) {
      if (!Array.isArray(conversation)) {
        throw new Error("Conversation must be an array.");
      }
      updateData.conversation = conversation;
    }
    if (messages !== undefined) {
      if (!Array.isArray(messages)) {
        throw new Error("Messages must be an array.");
      }
      updateData.messages = messages;
    }

    // Add evaluation results if provided
    if (score !== undefined) {
      updateData.score = score;
    }
    if (final_feedback !== undefined) {
      updateData.final_feedback = final_feedback;
    }
    if (interview_summary !== undefined) {
      updateData.interview_summary = interview_summary;
    }
    if (strengths !== undefined) {
      if (!Array.isArray(strengths)) {
        throw new Error("Strengths must be an array.");
      }
      updateData.strengths = strengths;
    }
    if (improvements !== undefined) {
      if (!Array.isArray(improvements)) {
        throw new Error("Improvements must be an array.");
      }
      updateData.improvements = improvements;
    }

    console.log("Update Data:", JSON.stringify(updateData, null, 2));

    const { data, error } = await supabase
      .from("interview_sessions")
      .update(updateData)
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Update Error:", error);
      throw new Error(error.message);
    }

    console.log("✅ Video Interview Completed Successfully");
    console.log("Duration:", durationMinutes, "minutes", `(${durationSeconds} seconds)`);
    console.log("Ended by:", ended_by);

    return {
      success: true,
      session_id: data.id,
      is_completed: data.is_completed,
      interview_status: data.interview_status,
      completed_at: data.completed_at,
      ended_at: data.ended_at,
      ended_by: data.ended_by,
      actual_duration: data.actual_duration,
      actual_duration_seconds: data.actual_duration_seconds,
      score: data.score,
      final_feedback: data.final_feedback,
      interview_summary: data.interview_summary,
      strengths: data.strengths,
      improvements: data.improvements,
      transcript: data.transcript,
      conversation: data.conversation,
      messages: data.messages,
    };
  } catch (error) {
    console.error("========== COMPLETE VIDEO INTERVIEW ERROR ==========");
    console.error(error);
    throw error;
  }
};

/**
 * ============================================================
 * PHASE 4: GET VIDEO INTERVIEW
 * ============================================================
 */
export const getVideoInterviewService = async ({
  session_id,
  user_id,
}) => {
  try {
    console.log("========== GET VIDEO INTERVIEW ==========");
    console.log("Session ID:", session_id);

    if (!session_id) {
      throw new Error("Session ID is required.");
    }

    // Build query
    let query = supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", session_id);

    // If user_id is provided, verify ownership
    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("Supabase Fetch Error:", error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Interview session not found.");
    }

    console.log("✅ Interview retrieved successfully");
    console.log("Status:", data.interview_status);
    console.log("Completed:", data.is_completed);

    return {
      success: true,
      session_id: data.id,
      interview_type: data.interview_type,
      sub_type: data.sub_type,
      interview_mode: data.interview_mode,
      session_type: data.session_type,
      interview_status: data.interview_status,
      is_completed: data.is_completed,
      interview_duration: data.interview_duration,
      actual_duration: data.actual_duration,
      actual_duration_seconds: data.actual_duration_seconds,
      started_at: data.started_at,
      completed_at: data.completed_at,
      ended_at: data.ended_at,
      ended_by: data.ended_by,
      company_name: data.company_name,
      job_title: data.job_title,
      job_description: data.job_description,
      tech_stack: data.tech_stack,
      difficulty: data.difficulty,
      candidate_experience: data.candidate_experience,
      agent_id: data.agent_id,
      transcript: data.transcript || [],
      conversation: data.conversation || [],
      messages: data.messages || [],
      score: data.score,
      final_feedback: data.final_feedback,
      interview_summary: data.interview_summary,
      strengths: data.strengths || [],
      improvements: data.improvements || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("========== GET VIDEO INTERVIEW ERROR ==========");
    console.error(error);
    throw error;
  }
};

/**
 * ============================================================
 * PHASE 5: UPDATE VIDEO CONVERSATION
 * ============================================================
 */
export const updateConversationService = async ({
  session_id,
  transcript,
  conversation,
  messages,
  user_id,
}) => {
  try {
    console.log("========== UPDATE VIDEO CONVERSATION ==========");
    console.log("Session ID:", session_id);

    if (!session_id) {
      throw new Error("Session ID is required.");
    }

    // Validate data types
    if (transcript !== undefined && !Array.isArray(transcript)) {
      throw new Error("Transcript must be an array.");
    }
    if (conversation !== undefined && !Array.isArray(conversation)) {
      throw new Error("Conversation must be an array.");
    }
    if (messages !== undefined && !Array.isArray(messages)) {
      throw new Error("Messages must be an array.");
    }

    // Build query with ownership check
    let query = supabase
      .from("interview_sessions")
      .select("id, interview_mode, is_completed, user_id")
      .eq("id", session_id);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: session, error: fetchError } = await query.single();

    if (fetchError || !session) {
      console.error("Session not found or unauthorized:", fetchError);
      throw new Error("Interview session not found or unauthorized.");
    }

    // Check if session is already completed
    if (session.is_completed) {
      throw new Error("Cannot update a completed interview.");
    }

    // Build update data - only include fields that are provided
    const updateData = {};

    if (transcript !== undefined) {
      updateData.transcript = transcript;
    }
    if (conversation !== undefined) {
      updateData.conversation = conversation;
    }
    if (messages !== undefined) {
      updateData.messages = messages;
    }

    // If no data to update, return early
    if (Object.keys(updateData).length === 0) {
      console.log("No data to update.");
      return {
        success: true,
        message: "No data to update.",
        session_id,
      };
    }

    console.log("Update Data:", JSON.stringify(updateData, null, 2));

    const { data, error } = await supabase
      .from("interview_sessions")
      .update(updateData)
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Update Error:", error);
      throw new Error(error.message);
    }

    console.log("✅ Conversation updated successfully");

    return {
      success: true,
      session_id: data.id,
      transcript: data.transcript,
      conversation: data.conversation,
      messages: data.messages,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("========== UPDATE VIDEO CONVERSATION ERROR ==========");
    console.error(error);
    throw error;
  }
};

/**
 * ============================================================
 * UPDATE VIDEO INTERVIEW - Generic Update
 * ============================================================
 */
export const updateVideoInterviewService = async ({
  session_id,
  updateData,
  user_id,
}) => {
  try {
    console.log("========== UPDATE VIDEO INTERVIEW ==========");
    console.log("Session ID:", session_id);

    if (!session_id) {
      throw new Error("Session ID is required.");
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error("Update data is required.");
    }

    // Build query with ownership check
    let query = supabase
      .from("interview_sessions")
      .select("id, user_id")
      .eq("id", session_id);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: session, error: fetchError } = await query.single();

    if (fetchError || !session) {
      console.error("Session not found or unauthorized:", fetchError);
      throw new Error("Interview session not found or unauthorized.");
    }

    const { data, error } = await supabase
      .from("interview_sessions")
      .update(updateData)
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Update Error:", error);
      throw new Error(error.message);
    }

    console.log("✅ Interview updated successfully");

    return {
      success: true,
      session_id: data.id,
      data,
    };
  } catch (error) {
    console.error("========== UPDATE VIDEO INTERVIEW ERROR ==========");
    console.error(error);
    throw error;
  }
};