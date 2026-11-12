const express = require("express");
const rateLimit = require("express-rate-limit");
const { login, register, getMe, logout } = require("../controllers/AuthController");
const { protect, authorize } = require("../middlewares/AuthMiddleware");
const { ROLES } = require("../constants/Roles");

const router = express.Router();

// Rate limiter to prevent brute force password attempts (max 15 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
});

// -- Public routes ------------------------------------------------------------
router.post("/login", loginLimiter, login);
router.post("/register", register);

// -- Protected routes ---------------------------------------------------------
// Returns the currently logged-in user (any valid role)
router.get("/me", protect, getMe);

// Role check verification test route
router.get("/admin-test", protect, authorize(ROLES.ADMIN), (req, res) => {
  res.json({ success: true, message: `Hello admin ${req.user.email}! Role check passed.` });
});

// logout
router.post("/logout", protect, logout);

module.exports = router;