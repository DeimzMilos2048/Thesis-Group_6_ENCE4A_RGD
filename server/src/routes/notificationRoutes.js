import express from "express";
import Notification from "../models/notificationModel.js";

const router = express.Router();

// GET unread count (useful for mobile badges)
// PUT THIS BEFORE the general GET route to avoid conflicts
router.get("/unread/count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all notifications WITH FILTERING (combined into one route)
router.get("/", async (req, res) => {
  try {
    const { isRead, type, limit = 50 } = req.query;
    
    const filter = {};
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (type) filter.type = type;
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
      
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// MARK ALL as read
router.patch("/read-all", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { isRead: false },
      { isRead: true }
    );
    res.json({ modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// MARK single notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE old notifications (optional cleanup)
router.delete("/cleanup", async (req, res) => {
  try {
    const daysAgo = parseInt(req.query.days) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true
    });
    
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE single notification
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Notification.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    res.json({ message: "Notification deleted", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;