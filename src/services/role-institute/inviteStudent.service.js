// services/studentInvitationService.js
import supabase from "../supabaseClient.js";
import crypto from "crypto";
import XLSX from "xlsx";
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
 * @param {string} params.search - Search term for student_name, email, course, branch, or batch
 * @param {string} params.status - Filter by status (pending, accepted, expired, cancelled)
 * @param {string} params.sortBy - Sort field (default: created_at)
 * @param {string} params.sortOrder - Sort order (asc/desc, default: desc)
 * @param {string} params.instituteId - Institute ID (from authenticated user)
 * @param {string} params.invitedBy - User ID who created the invitation (from authenticated user)
 * @returns {Promise<Object>} Paginated list of invitations with counts
 */
export const getStudentInvitationsService = async (params) => {
  try {
    const {
      search = "",
      status,
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

    // ─── Query 1: Get paginated invitations ──────────────────────────────
    let query = supabase
      .from("student_invitations")
      .select("*", { count: "exact" });

    // Apply institute filter (required for security)
    query = query.eq("institute_id", instituteId);

    // Apply invited_by filter if provided
    if (invitedBy) {
      query = query.eq("invited_by", invitedBy);
    }

    // Apply search filter - search across multiple fields
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // ✅ FIX: Use proper Supabase syntax with * wildcards
      // Using .or() with proper syntax
      query = query.or(
        `student_name.ilike.*${searchTerm}*,email.ilike.*${searchTerm}*,course.ilike.*${searchTerm}*,branch.ilike.*${searchTerm}*,batch.ilike.*${searchTerm}*`
      );
      
      // 🔍 DEBUG: Log the search query for debugging
      console.log("🔍 Search term:", searchTerm);
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

    // Apply sorting - make sure the column exists
    // ✅ Validate sortBy to prevent SQL errors
    const validSortColumns = ['created_at', 'student_name', 'email', 'course', 'branch', 'batch', 'status', 'invited_at'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    
    const order = sortOrder.toLowerCase() === "asc" ? true : false;
    query = query.order(safeSortBy, { ascending: order });

    // Apply pagination
    query = query.range(from, to);

    // Execute query
    const { data, count, error } = await query;

    // ✅ FIX: Log the actual error for debugging
    if (error) {
      console.error("❌ Supabase Error Details:", JSON.stringify(error, null, 2));
      console.error("❌ Error code:", error.code);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error details:", error.details);
      console.error("❌ Error hint:", error.hint);
      // Throw the actual error so the backend returns the real error message
      throw error;
    }

    // ─── Query 2: Get counts for all statuses ────────────────────────────
    let countQuery = supabase
      .from("student_invitations")
      .select("status")
      .eq("institute_id", instituteId);

    if (invitedBy) {
      countQuery = countQuery.eq("invited_by", invitedBy);
    }

    const { data: statusData, error: countError } = await countQuery;

    if (countError) {
      console.error("❌ Error fetching counts:", countError);
      throw countError;
    }

    // ─── Calculate counts ─────────────────────────────────────────────────
    const counts = {
      total: statusData?.length || 0,
      pending: statusData?.filter(s => s.status === INVITATION_STATUS.PENDING).length || 0,
      accepted: statusData?.filter(s => s.status === INVITATION_STATUS.ACCEPTED).length || 0,
      cancelled: statusData?.filter(s => s.status === INVITATION_STATUS.CANCELLED).length || 0,
      expired: statusData?.filter(s => s.status === INVITATION_STATUS.EXPIRED).length || 0,
    };

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      counts,
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
    console.error("❌ Error in getStudentInvitationsService:", error);
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
      console.error("❌ Error fetching invitation:", error);
      throw error;
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error("❌ Error in getStudentInvitationByIdService:", error);
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
      console.error("❌ Error checking existing invitations:", checkError);
      throw checkError;
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
      console.error("❌ Error creating invitation:", insertError);
      throw insertError;
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
      console.log(`✅ Invitation email sent to ${email}`);
    } catch (emailError) {
      // Log error but don't fail the request
      // The invitation is already saved in the database
      console.error("❌ Email sending failed:", emailError);
      console.error("❌ Error details:", {
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
    console.error("❌ Error in createStudentInvitationService:", error);
    throw error;
  }
};

/**
 * ✅ NEW: Generate Excel template for bulk student invitations
 * This does NOT create or send any invitation.
 * Only generates a downloadable Excel template with the required columns.
 * 
 * @returns {Promise<Buffer>} Excel file buffer
 */
export const generateStudentInvitationTemplateService = async () => {
  try {
    // Excel headers required for bulk student invitation
    const templateData = [
      {
        studentName: "",
        email: "",
        course: "",
        branch: "",
        batch: "",
      },
    ];

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 25 }, // studentName
      { wch: 35 }, // email
      { wch: 20 }, // course
      { wch: 30 }, // branch
      { wch: 15 }, // batch
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add worksheet
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Students"
    );

    // Generate Excel buffer
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return buffer;
  } catch (error) {
    console.error(
      "❌ Error generating student invitation template:",
      error
    );

    throw error;
  }
};

/**
 * ✅ NEW: Create bulk student invitations from uploaded Excel file
 * 
 * The Excel file must contain these columns:
 * - studentName: Student's full name
 * - email: Student's email address
 * - course: Student's course
 * - branch: Student's branch
 * - batch: Student's batch
 * 
 * @param {Object} params
 * @param {Buffer} params.fileBuffer - Uploaded Excel file buffer
 * @param {string} params.instituteId - Institute ID (from authenticated user)
 * @param {string} params.invitedBy - User ID who is creating the invitations (from authenticated user)
 * @param {number} params.expiryDays - Number of days until expiry (default: 7)
 * @returns {Promise<Object>} Bulk invitation result with sent, skipped, and failed counts
 */
export const createBulkStudentInvitationsService = async ({
  fileBuffer,
  instituteId,
  invitedBy,
  expiryDays = 7,
}) => {
  try {
    // ─── Validate required parameters ──────────────────────────────────
    if (!fileBuffer) {
      throw new Error("Excel file is required.");
    }

    if (!instituteId) {
      throw new Error("Institute ID is required.");
    }

    if (!invitedBy) {
      throw new Error("Invited By is required.");
    }

    // ─────────────────────────────────────────────
    // 1. Read Excel file
    // ─────────────────────────────────────────────

    const workbook = XLSX.read(fileBuffer, {
      type: "buffer",
    });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("Excel file does not contain any sheet.");
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert Excel rows into JavaScript objects
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
    });

    if (!rows.length) {
      throw new Error("Excel file is empty.");
    }

    // ─────────────────────────────────────────────
    // 2. Maximum upload limit
    // ─────────────────────────────────────────────

    const MAX_STUDENTS = 500;

    if (rows.length > MAX_STUDENTS) {
      throw new Error(
        `You can upload a maximum of ${MAX_STUDENTS} students at once.`
      );
    }

    // ─────────────────────────────────────────────
    // 3. Validate Excel headers
    // ─────────────────────────────────────────────

    const requiredHeaders = ["studentName", "email", "course", "branch", "batch"];
    const excelHeaders = Object.keys(rows[0]);

    const missingHeaders = requiredHeaders.filter(
      (header) => !excelHeaders.includes(header)
    );

    if (missingHeaders.length > 0) {
      throw new Error(
        `Missing required columns: ${missingHeaders.join(", ")}. ` +
        `Please use the template provided.`
      );
    }

    // ─────────────────────────────────────────────
    // 4. Process each row
    // ─────────────────────────────────────────────

    // ✅ FIX 2: Added emailFailed to results
    const results = {
      total: rows.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      emailFailed: 0,
      details: [],
    };

    // Helper function to validate email format
    const isValidEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // +2 because Excel rows are 1-indexed and header is row 1

      try {
        // ✅ FIX 1: Normalize email to lowercase
        const studentName = row.studentName?.trim() || "";
        const email = row.email?.trim().toLowerCase() || "";
        const course = row.course?.trim() || "";
        const branch = row.branch?.trim() || "";
        const batch = row.batch?.trim() || "";

        // Validate required fields
        if (!studentName) {
          throw new Error("Student name is required.");
        }

        if (!email) {
          throw new Error("Email is required.");
        }

        if (!isValidEmail(email)) {
          throw new Error("Invalid email format.");
        }

        if (!course) {
          throw new Error("Course is required.");
        }

        if (!branch) {
          throw new Error("Branch is required.");
        }

        if (!batch) {
          throw new Error("Batch is required.");
        }

        // ─── Check for duplicate pending invitation ──────────────────
        const { data: existingInvitation, error: checkError } = await supabase
          .from("student_invitations")
          .select("id, status, expires_at")
          .eq("email", email)
          .eq("institute_id", instituteId)
          .eq("status", INVITATION_STATUS.PENDING);

        if (checkError) {
          console.error("❌ Error checking existing invitations:", checkError);
          throw new Error("Database error while checking duplicates.");
        }

        // Check if there's a valid pending invitation (not expired)
        if (existingInvitation && existingInvitation.length > 0) {
          const validPending = existingInvitation.some(inv => 
            new Date(inv.expires_at) > new Date()
          );
          
          if (validPending) {
            results.skipped++;
            results.details.push({
              row: rowNumber,
              studentName,
              email,
              status: "skipped",
              reason: "Student already has a valid pending invitation.",
            });
            continue; // Skip to next row
          }
        }

        // ─── Check if student already exists ──────────────────────────
        const { data: userData } = await supabase
          .from("users")
          .select("id, role")
          .eq("email", email)
          .single();

        if (userData) {
          // Check if user already has a student role
          if (userData.role === "student") {
            results.skipped++;
            results.details.push({
              row: rowNumber,
              studentName,
              email,
              status: "skipped",
              reason: "Student already exists in this institute.",
            });
            continue; // Skip to next row
          }
        }

        // ─── Generate invite token ────────────────────────────────────
        const inviteToken = crypto.randomUUID();

        // Generate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        // ─── Insert invitation ────────────────────────────────────────
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

        const { data: insertedData, error: insertError } = await supabase
          .from("student_invitations")
          .insert([insertData])
          .select()
          .single();

        if (insertError) {
          console.error("❌ Error creating invitation:", insertError);
          throw new Error("Database error while creating invitation.");
        }

        // ─── Send Invitation Email ────────────────────────────────────
        try {
          const inviteLink = `${process.env.FRONTEND_URL}/login?token=${inviteToken}&type=student`;

          await sendInvitationEmail({
            studentName,
            email,
            inviteLink,
            course,
            branch,
            batch,
            instituteId
          });
          
          console.log(`✅ Invitation email sent to ${email}`);
          
          results.sent++;
          results.details.push({
            row: rowNumber,
            studentName,
            email,
            status: "sent",
            reason: "Invitation created and email sent successfully.",
          });

        } catch (emailError) {
          // ✅ FIX 2: Email failed - count as emailFailed, not sent
          console.error(`❌ Email sending failed for ${email}:`, emailError);
          
          results.emailFailed++;
          results.details.push({
            row: rowNumber,
            studentName,
            email,
            status: "email_failed",
            reason: "Invitation was created, but email sending failed. You can resend it later.",
          });
        }

      } catch (error) {
        // Row-level failure - continue with next row
        console.error(`❌ Error processing row ${rowNumber}:`, error.message);
        
        results.failed++;
        results.details.push({
          row: rowNumber,
          studentName: row.studentName || "Unknown",
          email: row.email || "Unknown",
          status: "failed",
          reason: error.message,
        });
      }
    }

    // ─── Return complete result ────────────────────────────────────────
    return {
      success: true,
      message: `Bulk invitation processed. ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed, ${results.emailFailed} emails failed.`,
      data: {
        total: results.total,
        sent: results.sent,
        skipped: results.skipped,
        failed: results.failed,
        emailFailed: results.emailFailed,
        details: results.details,
      },
    };

  } catch (error) {
    console.error("❌ Error in createBulkStudentInvitationsService:", error);
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
      console.error("❌ Error finding invitation:", findError);
      throw findError;
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
      console.error("❌ Error updating invitation:", updateError);
      throw updateError;
    }

    return {
      success: true,
      message: "Invitation updated successfully.",
      data: updatedData
    };
  } catch (error) {
    console.error("❌ Error in updateStudentInvitationService:", error);
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
      console.error("❌ Error finding invitation:", findError);
      throw findError;
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
      console.error("❌ Error cancelling invitation:", updateError);
      throw updateError;
    }

    return {
      success: true,
      message: "Invitation cancelled successfully.",
      data: cancelledData
    };
  } catch (error) {
    console.error("❌ Error in cancelStudentInvitationService:", error);
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
      console.error("❌ Error finding invitation:", findError);
      throw findError;
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
    console.log("Querying users table for userId:", userId);
    
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, role")
      .eq("id", userId)
      .single();

    console.log("User Query Result:", userData);
    console.log("User Query Error:", userError);

    if (userError) {
      console.error("❌ Error fetching user:", userError);
      throw userError;
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
      console.error("❌ Error updating user:", updateUserError);
      throw updateUserError;
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
      console.error("❌ Error updating invitation:", updateInvitationError);
      throw updateInvitationError;
    }

    console.log("Invitation updated successfully:", updatedInvitation);

    // ─── Step 7: Return success ─────────────────────────────────────────
    return {
      success: true,
      message: "Invitation accepted successfully.",
      data: updatedInvitation
    };

  } catch (error) {
    console.error("❌ Error in acceptStudentInvitationService:", error);
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
      console.error("❌ Error finding invitation:", findError);
      throw findError;
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
      console.error("❌ Error resending invitation:", updateError);
      throw updateError;
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
      console.log(`✅ Resent invitation email to ${invitation.email}`);
    } catch (emailError) {
      console.error("❌ Resend email failed:", emailError);
      console.error("❌ Error details:", {
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
    console.error("❌ Error in resendStudentInvitationService:", error);
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