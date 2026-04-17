/**
 * backend/logger.js
 * ─────────────────────────────────────────────────────────────────
 * NSTCrypto — Structured Application Logger
 * CN6035 — Nishan Sapkota
 *
 * Uses Winston for structured, levelled logging.
 * Logs are written to:
 *   • Console (coloured, human-readable in development)
 *   • logs/error.log   (error level only)
 *   • logs/combined.log (all levels)
 *
 * Log levels used:
 *   logger.error()  — unhandled exceptions, 500 errors
 *   logger.warn()   — 404s, bad input, rate limit hits
 *   logger.info()   — server start, successful blockchain queries
 *   logger.http()   — morgan HTTP request lines
 *   logger.debug()  — verbose chain lookup details (dev only)
 * ─────────────────────────────────────────────────────────────────
 */

const winston = require("winston");
const path    = require("path");
const fs      = require("fs");

// Ensure logs/ directory exists
const LOG_DIR = path.join(__dirname, "..", "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ── Custom log format ─────────────────────────────────────────
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return stack
      ? `[${timestamp}] [${level.toUpperCase()}] ${message}\n${stack}`
      : `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  })
);

// ── Console format (coloured) ─────────────────────────────────
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// ── Logger instance ───────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "http",
  transports: [
    // Console — always on
    new winston.transports.Console({ format: consoleFormat }),

    // File: errors only
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      format: logFormat,
      maxsize:  5 * 1024 * 1024, // 5 MB
      maxFiles: 3,
    }),

    // File: all levels
    new winston.transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      format: logFormat,
      maxsize:  10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
  ],
});

module.exports = logger;
