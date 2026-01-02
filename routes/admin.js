import express from "express";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import UserActivity from "../models/UserActivity.js";
import adminAuth from "../middleware/adminAuth.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// POST /api/admin/login - Admin login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Create JWT token
    const payload = {
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name
      },
      isAdmin: true
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    res.json({
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/admin/dashboard - Get dashboard stats
router.get("/dashboard", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMessages = await Message.countDocuments();
    const recentActivities = await UserActivity.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      stats: {
        totalUsers,
        totalMessages,
        recentActivities
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/admin/users - Get all users
router.get("/users", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments();

    // Get online status (users who logged in within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const onlineUserIds = await UserActivity.distinct('userId', {
      activityType: 'login',
      timestamp: { $gte: thirtyMinutesAgo }
    });

    const usersWithStatus = users.map(user => ({
      ...user,
      isOnline: onlineUserIds.some(id => id.toString() === user._id.toString())
    }));

    res.json({
      users: usersWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/admin/activities - Get user activities
router.get("/activities", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    const activityType = req.query.type;

    const query = {};
    if (activityType) {
      query.activityType = activityType;
    }

    const activities = await UserActivity.find(query)
      .populate('userId', 'username email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await UserActivity.countDocuments(query);

    res.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/admin/messages - Get all messages
router.get("/messages", adminAuth, async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('from', 'name email')
      .populate('to', 'username email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/admin/messages - Send message to user(s)
router.post("/messages", adminAuth, async (req, res) => {
  try {
    const { to, subject, content, isAnnouncement } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ message: "Subject and content are required" });
    }

    const adminId = req.admin.admin.id;

    if (isAnnouncement) {
      // Send to all users
      const allUsers = await User.find().select('_id');
      const messages = allUsers.map(user => ({
        from: new mongoose.Types.ObjectId(adminId),
        to: user._id,
        subject,
        content,
        isAnnouncement: true
      }));

      const created = await Message.insertMany(messages);
      return res.json({
        message: `Announcement sent to ${created.length} users`,
        count: created.length
      });
    } else {
      // Send to specific user(s)
      if (!to || (Array.isArray(to) && to.length === 0)) {
        return res.status(400).json({ message: "At least one recipient is required" });
      }

      const userIds = Array.isArray(to) ? to : [to];
      
      // Convert to ObjectIds and filter invalid ones
      const validUserIds = userIds
        .filter(id => id)
        .map(id => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch (e) {
            return null;
          }
        })
        .filter(id => id !== null);
      
      if (validUserIds.length === 0) {
        return res.status(400).json({ message: "No valid users selected" });
      }
      
      const users = await User.find({ _id: { $in: validUserIds } });
      if (users.length !== validUserIds.length) {
        return res.status(400).json({ message: "Some users not found" });
      }

      const messages = validUserIds.map(userId => ({
        from: new mongoose.Types.ObjectId(adminId),
        to: userId,
        subject,
        content,
        isAnnouncement: false
      }));

      const created = await Message.insertMany(messages);
      res.json({
        message: `Message sent to ${created.length} user(s)`,
        messages: created
      });
    }
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/admin/online-users - Get currently online users
router.get("/online-users", adminAuth, async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const onlineUserIds = await UserActivity.distinct('userId', {
      activityType: 'login',
      timestamp: { $gte: thirtyMinutesAgo }
    });

    const onlineUsers = await User.find({ _id: { $in: onlineUserIds } })
      .select('username email lastLogin createdAt')
      .lean();

    res.json({ onlineUsers, count: onlineUsers.length });
  } catch (error) {
    console.error("Get online users error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

