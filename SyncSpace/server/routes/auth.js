const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* =====================================================
   CONFIG
===================================================== */

const JWT_SECRET =
  process.env.JWT_SECRET || "syncspace-dev-secret";

const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://syncspace-1-ckob.onrender.com";

const RESET_TOKEN_EXPIRY_MINUTES = 15;

/* =====================================================
   MAILER
===================================================== */

const createTransporter = () => {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),

    secure:
      String(process.env.SMTP_SECURE).toLowerCase() ===
      "true",

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/* =====================================================
   JWT
===================================================== */

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/* =====================================================
   PUBLIC USER
===================================================== */

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
    const {
      name,
      email,
      password,
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required.",
      });
    }

    const cleanName = String(name).trim();

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const cleanPassword = String(password);

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Name must be at least 2 characters.",
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters.",
      });
    }

    /* Check existing user */

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    /* Hash password */

    const hashedPassword = await bcrypt.hash(
      cleanPassword,
      12
    );

    /* Create user */

    const user = await User.create({
      name: cleanName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    /* Create JWT */

    const token = createToken(user);

    console.log(
      `✅ User registered: ${normalizedEmail}`
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error(
      "❌ Register error:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
});

/* =====================================================
   LOGIN
===================================================== */

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const cleanPassword = String(password);

    /* Find user */

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      console.log(
        `❌ Login failed - user not found: ${normalizedEmail}`
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* Check password */

    const passwordMatches =
      await bcrypt.compare(
        cleanPassword,
        user.password
      );

    if (!passwordMatches) {
      console.log(
        `❌ Login failed - wrong password: ${normalizedEmail}`
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* Create token */

    const token = createToken(user);

    console.log(
      `✅ Login successful: ${normalizedEmail}`
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error(
      "❌ Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
});

/* =====================================================
   CURRENT USER
===================================================== */

router.get(
  "/me",
  requireAuth,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.userId
      ).select(
        "_id name email createdAt updatedAt"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      return res.status(200).json({
        success: true,

        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error(
        "❌ /me error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load user.",
      });
    }
  }
);

/* =====================================================
   FORGOT PASSWORD
===================================================== */

router.post(
  "/forgot-password",
  async (req, res) => {
    try {
      const email = String(
        req.body?.email || ""
      )
        .trim()
        .toLowerCase();

      /*
        Generic response prevents
        email enumeration.
      */

      const genericResponse = {
        success: true,
        message:
          "If an account exists for this email, a password reset link has been sent.",
      };

      if (!email) {
        return res.status(200).json(
          genericResponse
        );
      }

      /* Find user */

      const user = await User.findOne({
        email,
      });

      if (!user) {
        return res.status(200).json(
          genericResponse
        );
      }

      /* Generate reset token */

      const resetToken =
        crypto.randomBytes(32).toString("hex");

      const resetTokenHash =
        crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");

      const expiresAt = new Date(
        Date.now() +
          RESET_TOKEN_EXPIRY_MINUTES *
            60 *
            1000
      );

      user.resetPasswordTokenHash =
        resetTokenHash;

      user.resetPasswordExpiresAt =
        expiresAt;

      await user.save();

      /* Create transporter */

      const transporter =
        createTransporter();

      if (!transporter) {
        console.error(
          "❌ SMTP is not configured."
        );

        return res.status(500).json({
          success: false,
          message:
            "Email service is not configured. Check SMTP settings in Render.",
        });
      }

      /* Reset URL */

      const resetUrl =
        `${FRONTEND_URL}/reset-password` +
        `?token=${encodeURIComponent(
          resetToken
        )}` +
        `&email=${encodeURIComponent(
          email
        )}`;

      /* Send email */

      await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          process.env.SMTP_USER,

        to: user.email,

        subject:
          "Reset your SyncSpace password",

        text:
          `Hello ${user.name},\n\n` +
          `We received a request to reset your SyncSpace password.\n\n` +
          `Reset your password here:\n${resetUrl}\n\n` +
          `This link expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.\n\n` +
          `If you did not request this, you can safely ignore this email.\n\n` +
          `SyncSpace`,

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 30px;
              color: #111827;
            "
          >
            <h2>
              Reset your SyncSpace password
            </h2>

            <p>
              Hello ${escapeHtml(user.name)},
            </p>

            <p>
              We received a request to reset
              your SyncSpace password.
            </p>

            <p>
              Click the button below to create
              a new password.
            </p>

            <p>
              <a
                href="${resetUrl}"
                style="
                  display: inline-block;
                  padding: 12px 20px;
                  background: #2563eb;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                "
              >
                Reset Password
              </a>
            </p>

            <p>
              This link expires in
              ${RESET_TOKEN_EXPIRY_MINUTES}
              minutes.
            </p>

            <p>
              If you did not request this,
              you can safely ignore this email.
            </p>

            <p>
              SyncSpace
            </p>
          </div>
        `,
      });

      console.log(
        `📧 Password reset email sent to ${email}`
      );

      return res.status(200).json(
        genericResponse
      );
    } catch (error) {
      console.error(
        "❌ Forgot password error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to process password reset request.",
      });
    }
  }
);

/* =====================================================
   RESET PASSWORD
===================================================== */

router.post(
  "/reset-password",
  async (req, res) => {
    try {
      const {
        email,
        token,
        password,
      } = req.body || {};

      if (
        !email ||
        !token ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email, token and new password are required.",
        });
      }

      const cleanPassword =
        String(password);

      if (cleanPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters.",
        });
      }

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const cleanToken =
        String(token).trim();

      /* Hash reset token */

      const tokenHash =
        crypto
          .createHash("sha256")
          .update(cleanToken)
          .digest("hex");

      /* Find user */

      const user =
        await User.findOne({
          email: normalizedEmail,

          resetPasswordTokenHash:
            tokenHash,

          resetPasswordExpiresAt: {
            $gt: new Date(),
          },
        });

      if (!user) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid or expired reset link.",
        });
      }

      /* Hash new password */

      user.password =
        await bcrypt.hash(
          cleanPassword,
          12
        );

      /* Clear reset token */

      user.resetPasswordTokenHash =
        null;

      user.resetPasswordExpiresAt =
        null;

      await user.save();

      console.log(
        `🔐 Password reset successful for ${normalizedEmail}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Password reset successful. You can now log in.",
      });
    } catch (error) {
      console.error(
        "❌ Reset password error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Password reset failed.",
      });
    }
  }
);

/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =====================================================
   EXPORT
===================================================== */

module.exports = router;