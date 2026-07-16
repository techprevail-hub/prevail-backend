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
      
      // Duration tracking
      actual_duration_seconds: null,
      ended_at: null,
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
      interview_status: data.interview_status,
      interview_duration: data.interview_duration,
      started_at: data.started_at,
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
  ended_by,
  user_id,
}) => {
  try {
    console.log("========== COMPLETE VIDEO INTERVIEW ==========");
    console.log("Session ID:", session_id);
    console.log("Transcript length:", transcript?.length || 0);
    console.log("Conversation length:", conversation?.length || 0);
    console.log("Messages length:", messages?.length || 0);

    if (!session_id) {
      throw new Error("Session ID is required.");
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

    // Calculate duration in seconds
    const startedAt = new Date(session.started_at);
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt - startedAt) / 1000);
    const durationMinutes = Math.round(durationSeconds / 60);

    console.log(`📊 Duration: ${durationMinutes} minutes (${durationSeconds} seconds)`);

    // ============================================================
    // BUILD UPDATE DATA - COMPLETE INTERVIEW
    // ============================================================

    const updateData = {
      // ✅ Status updates
      is_completed: true,
      interview_status: "completed",
      ended_at: completedAt,
      
      // ✅ Duration tracking
      actual_duration_seconds: durationSeconds,
      actual_duration: durationMinutes,
      
      // ✅ Ended by (candidate or system)
      ended_by: ended_by || "candidate",
    };

    // ✅ Add transcript if provided
    if (transcript !== undefined) {
      if (!Array.isArray(transcript)) {
        throw new Error("Transcript must be an array.");
      }
      updateData.transcript = transcript;
      console.log(`✅ Adding ${transcript.length} transcript entries`);
    } else if (session.transcript) {
      // Keep existing transcript if not provided
      updateData.transcript = session.transcript;
    }

    // ✅ Add conversation if provided
    if (conversation !== undefined) {
      if (!Array.isArray(conversation)) {
        throw new Error("Conversation must be an array.");
      }
      updateData.conversation = conversation;
      console.log(`✅ Adding ${conversation.length} conversation entries`);
    } else if (session.conversation) {
      // Keep existing conversation if not provided
      updateData.conversation = session.conversation;
    }

    // ✅ Add messages if provided
    if (messages !== undefined) {
      if (!Array.isArray(messages)) {
        throw new Error("Messages must be an array.");
      }
      updateData.messages = messages;
      console.log(`✅ Adding ${messages.length} messages`);
    } else if (session.messages) {
      // Keep existing messages if not provided
      updateData.messages = session.messages;
    }

    // ✅ Add evaluation results if provided
    if (score !== undefined && score !== null) {
      updateData.score = Number(score);
      console.log(`✅ Adding score: ${score}`);
    }

    if (final_feedback !== undefined) {
      updateData.final_feedback = final_feedback;
      updateData.ai_feedback = final_feedback;
      console.log(`✅ Adding final feedback: ${final_feedback.substring(0, 50)}...`);
    }

    if (interview_summary !== undefined) {
      updateData.interview_summary = interview_summary;
      console.log(`✅ Adding interview summary: ${interview_summary.substring(0, 50)}...`);
    }

    if (strengths !== undefined) {
      if (!Array.isArray(strengths)) {
        throw new Error("Strengths must be an array.");
      }
      updateData.strengths = strengths;
      console.log(`✅ Adding ${strengths.length} strengths`);
    }

    if (improvements !== undefined) {
      if (!Array.isArray(improvements)) {
        throw new Error("Improvements must be an array.");
      }
      updateData.improvements = improvements;
      console.log(`✅ Adding ${improvements.length} improvements`);
    }

    console.log("📝 Update Data Summary:", {
      is_completed: updateData.is_completed,
      interview_status: updateData.interview_status,
      ended_at: updateData.ended_at,
      actual_duration_seconds: updateData.actual_duration_seconds,
      transcript_count: updateData.transcript?.length || 0,
      conversation_count: updateData.conversation?.length || 0,
      messages_count: updateData.messages?.length || 0,
      has_score: updateData.score !== undefined && updateData.score !== null,
      has_feedback: !!updateData.final_feedback,
      has_summary: !!updateData.interview_summary,
      ended_by: updateData.ended_by,
    });

    // ============================================================
    // UPDATE THE SESSION
    // ============================================================

    const { data, error } = await supabase
      .from("interview_sessions")
      .update(updateData)
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase Update Error:", error);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);
      throw new Error(`Failed to complete interview: ${error.message}`);
    }

    console.log("✅ Video Interview Completed Successfully");
    console.log("📊 Final Stats:");
    console.log(`  - Duration: ${durationMinutes} minutes (${durationSeconds} seconds)`);
    console.log(`  - Transcript entries: ${data.transcript?.length || 0}`);
    console.log(`  - Conversation entries: ${data.conversation?.length || 0}`);
    console.log(`  - Messages: ${data.messages?.length || 0}`);
    console.log(`  - Score: ${data.score || 'N/A'}`);
    console.log(`  - Status: ${data.interview_status}`);
    console.log(`  - Completed at: ${data.ended_at}`);

    // ============================================================
    // RETURN COMPLETE RESPONSE
    // ============================================================

    return {
      success: true,
      session_id: data.id,
      is_completed: data.is_completed,
      interview_status: data.interview_status,
      ended_at: data.ended_at,
      started_at: data.started_at,
      actual_duration_seconds: data.actual_duration_seconds,
      actual_duration: data.actual_duration,
      ended_by: data.ended_by,
      
      // ✅ All conversation data
      transcript: data.transcript || [],
      conversation: data.conversation || [],
      messages: data.messages || [],
      
      // ✅ Evaluation results
      score: data.score,
      final_feedback: data.final_feedback,
      interview_summary: data.interview_summary,
      strengths: data.strengths || [],
      improvements: data.improvements || [],
      
      // ✅ Metadata
      interview_type: data.interview_type,
      sub_type: data.sub_type,
      interview_mode: data.interview_mode,
      company_name: data.company_name,
      job_title: data.job_title,
      job_description: data.job_description,
      tech_stack: data.tech_stack,
      difficulty: data.difficulty,
      candidate_experience: data.candidate_experience,
      
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("========== COMPLETE VIDEO INTERVIEW ERROR ==========");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
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
    console.log("Transcript entries:", data.transcript?.length || 0);
    console.log("Conversation entries:", data.conversation?.length || 0);
    console.log("Messages:", data.messages?.length || 0);

    return {
      success: true,
      session_id: data.id,
      interview_type: data.interview_type,
      sub_type: data.sub_type,
      interview_mode: data.interview_mode,
      interview_status: data.interview_status,
      is_completed: data.is_completed,
      interview_duration: data.interview_duration,
      actual_duration_seconds: data.actual_duration_seconds,
      actual_duration: data.actual_duration,
      started_at: data.started_at,
      ended_at: data.ended_at,
      ended_by: data.ended_by,
      company_name: data.company_name,
      job_title: data.job_title,
      job_description: data.job_description,
      tech_stack: data.tech_stack,
      difficulty: data.difficulty,
      candidate_experience: data.candidate_experience,
      
      // ✅ All conversation data
      transcript: data.transcript || [],
      conversation: data.conversation || [],
      messages: data.messages || [],
      
      // ✅ Evaluation results
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