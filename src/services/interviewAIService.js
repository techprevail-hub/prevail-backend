import Groq from "groq-sdk";

// --------------------------------------------------
// Initialize Groq AI
// --------------------------------------------------
const groq = new Groq({
  apiKey:
    process.env.INTERVIEW_GROQ_API_KEY,
});

// --------------------------------------------------
// Generate Single Interview Question
// (Keep this for current controller)
// --------------------------------------------------
export const generateInterviewQuestion =
  async (interviewType) => {
    try {
      if (!interviewType) {
        throw new Error(
          "Interview type is required."
        );
      }

      const completion =
        await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `
You are a professional AI interviewer.

Generate ONLY ONE interview question.

Rules:
- Ask only one question
- Professional
- Beginner friendly
- No answers
`,
            },
            {
              role: "user",
              content: `Generate one ${interviewType} interview question.`,
            },
          ],
          model:
            "llama-3.1-8b-instant",
        });

      const question =
        completion.choices?.[0]
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
// Generate 10 Interview Questions
// (For new interview flow)
// --------------------------------------------------
export const generateInterviewQuestions =
  async (interviewType) => {
    try {
      const completion =
        await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `
Generate exactly 10 unique interview questions.

Rules:
- One question per line
- No numbering
- No answers
- No explanations
`,
            },
            {
              role: "user",
              content: `Generate 10 ${interviewType} interview questions.`,
            },
          ],
          model:
            "llama-3.1-8b-instant",
        });

      const text =
        completion.choices?.[0]
          ?.message?.content;

      if (!text) {
        throw new Error(
          "Failed to generate interview questions."
        );
      }

      const questions = text
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 10);

      return questions;
    } catch (error) {
      console.error(
        "Generate Interview Questions Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to generate interview questions."
      );
    }
  };

// --------------------------------------------------
// Evaluate Single Answer
// --------------------------------------------------
export const evaluateInterviewAnswer =
  async (
    question,
    answer,
    interviewType
  ) => {
    try {
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
            "llama-3.1-8b-instant",
        });

      const feedback =
        completion.choices?.[0]
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

// --------------------------------------------------
// Generate Final Feedback
// --------------------------------------------------
export const generateFinalFeedback =
  async (
    interviewType,
    answers
  ) => {
    try {
      const completion =
        await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `
Evaluate the complete interview.

Return ONLY valid JSON:

{
  "score": 8,
  "feedback": "Overall feedback here"
}

Rules:
- score must be between 1 and 10
- feedback should be professional
- return JSON only
`,
            },
            {
              role: "user",
              content: `
Interview Type:
${interviewType}

Answers:
${JSON.stringify(
  answers,
  null,
  2
)}
`,
            },
          ],
          model:
            "llama-3.1-8b-instant",
        });

      const response =
        completion.choices?.[0]
          ?.message?.content;

      const parsed =
        JSON.parse(response);

      return parsed;
    } catch (error) {
      console.error(
        "Generate Final Feedback Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to generate final feedback."
      );
    }
  };