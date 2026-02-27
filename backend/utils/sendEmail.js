require("dotenv").config();
const nodemailer = require("nodemailer");

const sendEmail = async (email, message, subject = "OTP Verification") => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"College App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: typeof message === "number" ? `Your OTP is ${message}` : message,
    });

    console.log("✅ Email sent to:", email);

  } catch (error) {
    console.log("❌ Email sending failed:", error.message);
    throw error;
  }
};

module.exports = sendEmail;