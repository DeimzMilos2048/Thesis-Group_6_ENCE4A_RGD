const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

// @desc    Save FCM token for a user
// @route   POST /api/fcm/token
// @access  Private
const saveFCMToken = asyncHandler(async (req, res) => {
  try {
    const { userId, fcmToken, platform } = req.body;

    // Validate input
    if (!userId || !fcmToken || !platform) {
      return res.status(400).json({ message: 'Missing required fields: userId, fcmToken, platform' });
    }

    // Find user to verify they exist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user's FCM token
    user.fcmToken = fcmToken;
    user.fcmPlatform = platform;
    user.lastActive = new Date();
    
    await user.save();

    console.log(`FCM token saved for user ${userId}:`, fcmToken);

    res.status(200).json({ 
      message: 'FCM token saved successfully',
      userId: userId,
      platform: platform
    });

  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = { saveFCMToken };
