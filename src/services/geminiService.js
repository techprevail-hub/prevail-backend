import { GoogleGenerativeAI } from "@google/generative-ai";

export const analyzeResumeWithAI = async (resumeText) => {
  try {
    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }

    // Initialize Gemini client inside the function
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Limit text length to reduce token usage and cost
    const truncatedText = (resumeText || "").slice(0, 12000);

    const prompt = `
You are an expert ATS (Applicant Tracking System) and senior technical recruiter.

Analyze the following resume and return ONLY valid JSON.

Required JSON format:
{
  "score": number,
  "atsScore": number,
  "skills": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestions": ["string"],
  "recommendedKeywords": ["string"],
  "summary": "string"
}

Scoring Rules:
- score: Overall resume quality score (0-100)
- atsScore: ATS compatibility score (0-100)
- skills: Important technical and professional skills found in the resume
- strengths: Key positive aspects
- weaknesses: Missing or weak areas
- suggestions: Specific improvement recommendations
- recommendedKeywords: Important keywords to add
- summary: 2-4 sentence evaluation

Important Rules:
- Return ONLY pure JSON.
- Do not wrap the JSON in markdown.
- Do not include any explanation before or after the JSON.
- Ensure all keys are present.

Resume Text:
${truncatedText}
`;

    // Select Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // Generate content
    const result = await model.generateContent(prompt);

    // Extract text output
    const rawText = result.response.text();

    // Remove markdown code fences if Gemini returns them
    const cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Parse JSON
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", rawText);
      throw new Error("Invalid AI response format.");
    }
  } catch (error) {
    console.error("Gemini Service Error:", error.message);
    throw error;
  }
};