import { GoogleGenerativeAI } from "@google/generative-ai";

export const analyzeLinkedInWithAI = async (profileText) => {
  try {
    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Limit text length to reduce token usage
    const truncatedText = (profileText || "").slice(0, 15000);

    // Prompt for LinkedIn profile analysis
    const prompt = `
You are an expert LinkedIn profile strategist, recruiter, and personal branding consultant.

Analyze the following LinkedIn profile content and return ONLY valid JSON.

Required JSON format:
{
  "score": number,
  "profileCompletenessScore": number,
  "keywordOptimizationScore": number,
  "headlineScore": number,
  "aboutScore": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestions": ["string"],
  "recommendedKeywords": ["string"],
  "personalBrandingTips": ["string"],
  "summary": "string"
}

Scoring Rules:
- score: Overall LinkedIn profile score (0-100)
- profileCompletenessScore: How complete the profile is (0-100)
- keywordOptimizationScore: Keyword usage and search optimization (0-100)
- headlineScore: Quality of headline (0-100)
- aboutScore: Quality of About section (0-100)

Analysis Rules:
- strengths: Positive aspects of the profile
- weaknesses: Missing or weak areas
- suggestions: Specific improvements to increase profile score
- recommendedKeywords: Important industry keywords to add
- personalBrandingTips: Tips to improve personal branding and visibility
- summary: 2-4 sentence overall evaluation

Important Rules:
- Return ONLY pure JSON.
- Do not wrap the JSON in markdown.
- Do not include any explanation before or after the JSON.
- Ensure all keys are present.
- All arrays must contain meaningful values.

LinkedIn Profile Content:
${truncatedText}
`;

    // Select Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // Generate analysis
    const result = await model.generateContent(prompt);

    // Extract raw text
    const rawText = result.response.text();

    // Remove markdown code fences if present
    const cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Parse JSON response
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", rawText);
      throw new Error("Invalid AI response format.");
    }
  } catch (error) {
    console.error("LinkedIn Gemini Service Error:", error.message);
    throw error;
  }
};