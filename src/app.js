import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import userRoutes from "./routes/userRoutes.js";
import supabase from "./services/supabaseClient.js";

dotenv.config();

const app = express();

// ✅ USE ENV (NO HARDCODE)
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());


// ✅ Test route
app.get("/test", (req, res) => {
  res.send("API working perfectly 🚀");
});


// ✅ DB test route
app.get("/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase.from("profiles").select("*");

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Routes
app.use("/api/user", userRoutes);


// ✅ Health route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});


export default app;