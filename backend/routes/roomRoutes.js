
const express = require("express");
const router  = express.Router();
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const ctrl    = require("../controllers/roomController");

router.get(   "/",               verifyToken, ctrl.getRooms);
router.post(  "/",               verifyToken, isAdmin, ctrl.addRoom);
router.put(   "/:id",            verifyToken, isAdmin, ctrl.updateRoom);
router.delete("/:id",            verifyToken, isAdmin, ctrl.deleteRoom);
router.get(   "/check-conflict", verifyToken, ctrl.checkRoomConflict);

module.exports = router;