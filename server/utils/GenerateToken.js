const jwt = require("jsonwebtoken");

// Login JWT issued on successful password authentication
const generateJwt = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

module.exports = { generateJwt };