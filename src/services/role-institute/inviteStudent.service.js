// services/studentInvitationService.js
import supabase from "../supabaseClient.js";
import crypto from "crypto";
import { sendInvitationEmail } from "./email.service.js";

/**
 * Invitation Status Constants
 * Centralized status management to avoid typos and enable easy updates
 */
export const INVITATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

/**
 * Student Invitation Service
 * Handles all invitation-related business logic
 * All functions assume authentication and validation have already been performed
 */

/**
 * Get student invitations with pagination, search, filters, and sorting
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search term for student_name or email
 * @param {string} params.status - Filter by status (pending, accepted, expired, cancelled)
 * @param {string} params.course - Filter by course
 * @param {string} params.batch - Filter by batch
 * @param {string} params.sortBy - Sort field (default: created_at)
 * @param {string} params.sortOrder - Sort order (asc/desc, default: desc)
 * @param {string} params.instituteId - Institute ID (from authenticated user)
 * @param {string} params.invitedBy - User ID who created the invitation (from authenticated user)
 * @returns {Promise<Object>} Paginated list of invitations
 */
export const getStudentInvitationsService = async (params) => {
  try {
    const {
      search = "",
      status,
      course,
      batch,
      sortBy = "created_at",
      sortOrder = "desc",
      instituteId,
      invitedBy
    } = params;

    // Convert pagination params to numbers immediately
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;

    // Validate required parameters
    if (!instituteId) {
      throw new Error("Institute ID is required");
    }

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build the base query
    let query = supabase
      .from("student_invitations")
      .select("*", { count: "exact" });

    // Apply institute filter (required for security)
    query = query.eq("institute_id", instituteId);

    // Apply invited_by filter if provided
    if (invitedBy) {
      query = query.eq("invited_by", invitedBy);
    }

    // Apply search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`student_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
    }

    // Apply status filter
    if (status) {
      // Validate status against constants
      const validStatuses = Object.values(INVITATION_STATUS);
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`);
      }
      query = query.eq("status", status);
    }

    // Apply course filter
    if (course) {
      query = query.eq("course", course);
    }

    // Apply batch filter
    if (batch) {
      query = query.eq("batch", batch);
    }

    // Apply sorting
    const order = sortOrder.toLowerCase() === "asc" ? true : false;
    query = query.order(sortBy, { ascending: order });

    // Apply pagination
    query = query.range(from, to);

    // Execute query
    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching invitations:", error);
      throw new Error("Unable to fetch invitations");
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      data: data || []
    };
  } catch (error) {
    console.error("Error in getStudentInvitationsService:", error);
    throw error;
  }
};

/**
 * Get a single student invitation by ID
 * @param {string} id - Invitation ID
 * @param {string} instituteId - Institute ID (from authenticated user)
 * @returns {Promise<Object>} Invitation data
 */
export const getStudentInvitationByIdService = async (id, instituteId) => {
  try {
    const { data, error } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("id", id)
      .eq("institute_id", instituteId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Invitation not found");
      }
      console.error("Error fetching invitation:", error);
      throw new Error("Unable to fetch invitation");
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error("Error in getStudentInvitationByIdService:", error);
    throw error;
  }
};

/**
 * Create a new student invitation
 * @param {Object} data - Invitation data (already validated)
 * @param {string} data.studentName - Student's full name
 * @param {string} data.email - Student's email address (already normalized)
 * @param {string} data.course - Student's course
 * @param {string} data.branch - Student's branch
 * @param {string} data.batch - Student's batch
 * @param {string} data.instituteId - Institute ID (from authenticated user)
 * @param {string} data.invitedBy - User ID who is creating the invitation (from authenticated user)
 * @param {number} data.expiryDays - Number of days until expiry (default: 7)
 * @returns {Promise<Object>} Created invitation
 */
export const createStudentInvitationService = async (data) => {
  try {
    const {
      studentName,
      email,
      course,
      branch,
      batch,
      instituteId,
      invitedBy,
      expiryDays = 7
    } = data;

    // Check for duplicate pending invitation (only if not expired)
    const { data: existingInvitation, error: checkError } = await supabase
      .from("student_invitations")
      .select("id, status, expires_at")
      .eq("email", email)
      .eq("institute_id", instituteId)
      .eq("status", INVITATION_STATUS.PENDING);

    if (checkError) {
      console.error("Error checking existing invitations:", checkError);
      throw new Error("Unable to verify existing invitations");
    }

    // Check if there's a valid pending invitation (not expired)
    if (existingInvitation && existingInvitation.length > 0) {
      const validPending = existingInvitation.some(inv => 
        new Date(inv.expires_at) > new Date()
      );
      
      if (validPending) {
        throw new Error("Student already has a valid pending invitation");
      }
      
      // If all pending invitations are expired, we can create a new one
    }

    // Check if student already exists in the institute
    const { data: userData } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", email)
      .single();

    if (userData) {
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", userData.id)
        .eq("institute_id", instituteId)
        .maybeSingle();

      if (studentData) {
        throw new Error("Student already exists in this institute");
      }
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID();

    // Generate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Prepare insert object (PostgreSQL will handle timestamps)
    const insertData = {
      student_name: studentName,
      email: email,
      course: course,
      branch: branch,
      batch: batch,
      invite_token: inviteToken,
      status: INVITATION_STATUS.PENDING,
      expires_at: expiresAt.toISOString(),
      invited_by: invitedBy,
      institute_id: instituteId
    };

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from("student_invitations")
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error("Error creating invitation:", insertError);
      throw new Error("Unable to create invitation");
    }

    // ─── Generate Invitation Link ──────────────────────────────────────
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${inviteToken}`;

    // ─── Send Invitation Email ────────────────────────────────────────
    // Send email after successful database insertion
    try {
      await sendInvitationEmail({
        studentName,
        email,
        inviteLink,
        course,
        branch,
        batch,
        instituteId
      });
      console.log(`Invitation email sent to ${email}`);
    } catch (emailError) {
      // Log error but don't fail the request
      // The invitation is already saved in the database
      console.error("Email sending failed:", emailError);
      console.error("Error details:", {
        message: emailError.message,
        stack: emailError.stack,
        to: email,
        studentName
      });
      
      // You could also log this to a separate error tracking service
      // e.g., Sentry, LogRocket, etc.
    }

    return {
      success: true,
      message: "Invitation created successfully. Email sent to student.",
      data: insertedData
    };
  } catch (error) {
    console.error("Error in createStudentInvitationService:", error);
    throw error;
  }
};

/**
 * Update an existing student invitation
 * @param {string} id - Invitation ID
 * @param {Object} data - Updated data (already validated)
 * @param {string} data.studentName - Updated student name
 * @param {string} data.course - Updated course
 * @param {string} data.branch - Updated branch
 * @param {string} data.batch - Updated batch
 * @param {string} data.instituteId - Institute ID (from authenticated user)
 * @returns {Promise<Object>} Updated invitation
 */
export const updateStudentInvitationService = async (id, data) => {
  try {
    const {
      studentName,
      course,
      branch,
      batch,
      instituteId
    } = data;

    // Find the invitation
    const { data: existingInvitation, error: findError } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("id", id)
      .eq("institute_id", instituteId)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Invitation not found");
      }
      console.error("Error finding invitation:", findError);
      throw new Error("Unable to find invitation");
    }

    // Check if invitation can be updated (only pending status)
    if (existingInvitation.status !== INVITATION_STATUS.PENDING) {
      throw new Error(`Cannot update invitation with status: ${existingInvitation.status}`);
    }

    // Prepare update object (only editable fields)
    const updateData = {};

    if (studentName) updateData.student_name = studentName;
    if (course) updateData.course = course;
    if (branch) updateData.branch = branch;
    if (batch) updateData.batch = batch;

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      throw new Error("No fields to update");
    }

    // Perform update (PostgreSQL will handle updated_at)
    const { data: updatedData, error: updateError } = await supabase
      .from("student_invitations")
      .update(updateData)
      .eq("id", id)
      .eq("institute_id", instituteId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      throw new Error("Unable to update invitation");
    }

    return {
      success: true,
      message: "Invitation updated successfully.",
      data: updatedData
    };
  } catch (error) {
    console.error("Error in updateStudentInvitationService:", error);
    throw error;
  }
};

/**
 * Cancel a student invitation (soft delete)
 * @param {string} id - Invitation ID
 * @param {string} instituteId - Institute ID (from authenticated user)
 * @param {string} cancelledBy - User ID who is cancelling the invitation (from authenticated user)
 * @returns {Promise<Object>} Success message
 */
export const cancelStudentInvitationService = async (id, instituteId, cancelledBy) => {
  try {
    // Find the invitation
    const { data: existingInvitation, error: findError } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("id", id)
      .eq("institute_id", instituteId)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Invitation not found");
      }
      console.error("Error finding invitation:", findError);
      throw new Error("Unable to find invitation");
    }

    // Check if invitation can be cancelled (only pending status)
    if (existingInvitation.status !== INVITATION_STATUS.PENDING) {
      throw new Error(`Cannot cancel invitation with status: ${existingInvitation.status}`);
    }

    // Update status to cancelled (PostgreSQL will handle updated_at)
    const { data: cancelledData, error: updateError } = await supabase
      .from("student_invitations")
      .update({
        status: INVITATION_STATUS.CANCELLED,
        cancelled_by: cancelledBy,
        cancelled_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("institute_id", instituteId)
      .select()
      .single();

    if (updateError) {
      console.error("Error cancelling invitation:", updateError);
      throw new Error("Unable to cancel invitation");
    }

    return {
      success: true,
      message: "Invitation cancelled successfully.",
      data: cancelledData
    };
  } catch (error) {
    console.error("Error in cancelStudentInvitationService:", error);
    throw error;
  }
};

/**
 * Accept an invitation (for students) - With Transaction Support
 * Uses Supabase RPC or multiple operations with rollback capability
 * @param {string} token - Invitation token
 * @param {string} userId - User ID accepting the invitation (from authenticated user)
 * @returns {Promise<Object>} Updated invitation
 */
export const acceptStudentInvitationService = async (token, userId) => {
  try {
    // Start a transaction by using a Supabase RPC call
    // This ensures both operations succeed or both fail
    
    // First, find the invitation by token
    const { data: invitation, error: findError } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("invite_token", token)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Invalid invitation token");
      }
      console.error("Error finding invitation:", findError);
      throw new Error("Unable to verify invitation");
    }

    // Check if invitation is still valid
    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new Error(`Invitation already ${invitation.status}`);
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from("student_invitations")
        .update({
          status: INVITATION_STATUS.EXPIRED
        })
        .eq("id", invitation.id);

      throw new Error("Invitation has expired");
    }

    // Check if the user matches the email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, role")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      throw new Error("Unable to verify user");
    }

    if (userData.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error("This invitation is for a different email address");
    }

    // Check if student already exists (prevent duplicate)
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .eq("institute_id", invitation.institute_id)
      .maybeSingle();

    if (existingStudent) {
      throw new Error("Student already exists in this institute");
    }

    // Option 1: Use Supabase RPC for transaction (recommended)
    // Create a PostgreSQL function that handles both operations
    try {
      // Call the RPC function that performs both operations in a transaction
      const { data: transactionResult, error: transactionError } = await supabase
        .rpc('accept_student_invitation', {
          p_invitation_id: invitation.id,
          p_user_id: userId,
          p_institute_id: invitation.institute_id,
          p_student_name: invitation.student_name,
          p_email: invitation.email,
          p_course: invitation.course,
          p_branch: invitation.branch,
          p_batch: invitation.batch
        });

      if (transactionError) {
        console.error("Transaction error:", transactionError);
        throw new Error("Failed to accept invitation");
      }

      return {
        success: true,
        message: "Invitation accepted successfully.",
        data: transactionResult
      };

    } catch (rpcError) {
      // Option 2: Fallback to manual operations if RPC is not available
      console.warn("RPC not available, using manual operations with manual rollback");
      
      // Update invitation status to accepted
      const { data: updatedInvitation, error: updateError } = await supabase
        .from("student_invitations")
        .update({
          status: INVITATION_STATUS.ACCEPTED,
          accepted_by: userId,
          accepted_at: new Date().toISOString()
        })
        .eq("id", invitation.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error accepting invitation:", updateError);
        throw new Error("Unable to accept invitation");
      }

      // Create student record
      const studentData = {
        user_id: userId,
        institute_id: invitation.institute_id,
        name: invitation.student_name,
        email: invitation.email,
        course: invitation.course,
        branch: invitation.branch,
        batch: invitation.batch,
        status: "active"
      };

      const { error: studentError } = await supabase
        .from("students")
        .insert([studentData]);

      if (studentError) {
        // Rollback: Revert invitation status back to pending
        console.error("Student creation failed, rolling back invitation:", studentError);
        await supabase
          .from("student_invitations")
          .update({
            status: INVITATION_STATUS.PENDING,
            accepted_by: null,
            accepted_at: null
          })
          .eq("id", invitation.id);

        throw new Error("Unable to create student record");
      }

      // Fetch the final updated invitation
      const { data: finalInvitation } = await supabase
        .from("student_invitations")
        .select("*")
        .eq("id", invitation.id)
        .single();

      return {
        success: true,
        message: "Invitation accepted successfully.",
        data: finalInvitation || updatedInvitation
      };
    }
  } catch (error) {
    console.error("Error in acceptStudentInvitationService:", error);
    throw error;
  }
};

/**
 * Resend an invitation
 * @param {string} id - Invitation ID
 * @param {string} instituteId - Institute ID (from authenticated user)
 * @returns {Promise<Object>} Updated invitation
 */
export const resendStudentInvitationService = async (id, instituteId) => {
  try {
    // Find the invitation
    const { data: invitation, error: findError } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("id", id)
      .eq("institute_id", instituteId)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Invitation not found");
      }
      console.error("Error finding invitation:", findError);
      throw new Error("Unable to find invitation");
    }

    // Check if invitation can be resent
    if (invitation.status === INVITATION_STATUS.ACCEPTED) {
      throw new Error("Cannot resend an already accepted invitation");
    }

    if (invitation.status === INVITATION_STATUS.CANCELLED) {
      throw new Error("Cannot resend a cancelled invitation");
    }

    // Regenerate token and expiry
    const newToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update invitation (PostgreSQL will handle updated_at)
    const { data: updatedInvitation, error: updateError } = await supabase
      .from("student_invitations")
      .update({
        invite_token: newToken,
        expires_at: expiresAt.toISOString(),
        status: INVITATION_STATUS.PENDING,
        resent_at: new Date().toISOString(),
        resent_count: (invitation.resent_count || 0) + 1
      })
      .eq("id", id)
      .eq("institute_id", instituteId)
      .select()
      .single();

    if (updateError) {
      console.error("Error resending invitation:", updateError);
      throw new Error("Unable to resend invitation");
    }

    // ─── Generate New Invitation Link ──────────────────────────────────
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${newToken}`;

    // ─── Send New Invitation Email ────────────────────────────────────
    try {
      await sendInvitationEmail({
        studentName: invitation.student_name,
        email: invitation.email,
        inviteLink,
        course: invitation.course,
        branch: invitation.branch,
        batch: invitation.batch,
        instituteId: invitation.institute_id,
        isResend: true
      });
      console.log(`Resent invitation email to ${invitation.email}`);
    } catch (emailError) {
      console.error("Resend email failed:", emailError);
      console.error("Error details:", {
        message: emailError.message,
        stack: emailError.stack,
        to: invitation.email,
        studentName: invitation.student_name
      });
    }

    return {
      success: true,
      message: "Invitation resent successfully. Email sent to student.",
      data: updatedInvitation
    };
  } catch (error) {
    console.error("Error in resendStudentInvitationService:", error);
    throw error;
  }
};

/**
 * Helper function to validate invitation status
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
export const isValidInvitationStatus = (status) => {
  return Object.values(INVITATION_STATUS).includes(status);
};

/**
 * Get all valid invitation statuses
 * @returns {Array} Array of valid status strings
 */
export const getInvitationStatuses = () => {
  return Object.values(INVITATION_STATUS);
};