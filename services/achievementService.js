import Achievement from '../models/Achievement.js';
import User from '../models/User.js';
import StudySession from '../models/StudySession.js';
import QuizSession from '../models/QuizSession.js';

export const checkAchievements = async (userId, newStats) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get all achievements
    const allAchievements = await Achievement.find();
    
    // Get user's already unlocked achievement IDs
    const unlockedIds = user.achievements.map(a => a.achievementId.toString());

    // Get detailed user stats
    const studySessionCount = await StudySession.countDocuments({ 
      userId, 
      wasSuccessful: true 
    });

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
          shouldUnlock = (newStats.dailyStreak || user.dailyStreak) >= achievement.threshold;
          break;
        case 'sessions':
          shouldUnlock = studySessionCount >= achievement.threshold;
          break;
        case 'xp':
          shouldUnlock = (newStats.totalXP || user.totalXP) >= achievement.threshold;
          break;
        case 'combo':
          shouldUnlock = maxCombo >= achievement.threshold;
          break;
        case 'quiz_score':
          shouldUnlock = maxScore >= achievement.threshold;
          break;
      }

      if (shouldUnlock) {
        const unlockedAchievement = {
          achievementId: achievement._id,
          unlockedAt: new Date(),
          achievement: achievement // Include full achievement object
        };
        
        newlyUnlocked.push(unlockedAchievement);

        // Add to user's achievements
        user.achievements.push({
          achievementId: achievement._id,
          unlockedAt: new Date()
        });

        // Award XP for achievement
        if (achievement.xpReward > 0) {
          user.totalXP += achievement.xpReward;
        }
      }
    }

    // Save user if new achievements were unlocked
    if (newlyUnlocked.length > 0) {
      await user.save();
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    throw error;
  }
};

export const getUnlockedAchievements = async (userId) => {
  try {
    const user = await User.findById(userId).populate('achievements.achievementId');
    return user.achievements || [];
  } catch (error) {
    console.error('Error getting unlocked achievements:', error);
    throw error;
  }
};

export default {
  checkAchievements,
  getUnlockedAchievements
};

