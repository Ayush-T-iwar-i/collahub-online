const User = require("../models/User");
const bcrypt = require("bcryptjs");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// ================= GET MY PROFILE =================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -refreshToken -otp -otpExpire");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= UPDATE PROFILE =================
exports.updateProfile = async (req, res) => {
  try {
    const { name, oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (name) user.name = name.trim();

    if (oldPassword && newPassword) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch)
        return res.status(400).json({ success: false, message: "Old password is incorrect" });

      if (newPassword.length < 6)
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({ success: true, message: "Profile updated successfully" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= UPLOAD PROFILE IMAGE =================
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    // ✅ Fixed: streamifier se buffer pipe kiya
    const uploadFromBuffer = () => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "college_app_profiles" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    };

    const result = await uploadFromBuffer();

    const user = await User.findById(req.user.id);
    user.profileImage = result.secure_url;
    await user.save();

    res.json({
      success: true,
      message: "Profile image uploaded successfully",
      imageUrl: result.secure_url,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};