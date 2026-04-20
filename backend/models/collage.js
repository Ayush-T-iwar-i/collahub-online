const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name:        { type:String, required:true, trim:true },
    code:        { type:String, required:true, trim:true },
    type:        { type:String, enum:["Theory","Lab","Both"], default:"Theory" },
    college:     { type:String, required:true, trim:true },
    department:  { type:String, required:true, trim:true },
    semester:    { type:Number, required:true, min:1, max:8 },
    credits:     { type:Number, default:0 },
    description: { type:String, trim:true, default:"" },
  },
  { timestamps: true }
);

// Same code+college+dept+sem will not be duplicated
subjectSchema.index(
  { code:1, college:1, department:1, semester:1 },
  { unique:true }
);

module.exports = mongoose.model("Subject", subjectSchema);