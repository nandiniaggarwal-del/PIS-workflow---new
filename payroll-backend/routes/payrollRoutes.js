const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middleware/auth");

const {
  getPayrollData,
  uploadPayrollFile,
} = require("../controllers/payrollController");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.get("/", authenticate, getPayrollData);

router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  uploadPayrollFile
);
module.exports = router;