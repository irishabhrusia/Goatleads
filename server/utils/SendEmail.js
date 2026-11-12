const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, text, html }) => {
  // No SMTP set: print the email in the terminal (development only)
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured");
    }
    console.log(`\n[DEV EMAIL - SMTP not set]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
};


module.exports = sendEmail;