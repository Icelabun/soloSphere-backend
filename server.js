import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import quizRoutes from "./routes/quiz.js";
import sessionRoutes from "./routes/session.js";
import achievementsRoutes from "./routes/achievements.js";
import rewardRoutes from "./routes/rewards.js";
import adminRoutes from "./routes/admin.js";
import messagesRoutes from "./routes/messages.js";
import progressRoutes from "./routes/progress.js";
import { startAnalyticsCron } from "./cronJobs/analyticsProcessor.js";

dotenv.config();
const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ["https://solosphere-1.onrender.com", "http://localhost:5001"];

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join group room for real-time updates
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`👥 User ${socket.id} joined group ${groupId}`);
    socket.to(groupId).emit('userJoined', { socketId: socket.id, groupId });
  });

  // Leave group room
  socket.on('leaveGroup', (groupId) => {
    socket.leave(groupId);
    console.log(`👋 User ${socket.id} left group ${groupId}`);
    socket.to(groupId).emit('userLeft', { socketId: socket.id, groupId });
  });

  // Handle chat messages
  socket.on('chatMessage', (data) => {
    console.log(`💬 Chat message in group ${data.groupId}:`, data.message);
    io.to(data.groupId).emit('newMessage', {
      userId: data.userId,
      username: data.username,
      message: data.message,
      timestamp: new Date()
    });
  });

  // Handle session synchronization
  socket.on('sessionUpdate', (data) => {
    console.log(`🔄 Session update in group ${data.groupId}`);
    socket.to(data.groupId).emit('sessionSync', {
      userId: data.userId,
      sessionData: data.sessionData,
      timestamp: new Date()
    });
  });

  // Quiz real-time monitoring events
  socket.on('quizSessionStart', (data) => {
    console.log(`📝 Quiz session started:`, data.sessionId);
    // Notify admins (socket doesn't need to join, admins listen in their own room)
    io.to('admin_quiz_monitor').emit('quizSessionStarted', {
      ...data,
      timestamp: new Date()
    });
  });

  socket.on('quizProgress', (data) => {
    // Broadcast progress to admin dashboard
    io.to('admin_quiz_monitor').emit('quizProgressUpdate', {
      ...data,
      timestamp: new Date()
    });
  });

  socket.on('quizAnswer', (data) => {
    // Broadcast answer updates to admin dashboard
    io.to('admin_quiz_monitor').emit('quizAnswerUpdate', {
      ...data,
      timestamp: new Date()
    });
  });

  socket.on('quizSessionComplete', (data) => {
    console.log(`✅ Quiz session completed:`, data.sessionId);
    // Notify admins
    io.to('admin_quiz_monitor').emit('quizSessionCompleted', {
      ...data,
      timestamp: new Date()
    });
    // Leave admin room
    socket.leave('admin_quiz_monitor');
  });

  socket.on('quizSessionEnd', (data) => {
    console.log(`🛑 Quiz session ended:`, data.sessionId);
    io.to('admin_quiz_monitor').emit('quizSessionEnded', {
      ...data,
      timestamp: new Date()
    });
    socket.leave('admin_quiz_monitor');
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(express.json());
app.use(cors({
  origin: corsOrigins, // Use environment variable or default to localhost
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(async () => {
  console.log("\n✅ MongoDB Connected");
  const { host, port, name } = mongoose.connection;
  console.log(`📊 Database Details: Host: ${host}, Port: ${port}, Database: ${name}`);
  
  // Initialize default admin account
  try {
    const Admin = (await import('./models/Admin.js')).default;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@studysphere.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin2025!';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';
    
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = new Admin({
        email: adminEmail,
        password: adminPassword,
        name: adminName
      });
      await admin.save();
      console.log(`✅ Default admin account created (${adminEmail})`);
    } else {
      // Check if password needs updating by comparing with bcrypt
      const isMatch = await existingAdmin.comparePassword(adminPassword);
      if (!isMatch) {
        // Password doesn't match, update it
        existingAdmin.password = adminPassword; // Will be re-hashed by pre-save hook
        existingAdmin.name = adminName;
        await existingAdmin.save();
        console.log(`✅ Admin password updated for ${adminEmail}`);
      } else {
        console.log(`✅ Admin account exists and password matches (${adminEmail})`);
      }
    }
  } catch (error) {
    console.error('⚠️  Could not initialize admin account:', error.message);
  }
})
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to StudySphere API' });
});

app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/achievements", achievementsRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/progress", progressRoutes);

// Start analytics cron job
startAnalyticsCron();

// Start the Server
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for real-time connections`);
});
