import express from "express";
import Notification from "../models/notificationModel.js";

const router = express.Router();

// CREATE notification
router.post("/", async (req, res) => {
  try {
    const notif = new Notification(req.body);
    const saved = await notif.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all notifications
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK as read
router.patch("/:id/read", async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
