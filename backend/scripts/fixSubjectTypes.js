require("dotenv").config();
const mongoose = require("mongoose");
const Subject  = require("../models/Subject");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("✅ Connected");

  // ✅ Sabhi subjects mein type field add karo jo missing hai
  const result = await Subject.updateMany(
    { type: { $exists: false } },  // type nahi hai jo bhi
    { $set: { type: "Theory" } }   // default Theory set karo
  );

  console.log(`✅ ${result.modifiedCount} subjects updated with type: Theory`);

  await mongoose.disconnect();
  console.log("🎉 Done!");
});