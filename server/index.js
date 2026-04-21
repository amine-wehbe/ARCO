// Express server entry point — mounts all routes and starts the server
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes   = require("./routes/auth");
const scoreRoutes  = require("./routes/scores");
const userRoutes   = require("./routes/users");
const adminRoutes  = require("./routes/admin");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://dmlg1bi4iczn7.cloudfront.net",
  ],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Health check
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.use("/auth",   authRoutes);
app.use("/scores", scoreRoutes);
app.use("/users",  userRoutes);
app.use("/admin",  adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ARCO server running on http://localhost:${PORT}`));
