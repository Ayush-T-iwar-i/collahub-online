const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  // Author
  authorId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  authorName: String,
  authorRole: String,   // "admin" | "teacher" | "student"

  // Content
  caption:   String,
  category:  { type: String, enum: ["General","Academic","Event","Holiday","Exam","Alert"], default: "General" },

  // Media — one of these can be present
  mediaType: { type: String, enum: ["none","image","video","audio"], default: "none" },
  mediaUrl:  String,    // Cloudinary URL

  // Engagement
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [{
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName:   String,
    userRole:   String,
    text:       String,
    createdAt:  { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);