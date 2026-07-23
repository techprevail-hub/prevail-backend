import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendInvitationEmail = async ({
  studentName,
  email,
  inviteLink,
}) => {
  try {
    const response = await resend.emails.send({
      // Replace this with your verified sender email from Resend
      from: process.env.RESEND_FROM_EMAIL,

      to: email,

      subject: "Invitation to Join Prevail",

      html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;">

        <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;padding:40px;">

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

          <div style="margin:35px 0;text-align:center;">

            <a
              href="${inviteLink}"
              style="
                background:#2563eb;
                color:#ffffff;
                padding:14px 28px;
                border-radius:8px;
                text-decoration:none;
                font-size:16px;
                font-weight:bold;
                display:inline-block;
              "
            >
              Accept Invitation
            </a>

          </div>

          <p>
            Or copy and paste this link into your browser:
          </p>

          <p style="word-break:break-all;">
            ${inviteLink}
          </p>

          <hr>

          <p style="color:#777;font-size:14px;">
            This invitation will expire in 7 days.
          </p>

          <p style="color:#777;font-size:14px;">
            If you were not expecting this invitation, you can safely ignore this email.
          </p>

        </div>

      </body>
      </html>
      `,
    });

    console.log("Invitation email sent successfully:", response);

    return response;
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw error;
  }
};