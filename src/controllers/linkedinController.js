import supabase from "../services/supabaseClient.js";
import { analyzeLinkedInWithAI } from "../services/linkedinGeminiService.js";
import { fetchLinkedInProfileFromUrl } from "../services/linkedinProfileService.js";
import { createNotificationService } from "../services/notificationService.js";

/**
 * POST /api/linkedin/analyze
 * Analyze LinkedIn profile using Gemini AI and save the result to Supabase.
 */
export const analyzeLinkedInProfile = async (req, res) => {
  try {
    // --------------------------------------------------
    // Get request data
    // profileText is declared with let because it may be
    // automatically filled from the LinkedIn URL.
    // --------------------------------------------------
    const { profileUrl } = req.body;
    let { profileText } = req.body;

    // --------------------------------------------------
    // Validate input
    // At least one of profileUrl or profileText is required.
    // --------------------------------------------------
    if (
      (!profileUrl || !profileUrl.trim()) &&
      (!profileText || !profileText.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a LinkedIn profile URL or profile text.",
      });
    }

    // --------------------------------------------------
    // If profile text is not provided but URL is provided,
    // automatically extract profile content from the URL.
    // --------------------------------------------------
    if ((!profileText || !profileText.trim()) && profileUrl) {
      try {
        profileText = await fetchLinkedInProfileFromUrl(profileUrl);
        console.log("LinkedIn profile text extracted successfully.");
      } catch (scrapeError) {
        console.error("LinkedIn scraping error:", scrapeError);

        return res.status(500).json({
          success: false,
          message: "Failed to extract LinkedIn profile data from URL.",
          error: scrapeError.message,
        });
      }
    }

    // --------------------------------------------------
    // Build content for AI analysis
    // --------------------------------------------------
    const contentToAnalyze = `
LinkedIn Profile URL:
${profileUrl || "Not provided"}

LinkedIn Profile Content:
${profileText || "No profile text provided."}
`.trim();

    // --------------------------------------------------
    // Call Gemini AI
    // --------------------------------------------------
    let analysis;

    try {
      analysis = await analyzeLinkedInWithAI(contentToAnalyze);
      console.log("LinkedIn AI Analysis:", analysis);
    } catch (aiError) {
      console.error("LinkedIn AI Analysis Error:", aiError);

      return res.status(500).json({
        success: false,
        message: "Failed to analyze LinkedIn profile using AI.",
        error: aiError.message,
      });
    }

    // --------------------------------------------------
    // Get logged-in user ID
    // --------------------------------------------------
    const userId = req.user?.id || null;

    // --------------------------------------------------
    // Save analysis to Supabase
    // --------------------------------------------------
    const { data, error } = await supabase
      .from("linkedin_analyses")
      .insert([
        {
          user_id: userId,
          profile_url: profileUrl || null,
          profile_text: profileText || null,

          // Scores
          score: analysis.score || 0,
          profile_completeness_score:
            analysis.profileCompletenessScore || 0,
          keyword_optimization_score:
            analysis.keywordOptimizationScore || 0,
          headline_score: analysis.headlineScore || 0,
          about_score: analysis.aboutScore || 0,

          // Arrays
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          suggestions: analysis.suggestions || [],
          recommended_keywords:
            analysis.recommendedKeywords || [],
          personal_branding_tips:
            analysis.personalBrandingTips || [],

          // Summary
          ai_summary: analysis.summary || "",
          ai_generated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    // --------------------------------------------------
    // Handle Supabase errors
    // --------------------------------------------------
    if (error) {
      console.error("Supabase insert error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to save LinkedIn analysis.",
        error: error.message,
      });
    }

    // Create Notification
    if (userId) {

      await createNotificationService(
        userId,
        "LinkedIn Analysis Complete",
        `Your LinkedIn profile scored ${analysis.score || 0}% and the report is ready.`,
        "system",
        "linkedin",
        "/dashboard/seeker/linkedin"
      );

    }

    // --------------------------------------------------
    // Return response to frontend
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "LinkedIn profile analyzed successfully.",
      data: {
        id: data.id,
        profileUrl: data.profile_url,
        profileText: data.profile_text,

        // Scores
        score: analysis.score || 0,
        profileCompletenessScore:
          analysis.profileCompletenessScore || 0,
        keywordOptimizationScore:
          analysis.keywordOptimizationScore || 0,
        headlineScore: analysis.headlineScore || 0,
        aboutScore: analysis.aboutScore || 0,

        // Analysis
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        suggestions: analysis.suggestions || [],
        recommendedKeywords:
          analysis.recommendedKeywords || [],
        personalBrandingTips:
          analysis.personalBrandingTips || [],
        summary: analysis.summary || "",

        // Metadata
        aiGeneratedAt: data.ai_generated_at,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error("LinkedIn analysis error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

/**
 * GET /api/linkedin/history
 * Fetch all LinkedIn analyses for the logged-in user.
 */
export const getLinkedInHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User not found.",
      });
    }

    const { data, error } = await supabase
      .from("linkedin_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch LinkedIn analysis history.",
        error: error.message,
      });
    }

    // Convert stringified arrays into actual arrays
    const formattedData = (data || []).map((item) => {
      const parseArray = (value) => {
        if (Array.isArray(value)) return value;

        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
          } catch {
            return value.trim() ? [value] : [];
          }
        }

        return [];
      };

      return {
        ...item,

        // Convert numeric strings to numbers
        score: Number(item.score) || 0,
        profile_completeness_score:
          Number(item.profile_completeness_score) || 0,
        keyword_optimization_score:
          Number(item.keyword_optimization_score) || 0,
        headline_score: Number(item.headline_score) || 0,
        about_score: Number(item.about_score) || 0,

        // Convert stringified arrays
        strengths: parseArray(item.strengths),
        weaknesses: parseArray(item.weaknesses),
        suggestions: parseArray(item.suggestions),
        recommended_keywords: parseArray(item.recommended_keywords),
        personal_branding_tips: parseArray(item.personal_branding_tips),
      };
    });

    return res.status(200).json({
      success: true,
      message: "LinkedIn analysis history fetched successfully.",
      data: formattedData,
    });
  } catch (error) {
    console.error("LinkedIn history error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};