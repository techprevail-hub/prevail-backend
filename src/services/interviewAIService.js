import { GoogleGenerativeAI } from "@google/generative-ai";

// --------------------------------------------------
// Initialize Gemini AI
// --------------------------------------------------
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

// --------------------------------------------------
// Generate First Interview Question
// --------------------------------------------------
export const generateInterviewQuestion =
  async (interviewType) => {
    try {
      // --------------------------------------------------
      // Validate input
      // --------------------------------------------------
      if (!interviewType) {
        throw new Error(
          "Interview type is required."
        );
      }

      // --------------------------------------------------
      // Gemini model
      // --------------------------------------------------
      const model =
        genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
        });

      // --------------------------------------------------
      // AI Prompt
      // --------------------------------------------------
      const prompt = `
You are a professional AI interviewer helping students and job seekers.

Generate ONLY ONE interview question for a ${interviewType} interview.

Rules:
- Ask only one question
- Beginner friendly
- Professional
- Do not provide answer
`;

      // --------------------------------------------------
      // Generate content
      // --------------------------------------------------
      const result =
        await model.generateContent(
          prompt
        );

      // --------------------------------------------------
      // Extract response safely
      // --------------------------------------------------
      const response =
        result?.response?.text();

      if (!response) {
        throw new Error(
          "No AI response generated."
        );
      }

      return response;
    } catch (error) {
      console.error(
        "Generate Interview Question Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to generate interview question."
      );
    }
  };

// --------------------------------------------------
// Evaluate Interview Answer
// --------------------------------------------------
export const evaluateInterviewAnswer =
  async (
    question,
    answer,
    interviewType
  ) => {
    try {
      // --------------------------------------------------
      // Gemini model
      // --------------------------------------------------
      const model =
        genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
        });

      // --------------------------------------------------
      // AI Prompt
      // --------------------------------------------------
      const prompt = `
You are a professional AI interviewer.

Interview Type:
${interviewType}

Question:
${question}

Candidate Answer:
${answer}

Evaluate the answer professionally.

Return:
1. Score out of 10
2. Short feedback
3. One improvement suggestion
`;

      // --------------------------------------------------
      // Generate content
      // --------------------------------------------------
      const result =
        await model.generateContent(
          prompt
        );

      // --------------------------------------------------
      // Extract response
      // --------------------------------------------------
      const response =
        result?.response?.text();

      if (!response) {
        throw new Error(
          "No AI feedback generated."
        );
      }

      return response;
    } catch (error) {
      console.error(
        "Evaluate Answer Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to evaluate answer."
      );
    }
  };