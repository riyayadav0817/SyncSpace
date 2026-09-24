const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
 
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
 
const router = express.Router();
 
/* =====================================================
   CONFIG & INITIALIZATION
===================================================== */
 
const JWT_SECRET = process.env.JWT_SECRET || "syncspace-dev-secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://syncspace-1-ckob.onrender.com";
const RESET_TOKEN_EXPIRY_MINUTES = 15;
 
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Render's network can't route Gmail SMTP over IPv6 (causes ENETUNREACH).
  // Forcing IPv4 fixes it.
  family: 4,
});
 
function escapeHtml(value) {
  if (!value) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
 
const createToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};
 
const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
});
 
/* =====================================================
   REGISTER
===================================================== */
 
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
 
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }
 
    const cleanName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);
 
    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters.",
      });
    }
 
    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }
 
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
 
    const hashedPassword = await bcrypt.hash(cleanPassword, 12);
    const user = await User.create({
      name: cleanName,
      email: normalizedEmail,
      password: hashedPassword,
    });
 
    const token = createToken(user);
 
    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    return res.status(500).json({ success: false, message: "Registration failed." });
  }
});
 
/* =====================================================
   LOGIN
===================================================== */
 
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
 
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }
 
    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);
 
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
 
    const passwordMatches = await bcrypt.compare(cleanPassword, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
 
    const token = createToken(user);
 
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ success: false, message: "Login failed." });
  }
});
 
/* =====================================================
   FORGOT PASSWORD (Nodemailer / Gmail Integration)
===================================================== */
 
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
 
    const genericResponse = {
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    };
 
    if (!email) return res.status(200).json(genericResponse);
 
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json(genericResponse);
 
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
 
    user.resetPasswordTokenHash = resetTokenHash;
    user.resetPasswordExpiresAt = expiresAt;
    await user.save();
 
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`;
 
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"SyncSpace" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Reset your SyncSpace password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #111827;">
            <h2>Reset your SyncSpace password</h2>
            <p>Hello ${escapeHtml(user.name)},</p>
            <p>We received a request to reset your SyncSpace password.</p>
            <p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Reset Password
              </a>
            </p>
            <p>This link expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.</p>
            <p>If you did not request this, you can safely ignore this email.</p>
          </div>
        `,
      });
 
      console.log(`📧 Password reset email sent via Gmail to ${email}`);
    } catch (mailError) {
      // Sending failed, but we never reveal that to the client — log it so this never fails silently
      console.error("❌ Nodemailer delivery error:", mailError.message);
    }
 
    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request.",
    });
  }
});
 
/* =====================================================
   RESET PASSWORD
===================================================== */
 
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, password } = req.body || {};
 
    if (!email || !token || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, token and new password are required.",
      });
    }
 
    const cleanPassword = String(password);
    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }
 
    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanToken = String(token).trim();
 
    const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");
 
    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });
 
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link.",
      });
    }
 
    user.password = await bcrypt.hash(cleanPassword, 12);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();
 
    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Password reset failed.",
    });
  }
});
 
module.exports = router;
 
