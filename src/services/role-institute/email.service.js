import { Resend } from "resend";

console.log("========== EMAIL SERVICE ==========");
console.log(
  "RESEND_API_KEY:",
  process.env.RESEND_API_KEY ? "Loaded ✅" : "Missing ❌"
);
console.log("RESEND_FROM_EMAIL:", process.env.RESEND_FROM_EMAIL);
console.log("===================================");

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendInvitationEmail = async ({
  studentName,
  email,
  inviteLink,
}) => {
  try {
    console.log("===================================");
    console.log("Sending invitation email...");
    console.log("Student Name:", studentName);
    console.log("To:", email);
    console.log("From:", process.env.RESEND_FROM_EMAIL);
    console.log("Invite Link:", inviteLink);
    console.log("===================================");

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: "You're Invited to Join Prevail",

      html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:30px;">
      
        <div style="max-width:600px;background:white;margin:auto;padding:30px;border-radius:10px;">
        
          <h2 style="color:#2563eb;">
            Welcome to Prevail
          </h2>

          <p>Hello <strong>${studentName}</strong>,</p>

          <p>
            You have been invited to join <strong>Prevail</strong>.
          </p>

          <p>
            Click the button below to accept your invitation.
          </p>

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

          <p>
            Or copy this link into your browser:
          </p>

          <p>
            ${inviteLink}
          </p>

          <hr>

          <p style="font-size:13px;color:#666;">
            This invitation expires in 7 days.
          </p>

        </div>

      </body>
      </html>
      `,
    });

    console.log("========== EMAIL SENT ==========");
    console.log(response);
    console.log("================================");

    return response;
  } catch (error) {
    console.error("========== EMAIL ERROR ==========");
    console.error("Message:", error.message);
    console.error("Full Error:", error);

    if (error.response) {
      console.error("Response:", error.response);
    }

    if (error.statusCode) {
      console.error("Status Code:", error.statusCode);
    }

    console.error("=================================");

    throw error;
  }
};