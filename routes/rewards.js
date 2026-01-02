import express from "express";
import User from "../models/User.js";
import RewardHistory from "../models/RewardHistory.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * Reward System Routes
 * Handles all reward-related operations including points, achievements, and bonuses
 */

// GET /api/rewards/user - Get user's reward summary
router.get("/user", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('achievements.achievementId');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate level
    const calculateLevel = (totalXP) => {
      return Math.floor(Math.sqrt(totalXP / 100)) + 1;
    };

    // Calculate level progress
    const calculateLevelProgress = (totalXP, currentLevel) => {
      const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
      const xpForNextLevel = Math.pow(currentLevel, 2) * 100;
      const xpInCurrentLevel = totalXP - xpForCurrentLevel;
      const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
      return Math.min(xpInCurrentLevel / xpNeededForNext, 1);
    };

    const level = calculateLevel(user.totalXP || 0);
    const levelProgress = calculateLevelProgress(user.totalXP || 0, level);

    // Get reward history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRewards = await RewardHistory.find({
      userId: user._id,
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 }).limit(50);

    res.json({
      totalXP: user.totalXP || 0,
      level,
      levelProgress,
      dailyStreak: user.dailyStreak || 0,
      achievements: user.achievements || [],
      recentRewards: recentRewards.map(r => ({
        amount: r.amount,
        type: r.type,
        description: r.description,
        timestamp: r.createdAt,
      })),
      coins: user.coins || 0,
    });
  } catch (error) {
    console.error("Error fetching user rewards:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/rewards/daily-login - Award daily login bonus
router.post("/daily-login", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastLogin = user.lastLoginReward ? new Date(user.lastLoginReward) : null;
    const lastLoginDate = lastLogin ? new Date(lastLogin.setHours(0, 0, 0, 0)) : null;

    // Check if already claimed today
    if (lastLoginDate && lastLoginDate.getTime() === today.getTime()) {
      return res.json({
        message: "Daily login bonus already claimed today",
        alreadyClaimed: true,
        streak: user.dailyStreak,
      });
    }

    // Check if streak should continue or reset
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = user.dailyStreak || 0;
    let bonusXP = 25; // Base daily login bonus

    if (lastLoginDate) {
      if (lastLoginDate.getTime() === yesterday.getTime()) {
        // Continue streak
        newStreak += 1;
        bonusXP += newStreak * 5; // +5 XP per streak day
      } else if (lastLoginDate.getTime() < yesterday.getTime()) {
        // Streak broken, reset
        newStreak = 1;
      }
      // If logged in today already, streak continues (handled above)
    } else {
      // First login
      newStreak = 1;
    }

    // Update user
    user.totalXP = (user.totalXP || 0) + bonusXP;
    user.dailyStreak = newStreak;
    user.lastLoginReward = new Date();

    // Create reward history entry
    const rewardEntry = new RewardHistory({
      userId: user._id,
      amount: bonusXP,
      type: 'daily_login',
      description: `Daily login bonus (${newStreak} day streak)`,
    });
    await rewardEntry.save();

    await user.save();

    res.json({
      message: "Daily login bonus awarded",
      xpEarned: bonusXP,
      streak: newStreak,
      totalXP: user.totalXP,
    });
  } catch (error) {
    console.error("Error awarding daily login bonus:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/rewards/history - Get user's reward history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const rewards = await RewardHistory.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await RewardHistory.countDocuments({ userId: req.user.id });

    res.json({
      rewards: rewards.map(r => ({
        id: r._id,
        amount: r.amount,
        type: r.type,
        description: r.description,
        timestamp: r.createdAt,
        bonusDetails: r.bonusDetails,
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Error fetching reward history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/rewards/manual - Admin only: Manually award rewards
router.post("/manual", authMiddleware, async (req, res) => {
  try {
    // Check if user is admin (you may want to add admin middleware)
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.userType !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { userId, amount, type, description } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ message: "userId and amount are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Update user XP
    user.totalXP = (user.totalXP || 0) + amount;
    await user.save();

    // Create reward history entry
    const rewardEntry = new RewardHistory({
      userId: user._id,
      amount,
      type: type || 'manual',
      description: description || `Manual reward from admin`,
      bonusDetails: {
        awardedBy: adminUser._id,
        reason: description,
      },
    });
    await rewardEntry.save();

    res.json({
      message: "Reward awarded successfully",
      userXP: user.totalXP,
      reward: {
        amount,
        type: type || 'manual',
        description: description || `Manual reward from admin`,
      },
    });
  } catch (error) {
    console.error("Error awarding manual reward:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

