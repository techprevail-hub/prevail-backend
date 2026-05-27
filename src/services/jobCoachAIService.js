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
      // Validate message
      // --------------------------------------------------
      if (!message) {
        throw new Error(
          "Message is required."
        );
      }

      // --------------------------------------------------
      // Gemini model
      // --------------------------------------------------
      const model =
        genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
        });

      // --------------------------------------------------
      // AI Prompt
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
      // Generate AI response
      // --------------------------------------------------
      const result =
        await model.generateContent(
          `${systemPrompt}

User Question:
${message}`
        );

      // --------------------------------------------------
      // Extract response
      // --------------------------------------------------
      const response =
        result.response.text();

      return response;
    } catch (error) {
      console.error(
        "Coach AI Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to generate AI response."
      );
    }
  };