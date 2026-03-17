const User = require("./models/User");

async function createSuperAdmin() {
  await User.create({
    name: "Super Admin",
    email: "admin@gmail.com",
    password: "147258369",
    role: "super-admin"
  });

  console.log("Super Admin Created");
}

createSuperAdmin();