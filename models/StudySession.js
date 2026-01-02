import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  dungeonName: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['E-Rank', 'D-Rank', 'C-Rank', 'B-Rank', 'A-Rank', 'S-Rank'],
    required: true
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  baseXP: {
    type: Number,
    required: true
  },
  bonusXP: {
    type: Number,
    default: 0
  },
  totalXP: {
    type: Number,
    required: true
  },
  wasSuccessful: {
    type: Boolean,
    default: true
  },
  startedAt: {
    type: Date,
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const StudySession = mongoose.model("StudySession", studySessionSchema);

export default StudySession;

