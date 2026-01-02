import express from "express";
import User from "../models/User.js";
import StudySession from "../models/StudySession.js";
import UserActivity from "../models/UserActivity.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Helper function to check if dates are consecutive days
const isNextDay = (lastDate, currentDate) => {
  if (!lastDate) return false;
  
  const last = new Date(lastDate);
  const current = new Date(currentDate);
  
  // Reset hours to compare just dates
  last.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  
  const diffTime = current - last;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays === 1;
};

// POST /api/session/session-complete - Handle session completion with rewards
router.post("/session-complete", authMiddleware, async (req, res) => {
  try {
    const {
      dungeonName,
      difficulty,
      duration,
      baseXP,
      bonusXP,
      comboStreak,
      wasSuccessful
    } = req.body;

    const userId = req.user.id;

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate total XP with combo bonus
    const comboBonus = comboStreak ? comboStreak * 10 : 0;
    const totalXP = baseXP + (bonusXP || 0) + comboBonus;

    // Check and update daily streak
    const today = new Date();
    const isConsecutive = isNextDay(user.lastSessionDate, today);
    const newStreak = isConsecutive ? user.dailyStreak + 1 : 1;

    // Calculate new level based on XP
    const newTotalXP = user.totalXP + totalXP;
    const newLevel = Math.floor(Math.sqrt(newTotalXP / 100)) + 1;

    // Update user stats atomically
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { totalXP: totalXP },
        $set: {
          dailyStreak: newStreak,
          lastSessionDate: today,
          level: newLevel
        }
      },
      { new: true }
    );

    // Save study session record
    const session = new StudySession({
      userId,
      dungeonName,
      difficulty,
      duration,
      baseXP,
      bonusXP: bonusXP + comboBonus,
      totalXP,
      wasSuccessful,
      startedAt: new Date(Date.now() - duration * 1000),
      completedAt: today
    });

    await session.save();

    // Log user activity
    await UserActivity.create({
      userId,
      activityType: 'session_complete',
      description: `Completed ${dungeonName} (${difficulty})`,
      metadata: {
        dungeonName,
        difficulty,
        duration,
        xpGained: totalXP
      }
    });

    res.json({
      message: "Session completed successfully",
      rewards: {
        xpGained: totalXP,
        newTotalXP: updatedUser.totalXP,
        newLevel: updatedUser.level,
        leveledUp: newLevel > user.level,
        dailyStreak: updatedUser.dailyStreak,
        streakIncreased: newStreak > user.dailyStreak
      },
      session
    });
  } catch (error) {
    console.error("Error completing session:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/session/history - Get user's session history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const sessions = await StudySession.find({ userId })
      .sort({ completedAt: -1 })
      .limit(limit);

    res.json({ sessions });
  } catch (error) {
    console.error("Error fetching session history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/session/stats - Get user's session statistics
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await StudySession.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
          totalXP: { $sum: "$totalXP" },
          successfulSessions: {
            $sum: { $cond: ["$wasSuccessful", 1, 0] }
          }
        }
      }
    ]);

    res.json({ stats: stats[0] || {} });
  } catch (error) {
    console.error("Error fetching session stats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

