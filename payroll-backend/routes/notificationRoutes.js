const express = require("express");
const { authenticate } = require("../middleware/auth");

const {
  getNotifications,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authenticate, getNotifications);

module.exports = router;