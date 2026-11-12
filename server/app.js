require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Stop early with a clear message if something is missing in .env
const required = ["MONGO_URI", "CLIENT_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();

// Trust reverse-proxy headers (Render, Railway, Nginx) so express-rate-limit gets real client IPs
app.set("trust proxy", 1);

const allowedOrigins = process.env.CLIENT_URL.split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server, health checks, or CLI requests with no Origin header
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "GoatLeads API is running" });
});
app.use("/api/auth",      require("./routes/AuthRoutes"));
app.use("/api/leads",     require("./routes/LeadRoutes"));
app.use("/api/dashboard", require("./routes/DashboardRoutes"));
app.use("/api/tasks",     require("./routes/TaskRoutes"));
app.use("/api/team",      require("./routes/TeamRoutes"));

const { initTaskReminderJob } = require("./jobs/TaskReminderJob");

// Unknown route
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Any error we did not catch
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.message === "Not allowed by CORS" ? 403 : 500;
  res.status(status).json({
    success: false,
    message: status === 403 ? "CORS origin not allowed" : "Server error",
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  initTaskReminderJob();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
