import cron from 'node-cron';
import QuizSession from '../models/QuizSession.js';
import StudySession from '../models/StudySession.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Model for storing daily analytics reports
const dailyAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  topicMastery: [{
    topic: String,
    averageScore: Number,
    totalAttempts: Number,
    uniqueUsers: Number
  }],
  userActivity: {
    totalSessions: Number,
    totalUsers: Number,
    averageSessionDuration: Number,
    totalXPAwarded: Number
  },
  quizMetrics: {
    totalQuizzes: Number,
    averageScore: Number,
    averageCombo: Number,
    totalQuestions: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const DailyAnalytics = mongoose.model('DailyAnalytics', dailyAnalyticsSchema);

export const calculateDailyReports = async () => {
  try {
    console.log('📊 Starting daily analytics calculation...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate topic mastery for yesterday
    const topicMastery = await QuizSession.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterday, $lt: today }
        }
      },
      {
        $group: {
          _id: "$topic",
          averageScore: { $avg: "$score" },
          totalAttempts: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" }
        }
      },
      {
        $project: {
          topic: "$_id",
          averageScore: 1,
          totalAttempts: 1,
          uniqueUsers: { $size: "$uniqueUsers" }
        }
      }
    ]);

    // Calculate user activity metrics
    const sessionMetrics = await StudySession.aggregate([
      {
        $match: {
          completedAt: { $gte: yesterday, $lt: today }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" },
          averageSessionDuration: { $avg: "$duration" },
          totalXPAwarded: { $sum: "$totalXP" }
        }
      },
      {
        $project: {
          totalSessions: 1,
          totalUsers: { $size: "$uniqueUsers" },
          averageSessionDuration: 1,
          totalXPAwarded: 1
        }
      }
    ]);

    // Calculate quiz metrics
    const quizMetrics = await QuizSession.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterday, $lt: today }
        }
      },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          averageScore: { $avg: "$score" },
          averageCombo: { $avg: "$comboStreak" },
          totalQuestions: { $sum: "$totalQuestions" }
        }
      }
    ]);

    // Create daily report
    const report = new DailyAnalytics({
      date: yesterday,
      topicMastery: topicMastery,
      userActivity: sessionMetrics[0] || {
        totalSessions: 0,
        totalUsers: 0,
        averageSessionDuration: 0,
        totalXPAwarded: 0
      },
      quizMetrics: quizMetrics[0] || {
        totalQuizzes: 0,
        averageScore: 0,
        averageCombo: 0,
        totalQuestions: 0
      }
    });

    await report.save();

    console.log('✅ Daily analytics report generated successfully');
    console.log(`   Date: ${yesterday.toISOString().split('T')[0]}`);
    console.log(`   Total Sessions: ${report.userActivity.totalSessions}`);
    console.log(`   Total Users: ${report.userActivity.totalUsers}`);
    
    return report;
  } catch (error) {
    console.error('❌ Error calculating daily reports:', error);
    throw error;
  }
};

// Schedule cron job to run at midnight every day (0 0 * * *)
export const startAnalyticsCron = () => {
  console.log('⏰ Scheduling daily analytics cron job (runs at midnight)...');
  
  cron.schedule('0 0 * * *', async () => {
    try {
      await calculateDailyReports();
    } catch (error) {
      console.error('Error in analytics cron job:', error);
    }
  });

  console.log('✅ Analytics cron job scheduled successfully');
};

export { DailyAnalytics };

export default {
  calculateDailyReports,
  startAnalyticsCron,
  DailyAnalytics
};

