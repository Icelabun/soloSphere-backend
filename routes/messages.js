import express from "express";
import Message from "../models/Message.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// GET /api/messages - Get user's messages
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({ to: userId })
      .populate('from', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const unreadCount = messages.filter(m => !m.isRead).length;

    res.json({
      messages,
      unreadCount
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /api/messages/:id/read - Mark message as read
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    const message = await Message.findOne({ _id: messageId, to: userId });
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.json({ message: "Message marked as read", message });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

