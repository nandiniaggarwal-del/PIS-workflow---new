const nodemailer = require("nodemailer");
const dns = require("dns");

const user = process.env.EMAIL_USER || process.env.SENDER_EMAIL;
const pass = process.env.EMAIL_PASS || process.env.SENDER_PASS;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user,
    pass,
  },
  // Force IPv4 to prevent ENETUNREACH network issues on Render cloud containers
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4 }, callback);
  }
});

const sendEmail = async (
  to,
  subject,
  text
) => {
  if (!user || !pass) {
    console.error("SMTP credentials are not configured. Cannot send email.");
    return;
  }
  await transporter.sendMail({
    from: user,
    to,
    subject,
    text,
  });
};

module.exports = {
  sendEmail,
};