// backend/server.js - STREAMLINED FOR DEVELOPMENT

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIO = require("socket.io");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

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
const routeOptimizationRoutes = require("./routes/routeOptimization");
const queueRoutes = require("./routes/queue");
const adminRoutes = require("./routes/admin");
const centersRoutes = require("./routes/centers");
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

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ============================================
// Security Middleware
// ============================================

// Sets the standard defensive response headers (HSTS, no-sniff, frame-deny, and so
// on). crossOriginResourcePolicy is relaxed because Cloudinary-hosted images are
// loaded cross-origin by the mobile client.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(compression());

// Behind a reverse proxy (Render, Railway, nginx) the client IP arrives in
// X-Forwarded-For. Without this the rate limiter keys every request to the proxy's
// address and throttles all users as one.
if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

// ============================================
// CORS Configuration
// ============================================

// Comma-separated list, so deployment targets are configured rather than hardcoded.
// The previous hardcoded LAN address broke whenever the network changed.
const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  process.env.CLIENT_URL,
  // Local web development only; never trusted in production.
  ...(IS_PRODUCTION
    ? []
    : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]),
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // React Native and curl send no Origin header. CORS is a browser mechanism, so
    // there is nothing to enforce here — the request is still gated by auth.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Previously this branch called callback(null, true), which allowed every
    // origin in every environment and made the allowlist decorative.
    console.warn(`⚠️ CORS rejected origin: ${origin}`);

    // Tagged 403 so the error handler reports a client error. A bare Error here
    // surfaces as 500, which blames the server for the caller's mistake.
    const error = new Error("Origin not allowed");
    error.statusCode = 403;
    return callback(error);
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

// 10mb accommodates base64-encoded scan images.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// morgan was already a dependency but unused. "combined" is the parseable format
// production log collectors expect; "dev" stays readable in a terminal.
app.use(morgan(IS_PRODUCTION ? "combined" : "dev"));

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
      routes: "/api/routes",
      queue: "/api/queue",
      admin: "/api/admin",
      centers: "/api/centers",
      eco: "/api/eco",
      map: "/api/map",
      pickup: "/api/pickup",
    },
  });
});

// ============================================
// Rate Limiting
// ============================================

// A blanket ceiling on the whole API. Cheap protection against a script hammering
// any endpoint. /health is exempt so uptime probes are never throttled.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path.startsWith("/api/health"),
  message: { success: false, message: "Too many requests. Please try again later." },
});

// Credential endpoints get a much tighter budget: the general ceiling is far too
// generous to slow down password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count toward the limit
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

app.use("/api", apiLimiter);

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
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
app.use("/api/routes", routeOptimizationRoutes);
app.use("/api/health", require("./routes/health"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/queue", queueRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/centers", centersRoutes);
app.use("/api/eco", ecoRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/pickup", pickupRoutes);
app.use("/api/config", configRoutes);

// ============================================
// Error Handling
// ============================================

// Order matters: the 404 catch-all must run before the error handler. Express
// resolves error middleware by position, so a handler registered ahead of the
// catch-all is skipped for anything the catch-all itself passes along.

// 404 handler — no route matched
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

// Error handler must be last. It reports stack traces only outside production.
app.use(errorHandler);

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
