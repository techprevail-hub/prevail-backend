import { GoogleGenerativeAI } from "@google/generative-ai";

// --------------------------------------------------
// Initialize Gemini AI
// --------------------------------------------------
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

// --------------------------------------------------
// Generate AI Coach Response
// --------------------------------------------------
export const generateCoachResponse =
  async (message) => {
    try {
      // --------------------------------------------------
      // Gemini model
      // --------------------------------------------------
      const model =
        genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
        });

      // --------------------------------------------------
      // Combined AI Career Coach Prompt
      // --------------------------------------------------
      const systemPrompt = `
You are an AI Career Coach helping students and job seekers.

Help users with:
- learning roadmap
- coding guidance
- project ideas
- internships
- interview preparation
- resume improvement
- LinkedIn optimization
- career growth
- job preparation
- skill development
- salary guidance
- productivity and motivation

Provide clear, practical, beginner-friendly, and professional guidance.
Always give step-by-step suggestions whenever possible.
`;

      // --------------------------------------------------
      // Generate response
      // --------------------------------------------------
      const result =
        await model.generateContent(
          `${systemPrompt}\n\nUser Question: ${message}`
        );

      const response =
        result.response.text();

      return response;
    } catch (error) {
      console.error(
        "Coach AI Error:",
        error
      );

      throw new Error(
        "Failed to generate AI response."
      );
    }
  };