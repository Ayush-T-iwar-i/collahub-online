const User        = require("../models/User");
const cloudinary  = require("cloudinary").v2;
const streamifier = require("streamifier");
const multer      = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

// ══════════════════════════════════════════════════════
// GET STUDENT BY EMAIL  —  GET /student/email/:email
// ══════════════════════════════════════════════════════
const getStudentByEmail = async (req, res) => {
  try {
    const email   = req.params.email.toLowerCase().trim();
    const student = await User.findOne({ email }).select("-password -refreshToken");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// ══════════════════════════════════════════════════════
// GET MY PROFILE  —  GET /student/me
// Returns full student profile from DB (fresh data)
// ══════════════════════════════════════════════════════
const getMyProfile = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select("-password -refreshToken -otp -otpExpire");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ success: true, student });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// ══════════════════════════════════════════════════════
// UPLOAD PROFILE IMAGE  —  POST /student/upload-profile
// Uploads to Cloudinary, returns { profileImage: url }
// ══════════════════════════════════════════════════════
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const streamUpload = (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder:           "collahub/profiles",
            public_id:        `student_${req.user.id}`,
            overwrite:        true,
            transformation:   [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
          },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });

    const result = await streamUpload(req.file.buffer);

    // Save URL to DB
    await User.findByIdAndUpdate(req.user.id, { profileImage: result.secure_url });

    // Return as `profileImage` (frontend expects this key)
    res.json({
      success:      true,
      profileImage: result.secure_url,
      message:      "Profile image uploaded successfully",
    });
  } catch (e) {
    console.log("UPLOAD ERROR:", e.message);
    res.status(500).json({ message: "Upload failed", error: e.message });
  }
};

module.exports = {
  getStudentByEmail,
  getMyProfile,
  uploadProfileImage,
  upload,
};