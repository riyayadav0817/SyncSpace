
const mongoose = require("mongoose");

/* =====================================================
   CONSTANTS
===================================================== */

const DEFAULT_CODE =
  '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");';

const SUPPORTED_LANGUAGES = [
  "javascript",
  "python",
  "java",
  "cpp",
  "c",
  "html",
  "json",
];

/* =====================================================
   POINT
===================================================== */

const pointSchema = new mongoose.Schema(
  {
    x: {
      type: Number,
      required: true,
      min: -100000,
      max: 100000,
    },

    y: {
      type: Number,
      required: true,
      min: -100000,
      max: 100000,
    },
  },
  {
    _id: false,
    versionKey: false,
  }
);

/* =====================================================
   LINE
===================================================== */

const lineSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    type: {
      type: String,
      default: "pen",
      enum: [
        "pen",
        "line",
        "rectangle",
        "circle",
        "eraser",
      ],
    },

    tool: {
      type: String,
      default: "pen",
      enum: [
        "pen",
        "line",
        "rectangle",
        "circle",
        "eraser",
      ],
    },

    points: {
      type: [pointSchema],
      default: [],
      validate: {
        validator: function (points) {
          return points.length <= 5000;
        },
        message: "A drawing line cannot contain more than 5000 points.",
      },
    },

    color: {
      type: String,
      default: "#2563eb",
      trim: true,
      match: /^#[0-9A-Fa-f]{6}$/,
    },

    brushSize: {
      type: Number,
      default: 4,
      min: 1,
      max: 50,
    },

    socketId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },
  },
  {
    _id: false,
    versionKey: false,
  }
);

/* =====================================================
   WORKSPACE
===================================================== */

const workspaceSchema = new mongoose.Schema(
  {
    /* =================================================
       ROOM ID
    ================================================= */

    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
      minlength: 4,
      maxlength: 50,
    },

    /* =================================================
       LIVE CODE
    ================================================= */

    code: {
      type: String,
      default: DEFAULT_CODE,
      maxlength: 100000,
    },

    language: {
      type: String,
      default: "javascript",
      enum: SUPPORTED_LANGUAGES,
    },

    /* =================================================
       WHITEBOARD
    ================================================= */

    lines: {
      type: [lineSchema],
      default: [],
      validate: {
        validator: function (lines) {
          return lines.length <= 10000;
        },
        message: "A workspace cannot contain more than 10000 drawing lines.",
      },
    },

    /* =================================================
       YJS CRDT STATE
    ================================================= */

    yjsState: {
      type: Buffer,
      default: null,
    },
  },

  {
    timestamps: true,

    minimize: false,

    strict: true,

    versionKey: false,
  }
);

/* =====================================================
   NORMALIZE ROOM ID
===================================================== */

workspaceSchema.pre("validate", function (next) {
  if (this.roomId) {
    this.roomId = this.roomId.trim().toUpperCase();
  }

  next();
});

/* =====================================================
   HELPER METHODS
===================================================== */

workspaceSchema.methods.resetWorkspace = function () {
  this.code = DEFAULT_CODE;
  this.language = "javascript";
  this.lines = [];
  this.yjsState = null;

  return this;
};

workspaceSchema.methods.clearWhiteboard = function () {
  this.lines = [];

  return this;
};

workspaceSchema.methods.updateCode = function (
  code,
  language
) {
  if (typeof code === "string") {
    this.code = code;
  }

  if (
    typeof language === "string" &&
    SUPPORTED_LANGUAGES.includes(language)
  ) {
    this.language = language;
  }

  return this;
};

/* =====================================================
   STATIC HELPERS
===================================================== */

workspaceSchema.statics.findByRoomId = function (
  roomId
) {
  if (!roomId) {
    return null;
  }

  return this.findOne({
    roomId: roomId.trim().toUpperCase(),
  });
};

/* =====================================================
   MODEL
===================================================== */

module.exports = mongoose.model(
  "Workspace",
  workspaceSchema
);
