
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
  const hrbp =
  getUserByRole("hrbp");

if (hrbp) {

  await sendEmail(

    hrbp.email,

    "Payroll Sheet Awaiting Review",

    "A payroll sheet has been submitted by Business SPOC and is awaiting your review."

  );

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
  const hod =
  getUserByRole("hod");

if (hod) {

  await sendEmail(

    hod.email,

    "Payroll Sheet Awaiting Approval",

    "A payroll sheet is awaiting your approval."

  );

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
  const payroll =
  getUserByRole("payroll");

if (payroll) {

  await sendEmail(

    payroll.email,

    "Payroll Sheet Ready",

    "A payroll sheet has been approved and is ready for payroll processing."

  );

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

  const maker =
    getUserByRole("maker");

  if (maker) {

    await sendEmail(

      maker.email,

      "Payroll Sheet Rejected",

      `The payroll sheet has been returned by HRBP.

Comments:
${comments}`

    );

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

  const hrbp =
    getUserByRole("hrbp");

  if (hrbp) {

    await sendEmail(

      hrbp.email,

      "Payroll Sheet Returned",

      `The payroll sheet has been returned by HOD.

Comments:
${comments}`

    );

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
