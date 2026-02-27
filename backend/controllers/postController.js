const Post = require("../models/Post");

/* ================= GET ALL POSTS ================= */
const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= CREATE POST ================= */
const createPost = async (req, res) => {
  try {
    const { teacherName, teacherImage, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content required" });
    }

    const newPost = await Post.create({ teacherName, teacherImage, content });

    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllPosts,
  createPost,
};