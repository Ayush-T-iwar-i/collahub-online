// backend/controllers/roomController.js
const Room = require("../models/Room");
const User = require("../models/User");

// ── GET /rooms  — get all rooms for admin's college ──────
exports.getRooms = async (req, res) => {
  try {
    const admin   = await User.findById(req.user.id);
    const college = req.query.college || admin?.college;
    if (!college) return res.status(400).json({ success:false, message:"College not found." });

    const rooms = await Room.find({ college, isActive:true }).sort("type name");
    res.json({ success:true, rooms });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── POST /rooms  — add a room ────────────────────────────
exports.addRoom = async (req, res) => {
  try {
    const admin   = await User.findById(req.user.id);
    const college = admin?.college;
    if (!college) return res.status(400).json({ success:false, message:"College not found in your account." });

    const { name, type, capacity, building, floor, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success:false, message:"Room name is required." });

    const exists = await Room.findOne({ name:name.trim(), college });
    if (exists) return res.status(400).json({ success:false, message:`Room "${name}" already exists in your college.` });

    const room = await Room.create({
      name:name.trim(), type:type||"Lecture",
      capacity:Number(capacity)||0,
      college, building:building?.trim()||"",
      floor:floor?.trim()||"", description:description?.trim()||"",
    });
    res.status(201).json({ success:true, message:"Room added successfully!", room });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── PUT /rooms/:id  — edit room ──────────────────────────
exports.updateRoom = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    const room  = await Room.findById(req.params.id);
    if (!room)                    return res.status(404).json({ success:false, message:"Room not found." });
    if (room.college !== admin?.college) return res.status(403).json({ success:false, message:"You can only edit rooms of your own college." });

    const { name, type, capacity, building, floor, description, isActive } = req.body;
    if (name) room.name        = name.trim();
    if (type) room.type        = type;
    if (capacity !== undefined) room.capacity = Number(capacity)||0;
    if (building !== undefined) room.building = building.trim();
    if (floor    !== undefined) room.floor    = floor.trim();
    if (description !== undefined) room.description = description.trim();
    if (isActive !== undefined) room.isActive  = isActive;

    await room.save();
    res.json({ success:true, message:"Room updated successfully!", room });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── DELETE /rooms/:id  — delete room ────────────────────
exports.deleteRoom = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    const room  = await Room.findById(req.params.id);
    if (!room)                    return res.status(404).json({ success:false, message:"Room not found." });
    if (room.college !== admin?.college) return res.status(403).json({ success:false, message:"You can only delete rooms of your own college." });
    await room.deleteOne();
    res.json({ success:true, message:"Room deleted." });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /rooms/check-conflict  — check if room is free ──
// Query: roomId, day, startTime, excludeTeacherId (optional)
exports.checkRoomConflict = async (req, res) => {
  try {
    const { roomName, college, day, startTime, excludeAssignmentId } = req.query;
    if (!roomName || !college || !day || !startTime)
      return res.status(400).json({ success:false, message:"roomName, college, day, startTime required." });

    // Look in accepted subject requests for this room+day+time
    let SubjectRequest;
    try { SubjectRequest = require("../models/SubjectRequest"); } catch {
      return res.json({ success:true, conflict:false });
    }

    const query = {
      college, status:"accepted",
      "timetable.room": roomName,
      "timetable.day":  day,
      "timetable.startTime": startTime,
    };
    if (excludeAssignmentId) query._id = { $ne: excludeAssignmentId };

    const conflict = await SubjectRequest.findOne(query).select("teacherName subjectName");
    if (conflict) {
      return res.json({
        success:true, conflict:true,
        message:`Room "${roomName}" is already booked at this time for "${conflict.subjectName}" (${conflict.teacherName}).`
      });
    }
    res.json({ success:true, conflict:false });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};