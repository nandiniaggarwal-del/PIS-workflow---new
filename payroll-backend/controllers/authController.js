const users =
  require("../data/users");

const otpStore =
  require("../data/otpStore");

const {
  sendEmail,
} = require("../services/emailService");
exports.sendOTP =
  async (req, res) => {

    const { email } =
      req.body;
    console.log("EMAIL RECEIVED:", email);

    console.log("USERS:", users);

    const user =
      users.find(
        u =>
          u.email.toLowerCase() ===
          email.toLowerCase()
      );

    if (!user) {

      return res.status(401).json({
        message:
          "Email not authorised"
      });

    }

    const otp =
      Math.floor(
        100000 +
        Math.random() * 900000
      ).toString();

    otpStore[email] = otp;

    await sendEmail(
      email,
      "Payroll Login OTP",
      `Your OTP is ${otp}`
    );

    res.json({
      message:
        "OTP sent"
    });

};
exports.verifyOTP =
(req,res)=>{

  const {
    email,
    otp,
  } = req.body;

  const storedOTP =
    otpStore[email];

  if(
    !storedOTP ||
    storedOTP !== otp
  ){

    return res.status(401).json({
      message:
      "Invalid OTP"
    });

  }

  delete otpStore[email];

  const user =
    users.find(
      u =>
      u.email === email
    );

  res.json({

    success:true,

    email:user.email,

    role:user.role

  });

};