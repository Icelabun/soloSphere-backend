import redis from '../config/redis.js';
import QuizSession from '../models/QuizSession.js';
import StudySession from '../models/StudySession.js';

// Cache popular quizzes
export const getPopularQuizzes = async () => {
  try {
    // Try to get from cache first
    const cached = await redis.get('popular_quizzes');
    if (cached) {
      console.log('📦 Returning cached popular quizzes');
      return JSON.parse(cached);
    }

    console.log('🔍 Fetching popular quizzes from database');
    
    // Get from database
    const quizzes = await QuizSession.aggregate([
      {
        $group: {
          _id: "$topic",
          attemptCount: { $sum: 1 },
          averageScore: { $avg: "$score" },
          totalXP: { $sum: "$xpEarned" }
        }
      },
      { $sort: { attemptCount: -1 } },
      { $limit: 10 }
    ]);

    // Cache for 1 hour (3600 seconds)
    await redis.set('popular_quizzes', JSON.stringify(quizzes), 'EX', 3600);

    return quizzes;
  } catch (error) {
    console.error('Error getting popular quizzes:', error);
    
    // Fallback to database without caching
    const quizzes = await QuizSession.aggregate([
      {
        $group: {
          _id: "$topic",
          attemptCount: { $sum: 1 },
          averageScore: { $avg: "$score" },
          totalXP: { $sum: "$xpEarned" }
        }
      },
      { $sort: { attemptCount: -1 } },
      { $limit: 10 }
    ]);
    
    return quizzes;
  }
};

// Cache user stats
export const getUserStats = async (userId) => {
  try {
    const cacheKey = `user_stats:${userId}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`📦 Returning cached stats for user ${userId}`);
      return JSON.parse(cached);
    }

    console.log(`🔍 Fetching stats for user ${userId} from database`);

    // Fetch from database
    const stats = await StudySession.aggregate([
      { $match: { userId } },
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

    const userStats = stats[0] || {};

    // Cache for 5 minutes (300 seconds)
    await redis.set(cacheKey, JSON.stringify(userStats), 'EX', 300);

    return userStats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    
    // Fallback to database
    const stats = await StudySession.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
          totalXP: { $sum: "$totalXP" }
        }
      }
    ]);
    
    return stats[0] || {};
  }
};

// Invalidate user stats cache
export const invalidateUserStatsCache = async (userId) => {
  try {
    const cacheKey = `user_stats:${userId}`;
    await redis.del(cacheKey);
    console.log(`🗑️  Invalidated cache for user ${userId}`);
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
};

// Invalidate popular quizzes cache
export const invalidatePopularQuizzesCache = async () => {
  try {
    await redis.del('popular_quizzes');
    console.log('🗑️  Invalidated popular quizzes cache');
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
};

export default {
  getPopularQuizzes,
  getUserStats,
  invalidateUserStatsCache,
  invalidatePopularQuizzesCache
};

