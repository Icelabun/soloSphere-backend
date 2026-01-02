import express from "express";
import QuizQuestion from "../models/QuizQuestion.js";
import QuizSession from "../models/QuizSession.js";
import UserActivity from "../models/UserActivity.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Fallback static quiz questions
const fallbackQuestions = {
  math: [
    {
      question: "What is 15 × 12?",
      answers: [
        { text: "180", isCorrect: true },
        { text: "170", isCorrect: false },
        { text: "190", isCorrect: false },
        { text: "175", isCorrect: false }
      ],
      correctAnswer: "180",
      difficulty: "easy",
      explanation: "15 × 12 = 180"
    },
    {
      question: "What is the value of π (pi) rounded to 2 decimal places?",
      answers: [
        { text: "3.14", isCorrect: true },
        { text: "3.41", isCorrect: false },
        { text: "3.12", isCorrect: false },
        { text: "3.16", isCorrect: false }
      ],
      correctAnswer: "3.14",
      difficulty: "easy",
      explanation: "π (pi) ≈ 3.14159..."
    }
  ],
  science: [
    {
      question: "What is the chemical symbol for water?",
      answers: [
        { text: "H2O", isCorrect: true },
        { text: "O2", isCorrect: false },
        { text: "CO2", isCorrect: false },
        { text: "H2", isCorrect: false }
      ],
      correctAnswer: "H2O",
      difficulty: "easy",
      explanation: "Water is composed of 2 hydrogen atoms and 1 oxygen atom"
    },
    {
      question: "What planet is known as the Red Planet?",
      answers: [
        { text: "Mars", isCorrect: true },
        { text: "Venus", isCorrect: false },
        { text: "Jupiter", isCorrect: false },
        { text: "Saturn", isCorrect: false }
      ],
      correctAnswer: "Mars",
      difficulty: "easy",
      explanation: "Mars appears red due to iron oxide on its surface"
    }
  ],
  history: [
    {
      question: "In which year did World War II end?",
      answers: [
        { text: "1945", isCorrect: true },
        { text: "1944", isCorrect: false },
        { text: "1946", isCorrect: false },
        { text: "1943", isCorrect: false }
      ],
      correctAnswer: "1945",
      difficulty: "medium",
      explanation: "World War II ended in 1945"
    }
  ],
  programming: [
    {
      question: "What does HTML stand for?",
      answers: [
        { text: "HyperText Markup Language", isCorrect: true },
        { text: "High Tech Modern Language", isCorrect: false },
        { text: "Home Tool Markup Language", isCorrect: false },
        { text: "Hyperlinks and Text Markup Language", isCorrect: false }
      ],
      correctAnswer: "HyperText Markup Language",
      difficulty: "easy",
      explanation: "HTML stands for HyperText Markup Language"
    }
  ]
};

// GET /api/quiz/question - Get a random question by topic and difficulty (no-repeat logic)
router.get("/question", authMiddleware, async (req, res) => {
  try {
    const { topic, difficulty, excludeIds } = req.query;

    if (!topic) {
      return res.status(400).json({ message: "Topic is required" });
    }

    // Parse excludeIds if provided (array of question IDs already used)
    const excludeArray = excludeIds 
      ? (Array.isArray(excludeIds) ? excludeIds : excludeIds.split(','))
      : [];

    // Try to get from database first
    let question = null;
    let availableQuestions = [];
    
    try {
      // Find questions matching topic and difficulty, excluding used ones
      const query = { topic, difficulty };
      if (excludeArray.length > 0) {
        query._id = { $nin: excludeArray };
      }
      
      availableQuestions = await QuizQuestion.find(query);
      
      if (availableQuestions.length > 0) {
        // Randomly select from available questions
        question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      }
    } catch (dbError) {
      console.log("Database query failed, using fallback");
    }

    // Fallback to static questions
    if (!question) {
      const topicQuestions = fallbackQuestions[topic.toLowerCase()];
      if (topicQuestions && topicQuestions.length > 0) {
        // Filter out already used fallback questions
        let availableFallbacks = topicQuestions;
        if (excludeArray.length > 0) {
          // For fallback questions, we use timestamp-based IDs, so we can't reliably exclude
          // Just provide a random one from the available pool
          availableFallbacks = topicQuestions;
        }
        
        const fallback = availableFallbacks[Math.floor(Math.random() * availableFallbacks.length)];
        question = {
          _id: 'fallback-' + Date.now() + '-' + Math.random(),
          topic,
          difficulty: difficulty || fallback.difficulty,
          question: fallback.question,
          answers: fallback.answers,
          correctAnswer: fallback.correctAnswer,
          explanation: fallback.explanation
        };
      } else {
        return res.status(404).json({ message: "No questions found for this topic" });
      }
    }

    res.json(question);
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/quiz/complete - Complete a quiz and get rewards (simplified endpoint)
router.post("/complete", authMiddleware, async (req, res) => {
  try {
    const { score, totalQuestions, accuracy, comboStreak, xpEarned } = req.body;
    const userId = req.user.id;

    // Update user XP
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { totalXP: xpEarned || 0 } },
      { new: true }
    );

    // Log user activity
    await UserActivity.create({
      userId,
      activityType: 'quiz_complete',
      description: `Completed quiz - Score: ${score}/${totalQuestions} (${accuracy?.toFixed(1) || 0}%)`,
      metadata: {
        score,
        totalQuestions,
        accuracy,
        comboStreak,
        xpEarned: xpEarned || 0,
      }
    });

    res.json({
      message: "Quiz completed successfully",
      rewards: {
        xpEarned: xpEarned || 0,
        newTotalXP: updatedUser.totalXP,
      }
    });
  } catch (error) {
    console.error("Error completing quiz:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/quiz/session - Save quiz session results
router.post("/session", authMiddleware, async (req, res) => {
  try {
    const { 
      topic, 
      difficulty, 
      questions, 
      score, 
      totalQuestions, 
      comboStreak, 
      xpEarned,
      hintsUsed,
      avgTimeToAnswer,
      duration
    } = req.body;

    const session = new QuizSession({
      userId: req.user.id,
      topic,
      difficulty,
      questions,
      score,
      totalQuestions,
      comboStreak,
      xpEarned,
      hintsUsed: hintsUsed || 0,
      avgTimeToAnswer: avgTimeToAnswer || 0,
      duration: duration || 0
    });

    await session.save();

    // Log user activity
    await UserActivity.create({
      userId: req.user.id,
      activityType: 'quiz_complete',
      description: `Completed quiz: ${topic} (${difficulty}) - Score: ${score}/${totalQuestions}`,
      metadata: {
        topic,
        difficulty,
        score,
        totalQuestions,
        comboStreak,
        xpEarned
      }
    });

    res.status(201).json({
      message: "Quiz session saved successfully",
      session
    });
  } catch (error) {
    console.error("Error saving quiz session:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/quiz/topics - Get available quiz topics
router.get("/topics", async (req, res) => {
  try {
    const topics = Object.keys(fallbackQuestions);
    res.json({ topics });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

