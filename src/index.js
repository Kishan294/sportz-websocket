import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { matchRouter } from "./routes/matches.js";
import http from "http";
import { attachWebSocketServer } from "./ws/server.js";

// Load environment variables
dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

// --- SECURITY MIDDLEWARE ---
// 1. Helmet helps secure Express apps by setting various HTTP headers.
app.use(helmet());

// 2. CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || "*",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 3. Rate Limiting to prevent brute-force attacks/DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/", limiter);

// --- UTILITY MIDDLEWARE ---
// 4. Request logging
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined")); // Standard Apache combined log format
}

// 5. Body parsers
app.use(express.json({ limit: "10kb" })); // Limit body size for security
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// --- ROUTES ---

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use("/matches", matchRouter);

// --- ERROR HANDLING ---

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot find ${req.originalUrl} on this server!`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal Server Error",
    // Only show stack trace in development
    stack: NODE_ENV === "development" ? err.stack : undefined,
  });
});

const { broadcastMatchCreated } = attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;

// --- SERVER INITIALIZATION ---

const socketServer = server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`
  🚀 Server is running in ${NODE_ENV} mode
  🔗 URL: ${baseUrl}
  🏥 Health: http://localhost:${PORT}/health
  `);
  console.log(
    `WebSocket server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});

// --- GRACEFUL SHUTDOWN ---
// Handle unhandled rejections and exceptions
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  socketServer.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.info("SIGTERM received. Shutting down gracefully...");
  socketServer.close(() => {
    console.log("Process terminated.");
  });
});
