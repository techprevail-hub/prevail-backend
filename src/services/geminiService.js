import { GoogleGenerativeAI } from "@google/generative-ai";

export const analyzeResumeWithAI = async (resumeText) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
Return ONLY valid JSON in this format:
{
  "score": 85,
  "atsScore": 90,
  "skills": ["JavaScript", "Node.js"],
  "strengths": ["Strong technical skills"],
  "weaknesses": ["Missing quantified achievements"],
  "suggestions": ["Add measurable results"],
  "recommendedKeywords": ["REST API", "Docker"],
  "summary": "Well-structured and ATS-friendly resume."
}

Resume:
${(resumeText || "").slice(0, 12000)}
`;

  const result = await model.generateContent(prompt);
  const rawText = result.response.text();

  const cleanedText = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleanedText);
};