
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* =================================================
       NAME
    ================================================= */

    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    /* =================================================
       EMAIL
    ================================================= */

    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    /* =================================================
       PASSWORD
    ================================================= */

    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: 6,
    },

    /* =================================================
       PASSWORD RESET
    ================================================= */

    resetPasswordTokenHash: {
      type: String,
      default: null,
    },

    resetPasswordExpiresAt: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
  }
);

/* =====================================================
   EXPORT
===================================================== */

module.exports =
  mongoose.model(
    "User",
    userSchema
  );
