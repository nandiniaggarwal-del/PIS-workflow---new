const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();

const workflowController =
  require("../controllers/workflowController");

// Maker Routes
router.get(
  "/maker",
  authenticate,
  authorize(["maker"]),
  workflowController.getMakerData
);
router.post(
  "/save-maker",
  authenticate,
  authorize(["maker"]),
  workflowController.updateMakerData
);
router.get(
  "/submit-hrbp",
  authenticate,
  authorize(["maker"]),
  workflowController.submitToHRBP
);

// HRBP Routes
router.get(
  "/hrbp",
  authenticate,
  authorize(["hrbp"]),
  workflowController.getHRBPData
);
router.post(
  "/save-hrbp-review",
  authenticate,
  authorize(["hrbp"]),
  workflowController.saveHRBPReview
);
router.get(
  "/submit-hod",
  authenticate,
  authorize(["hrbp"]),
  workflowController.submitToHOD
);
router.get(
  "/return-maker",
  authenticate,
  authorize(["hrbp"]),
  workflowController.returnToMaker
);

// HOD Routes
router.get(
  "/hod",
  authenticate,
  authorize(["hod"]),
  workflowController.getHODData
);
router.post(
  "/save-hod-review",
  authenticate,
  authorize(["hod"]),
  workflowController.saveHODReview
);
router.get(
  "/submit-payroll",
  authenticate,
  authorize(["hod"]),
  workflowController.submitToPayroll
);
router.get(
  "/return-hrbp",
  authenticate,
  authorize(["hod"]),
  workflowController.returnToHRBP
);

// Payroll Routes
router.get(
  "/payroll",
  authenticate,
  authorize(["payroll"]),
  workflowController.getPayrollData
);

// Global History Route
router.get(
  "/history",
  authenticate,
  workflowController.getWorkflowHistory
);

module.exports = router;