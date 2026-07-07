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
- profileCompletenessScore: Evaluate the completeness of the LinkedIn profile including headline, profile photo (if mentioned), about section, experience, education, skills, certifications, projects, languages, and contact information. Return a score between 0 and 100.
- keywordOptimizationScore: Evaluate how effectively the profile uses industry-relevant keywords for search visibility and ATS optimization. Return a score between 0 and 100.
- headlineScore: Evaluate whether the headline is clear, professional, keyword-rich, and role-focused. Return a score between 0 and 100.
- aboutScore: Evaluate the About section based on clarity, professionalism, achievements, storytelling, and keyword usage. Return a score between 0 and 100.

Analysis Rules:
- strengths: Positive aspects of the profile. Must contain at least 2-3 items.
- weaknesses: Missing or weak areas. Must contain at least 2-3 items.
- suggestions: Specific improvements to increase profile score. Must contain at least 3-5 items.
- recommendedKeywords: Important industry keywords to add. Must contain at least 5-7 items.
- personalBrandingTips: Tips to improve personal branding and visibility. Must contain at least 3-5 items.
- summary: 2-4 sentence overall evaluation. Should be detailed and actionable.

Important Rules:
- Return ONLY valid JSON.
- Do NOT return markdown.
- Do NOT return explanations.
- Always include every key.
- Every score must be an integer between 0 and 100.
- Do NOT return an overall score.
- Arrays must never be empty. If there are no items, provide the best possible recommendations.

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
      const parsedData = JSON.parse(cleanedText);
      
      // Calculate overall score from individual scores
      const overallScore = Math.round(
        (
          Number(parsedData.profileCompletenessScore || 0) +
          Number(parsedData.keywordOptimizationScore || 0) +
          Number(parsedData.headlineScore || 0) +
          Number(parsedData.aboutScore || 0)
        ) / 4
      );
      
      // Add the calculated overall score to the response
      parsedData.score = overallScore;
      
      return parsedData;
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", rawText);
      throw new Error("Invalid AI response format.");
    }
  } catch (error) {
    console.error("LinkedIn Gemini Service Error:", error.message);
    throw error;
  }
};