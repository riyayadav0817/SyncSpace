const mongoose = require("mongoose");

/* =====================================================
   POINT
===================================================== */

const pointSchema = new mongoose.Schema(
  {
    x: {
      type: Number,
      required: true,
    },

    y: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
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
    },

    type: {
      type: String,
      default: "pen",
    },

    tool: {
      type: String,
      default: "pen",
    },

    points: {
      type: [pointSchema],
      default: [],
    },

    color: {
      type: String,
      default: "#2563eb",
    },

    brushSize: {
      type: Number,
      default: 4,
    },

    socketId: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

/* =====================================================
   WORKSPACE
===================================================== */

const workspaceSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    code: {
      type: String,
      default:
        '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");',
    },

    language: {
      type: String,
      default: "javascript",
    },

    lines: {
      type: [lineSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Workspace",
  workspaceSchema
);