const Post    = require("../models/Post");
const User    = require("../models/User");
const cloudinary  = require("../config/cloudinary");
const streamifier = require("streamifier");

// helper: upload buffer to cloudinary
const uploadToCloud = (buffer, resourceType = "auto") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "collahub_posts", resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

// ── CREATE POST ──
// POST /api/posts
exports.createPost = async (req, res) => {
  try {
    const { caption, category } = req.body;
    if (!caption?.trim() && !req.file)
      return res.status(400).json({ message: "Caption or media is required" });

    const user = await User.findById(req.user.id).select("name role");

    let mediaUrl  = null;
    let mediaType = "none";

    if (req.file) {
      const mime = req.file.mimetype;
      if (mime.startsWith("image/"))      mediaType = "image";
      else if (mime.startsWith("video/")) mediaType = "video";
      else if (mime.startsWith("audio/")) mediaType = "audio";

      const result = await uploadToCloud(
        req.file.buffer,
        mediaType === "image" ? "image" : "video"   // cloudinary: video handles audio too
      );
      mediaUrl = result.secure_url;
    }

    const post = await Post.create({
      authorId:   user._id,
      authorName: user.name,
      authorRole: user.role,
      caption:    caption?.trim() || "",
      category:   category || "General",
      mediaType,
      mediaUrl,
    });

    res.status(201).json({ success: true, post });
  } catch (error) {
    console.log("CREATE POST ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── GET ALL POSTS ──
// GET /api/posts
exports.getAllPosts = async (req, res) => {
  try {
    const userId = req.user?.id;
    const posts  = await Post.find().sort({ createdAt: -1 }).lean();

    // Attach isLiked flag for current user
    const enriched = posts.map(p => ({
      ...p,
      likeCount:    p.likes?.length || 0,
      commentCount: p.comments?.length || 0,
      isLiked:      userId ? p.likes?.some(id => id.toString() === userId) : false,
    }));

    res.json({ success: true, posts: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── TOGGLE LIKE ──
// POST /api/posts/:id/like
exports.toggleLike = async (req, res) => {
  try {
    const post   = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;
    const liked  = post.likes.some(id => id.toString() === userId);

    if (liked) post.likes = post.likes.filter(id => id.toString() !== userId);
    else       post.likes.push(userId);

    await post.save();

    res.json({
      success:   true,
      liked:     !liked,
      likeCount: post.likes.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ADD COMMENT ──
// POST /api/posts/:id/comment
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const user = await User.findById(req.user.id).select("name role");

    const comment = {
      userId:   user._id,
      userName: user.name,
      userRole: user.role,
      text:     text.trim(),
    };

    post.comments.push(comment);
    await post.save();

    res.json({
      success:  true,
      comment:  post.comments[post.comments.length - 1],
      commentCount: post.comments.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET COMMENTS ──
// GET /api/posts/:id/comments
exports.getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select("comments");
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ success: true, comments: post.comments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE POST (Admin/Author only) ──
// DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isAuthor = post.authorId.toString() === req.user.id;
    const isAdmin  = req.user.role === "admin";

    if (!isAuthor && !isAdmin)
      return res.status(403).json({ message: "Not authorized to delete this post" });

    await post.deleteOne();
    res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};