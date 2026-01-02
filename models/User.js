import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  userType: {
    type: String,
    enum: ['student', 'teacher'],
    required: true
  },
  // Gamification fields
  totalXP: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  dailyStreak: {
    type: Number,
    default: 0
  },
  lastSessionDate: {
    type: Date,
    default: null
  },
  lastLoginReward: {
    type: Date,
    default: null
  },
  coins: {
    type: Number,
    default: 0
  },
  achievements: [{
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Student specific fields
  grade: {
    type: String,
    required: function() { return this.userType === 'student' }
  },
  subjects: [{
    type: String
  }],
  // Teacher specific fields
  qualifications: {
    type: String,
    required: function() { return this.userType === 'teacher' }
  },
  expertise: [{
    type: String
  }],
  // Common fields
  profilePicture: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Hash password before saving
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password function for login
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Method to get user's role-based dashboard
userSchema.methods.getDashboard = function() {
  return this.userType === 'student' ? '/student-dashboard' : '/teacher-dashboard';
};

const User = mongoose.model("User", userSchema);

export default User;
