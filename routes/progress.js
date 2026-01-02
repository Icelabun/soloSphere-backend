import express from "express";
import User from "../models/User.js";
import StudySession from "../models/StudySession.js";
import QuizSession from "../models/QuizSession.js";
import UserActivity from "../models/UserActivity.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// GET /api/progress/summary - Get user's progress summary (daily, weekly, monthly)
router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    
    // Calculate date ranges
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    // Aggregate daily progress
    const dailySessions = await StudySession.aggregate([
      {
        $match: {
          userId: userId,
          completedAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          timeSpent: { $sum: "$duration" },
          sessionsCompleted: { $sum: 1 },
          xpEarned: { $sum: "$totalXP" }
        }
      }
    ]);

    const dailyQuizzes = await QuizSession.aggregate([
      {
        $match: {
          userId: userId,
          completedAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          quizzesCompleted: { $sum: 1 },
          xpEarned: { $sum: "$xpEarned" }
        }
      }
    ]);

    // Aggregate weekly progress
    const weeklySessions = await StudySession.aggregate([
      {
        $match: {
          userId: userId,
          completedAt: { $gte: weekAgo }
        }
      },
      {
        $group: {
          _id: null,
          timeSpent: { $sum: "$duration" },
          sessionsCompleted: { $sum: 1 },
          xpEarned: { $sum: "$totalXP" }
        }
      }
    ]);

    const weeklyQuizzes = await QuizSession.aggregate([
      {
        $match: {
          userId: userId,
          completedAt: { $gte: weekAgo }
        }
      },
      {
        $group: {
          _id: null,
          quizzesCompleted: { $sum: 1 },
          xpEarned: { $sum: "$xpEarned" }
        }
      }
    ]);

    // Aggregate monthly progress
    const monthlySessions = await StudySession.aggregate([
      {
        $match: {
          userId: userId,
          completedAt: { $gte: monthAgo }
        }
      },
      {
        $group: {
          _id: null,
          timeSpent: { $sum: "$duration" },
          sessionsCompleted: { $sum: 1 },
          xpEarned: { $sum: "$totalXP" }
        }
      }
    ]);

    const monthlyQuizzes = await QuizSession.aggregate([
      {
        $match: {
          userId: userId,
          completedAt: { $gte: monthAgo }
        }
      },
      {
        $group: {
          _id: null,
          quizzesCompleted: { $sum: 1 },
          xpEarned: { $sum: "$xpEarned" }
        }
      }
    ]);

    // Combine results
    const daily = dailySessions[0] || { timeSpent: 0, sessionsCompleted: 0, xpEarned: 0 };
    const dailyQuiz = dailyQuizzes[0] || { quizzesCompleted: 0, xpEarned: 0 };
    const weekly = weeklySessions[0] || { timeSpent: 0, sessionsCompleted: 0, xpEarned: 0 };
    const weeklyQuiz = weeklyQuizzes[0] || { quizzesCompleted: 0, xpEarned: 0 };
    const monthly = monthlySessions[0] || { timeSpent: 0, sessionsCompleted: 0, xpEarned: 0 };
    const monthlyQuiz = monthlyQuizzes[0] || { quizzesCompleted: 0, xpEarned: 0 };

    res.json({
      daily: {
        timeSpent: daily.timeSpent || 0,
        goalsCompleted: (daily.sessionsCompleted || 0) + (dailyQuiz.quizzesCompleted || 0),
        xpEarned: (daily.xpEarned || 0) + (dailyQuiz.xpEarned || 0),
        sessionsCompleted: daily.sessionsCompleted || 0,
      },
      weekly: {
        timeSpent: weekly.timeSpent || 0,
        goalsCompleted: (weekly.sessionsCompleted || 0) + (weeklyQuiz.quizzesCompleted || 0),
        xpEarned: (weekly.xpEarned || 0) + (weeklyQuiz.xpEarned || 0),
        sessionsCompleted: weekly.sessionsCompleted || 0,
      },
      monthly: {
        timeSpent: monthly.timeSpent || 0,
        goalsCompleted: (monthly.sessionsCompleted || 0) + (monthlyQuiz.quizzesCompleted || 0),
        xpEarned: (monthly.xpEarned || 0) + (monthlyQuiz.xpEarned || 0),
        sessionsCompleted: monthly.sessionsCompleted || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching progress summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/progress/recent - Get recent activities
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const activities = await UserActivity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ activities });
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/progress/sync - Sync frontend state with backend
router.post("/sync", authMiddleware, async (req, res) => {
  try {
    const { totalXP, level, dailyStreak, totalStudyTime } = req.body;
    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          totalXP,
          level,
          dailyStreak,
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Progress synced successfully", user });
  } catch (error) {
    console.error("Error syncing progress:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

