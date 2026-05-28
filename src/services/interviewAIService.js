import Groq from "groq-sdk";

// --------------------------------------------------
// Initialize Groq AI
// --------------------------------------------------
const groq = new Groq({
  apiKey:
    process.env.INTERVIEW_GROQ_API_KEY,
});

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
      // Generate AI interview question
      // --------------------------------------------------
      const completion =
        await groq.chat.completions.create({
          messages: [
            {
              role: "system",

              content: `
You are a professional AI interviewer helping students and job seekers.

Generate ONLY ONE professional interview question.

Rules:
- Ask only one question
- Beginner friendly
- Professional tone
- Do not provide answers
- Keep the question realistic
`,
            },

            {
              role: "user",

              content: `Generate a ${interviewType} interview question.`,
            },
          ],

          model:
            "llama3-8b-8192",
        });

      // --------------------------------------------------
      // Extract response
      // --------------------------------------------------
      const question =
        completion.choices[0]
          ?.message?.content;

      if (!question) {
        throw new Error(
          "No interview question generated."
        );
      }

      return question;
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
      // Generate AI feedback
      // --------------------------------------------------
      const completion =
        await groq.chat.completions.create({
          messages: [
            {
              role: "system",

              content: `
You are a professional AI interviewer.

Evaluate interview answers professionally.

Return:
1. Score out of 10
2. Feedback
3. Improvement suggestion

Keep the response beginner-friendly and professional.
`,
            },

            {
              role: "user",

              content: `
Interview Type:
${interviewType}

Question:
${question}

Candidate Answer:
${answer}
`,
            },
          ],

          model:
            "llama3-8b-8192",
        });

      // --------------------------------------------------
      // Extract response
      // --------------------------------------------------
      const feedback =
        completion.choices[0]
          ?.message?.content;

      if (!feedback) {
        throw new Error(
          "No feedback generated."
        );
      }

      return feedback;
    } catch (error) {
      console.error(
        "Evaluate Interview Answer Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to evaluate interview answer."
      );
    }
  };