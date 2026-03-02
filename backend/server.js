// backend/server.js - STREAMLINED FOR DEVELOPMENT

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIO = require("socket.io");

// Load env variables
dotenv.config();

// Import database connection
const connectDB = require("./config/db");

// Import routes
const authRoutes = require("./routes/auth");
const listingRoutes = require("./routes/listings");
const chatRoutes = require("./routes/chat");
const userRoutes = require("./routes/users");
const notificationRoutes = require("./routes/notifications");
const analyticsRoutes = require("./routes/analytics");
const qrRoutes = require("./routes/qr");
const impactRoutes = require("./routes/impact");
const ratingRoutes = require("./routes/ratings");
const aiMatchingRoutes = require("./routes/aiMatching");
const scheduleRoutes = require("./routes/schedules");
const reportRoutes = require("./routes/reports");
const wasteAnalysisRoutes = require("./routes/wasteAnalysis");
const chatbotRoutes = require("./routes/chatbot");
const routeOptimizationRoutes = require("./routes/routeOptimization");
const queueRoutes = require("./routes/queue");
const adminRoutes = require("./routes/admin");
const centersRoutes = require("./routes/centers");
const verificationOTPRoutes = require("./routes/verificationOTP");
const ecoRoutes = require("./routes/ecoRoutes");
const mapRoutes = require("./routes/mapRoutes");
const pickupRoutes = require("./routes/pickupRoutes");
const configRoutes = require("./routes/config");

// Import socket handler
const socketHandler = require("./socket/socketHandler");

// Import error handler
const errorHandler = require("./middleware/errorHandler");

const { initScheduleCronJobs } = require("./utils/scheduleCron");
const { setIO: setQueueIO } = require("./utils/queueCronJob");

const app = express();
const server = http.createServer(app);

// ============================================
// CORS Configuration
// ============================================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://172.250.36.214:8081",
  "http://172.250.36.214:19000",
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("⚠️ CORS blocked origin:", origin);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ============================================
// Middleware
// ============================================

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Simple logging middleware for development
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// Socket.IO Setup
// ============================================

const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize socket handlers
socketHandler(io);
initScheduleCronJobs(io);
setQueueIO(io);

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ============================================
// Routes
// ============================================

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "LifeLoop API is running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      listings: "/api/listings",
      chat: "/api/chat",
      users: "/api/users",
      notifications: "/api/notifications",
      analytics: "/api/analytics",
      qr: "/api/qr",
      impact: "/api/impact",
      ratings: "/api/ratings",
      schedules: "/api/schedules",
      reports: "/api/reports",
      wasteAnalysis: "/api/waste-analysis",
      chatbot: "/api/chatbot",
      routes: "/api/routes",
      queue: "/api/queue",
      admin: "/api/admin",
      centers: "/api/centers",
      verify: "/api/verify",
      eco: "/api/eco",
      map: "/api/map",
      pickup: "/api/pickup",
    },
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/impact", impactRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api", aiMatchingRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/waste-analysis", wasteAnalysisRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/routes", routeOptimizationRoutes);
app.use("/api/health", require("./routes/health"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/queue", queueRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/centers", centersRoutes);
app.use("/api/sms", require("./routes/sms"));
app.use("/api/verify", verificationOTPRoutes);
app.use("/api/eco", ecoRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/pickup", pickupRoutes);
app.use("/api/config", configRoutes);

// ============================================
// Error Handling
// ============================================

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    server.listen(PORT, "0.0.0.0", () => {
      console.log("");
      console.log("╔═══════════════════════════════════════════╗");
      console.log("║       🚀 LIFELOOP SERVER RUNNING         ║");
      console.log("╚═══════════════════════════════════════════╝");
      console.log("");
      console.log(`✅ Server:        http://localhost:${PORT}`);
      console.log(`✅ Environment:   ${process.env.NODE_ENV || "development"}`);
      console.log(`✅ Socket.IO:     Enabled`);
      console.log("");
      console.log("Press Ctrl+C to stop");
      console.log("");
    });

    // Graceful shutdown — free port on SIGINT/SIGTERM so nodemon restarts cleanly
    const shutdown = () => {
      console.log("\n🛑 Shutting down gracefully...");
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 3000);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();

module.exports = { app, io, server };
