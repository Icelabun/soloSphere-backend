import express from "express";
import Achievement from "../models/Achievement.js";
import User from "../models/User.js";
import StudySession from "../models/StudySession.js";
import QuizSession from "../models/QuizSession.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// GET /api/achievements - Get all available achievements
router.get("/", async (req, res) => {
  try {
    const achievements = await Achievement.find().sort({ threshold: 1 });
    res.json({ achievements });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/achievements/user - Get user's unlocked achievements
router.get("/user", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('achievements.achievementId');
    res.json({ achievements: user.achievements || [] });
  } catch (error) {
    console.error("Error fetching user achievements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/achievements/check - Check and unlock achievements for user
router.post("/check", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all achievements
    const allAchievements = await Achievement.find();
    
    // Get user's already unlocked achievement IDs
    const unlockedIds = user.achievements.map(a => a.achievementId.toString());

    // Get user stats
    const studySessionCount = await StudySession.countDocuments({ userId, wasSuccessful: true });
    const quizSessionStats = await QuizSession.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          maxCombo: { $max: "$comboStreak" },
          maxScore: { $max: "$score" }
        }
      }
    ]);

    const maxCombo = quizSessionStats[0]?.maxCombo || 0;
    const maxScore = quizSessionStats[0]?.maxScore || 0;

    const newlyUnlocked = [];

    // Check each achievement
    for (const achievement of allAchievements) {
      // Skip if already unlocked
      if (unlockedIds.includes(achievement._id.toString())) {
        continue;
      }

      let shouldUnlock = false;

      switch (achievement.condition) {
        case 'streak':
          shouldUnlock = user.dailyStreak >= achievement.threshold;
          break;
        case 'sessions':
          shouldUnlock = studySessionCount >= achievement.threshold;
          break;
        case 'xp':
          shouldUnlock = user.totalXP >= achievement.threshold;
          break;
        case 'combo':
          shouldUnlock = maxCombo >= achievement.threshold;
          break;
        case 'quiz_score':
          shouldUnlock = maxScore >= achievement.threshold;
          break;
      }

      if (shouldUnlock) {
        newlyUnlocked.push({
          achievementId: achievement._id,
          unlockedAt: new Date()
        });

        // Award XP for achievement
        if (achievement.xpReward > 0) {
          user.totalXP += achievement.xpReward;
        }
      }
    }

    // Update user with newly unlocked achievements
    if (newlyUnlocked.length > 0) {
      user.achievements.push(...newlyUnlocked);
      await user.save();

      // Populate achievement details
      await user.populate('achievements.achievementId');
    }

    res.json({
      message: `${newlyUnlocked.length} new achievement(s) unlocked`,
      newlyUnlocked: newlyUnlocked.length,
      achievements: user.achievements
    });
  } catch (error) {
    console.error("Error checking achievements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/achievements/seed - Seed initial achievements (dev/admin only)
router.post("/seed", async (req, res) => {
  try {
    const defaultAchievements = [
      {
        name: "First Steps",
        description: "Complete your first study session",
        icon: "🎯",
        condition: "sessions",
        threshold: 1,
        xpReward: 50,
        tier: "bronze"
      },
      {
        name: "Dedicated Student",
        description: "Complete 10 study sessions",
        icon: "📚",
        condition: "sessions",
        threshold: 10,
        xpReward: 200,
        tier: "silver"
      },
      {
        name: "Study Master",
        description: "Complete 50 study sessions",
        icon: "🏆",
        condition: "sessions",
        threshold: 50,
        xpReward: 1000,
        tier: "gold"
      },
      {
        name: "Streak Beginner",
        description: "Maintain a 3-day study streak",
        icon: "🔥",
        condition: "streak",
        threshold: 3,
        xpReward: 100,
        tier: "bronze"
      },
      {
        name: "Streak Warrior",
        description: "Maintain a 7-day study streak",
        icon: "⚡",
        condition: "streak",
        threshold: 7,
        xpReward: 300,
        tier: "silver"
      },
      {
        name: "Streak Legend",
        description: "Maintain a 30-day study streak",
        icon: "💎",
        condition: "streak",
        threshold: 30,
        xpReward: 1500,
        tier: "platinum"
      },
      {
        name: "Combo Starter",
        description: "Achieve a 5-question combo streak",
        icon: "🎯",
        condition: "combo",
        threshold: 5,
        xpReward: 100,
        tier: "bronze"
      },
      {
        name: "Combo Expert",
        description: "Achieve a 10-question combo streak",
        icon: "🌟",
        condition: "combo",
        threshold: 10,
        xpReward: 300,
        tier: "gold"
      },
      {
        name: "XP Collector",
        description: "Earn 1000 total XP",
        icon: "💰",
        condition: "xp",
        threshold: 1000,
        xpReward: 200,
        tier: "silver"
      },
      {
        name: "XP Master",
        description: "Earn 10000 total XP",
        icon: "👑",
        condition: "xp",
        threshold: 10000,
        xpReward: 2000,
        tier: "platinum"
      }
    ];

    // Remove existing achievements
    await Achievement.deleteMany({});

    // Insert new achievements
    const created = await Achievement.insertMany(defaultAchievements);

    res.json({
      message: "Achievements seeded successfully",
      count: created.length,
      achievements: created
    });
  } catch (error) {
    console.error("Error seeding achievements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

