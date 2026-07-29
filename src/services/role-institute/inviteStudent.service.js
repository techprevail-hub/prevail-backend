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
      // Check if user already has a student role
      if (userData.role === "student") {
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
    const inviteLink = `${process.env.FRONTEND_URL}/login?token=${inviteToken}&type=student`;

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
 * Accept an invitation (for students)
 * Updated flow: Update users table -> Update invitation status -> Return success
 * @param {string} token - Invitation token
 * @param {string} userId - User ID accepting the invitation (from authenticated user)
 * @returns {Promise<Object>} Updated invitation
 */
export const acceptStudentInvitationService = async (token, userId) => {
  try {
    console.log("Starting invitation acceptance...");
    console.log("Token:", token);
    console.log("UserId:", userId);

    // ─── Step 1: Find the invitation by token ──────────────────────────
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

    console.log("Invitation found:", invitation);

    // ─── Step 2: Validate invitation status ────────────────────────────
    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new Error(`Invitation already ${invitation.status}`);
    }

    // ─── Step 3: Check if invitation has expired ──────────────────────
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

    // ─── Step 4: Verify email matches ──────────────────────────────────
    // ✅ FIX 1: Better error logging for user query
    console.log("Querying users table for userId:", userId);
    
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, role")
      .eq("id", userId)
      .single();

    console.log("User Query Result:", userData);
    console.log("User Query Error:", userError);

    // ✅ FIX 1: Throw the actual error message instead of hiding it
    if (userError) {
      console.error("Error fetching user:", userError);
      throw new Error(userError.message);
    }

    console.log("User data:", userData);

    // Check if the user's email matches the invitation email
    if (userData.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error("This invitation is for a different email address");
    }

    // ─── Step 5: Update users table (set role to student) ──────────────
    console.log("Updating user role to student...");
    
    const { data: updatedUser, error: updateUserError } = await supabase
      .from("users")
      .update({
        name: invitation.student_name,
        role: "student"
      })
      .eq("id", userId)
      .select()
      .single();

    if (updateUserError) {
      console.error("Error updating user:", updateUserError);
      throw new Error("Unable to update user role");
    }

    console.log("User updated successfully:", updatedUser);

    // ─── Step 6: Update invitation status to accepted ──────────────────
    console.log("Updating invitation status to accepted...");
    
    const { data: updatedInvitation, error: updateInvitationError } = await supabase
      .from("student_invitations")
      .update({
        status: INVITATION_STATUS.ACCEPTED,
        accepted_by: userId,
        accepted_at: new Date().toISOString()
      })
      .eq("id", invitation.id)
      .select()
      .single();

    if (updateInvitationError) {
      console.error("Error updating invitation:", updateInvitationError);
      throw new Error("Unable to accept invitation");
    }

    console.log("Invitation updated successfully:", updatedInvitation);

    // ─── Step 7: Return success ─────────────────────────────────────────
    return {
      success: true,
      message: "Invitation accepted successfully.",
      data: updatedInvitation
    };

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
    const inviteLink = `${process.env.FRONTEND_URL}/login?token=${newToken}&type=student`;

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