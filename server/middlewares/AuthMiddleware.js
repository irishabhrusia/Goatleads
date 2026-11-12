const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ROLES } = require("../constants/Roles");

// --- protect ----------------------------------------------------------------
// This middleware runs before any protected route.
// It reads the JWT from the "Authorization: Bearer <token>" header,
// verifies it, loads the user from the database, and puts it in req.user
// so the next middleware or controller can use it.
const protect = async (req, res, next) => {
  try {
    // 1. Pull the raw header value
    const authHeader = req.headers.authorization;

    // 2. Make sure it starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided. Please log in." });
    }

    // 3. Grab the token part after "Bearer "
    const token = authHeader.split(" ")[1];

    // 4. Verify the token with our secret (HS256 is the default algorithm)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
    } catch (err) {
      // Expired tokens get a specific, friendly message
      const message =
        err.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid token. Please log in.";
      return res.status(401).json({ success: false, message });
    }

    // 5. Load the user from the database using the id stored inside the token
    //    We explicitly exclude the token hash fields (they have select:false anyway)
    const user = await User.findById(decoded.id).select("-password");

    // 6. User was deleted after the token was issued
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists." });
    }

    // 7. A user with role "none" is disabled — deny access
    if (user.role === ROLES.NONE) {
      return res.status(401).json({
        success: false,
        message: "Your account has been disabled. Contact an admin.",
      });
    }

    // 8. Everything is fine — attach the user to the request object
    req.user = user;

    // 9. Pass control to the next middleware or controller
    next();
  } catch (err) {
    // Catch any unexpected errors (e.g. database is down)
    console.error("protect middleware error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// --- authorize --------------------------------------------------------------
// This is a role guard. You call it AFTER protect like:
//   router.get("/admin-test", protect, authorize(ROLES.ADMIN), handler)
//
// It accepts a list of allowed roles and returns a middleware function.
// If the logged-in user's role is NOT in that list, it returns 403 Forbidden.
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
