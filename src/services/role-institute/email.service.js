// services/email.service.js

import { Resend } from "resend";

console.log("========== EMAIL SERVICE ==========");
console.log(
  "RESEND_API_KEY:",
  process.env.RESEND_API_KEY ? "Loaded ✅" : "Missing ❌"
);
console.log("RESEND_FROM_EMAIL:", process.env.RESEND_FROM_EMAIL);
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("===================================");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send Invitation Email (UPDATED - Supports both student and coach)
 * Used by studentInvitationService.js and coachInvitationService.js
 */
export const sendInvitationEmail = async ({
  studentName,
  coachName,
  email,
  inviteLink,
  course,
  branch,
  batch,
  specialization,
  experience,
  instituteId,
  isResend = false,
}) => {
  try {
    // ✅ Determine name and role
    const isCoach = !!coachName;
    const isStudent = !!studentName;
    
    // ✅ FIX: Use coachName if provided, otherwise use studentName
    const name = coachName || studentName || "there";
    
    // ✅ Determine role for display
    let roleDisplay = "a member";
    if (isCoach) {
      roleDisplay = "a Career Coach";
    } else if (isStudent) {
      roleDisplay = "a Student";
    }

    console.log("===================================");
    console.log("Sending invitation email...");
    console.log("Name:", name);
    console.log("Role:", roleDisplay);
    console.log("To:", email);
    console.log("From:", process.env.RESEND_FROM_EMAIL);
    console.log("Invite Link:", inviteLink);
    console.log("Is Resend:", isResend);
    console.log("===================================");

    const subject = isResend 
      ? `Reminder: You're Invited to Join Prevail as ${roleDisplay}`
      : `You're Invited to Join Prevail as ${roleDisplay}`;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL.trim(),
      to: email,
      subject: subject,

      html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:30px;">
      
        <div style="max-width:600px;background:white;margin:auto;padding:30px;border-radius:10px;">
        
          <h2 style="color:#2563eb;">
            Welcome to Prevail
          </h2>

          <p>Hello <strong>${name}</strong>,</p>

          <p>
            You have been invited to join <strong>Prevail</strong> as 
            <strong>${roleDisplay}</strong>.
          </p>

          ${specialization || experience ? `
            <div style="background:#f0f4ff;padding:12px 16px;border-radius:6px;margin:15px 0;border-left:4px solid #2563eb;">
              <p style="margin:4px 0;font-weight:600;color:#2563eb;">Coach Details:</p>
              ${specialization ? `<p style="margin:4px 0;"><strong>Specialization:</strong> ${specialization}</p>` : ''}
              ${experience ? `<p style="margin:4px 0;"><strong>Experience:</strong> ${experience}</p>` : ''}
            </div>
          ` : ''}

          ${course || branch || batch ? `
            <div style="background:#f0f4ff;padding:12px 16px;border-radius:6px;margin:15px 0;border-left:4px solid #2563eb;">
              <p style="margin:4px 0;font-weight:600;color:#2563eb;">Student Details:</p>
              ${course ? `<p style="margin:4px 0;"><strong>Course:</strong> ${course}</p>` : ''}
              ${branch ? `<p style="margin:4px 0;"><strong>Branch:</strong> ${branch}</p>` : ''}
              ${batch ? `<p style="margin:4px 0;"><strong>Batch:</strong> ${batch}</p>` : ''}
            </div>
          ` : ''}

          ${isResend ? `
            <div style="
              background:#fef3c7;
              border:1px solid #f59e0b;
              padding:12px 16px;
              border-radius:6px;
              margin:15px 0;
              font-size:14px;
              color:#92400e;
            ">
              ⏰ This is a reminder to accept your invitation. If you've already accepted it, please ignore this email.
            </div>
          ` : ''}

          <p style="margin:35px 0;">
            <a
              href="${inviteLink}"
              style="
                background:#2563eb;
                color:white;
                padding:12px 24px;
                text-decoration:none;
                border-radius:8px;
                display:inline-block;
              "
            >
              Accept Invitation
            </a>
          </p>

          <p>Or copy this link:</p>

          <p style="word-break:break-all;color:#2563eb;">${inviteLink}</p>

          <hr>

          <p style="font-size:13px;color:#666;">
            <strong>Note:</strong> This invitation expires in 7 days.
          </p>

          <p style="font-size:12px;color:#999;margin-top:20px;">
            You received this email because you have been invited to join Prevail.<br>
            If you have any questions, please contact the institute administrator.<br>
            This is an automated email. Please do not reply to this message.
          </p>

        </div>

      </body>
      </html>
      `,
    });

    if (error) {
      console.error("========== RESEND ERROR ==========");
      console.error(error);
      console.error("=================================");
      throw new Error(error.message);
    }

    console.log("========== EMAIL SENT ==========");
    console.log(data);
    console.log("================================");

    return data;
  } catch (error) {
    console.error("========== EMAIL ERROR ==========");
    console.error(error);
    console.error("=================================");
    throw error;
  }
};

/**
 * Send NPS Survey Email (UNCHANGED)
 * Used by nps.service.js for sending survey links
 */
export const sendNpsSurveyEmail = async ({
  studentName,
  email,
  surveyLink,
  surveyTitle,
  instituteId,
  isResend = false,
}) => {
  try {
    console.log("===================================");
    console.log("Sending NPS Survey email...");
    console.log("Student Name:", studentName);
    console.log("To:", email);
    console.log("From:", process.env.RESEND_FROM_EMAIL);
    console.log("Survey Title:", surveyTitle);
    console.log("Survey Link:", surveyLink);
    console.log("Is Resend:", isResend);
    console.log("===================================");

    const subject = isResend 
      ? `Reminder: ${surveyTitle} - Your feedback matters!`
      : `${surveyTitle} - Share your feedback!`;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL.trim(),
      to: email,
      subject: subject,

      html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:30px;">
      
        <div style="max-width:600px;background:white;margin:auto;padding:30px;border-radius:10px;">
        
          <h2 style="color:#2563eb;">
            ${surveyTitle || 'NPS Survey'}
          </h2>

          <p>Hello <strong>${studentName || 'Student'}</strong> 👋,</p>

          <p>
            We value your feedback and would like to hear about your experience.
          </p>

          <p>
            Please take a few minutes to complete our survey. Your responses will help us improve our services.
          </p>

          ${isResend ? `
            <div style="
              background:#fef3c7;
              border:1px solid #f59e0b;
              padding:12px 16px;
              border-radius:6px;
              margin:15px 0;
              font-size:14px;
              color:#92400e;
            ">
              ⏰ This is a reminder to complete the survey. If you've already submitted it, please ignore this email.
            </div>
          ` : ''}

          <p style="margin:35px 0;">
            <a
              href="${surveyLink}"
              style="
                background:#2563eb;
                color:white;
                padding:12px 24px;
                text-decoration:none;
                border-radius:8px;
                display:inline-block;
              "
            >
              📝 Take the Survey
            </a>
          </p>

          <p>Or copy this link in your browser:</p>

          <p style="word-break:break-all;color:#2563eb;">${surveyLink}</p>

          <hr>

          <p style="font-size:13px;color:#666;">
            <strong>Note:</strong> This survey link will expire in 7 days.
          </p>

          <p style="font-size:12px;color:#999;margin-top:20px;">
            You received this email because you are a student at our institute.<br>
            If you have any questions, please contact your institute administrator.<br>
            This is an automated email. Please do not reply to this message.
          </p>

        </div>

      </body>
      </html>
      `,
    });

    if (error) {
      console.error("========== RESEND ERROR (NPS SURVEY) ==========");
      console.error(error);
      console.error("================================================");
      throw new Error(error.message);
    }

    console.log("========== NPS SURVEY EMAIL SENT ==========");
    console.log(data);
    console.log("============================================");

    return data;
  } catch (error) {
    console.error("========== NPS SURVEY EMAIL ERROR ==========");
    console.error(error);
    console.error("=============================================");
    throw error;
  }
};