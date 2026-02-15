import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/userModel.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  res.json(req.user);
});

router.put('/update', protect, async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.username = req.body.username || user.username;
  user.fullname = req.body.fullname || user.fullname;
  user.email = req.body.email || user.email;

  const updatedUser = await user.save();
  res.json(updatedUser);
});

export default router;
