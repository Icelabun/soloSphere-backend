import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Achievement from '../models/Achievement.js';
import QuizQuestion from '../models/QuizQuestion.js';

dotenv.config();

const seedAchievements = async () => {
  const achievements = [
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

  await Achievement.deleteMany({});
  const created = await Achievement.insertMany(achievements);
  console.log(`✅ Seeded ${created.length} achievements`);
};

const seedQuizQuestions = async () => {
  const questions = [
    // Math Questions
    {
      topic: "math",
      difficulty: "easy",
      question: "What is 15 × 12?",
      answers: [
        { text: "180", isCorrect: true },
        { text: "170", isCorrect: false },
        { text: "190", isCorrect: false },
        { text: "175", isCorrect: false }
      ],
      correctAnswer: "180",
      explanation: "15 × 12 = 180"
    },
    {
      topic: "math",
      difficulty: "easy",
      question: "What is the value of π (pi) rounded to 2 decimal places?",
      answers: [
        { text: "3.14", isCorrect: true },
        { text: "3.41", isCorrect: false },
        { text: "3.12", isCorrect: false },
        { text: "3.16", isCorrect: false }
      ],
      correctAnswer: "3.14",
      explanation: "π (pi) ≈ 3.14159..."
    },
    {
      topic: "math",
      difficulty: "medium",
      question: "What is the square root of 144?",
      answers: [
        { text: "12", isCorrect: true },
        { text: "14", isCorrect: false },
        { text: "10", isCorrect: false },
        { text: "16", isCorrect: false }
      ],
      correctAnswer: "12",
      explanation: "√144 = 12 because 12² = 144"
    },
    // Science Questions
    {
      topic: "science",
      difficulty: "easy",
      question: "What is the chemical symbol for water?",
      answers: [
        { text: "H2O", isCorrect: true },
        { text: "O2", isCorrect: false },
        { text: "CO2", isCorrect: false },
        { text: "H2", isCorrect: false }
      ],
      correctAnswer: "H2O",
      explanation: "Water is composed of 2 hydrogen atoms and 1 oxygen atom"
    },
    {
      topic: "science",
      difficulty: "easy",
      question: "What planet is known as the Red Planet?",
      answers: [
        { text: "Mars", isCorrect: true },
        { text: "Venus", isCorrect: false },
        { text: "Jupiter", isCorrect: false },
        { text: "Saturn", isCorrect: false }
      ],
      correctAnswer: "Mars",
      explanation: "Mars appears red due to iron oxide on its surface"
    },
    {
      topic: "science",
      difficulty: "medium",
      question: "What is the speed of light in vacuum?",
      answers: [
        { text: "299,792,458 m/s", isCorrect: true },
        { text: "150,000,000 m/s", isCorrect: false },
        { text: "300,000 m/s", isCorrect: false },
        { text: "186,000 m/s", isCorrect: false }
      ],
      correctAnswer: "299,792,458 m/s",
      explanation: "The speed of light in vacuum is approximately 299,792,458 meters per second"
    },
    // History Questions
    {
      topic: "history",
      difficulty: "medium",
      question: "In which year did World War II end?",
      answers: [
        { text: "1945", isCorrect: true },
        { text: "1944", isCorrect: false },
        { text: "1946", isCorrect: false },
        { text: "1943", isCorrect: false }
      ],
      correctAnswer: "1945",
      explanation: "World War II ended in 1945"
    },
    {
      topic: "history",
      difficulty: "easy",
      question: "Who was the first President of the United States?",
      answers: [
        { text: "George Washington", isCorrect: true },
        { text: "Thomas Jefferson", isCorrect: false },
        { text: "Abraham Lincoln", isCorrect: false },
        { text: "John Adams", isCorrect: false }
      ],
      correctAnswer: "George Washington",
      explanation: "George Washington served as the first U.S. President from 1789 to 1797"
    },
    // Programming Questions
    {
      topic: "programming",
      difficulty: "easy",
      question: "What does HTML stand for?",
      answers: [
        { text: "HyperText Markup Language", isCorrect: true },
        { text: "High Tech Modern Language", isCorrect: false },
        { text: "Home Tool Markup Language", isCorrect: false },
        { text: "Hyperlinks and Text Markup Language", isCorrect: false }
      ],
      correctAnswer: "HyperText Markup Language",
      explanation: "HTML stands for HyperText Markup Language"
    },
    {
      topic: "programming",
      difficulty: "medium",
      question: "Which programming language is known as the 'language of the web'?",
      answers: [
        { text: "JavaScript", isCorrect: true },
        { text: "Python", isCorrect: false },
        { text: "Java", isCorrect: false },
        { text: "C++", isCorrect: false }
      ],
      correctAnswer: "JavaScript",
      explanation: "JavaScript is commonly referred to as the language of the web"
    }
  ];

  await QuizQuestion.deleteMany({});
  const created = await QuizQuestion.insertMany(questions);
  console.log(`✅ Seeded ${created.length} quiz questions`);
};

const seedAll = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Seed data
    await seedAchievements();
    await seedQuizQuestions();

    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedAll();

