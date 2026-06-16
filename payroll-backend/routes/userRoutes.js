const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");

const {
  getCurrentUser,
  getAllUsers,
  createUser,
  deleteUser
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", authenticate, getCurrentUser);
router.get("/", authenticate, authorize(["admin"]), getAllUsers);
router.post("/", authenticate, authorize(["admin"]), createUser);
router.delete("/:email", authenticate, authorize(["admin"]), deleteUser);

module.exports = router;