// utils/sendEmail.js
// ✅ Use Resend — Railway pe Gmail SMTP blocked hai
// Setup: npm install resend

const { Resend } = require("resend");

const resend   = new Resend(process.env.RESEND_API_KEY);
const FROM     = process.env.FROM_EMAIL || "CollaHub <onboarding@resend.dev>";
const APP_NAME = "CollaHub";

// ── Generic send ──────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const { data, error } = await resend.emails.send({
      from:    FROM,
      to:      Array.isArray(to) ? to : [to],
      subject,
      html:    html || `<p>${text || ""}</p>`,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      throw new Error(error.message || "Email send failed");
    }

    console.log("✅ Email sent | ID:", data?.id, "| To:", to);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("❌ sendEmail failed:", err.message);
    throw err;
  }
};

// ── OTP Email ─────────────────────────────────────────────
const sendOtpEmail = async (email, otp, purpose = "login") => {
  const purposeMap = {
    login:    "Login Verification",
    register: "Account Registration",
    reset:    "Password Reset",
  };
  const purposeText = purposeMap[purpose] || "Verification";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:20px}
.c{max-width:460px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.h{background:linear-gradient(135deg,#080d17,#1a2535);padding:28px 24px;text-align:center}
.logo{color:#fff;font-size:26px;font-weight:900;letter-spacing:-1px}
.logo span{color:#00c6ff}
.sub{color:#64748b;font-size:12px;margin-top:4px}
.b{padding:28px 24px;text-align:center}
.title{color:#1e293b;font-size:15px;font-weight:700;margin-bottom:6px}
.desc{color:#64748b;font-size:13px;line-height:1.6;margin-bottom:24px}
.otp-box{background:#f8fafc;border:2px dashed #00c6ff;border-radius:12px;padding:20px 32px;margin-bottom:16px;display:inline-block}
.otp{font-size:38px;font-weight:900;letter-spacing:12px;color:#080d17;font-family:'Courier New',monospace}
.exp{color:#f87171;font-size:12px;font-weight:700;margin-bottom:20px}
.warn{background:#fef9c3;border-radius:8px;padding:12px 16px;color:#713f12;font-size:11px;line-height:1.5;text-align:left}
.f{background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0}
.f p{color:#94a3b8;font-size:11px;margin:3px 0}
</style>
</head>
<body>
<div class="c">
<div class="h">
<div class="logo">COLLA<span>हUB</span></div>
<div class="sub">Smart College Management Platform</div>
</div>
<div class="b">
<p class="title">${purposeText}</p>
<p class="desc">Your one-time password (OTP) for ${purposeText.toLowerCase()}:</p>
<div class="otp-box"><div class="otp">${otp}</div></div>
<p class="exp">⏱ Expires in 10 minutes</p>
<div class="warn">🔒 <strong>Security:</strong> Never share this OTP with anyone. CollaHub staff will never ask for your OTP. If you did not request this, ignore this email.</div>
</div>
<div class="f">
<p><strong>${APP_NAME}</strong> — NIMS University, Jaipur</p>
<p>Automated email — do not reply</p>
</div>
</div>
</body>
</html>`;

  return sendEmail({
    to:      email,
    subject: `${otp} is your CollaHub OTP`,
    html,
  });
};

module.exports = { sendEmail, sendOtpEmail };