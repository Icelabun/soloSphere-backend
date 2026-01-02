const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  category: { type: String, enum: ['Study', 'Break', 'Self-Care', 'Other'], default: 'Study' },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  pomodoroCount: { type: Number, default: 0 },
  streakDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema); 