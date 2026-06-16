
const workflowData =
  require("../data/workflowData");

const {
  sendEmail,
} = require("../services/emailService");

const users =
  require("../data/users");
  exports.getMakerData = (req, res) => {
  res.json(workflowData.makerQueue);
};
const getUserByRole = (role) => {

  return users.find(
    user =>
      user.role.toLowerCase() ===
      role.toLowerCase()
  );

};

exports.getHRBPData = (req, res) => {
  res.json(workflowData.hrbpQueue);
};

exports.getHODData = (req, res) => {
  res.json(workflowData.hodQueue);
};

exports.getPayrollData = (req, res) => {
  res.json(workflowData.payrollQueue);
};

exports.submitToHRBP = async (req, res) => {

  workflowData.hrbpQueue.push(

    ...workflowData.makerQueue.map(item => ({

      ...item,

      status: "HRBP",

      history: [

        ...(item.history || []),

        {
          action: "Submitted by Maker (Business SPOC)",
          user: "Maker User",
          timestamp:
            new Date().toLocaleString()
        }

      ]

    }))

  );

  workflowData.makerQueue = [];

  const activeModule = workflowData.hrbpQueue[workflowData.hrbpQueue.length - 1]?.module || "Payroll";
  workflowData.workflowHistory.push({
    action: `Submitted Sheet (${activeModule})`,
    user: "Maker User",
    remarks: "Pending HRBP review",
    timestamp: new Date().toLocaleString()
  });

  const hrbp =
  getUserByRole("hrbp");

if (hrbp) {
  try {
    await sendEmail(

      hrbp.email,

      "Payroll Sheet Awaiting Review",

      "A payroll sheet has been submitted by Business SPOC and is awaiting your review."

    );
  } catch (err) {
    console.error("Failed to send email to HRBP:", err);
  }
}

  res.json({
    message: "Sent to HRBP"
  });

};

exports.submitToHOD = async (req, res) => {

  workflowData.hodQueue.push(

    ...workflowData.hrbpQueue.map(item => ({

      ...item,

      status: "HOD",

      history: [

        ...(item.history || []),

        {
          action: "Approved by HRBP",
          user: "HRBP User",
          timestamp:
            new Date().toLocaleString()
        }

      ]

    }))

  );

  workflowData.hrbpQueue = [];

  const activeModule = workflowData.hodQueue[workflowData.hodQueue.length - 1]?.module || "Payroll";
  workflowData.workflowHistory.push({
    action: `Approved Sheet (${activeModule})`,
    user: "HRBP User",
    remarks: "Pending HOD approval",
    timestamp: new Date().toLocaleString()
  });

  const hod =
  getUserByRole("hod");

if (hod) {
  try {
    await sendEmail(

      hod.email,

      "Payroll Sheet Awaiting Approval",

      "A payroll sheet is awaiting your approval."

    );
  } catch (err) {
    console.error("Failed to send email to HOD:", err);
  }
}

  res.json({
    message: "Sent to HOD"
  });

};

exports.submitToPayroll = async (req, res) => {

  workflowData.payrollQueue.push(

    ...workflowData.hodQueue.map(item => ({

      ...item,

      status: "PAYROLL",

      history: [

        ...(item.history || []),

        {
          action: "Approved by HOD",
          user: "HOD User",
          timestamp:
            new Date().toLocaleString()
        }

      ]

    }))

  );

  workflowData.hodQueue = [];

  const activeModule = workflowData.payrollQueue[workflowData.payrollQueue.length - 1]?.module || "Payroll";
  workflowData.workflowHistory.push({
    action: `Approved & Sent to Payroll (${activeModule})`,
    user: "HOD User",
    remarks: "Ready for processing",
    timestamp: new Date().toLocaleString()
  });

  const payroll =
  getUserByRole("payroll");

if (payroll) {
  try {
    await sendEmail(

      payroll.email,

      "Payroll Sheet Ready",

      "A payroll sheet has been approved and is ready for payroll processing."

    );
  } catch (err) {
    console.error("Failed to send email to Payroll:", err);
  }
}

  res.json({
    message: "Sent to Payroll"
  });

};
exports.updateMakerData = (req, res) => {

  workflowData.makerQueue = req.body;

  res.json({
    message: "Saved Successfully"
  });

};
exports.saveHRBPReview = (req, res) => {

  const {
    comments,
    flaggedColumns
  } = req.body;

  console.log("COMMENTS RECEIVED:", comments);

  workflowData.hrbpQueue =
    workflowData.hrbpQueue.map(item => ({
      ...item,
      hrbpComments: comments,
      flaggedColumns
    }));

  console.log(
    "FIRST RECORD AFTER SAVE:",
    workflowData.hrbpQueue[0]
  );

  res.json({
    message: "Review Saved"
  });

};

exports.returnToMaker = async (
  req,
  res
) => {
  console.log(
    "===== RETURN TO MAKER HIT ====="
  );

  console.log(
    "HRBP QUEUE:",
    workflowData.hrbpQueue
  );


  const updatedItems =
    workflowData.hrbpQueue.map(item => ({

      ...item,

      status: "MAKER",

      history: [

        ...(item.history || []),

        {
          action: "Rejected by HRBP",
          user: "HRBP User",
          remarks:
            item.hrbpComments || "",
          timestamp:
            new Date().toLocaleString()
        }

      ]

    }));

  workflowData.makerQueue.push(
    ...updatedItems
  );

  const comments =
    updatedItems[0]?.hrbpComments ||
    "No comments";

  console.log(
  "UPDATED ITEMS:",
  updatedItems[0]
);

console.log(
  "COMMENT SENT:",
  comments
);

  workflowData.hrbpQueue = [];

  const activeModule = updatedItems[0]?.module || "Payroll";
  workflowData.workflowHistory.push({
    action: `Returned Sheet to Maker (${activeModule})`,
    user: "HRBP User",
    remarks: comments,
    timestamp: new Date().toLocaleString()
  });

  const maker =
    getUserByRole("maker");

  if (maker) {
    try {
      await sendEmail(

        maker.email,

        "Payroll Sheet Rejected",

        `The payroll sheet has been returned by HRBP.

Comments:
${comments}`

      );
    } catch (err) {
      console.error("Failed to send rejection email to Maker:", err);
    }
  }

  res.json({
    message:
      "Returned to Maker"
  });

};

exports.returnToHRBP = async (
  req,
  res
) => {

  const updatedItems =
    workflowData.hodQueue.map(item => ({

      ...item,

      status: "HRBP",

      history: [

        ...(item.history || []),

        {
          action: "Rejected by HOD",
          user: "HOD User",
          remarks:
            item.hodComments || "",
          timestamp:
            new Date().toLocaleString()
        }

      ]

    }));

  workflowData.hrbpQueue.push(
    ...updatedItems
  );

  const comments =
    updatedItems[0]?.hodComments ||
    "No comments";

  workflowData.hodQueue = [];

  const activeModule = updatedItems[0]?.module || "Payroll";
  workflowData.workflowHistory.push({
    action: `Returned Sheet to HRBP (${activeModule})`,
    user: "HOD User",
    remarks: comments,
    timestamp: new Date().toLocaleString()
  });

  const hrbp =
    getUserByRole("hrbp");

  if (hrbp) {
    try {
      await sendEmail(

        hrbp.email,

        "Payroll Sheet Returned",

        `The payroll sheet has been returned by HOD.

Comments:
${comments}`

      );
    } catch (err) {
      console.error("Failed to send return email to HRBP:", err);
    }
  }

  res.json({
    message:
      "Returned to HRBP"
  });

};
exports.saveHODReview =
(req,res)=>{

  const { comments } =
    req.body;

  workflowData.hodQueue =
    workflowData.hodQueue.map(
      item => ({

        ...item,

        hodComments:
          comments

      })
    );

  res.json({
    message:
      "HOD Review Saved"
  });

};

exports.getWorkflowHistory = (req, res) => {
  res.json(workflowData.workflowHistory || []);
};
