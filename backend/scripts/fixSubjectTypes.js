require("dotenv").config();
const mongoose = require("mongoose");
const Subject  = require("../models/Subject");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("✅ Connected");

  // ✅ Add type field to all subjects where missing
  const result = await Subject.updateMany(
    { type: { $exists: false } },  // those without type
    { $set: { type: "Theory" } }   // set default Theory
  );

  console.log(`✅ ${result.modifiedCount} subjects updated with type: Theory`);

  await mongoose.disconnect();
  console.log("🎉 Done!");
});