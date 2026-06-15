const express = require("express");
const { sendEmail } =
require("../services/emailService");
const router = express.Router();

const workflowController =
  require("../controllers/workflowController");

router.get(
  "/maker",
  workflowController.getMakerData
);
router.get("/test-email", async (req,res)=>{

  await sendEmail(
    "nandini.aggarwal@1mg.com",
    "Test Email",
    "Email system working"
  );

  res.send("Email sent");

});

router.get(
  "/hrbp",
  workflowController.getHRBPData
);

router.get(
  "/hod",
  workflowController.getHODData
);

router.get(
  "/payroll",
  workflowController.getPayrollData
);

router.post(
  "/save-maker",
  workflowController.updateMakerData
);

router.post(
  "/save-hrbp-review",
  workflowController.saveHRBPReview
);
router.post(
  "/save-hod-review",
  workflowController.saveHODReview
);
router.get(
  "/submit-hrbp",
  workflowController.submitToHRBP
);

router.get(
  "/submit-hod",
  workflowController.submitToHOD
);

router.get(
  "/submit-payroll",
  workflowController.submitToPayroll
);

router.get(
  "/return-maker",
  workflowController.returnToMaker
);

router.get(
  "/return-hrbp",
  workflowController.returnToHRBP
);

module.exports = router;