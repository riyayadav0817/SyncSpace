const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "syncspace-dev-secret";

/* =====================================================
   AUTH MIDDLEWARE
===================================================== */

const requireAuth = (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token =
      authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing.",
      });
    }

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    req.user = decoded;

    next();
  } catch (error) {
    console.error(
      "❌ Auth middleware error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

module.exports = {
  requireAuth,
};