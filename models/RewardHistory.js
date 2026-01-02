import mongoose from "mongoose";

const rewardHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: [
      'daily_login',
      'quiz_complete',
      'session_complete',
      'achievement',
      'combo_bonus',
      'streak_bonus',
      'speed_bonus',
      'accuracy_bonus',
      'difficulty_bonus',
      'manual',
      'event_bonus'
    ],
    required: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  bonusDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const RewardHistory = mongoose.model("RewardHistory", rewardHistorySchema);

export default RewardHistory;

