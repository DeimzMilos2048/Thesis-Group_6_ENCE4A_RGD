import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";

// @desc    Get logged-in user's profile
// @route   GET /api/profile
// @access  Private (User)
const getProfile = asyncHandler(async (req, res) => {
  res.json(req.user); // req.user already attached by protect middleware
});

// @desc    Update logged-in user's profile
// @route   PUT /api/profile/update
// @access  Private (User)
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.username = req.body.username || user.username;
  user.fullname = req.body.fullname || user.fullname;
  user.email = req.body.email || user.email;
  user.avatar = req.body.avatar || user.avatar;

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    username: updatedUser.username,
    fullname: updatedUser.fullname,
    email: updatedUser.email,
    avatar: updatedUser.avatar,
    role: updatedUser.role,
  });
});

export { getProfile, updateProfile };
