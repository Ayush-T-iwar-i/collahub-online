const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    subjectName: { type: String, trim: true, default: "" },
    code:        { type: String, required: true, trim: true },
    subjectCode: { type: String, trim: true, default: "" },
    type:        { type: String, enum: ["Theory","Lab","Both"], default: "Theory" },
    college:     { type: String, required: true, trim: true },
    department:  { type: String, required: true, trim: true },
    semester:    { type: Number, required: true, min: 1, max: 8 },
    credits:     { type: Number, default: 0 },
    description: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

subjectSchema.index(
  { code: 1, college: 1, department: 1, semester: 1 },
  { unique: true }
);

module.exports = mongoose.model("Subject", subjectSchema);