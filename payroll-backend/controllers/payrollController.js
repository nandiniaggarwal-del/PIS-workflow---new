const payrollData = require("../data/payrollData");

const getPayrollData = (req, res) => {
  res.json(payrollData);
};

const uploadPayrollFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No file uploaded",
    });
  }

  res.json({
    message: "File uploaded successfully",
    file: req.file.filename,
  });
};

module.exports = {
  getPayrollData,
  uploadPayrollFile,
};