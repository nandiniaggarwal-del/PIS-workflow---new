require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sendEmail } =
  require("./services/emailService");
const payrollRoutes = require("./routes/payrollRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes =
  require("./routes/authRoutes");
const app = express();
const workflowRoutes =
  require("./routes/workflowRoutes");

app.use(cors());
app.use(express.json());
app.use(
  "/api/auth",
  authRoutes
);

app.use("/api/payroll", payrollRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use(
  "/api/workflow",
  workflowRoutes
);
app.get(
  "/test-email",
  async (req, res) => {

    try {

      await sendEmail(
        "YOUR_PERSONAL_EMAIL@gmail.com",
        "Payroll Workflow Test",
        "Email service is working."
      );

      res.json({
        message:
          "Email sent"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          "Email failed"
      });

    }

  }
);

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});