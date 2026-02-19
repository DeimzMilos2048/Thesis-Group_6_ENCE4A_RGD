import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";

// Protect routes - verify token and attach user to request
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Validate token format
      if (!token || token.length < 10) {
        return res.status(401).json({ message: "Invalid token format" });
      }

      // Verify token - no fallback in production
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error("JWT_SECRET environment variable is not set");
        return res.status(500).json({ message: "Server configuration error" });
      }

      const decoded = jwt.verify(token, jwtSecret);

      // Get user from token and attach to request
      const user = await User.findById(decoded.id).select("-password");
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Authentication error:", error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: "Invalid token" });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Token expired" });
      }
      if (error.name === 'NotBeforeError') {
        return res.status(401).json({ message: "Token not active" });
      }
      return res.status(401).json({ message: "Authentication failed" });
    }
  } else {
    return res.status(401).json({ message: "No token provided" });
  }
});

// Admin middleware - verify user is an admin
const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as admin" });
  }
});

export { protect, admin };