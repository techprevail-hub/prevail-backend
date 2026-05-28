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

Generate ONE professional interview question for a ${interviewType} interview.

Rules:
- Ask only ONE question
- Keep it realistic
- Beginner-friendly
- Professional tone
- Do not provide answers
`;

      // --------------------------------------------------
      // Generate AI response
      // --------------------------------------------------
      const result =
        await model.generateContent(
          prompt
        );

      const response =
        result.response.text();

      return response;
    } catch (error) {
      console.error(
        "Generate Question Error:",
        error
      );

      throw new Error(
        "Failed to generate interview question."
      );
    }
  };

// --------------------------------------------------
// Evaluate User Answer
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
You are an AI interviewer.

Interview Type:
${interviewType}

Question:
${question}

User Answer:
${answer}

Evaluate the answer professionally.

Return:
1. Score out of 10
2. Short feedback
3. One improvement suggestion
4. Next interview question

Format response clearly.
`;

      // --------------------------------------------------
      // Generate AI response
      // --------------------------------------------------
      const result =
        await model.generateContent(
          prompt
        );

      const response =
        result.response.text();

      return response;
    } catch (error) {
      console.error(
        "Evaluate Answer Error:",
        error
      );

      throw new Error(
        "Failed to evaluate answer."
      );
    }
  };