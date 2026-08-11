import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import userRoutes from "./routes/userRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import linkedinRoutes from "./routes/linkedinRoutes.js";
import headshotRoutes from "./routes/headshotRoutes.js";
import coachRoutes from "./routes/jobCoachRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import jobInsightsRoutes from "./routes/jobInsightsRoutes.js";
import seekerDashboardRoutes from "./routes/seekerDashboardRoute.js";
import resumeBuilderRoutes from "./routes/resumeBuilderRoutes.js";
import inviteStudentRoutes from "./routes/role-institute/inviteStudent.routes.js";
import inviteCoachRoutes from "./routes/role-institute/inviteCoach.routes.js";
import instituteNpsRoutes from "./routes/role-institute/nps.routes.js";
import seekerNpsRoutes from "./routes/role-seeker/nps.routes.js";
import npsRoutes from "./routes/role-seeker/nps.routes.js";
import instituteProfileRoutes from "./routes/role-institute/profile.routes.js";



import supabase from "./services/supabaseClient.js";

dotenv.config();

const app = express();


// ✅ Allowed Frontend URLs
const allowedOrigins = [
  "http://localhost:3000",
  "https://app.withprevail.com",
];


// ✅ Middlewares
app.use(
  cors({
    origin: function (origin, callback) {

      // Allow requests with no origin (Postman/mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }

    },
    credentials: true,
  })
);

app.use(express.json());


// ✅ Health Check Route
app.get("/", (req, res) => {
  res.status(200).send("Backend running successfully 🚀");
});


// ✅ API Test Route
app.get("/test", (req, res) => {
  res.status(200).send("API working perfectly 🚀");
});


// ✅ Database Test Route
app.get("/test-db", async (req, res) => {

  try {

    const { data, error } = await supabase
      .from("Seeker-profiles")
      .select("*");

    if (error) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  }

});


// ✅ Routes
app.use("/api/user", userRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/headshot", headshotRoutes);
app.use("/api/jobCoach", coachRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/settings",settingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/job-insights", jobInsightsRoutes);
app.use("/api/seeker", seekerDashboardRoutes);
app.use("/api/resume-builder", resumeBuilderRoutes);
app.use("/api/role-institute/student-invitations", inviteStudentRoutes);
app.use("/api/role-institute/coach-invitations", inviteCoachRoutes);
app.use("/api/role-institute/nps", instituteNpsRoutes);
app.use("/api/role-seeker/nps", seekerNpsRoutes);
app.use("/api/role-seeker/nps", npsRoutes);
app.use("/api/role-institute/profile", instituteProfileRoutes);

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});


export default app;