import fs from "fs";
import supabase from "../services/supabaseClient.js";
import { analyzeResumeWithAI } from "../services/geminiService.js";

export const uploadResume = async (req, res) => {
  let filePath = null;

  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required.",
      });
    }

    // Store uploaded file path
    filePath = req.file.path;

    // ------------------------------------------------------------------
    // Temporary extracted text
    // ------------------------------------------------------------------
    // Later, you can replace this with actual PDF/DOCX parsing logic.
    const extractedText = `
      Resume File: ${req.file.originalname}

      Skills: JavaScript, TypeScript, Node.js, Express.js, MongoDB, React, Next.js

      Projects:
      - ParentEye
      - ePolice
      - Prevail

      Experience:
      - Software Development Intern

      Education:
      - Bachelor of Engineering
    `;

    // ------------------------------------------------------------------
    // Call Gemini AI to analyze the resume
    // ------------------------------------------------------------------
    let analysis;

    try {
      analysis = await analyzeResumeWithAI(extractedText);
      console.log("AI Analysis:", analysis);
    } catch (aiError) {
      console.error("AI Analysis Error:", aiError);

      return res.status(500).json({
        success: false,
        message: "Failed to analyze resume using AI.",
        error: aiError.message,
      });
    }

    // Get authenticated user ID if available
    const userId = req.user?.id || null;

    // ------------------------------------------------------------------
    // Save to Supabase (table name: resume)
    // ------------------------------------------------------------------
    let savedData = null;

    try {
      const { data, error } = await supabase
        .from("resume")
        .insert([
          {
            user_id: userId,
            file_name: req.file.originalname,
            extracted_text: extractedText,

            // AI-generated fields
            score: analysis.score || 0,
            ats_score: analysis.atsScore || 0,
            skills: analysis.skills || [],
            suggestions: analysis.suggestions || [],
            strengths: analysis.strengths || [],
            weaknesses: analysis.weaknesses || [],
            recommended_keywords: analysis.recommendedKeywords || [],
            ai_summary: analysis.summary || "",
            ai_generated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error.message);

        return res.status(500).json({
          success: false,
          message: "Failed to save resume analysis to database.",
          error: error.message,
        });
      }

      savedData = data;
      console.log("Resume analysis saved successfully.");
    } catch (dbError) {
      console.error("Database save error:", dbError.message);

      return res.status(500).json({
        success: false,
        message: "Database save error.",
        error: dbError.message,
      });
    }

    // ------------------------------------------------------------------
    // Return response to frontend
    // ------------------------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "Resume analyzed successfully.",
      data: {
        id: savedData.id,
        fileName: req.file.originalname,
        extractedText,

        // AI Analysis Results
        score: analysis.score || 0,
        atsScore: analysis.atsScore || 0,
        skills: analysis.skills || [],
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        suggestions: analysis.suggestions || [],
        recommendedKeywords: analysis.recommendedKeywords || [],
        summary: analysis.summary || "",
        aiGeneratedAt: savedData.ai_generated_at,
      },
    });
  } catch (error) {
    console.error("Resume upload error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  } finally {
    // Delete uploaded file after processing
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};