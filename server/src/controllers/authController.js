import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, fullname,email, password } = req.body;

  if (!username || !fullname ||!email || !password) {
    return res.status(400).json({ message: "Please include all fields" });
  }

  //Check for existing user
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User already exists with this email" });
  }

  //Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  //Create user
  const user = await User.create({
    username,
    fullname,
    email,
    password: hashedPassword,
    role: req.body.role || 'User'  // Default to User if not specified
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    return res.status(400).json({ message: "Invalid user data" });
  }
});

// @desc    Authenticate user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //Check for user email
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    // Create response object with user data
    const responseData = {
      _id: user._id,
      username: user.username,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      // Add redirect information based on role
      redirectTo: user.role === 'Admin' ? '/admindashboard' : '/dashboard'
    };

    res.json(responseData);
  } else {
    res.status(400).json({ message: "Invalid credentials" });
  }
});

// @desc    Get user details
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const { _id, username, email, role } = await User.findById(req.user.id);
  res.status(200).json({ id: _id, username, email, role });
});

//Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Get admin dashboard data
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getAdminDashboard = asyncHandler(async (req, res) => {
  try {
    // Get all users for admin dashboard
    const users = await User.find({}).select('-password');
    
    res.status(200).json({
      users,
      totalUsers: users.length,
      admins: users.filter(user => user.role === 'Admin').length,
      regularUsers: users.filter(user => user.role === 'User').length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin dashboard data', error: error.message });
  }
});

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const { username, fullname, email, role } = req.body;
  const userId = req.params.id;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Update user fields
  user.username = username || user.username;
  user.fullname = fullname || user.fullname;
  user.email = email || user.email;
  user.role = role || user.role;

  const updatedUser = await user.save();

  res.status(200).json({
    _id: updatedUser._id,
    username: updatedUser.username,
    fullname: updatedUser.fullname,
    email: updatedUser.email,
    role: updatedUser.role
  });
});

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.deleteOne();
  res.status(200).json({ message: 'User removed' });
});

// @desc    Get user dashboard data
// @route   GET /api/dashboard
// @access  Private
const getDashboard = asyncHandler(async (req, res) => {
  // Get user-specific dashboard data
  const user = await User.findById(req.user.id).select('-password');
  
  // You can add more user-specific data here
  res.status(200).json({
    user,
    lastLogin: new Date(),
    // Add other user-specific dashboard data as needed
  });
});

export { 
  registerUser, 
  loginUser, 
  getMe, 
  getAdminDashboard, 
  getDashboard,
  updateUser,
  deleteUser 
};