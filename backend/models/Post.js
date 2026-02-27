const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    teacherName: String,
    teacherImage: String,
    content: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);