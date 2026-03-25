
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  name:        { type:String, required:true, trim:true },       // e.g. "Room 101", "Lab 3", "LT-A"
  type:        { type:String, enum:["Lecture","Lab","Theater","Seminar","Other"], default:"Lecture" },
  capacity:    { type:Number, default:0 },
  college:     { type:String, required:true, trim:true },
  building:    { type:String, trim:true, default:"" },
  floor:       { type:String, trim:true, default:"" },
  description: { type:String, trim:true, default:"" },
  isActive:    { type:Boolean, default:true },
}, { timestamps:true });

roomSchema.index({ name:1, college:1 }, { unique:true });

module.exports = mongoose.models.Room || mongoose.model("Room", roomSchema);