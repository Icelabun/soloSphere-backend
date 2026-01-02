import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏆'
  },
  condition: {
    type: String,
    enum: ['streak', 'sessions', 'xp', 'quiz_score', 'combo'],
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  xpReward: {
    type: Number,
    default: 0
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Achievement = mongoose.model("Achievement", achievementSchema);

export default Achievement;

