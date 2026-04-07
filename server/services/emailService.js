const nodemailer = require('nodemailer');

// For development without specific credentials, we use Ethereal Mail (a fake SMTP service).
// In production, configure these from process.env (e.g., SendGrid, AWS SES, or Gmail)
let transporter;

async function initTransporter() {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Generate test account for local dev
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log(`Email Service initialized with Ethereal Email (Test Account: ${testAccount.user})`);
  }
}

// Call on startup
initTransporter().catch(console.error);

async function sendAccountApprovalEmail(recipientEmail, name) {
  if (!transporter) return;
  
  const mailOptions = {
    from: '"NUUR TECH System" <no-reply@nuurtech.ai>',
    to: recipientEmail,
    subject: "Instructor Account Approved",
    text: `Hello ${name},\n\nYour instructor account at NUUR TECH has been approved by the administrators!\n\nYou can now log in and start creating courses.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #6366f1;">Welcome to NUUR TECH!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We are thrilled to inform you that your instructor account has been <strong>approved</strong> by the administrators.</p>
        <p>You can now log in to your Instructor Dashboard to start creating courses, uploading lessons, and interacting with students.</p>
        <a href="http://localhost:5173" style="display:inline-block; padding:10px 20px; background-color:#6366f1; color:#fff; text-decoration:none; border-radius:5px;">Go to Dashboard</a>
        <br><br>
        <p>Best regards,<br>The NUUR TECH Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Approval email sent! Message ID: %s", info.messageId);
    if (!process.env.SMTP_HOST) {
      console.log("Preview local email URL: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

module.exports = {
  sendAccountApprovalEmail
};
