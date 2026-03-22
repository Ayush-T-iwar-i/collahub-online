// utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendEmail = async (to, message, subject = "COLLAहUB Notification") => {
  const transporter = nodemailer.createTransport({
    host:   "smtp.gmail.com",
    port:   587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const text = typeof message === "number"
    ? `Your OTP is: ${message}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`
    : message;

  await transporter.sendMail({
    from:    `"COLLAहUB" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f8f9fa;border-radius:12px">
      <h2 style="color:#0072ff;margin-bottom:8px">COLLAहUB</h2>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:24px"/>
      <p style="color:#334155;font-size:15px;line-height:1.6">${text.replace(/\n/g,"<br/>")}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin-top:24px"/>
      <p style="color:#94a3b8;font-size:12px;margin-top:12px">This is an automated message from COLLAहUB. Do not reply.</p>
    </div>`,
  });

  console.log("✅ Email sent →", to);
};

module.exports = sendEmail;