import express from "express";
import mongoose from "mongoose";
import apiRoutes from "./routes/api.js";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'http://127.0.0.1:3000', 
    'http://127.0.0.1:5173',
    'http://192.168.18.45:3000',
    'http://192.168.18.45:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("API is working");
});
app.use("/api", apiRoutes);

// Global error handler middleware
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  // Handle MongoDB connection errors
  if (
    error.name === "MongoServerSelectionError" ||
    error.name === "MongoNetworkError" ||
    error.message.includes("buffering timed out")
  ) {
    return res.status(503).json({
      error: "Database connection error. Please try again later.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }

  // Handle Mongoose validation errors
  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation error",
      details: Object.values(error.errors).map((err) => err.message),
    });
  }

  // Handle other errors
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// MongoDB Connection with production-ready options
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI || "mongodb://localhost:27017/pharmacy-chain";

    // Production-ready connection options (only supported options)
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      retryWrites: true,
      w: "majority",
      bufferCommands: false, // Disable mongoose buffering
    };

    await mongoose.connect(mongoURI, options);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit process with failure
  }
};

// MongoDB connection event listeners
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected from MongoDB");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed through app termination");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
});

// Connect to MongoDB before starting server
connectDB()
  .then(() => {
    // Start Server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
