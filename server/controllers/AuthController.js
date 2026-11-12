const User = require("../models/User");
const { generateJwt } = require("../utils/GenerateToken");
const { ROLES } = require("../constants/Roles");

// --- login -------------------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
//
// Authenticates user with email and password.
// If the email matches ADMIN_EMAIL and no admin user exists yet,
// automatically bootstraps the admin account with the provided password.
const login = async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    const password = req.body.password;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    // -- First-time admin bootstrap ------------------------------------------
    // If this email matches ADMIN_EMAIL and no admin user exists yet, bootstrap one
    if (email === (process.env.ADMIN_EMAIL || "").toLowerCase().trim()) {
      const adminExists = await User.findOne({ role: ROLES.ADMIN });
      if (!adminExists) {
        await User.create({
          email,
          role: ROLES.ADMIN,
          name: "Admin",
          password,
        });
      }
    }

    // -- Find user with password included ------------------------------------
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    if (user.role === ROLES.NONE) {
      return res.status(401).json({
        success: false,
        message: "Your account has been disabled. Contact an admin.",
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Issue JWT
    const token = generateJwt(user._id);

    res.json({
      success: true,
      message: "Logged in successfully.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};

// --- register ----------------------------------------------------------------
// POST /api/auth/register
// Body: { email, password, name }
//
// Creates a new user account with password authentication.
const register = async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    const { password, name } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already registered." });
    }

    // If first admin registering with configured ADMIN_EMAIL
    let role = ROLES.REP;
    if (email === (process.env.ADMIN_EMAIL || "").toLowerCase().trim()) {
      const adminExists = await User.findOne({ role: ROLES.ADMIN });
      if (!adminExists) {
        role = ROLES.ADMIN;
      }
    }

    const user = await User.create({
      email,
      password,
      name: name?.trim() || email.split("@")[0],
      role,
    });

    const token = generateJwt(user._id);

    res.status(201).json({
      success: true,
      message: "Registered successfully.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};

// --- getMe -------------------------------------------------------------------
// GET /api/auth/me  (protected - requires valid JWT)
//
// Returns the currently logged-in user from req.user.
// req.user is already set by the protect middleware.
const getMe = async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const logout = async (req, res) => {
  try {
    // If using cookies, you can clear them here: res.clearCookie("token");
    res.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (err) {
    console.error("logout error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};






module.exports = { login, register, getMe, logout };