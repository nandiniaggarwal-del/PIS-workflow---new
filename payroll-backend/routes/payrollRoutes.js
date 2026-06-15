const express = require("express");
const multer = require("multer");

const {
  getPayrollData,
  uploadPayrollFile,
} = require("../controllers/payrollController");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.get("/", getPayrollData);

router.post(
  "/upload",
  upload.single("file"),
  uploadPayrollFile
);
module.exports = router;