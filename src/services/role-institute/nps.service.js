// services/role-institute/nps.service.js
import supabase from "../supabaseClient.js";
import crypto from "crypto";
import { sendNpsSurveyEmail } from "./email.service.js";

/**
 * NPS/Survey Service
 * Handles all survey-related business logic
 * All functions assume authentication and validation have already been performed
 */

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Calculate survey analytics from responses based on question types
 * @param {Array} responses - Array of survey responses with answers
 * @param {Array} questions - Array of survey questions with types
 * @returns {Object} Survey analytics with average rating, total responses, recommendation %, satisfaction %
 */
/**
 * Convert a survey answer into an NPS-compatible score.
 *
 * 1-5 rating:
 * 1 -> 2
 * 2 -> 4
 * 3 -> 6
 * 4 -> 8
 * 5 -> 10
 *
 * 0-10 recommendation:
 * 0 -> 0
 * ...
 * 10 -> 10
 *
 * Yes/No and text questions are not converted.
 */
const convertToNpsScore = (value, questionType) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return null;
  }

  // Existing recommendation questions use 0-10 scale
  if (questionType === "recommendation") {
    if (numericValue >= 0 && numericValue <= 10) {
      return numericValue;
    }

    return null;
  }

  // Existing rating questions use 1-5 scale
  if (questionType === "rating") {
    if (numericValue >= 1 && numericValue <= 5) {
      return numericValue * 2;
    }

    // Allows a future rating question to already provide 0-10.
    if (numericValue >= 6 && numericValue <= 10) {
      return numericValue;
    }

    return null;
  }

  return null;
};


/**
 * Get NPS category from NPS score.
 *
 * 9-10  -> Promoter
 * 7-8   -> Passive
 * 0-6   -> Detractor
 */
const getNpsCategory = (score) => {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return null;
  }

  const numericScore = Number(score);

  if (numericScore >= 9) {
    return "promoter";
  }

  if (numericScore >= 7) {
    return "passive";
  }

  return "detractor";
};


/**
 * Calculate NPS for one student's response.
 *
 * For example:
 *
 * 5,5,5,4,5,5,5,4
 *
 * becomes:
 *
 * 10,10,10,8,10,10,10,8
 *
 * average = 9.5
 * category = promoter
 */
const calculateResponseNps = (response, questions) => {
  const answers = response?.answers || {};

  const questionMap = {};
  (questions || []).forEach((question) => {
    questionMap[question.id] = question;
  });

  const scores = [];

  Object.entries(answers).forEach(([questionId, value]) => {
    const question = questionMap[questionId];

    if (!question) {
      return;
    }

    const score = convertToNpsScore(
      value,
      question.question_type
    );

    if (score !== null) {
      scores.push(score);
    }
  });

  if (scores.length === 0) {
    return {
      score: null,
      category: null,
      scores: [],
    };
  }

  const total = scores.reduce((sum, score) => sum + score, 0);

  const averageScore =
    Math.round((total / scores.length) * 10) / 10;

  return {
    score: averageScore,
    category: getNpsCategory(averageScore),
    scores,
  };
};


/**
 * Build detailed answers for one response.
 *
 * This is used by the response list and the response detail API.
 */
const buildAnswerDetails = (response, questions) => {
  const answers = response?.answers || {};

  const questionMap = {};
  (questions || []).forEach((question) => {
    questionMap[question.id] = question;
  });

  return Object.entries(answers)
    .map(([questionId, answer]) => {
      const question = questionMap[questionId];

      if (!question) {
        return null;
      }

      const npsScore = convertToNpsScore(
        answer,
        question.question_type
      );

      return {
        questionId: question.id,
        question: question.question,
        questionType: question.question_type,
        displayOrder: question.display_order ?? null,
        answer,
        npsScore,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.displayOrder === null) return 1;
      if (b.displayOrder === null) return -1;

      return a.displayOrder - b.displayOrder;
    });
};


/**
 * Calculate survey analytics.
 *
 * IMPORTANT:
 * - Old analytics fields are preserved.
 * - New NPS analytics are added.
 * - Analytics should receive ALL responses, not only paginated responses.
 */
const calculateSurveyAnalytics = (responses, questions) => {
  const totalResponses = responses?.length || 0;

  let totalRating = 0;
  let ratingCount = 0;

  let recommendations = 0;
  let recommendationCount = 0;

  let satisfactions = 0;
  let satisfactionCount = 0;

  let promoterCount = 0;
  let passiveCount = 0;
  let detractorCount = 0;

  let totalNpsScore = 0;
  let npsResponseCount = 0;

  const questionTypeMap = {};

  (questions || []).forEach((question) => {
    questionTypeMap[question.id] = question;
  });

  (responses || []).forEach((response) => {
    const answers = response.answers || {};

    /*
     * ---------------------------------------------------------
     * OLD ANALYTICS
     * ---------------------------------------------------------
     */

    Object.entries(answers).forEach(([questionId, value]) => {
      const question = questionTypeMap[questionId];

      if (!question) {
        return;
      }

      const questionType = question.question_type;

      switch (questionType) {
        case "rating": {
          const numericValue = Number(value);

          if (
            !Number.isNaN(numericValue) &&
            numericValue >= 1 &&
            numericValue <= 5
          ) {
            totalRating += numericValue;
            ratingCount++;
          }

          break;
        }

        case "recommendation": {
          const numericValue = Number(value);

          if (
            !Number.isNaN(numericValue) &&
            numericValue >= 0 &&
            numericValue <= 10
          ) {
            if (numericValue >= 9) {
              recommendations++;
            }

            recommendationCount++;
          }

          break;
        }

        case "satisfaction": {
          if (
            typeof value === "string" &&
            value.toLowerCase().includes("satisfied")
          ) {
            satisfactions++;
            satisfactionCount++;
          } else {
            const numericValue = Number(value);

            if (
              !Number.isNaN(numericValue) &&
              numericValue >= 4
            ) {
              satisfactions++;
              satisfactionCount++;
            }
          }

          break;
        }

        default:
          break;
      }
    });

    /*
     * ---------------------------------------------------------
     * NEW NPS ANALYTICS
     * ---------------------------------------------------------
     *
     * Calculate one NPS score for each student response.
     */
    const responseNps = calculateResponseNps(
      response,
      questions
    );

    if (responseNps.score !== null) {
      totalNpsScore += responseNps.score;
      npsResponseCount++;

      if (responseNps.category === "promoter") {
        promoterCount++;
      } else if (responseNps.category === "passive") {
        passiveCount++;
      } else if (responseNps.category === "detractor") {
        detractorCount++;
      }
    }
  });

  const averageRating =
    ratingCount > 0
      ? Math.round((totalRating / ratingCount) * 10) / 10
      : 0;

  const recommendationPercentage =
    recommendationCount > 0
      ? Math.round(
          (recommendations / recommendationCount) * 100
        )
      : 0;

  const satisfactionPercentage =
    satisfactionCount > 0
      ? Math.round(
          (satisfactions / satisfactionCount) * 100
        )
      : 0;

  const npsAverageScore =
    npsResponseCount > 0
      ? Math.round(
          (totalNpsScore / npsResponseCount) * 10
        ) / 10
      : 0;

  const totalNpsResponses =
    promoterCount +
    passiveCount +
    detractorCount;

  const promoterPercentage =
    totalNpsResponses > 0
      ? Math.round(
          (promoterCount / totalNpsResponses) * 100
        )
      : 0;

  const passivePercentage =
    totalNpsResponses > 0
      ? Math.round(
          (passiveCount / totalNpsResponses) * 100
        )
      : 0;

  const detractorPercentage =
    totalNpsResponses > 0
      ? Math.round(
          (detractorCount / totalNpsResponses) * 100
        )
      : 0;

  /*
   * Standard NPS:
   *
   * % Promoters - % Detractors
   */
  const npsScore =
    totalNpsResponses > 0
      ? promoterPercentage - detractorPercentage
      : 0;

  return {
    // Existing fields - DO NOT REMOVE
    totalResponses,
    averageRating,
    recommendationPercentage,
    satisfactionPercentage,
    totalRatingQuestions: ratingCount,
    totalRecommendationQuestions: recommendationCount,
    totalSatisfactionQuestions: satisfactionCount,

    // New NPS fields
    nps: {
      averageScore: npsAverageScore,

      promoters: promoterCount,
      passives: passiveCount,
      detractors: detractorCount,

      promoterPercentage,
      passivePercentage,
      detractorPercentage,

      score: npsScore,

      totalResponses: totalNpsResponses,
    },
  };
};

/**
 * Calculate referral summary from referral data
 * @param {Array} referralData - Array of referral records
 * @returns {Object} Referral summary with totals
 */
const calculateReferralSummary = (referralData) => {
  let totalClicks = 0;
  let totalSignups = 0;
  let totalEnrollments = 0;
  let rewardPoints = 0;

  if (referralData && referralData.length > 0) {
    referralData.forEach(referral => {
      totalClicks += referral.total_clicks || 0;
      totalSignups += referral.total_signups || 0;
      totalEnrollments += referral.total_enrollments || 0;
      rewardPoints += referral.reward_points || 0;
    });
  }

  return {
    totalReferrals: referralData?.length || 0,
    totalClicks,
    totalSignups,
    totalEnrollments,
    rewardPoints,
  };
};

/**
 * Generate a secure survey token
 * @returns {string} Secure token
 */
const generateSurveyToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Validate that all selected questions exist
 * @param {Array} questionIds - Array of question IDs
 * @param {string} institute_id - Institute ID
 * @returns {Promise<Array>} Array of valid question IDs
 */
const validateSelectedQuestions = async (questionIds, institute_id) => {
  if (!questionIds || questionIds.length === 0) {
    throw new Error("At least one question must be selected");
  }

  if (questionIds.length < 6) {
    throw new Error("Survey must have at least 6 questions");
  }

  if (questionIds.length > 10) {
    throw new Error("Survey cannot have more than 10 questions");
  }

  // Check if all questions exist
  const { data: questions, error } = await supabase
    .from("survey_questions")
    .select("id, question, question_type")
    .in("id", questionIds);

  if (error) {
    console.error("❌ Error validating questions:", error);
    throw error;
  }

  if (!questions || questions.length !== questionIds.length) {
    const foundIds = questions.map(q => q.id);
    const missingIds = questionIds.filter(id => !foundIds.includes(id));
    throw new Error(`Some selected questions do not exist: ${missingIds.join(", ")}`);
  }

  return questions;
};

/**
 * Generate survey link with token
  * @param {string} surveyId - Survey ID
  * @param {string} token - Survey token
  * @param {string} studentId - Student ID
  * @returns {string} Survey link
 */
const generateSurveyLink = (surveyId, token, studentId) => {
  // Updated to use the correct path with all required parameters
  return `${process.env.FRONTEND_URL}/dashboard/seeker/nps-survey?surveyId=${surveyId}&token=${token}&studentId=${studentId}`;
};

// ─── SECTION 1: Survey Questions ──────────────────────────────────────────

/**
 * Get all survey questions
 * @param {Object} params - Query parameters
 * @param {string} params.instituteId - Institute ID
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search term
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort order
 * @returns {Promise<Object>} List of survey questions
 */
export const getSurveyQuestionsService = async (params) => {
  try {
    const {
      instituteId,
      search = "",
      sortBy = "created_at",
      sortOrder = "desc",
    } = params;

    if (!instituteId) {
      throw new Error("Institute ID is required");
    }

    let query = supabase
      .from("survey_questions")
      .select("*");

    // Questions are common for all institutes
    // query = query.eq("institute_id", instituteId);

    // Search logic - kept unchanged
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.ilike("question", `%${searchTerm}%`);
    }

    // Sorting logic - kept unchanged
    const validSortColumns = [
      "created_at",
      "question",
      "question_type",
      "display_order"
    ];

    const safeSortBy = validSortColumns.includes(sortBy)
      ? sortBy
      : "created_at";

    const order = sortOrder.toLowerCase() === "asc" ? true : false;

    query = query.order(safeSortBy, { ascending: order });

    // No pagination
    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching survey questions:", error);
      throw error;
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error("❌ Error in getSurveyQuestionsService:", error);
    throw error;
  }
};

/**
 * Get a single survey question by ID
 * @param {string} id - Survey question ID
 * @param {string} instituteId - Institute ID
 * @returns {Promise<Object>} Survey question data
 */
export const getSurveyQuestionByIdService = async (id, instituteId) => {
  try {
    const { data, error } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Survey question not found");
      }
      console.error("❌ Error fetching survey question:", error);
      throw error;
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("❌ Error in getSurveyQuestionByIdService:", error);
    throw error;
  }
};

/**
 * Create a new survey question
 * @param {Object} data - Survey question data
 * @param {string} data.questionText - Question text
 * @param {string} data.questionType - Question type (rating, text, multiple_choice, recommendation, satisfaction, email, phone, name)
 * @param {string} data.category - Question category
 * @param {Array} data.options - Question options (for multiple choice)
 * @param {boolean} data.isRequired - Whether question is required
 * @returns {Promise<Object>} Created survey question
 */
export const createSurveyQuestionService = async (data) => {
  try {
    // ✅ FIX 1: Added category, options, isRequired
    const {
      questionText,
      questionType,
      category,
      options,
      isRequired,
    } = data;

    if (!questionText) {
      throw new Error("Question text is required");
    }
    if (!questionType) {
      throw new Error("Question type is required");
    }

    // Validate question type
    const validTypes = ['rating', 'text', 'multiple_choice', 'recommendation', 'satisfaction', 'email', 'phone', 'name'];
    if (!validTypes.includes(questionType)) {
      throw new Error(`Invalid question type. Must be one of: ${validTypes.join(', ')}`);
    }

    // ✅ FIX 1: Include category, options, is_required in insert
    const insertData = {
      question: questionText,
      question_type: questionType,
      category: category || null,
      options: options || null,
      is_required: isRequired !== undefined ? isRequired : true,
    };

    const { data: insertedData, error: insertError } = await supabase
      .from("survey_questions")
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error creating survey question:", insertError);
      throw insertError;
    }

    return {
      success: true,
      message: "Survey question created successfully.",
      data: insertedData,
    };
  } catch (error) {
    console.error("❌ Error in createSurveyQuestionService:", error);
    throw error;
  }
};

/**
 * Update a survey question
 * @param {string} id - Survey question ID
 * @param {Object} data - Updated data
 * @param {string} data.questionText - Question text
 * @param {string} data.questionType - Question type
 * @param {string} data.category - Question category
 * @param {Array} data.options - Question options (for multiple choice)
 * @param {boolean} data.isRequired - Whether question is required
 * @param {string} instituteId - Institute ID
 * @returns {Promise<Object>} Updated survey question
 */
export const updateSurveyQuestionService = async (id, data, instituteId) => {
  try {
    // ✅ FIX 2: Added category, options, isRequired
    const {
      questionText,
      questionType,
      category,
      options,
      isRequired,
    } = data;

    const { data: existingQuestion, error: findError } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("id", id)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Survey question not found");
      }
      console.error("❌ Error finding survey question:", findError);
      throw findError;
    }

    const updateData = {};
    
    // ✅ FIX 2: Include all fields in update
    if (questionText !== undefined) {
      updateData.question = questionText;
    }
    
    if (questionType !== undefined) {
      const validTypes = ['rating', 'text', 'multiple_choice', 'recommendation', 'satisfaction', 'email', 'phone', 'name'];
      if (!validTypes.includes(questionType)) {
        throw new Error(`Invalid question type. Must be one of: ${validTypes.join(', ')}`);
      }
      updateData.question_type = questionType;
    }
    
    if (category !== undefined) {
      updateData.category = category;
    }
    
    if (options !== undefined) {
      updateData.options = options;
    }
    
    if (isRequired !== undefined) {
      updateData.is_required = isRequired;
    }

    // ✅ FIX 3: Check for fields BEFORE adding updated_at
    if (Object.keys(updateData).length === 0) {
      throw new Error("No fields to update");
    }

    // Only add updated_at if there are fields to update
    updateData.updated_at = new Date().toISOString();

    const { data: updatedData, error: updateError } = await supabase
      .from("survey_questions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating survey question:", updateError);
      throw updateError;
    }

    return {
      success: true,
      message: "Survey question updated successfully.",
      data: updatedData,
    };
  } catch (error) {
    console.error("❌ Error in updateSurveyQuestionService:", error);
    throw error;
  }
};

/**
 * Delete a survey question
 * @param {string} id - Survey question ID
 * @param {string} instituteId - Institute ID
 * @returns {Promise<Object>} Success message
 */
export const deleteSurveyQuestionService = async (id, instituteId) => {
  try {
    const { data: existingQuestion, error: findError } = await supabase
      .from("survey_questions")
      .select("id")
      .eq("id", id)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Survey question not found");
      }
      console.error("❌ Error finding survey question:", findError);
      throw findError;
    }

    const { error: deleteError } = await supabase
      .from("survey_questions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("❌ Error deleting survey question:", deleteError);
      throw deleteError;
    }

    return {
      success: true,
      message: "Survey question deleted successfully.",
    };
  } catch (error) {
    console.error("❌ Error in deleteSurveyQuestionService:", error);
    throw error;
  }
};

// ─── SECTION 2: Survey Management ─────────────────────────────────────────

/**
 * Get all surveys
 * @param {Object} params - Query parameters
 * @param {string} params.instituteId - Institute ID
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search term
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort order
 * @param {string} params.status - Filter by status (draft, scheduled, sent, completed)
 * @returns {Promise<Object>} List of surveys with questions
 */
export const getSurveysService = async (params) => {
  try {
    const {
      instituteId,
      search = "",
      sortBy = "created_at",
      sortOrder = "desc",
      status,
    } = params;

    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;

    if (!instituteId) {
      throw new Error("Institute ID is required");
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("nps_surveys")
      .select("*", { count: "exact" });

    query = query.eq("institute_id", instituteId);

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.ilike("title", `%${searchTerm}%`);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const validSortColumns = ['created_at', 'title', 'send_after_days', 'status', 'is_active'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === "asc" ? true : false;
    query = query.order(safeSortBy, { ascending: order });
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("❌ Error fetching surveys:", error);
      throw error;
    }

    // ─── Fetch questions for each survey ──────────────────────────────────
    const surveys = data || [];

    for (const survey of surveys) {
      if (survey.question_ids && survey.question_ids.length > 0) {
        const { data: questions, error: questionError } = await supabase
          .from("survey_questions")
          .select("id, question, question_type, display_order")
          .in("id", survey.question_ids);

        if (questionError) {
          console.error(`❌ Error fetching questions for survey ${survey.id}:`, questionError);
          survey.questions = [];
        } else {
          // Preserve the order from question_ids
          survey.questions = survey.question_ids
            .map(id => questions.find(q => q.id === id))
            .filter(Boolean);
        }
      } else {
        survey.questions = [];
      }
    }

    const totalPages = Math.max(1, Math.ceil(count / limit));

    return {
      success: true,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      data: surveys,
    };
  } catch (error) {
    console.error("❌ Error in getSurveysService:", error);
    throw error;
  }
};

/**
 * Get a single survey by ID
 * @param {string} id - Survey ID
 * @param {string} instituteId - Institute ID
 * @returns {Promise<Object>} Survey data with questions
 */
export const getSurveyByIdService = async (id, instituteId) => {
  try {
    // Get survey
    const { data: survey, error: surveyError } = await supabase
      .from("nps_surveys")
      .select("*")
      .eq("id", id)
      .eq("institute_id", instituteId) // ✅ FIX 3: Added institute filter
      .single();

    if (surveyError) {
      if (surveyError.code === "PGRST116") {
        throw new Error("Survey not found");
      }
      console.error("❌ Error fetching survey:", surveyError);
      throw surveyError;
    }

    // Get survey questions if survey has question IDs
    let questions = [];
    if (survey.question_ids && survey.question_ids.length > 0) {
      const { data: questionData, error: questionError } = await supabase
        .from("survey_questions")
        .select("*")
        .in("id", survey.question_ids);

      if (questionError) {
        console.error("❌ Error fetching survey questions:", questionError);
        throw questionError;
      }
      
      // Preserve the original order from question_ids
      questions = survey.question_ids
        .map(id => questionData.find(q => q.id === id))
        .filter(Boolean);
    }

    return {
      success: true,
      data: {
        ...survey,
        questions,
      },
    };
  } catch (error) {
    console.error("❌ Error in getSurveyByIdService:", error);
    throw error;
  }
};

/**
 * Create a new survey
 * @param {Object} data - Survey data
 * @param {string} data.institute_id - Institute ID
 * @param {string} data.title - Survey title
 * @param {string} data.description - Survey description
 * @param {Array} data.selectedQuestions - Array of question IDs
 * @param {number} data.sendAfterDays - Days after acceptance to send survey
 * @param {string} data.status - Survey status (draft, scheduled, sent, completed)
 * @returns {Promise<Object>} Created survey
 */
export const createSurveyService = async (data) => {
  try {
    const {
      institute_id,
      title,
      description,
      selectedQuestions,
      sendAfterDays,
      status = 'draft',
    } = data;

    if (!institute_id) {
      throw new Error("Institution ID is required");
    }
    if (!title) {
      throw new Error("Survey title is required");
    }
    
    // Validate questions
    const validatedQuestions = await validateSelectedQuestions(selectedQuestions, institute_id);
    
    if (sendAfterDays === undefined || sendAfterDays === null) {
      throw new Error("Send after days is required");
    }

    // Validate status
    const validStatuses = ['draft', 'scheduled', 'sent', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const insertData = {
      institute_id: institute_id,
      title,
      description: description || "",
      question_ids: selectedQuestions,
      send_after_days: sendAfterDays,
      status: status,
      is_active: status !== 'draft', // Only activate if not draft
    };

    const { data: insertedData, error: insertError } = await supabase
      .from("nps_surveys")
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error creating survey:", insertError);
      throw insertError;
    }

    return {
      success: true,
      message: "Survey created successfully.",
      data: insertedData,
    };
  } catch (error) {
    console.error("❌ Error in createSurveyService:", error);
    throw error;
  }
};

/**
 * Update a survey
 * @param {string} id - Survey ID
 * @param {Object} data - Updated data
 * @param {string} data.title - Survey title
 * @param {string} data.description - Survey description
 * @param {Array} data.selectedQuestions - Array of question IDs
 * @param {boolean} data.isActive - Whether survey is active
 * @param {number} data.sendAfterDays - Days after acceptance to send survey
 * @param {string} data.status - Survey status (draft, scheduled, sent, completed)
 * @param {string} instituteId - Institute ID
 * @returns {Promise<Object>} Updated survey
 */
export const updateSurveyService = async (id, data, instituteId) => {
  try {
    const { title, description, selectedQuestions, isActive, sendAfterDays, status } = data;

    const { data: existingSurvey, error: findError } = await supabase
      .from("nps_surveys")
      .select("*")
      .eq("id", id)
      .eq("institute_id", instituteId) // ✅ FIX 3: Added institute filter
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Survey not found");
      }
      console.error("❌ Error finding survey:", findError);
      throw findError;
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    
    if (selectedQuestions !== undefined) {
      const validatedQuestions = await validateSelectedQuestions(selectedQuestions, instituteId);
      updateData.question_ids = selectedQuestions;
    }
    
    if (isActive !== undefined) updateData.is_active = isActive;
    if (sendAfterDays !== undefined) updateData.send_after_days = sendAfterDays;
    
    if (status !== undefined) {
      const validStatuses = ['draft', 'scheduled', 'sent', 'completed'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
      updateData.status = status;
    }

    // ✅ FIX 2: Check for fields BEFORE adding updated_at
    if (Object.keys(updateData).length === 0) {
      throw new Error("No fields to update");
    }

    // Only add updated_at if there are fields to update
    updateData.updated_at = new Date().toISOString();

    const { data: updatedData, error: updateError } = await supabase
      .from("nps_surveys")
      .update(updateData)
      .eq("id", id)
      .eq("institute_id", instituteId) // ✅ FIX 3: Added institute filter
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating survey:", updateError);
      throw updateError;
    }

    return {
      success: true,
      message: "Survey updated successfully.",
      data: updatedData,
    };
  } catch (error) {
    console.error("❌ Error in updateSurveyService:", error);
    throw error;
  }
};

/**
 * Delete a survey
 * @param {string} id - Survey ID
 * @param {string} instituteId - Institute ID
 * @returns {Promise<Object>} Success message
 */
export const deleteSurveyService = async (id, instituteId) => {
  try {
    const { data: existingSurvey, error: findError } = await supabase
      .from("nps_surveys")
      .select("id")
      .eq("id", id)
      .eq("institute_id", instituteId) // ✅ FIX 3: Added institute filter
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Survey not found");
      }
      console.error("❌ Error finding survey:", findError);
      throw findError;
    }

    const { error: deleteError } = await supabase
      .from("nps_surveys")
      .delete()
      .eq("id", id)
      .eq("institute_id", instituteId); // ✅ FIX 3: Added institute filter

    if (deleteError) {
      console.error("❌ Error deleting survey:", deleteError);
      throw deleteError;
    }

    return {
      success: true,
      message: "Survey deleted successfully.",
    };
  } catch (error) {
    console.error("❌ Error in deleteSurveyService:", error);
    throw error;
  }
};
// ─── SECTION 3: Send Survey ───────────────────────────────────────────────

/**
 * Send survey to eligible students
 * @param {string} surveyId - Survey ID
 * @param {Object} options - Send options
 * @param {boolean} options.resend - Whether to resend to students who haven't completed
 * @param {Array} options.studentIds - Array of student IDs to send to
 * @param {Array} options.coachIds - Array of coach IDs to send to
 * @param {string} instituteId - Institute ID
 * @returns {Promise<Object>} Send results
 */
export const sendSurveyService = async (surveyId, options, instituteId) => {
  try {
    const { 
      resend = false,
      studentIds = [],
      coachIds = []
    } = options || {};

    if (!surveyId) {
      throw new Error("Survey ID is required");
    }
    if (!instituteId) {
      throw new Error("Institute ID is required");
    }

    // 1. Load survey
    const { data: survey, error: surveyError } = await supabase
      .from("nps_surveys")
      .select("*")
      .eq("id", surveyId)
      .eq("institute_id", instituteId) // ✅ FIX 4: Added institute filter
      .single();

    if (surveyError) {
      if (surveyError.code === "PGRST116") {
        throw new Error("Survey not found");
      }
      console.error("❌ Error fetching survey:", surveyError);
      throw surveyError;
    }

    // 2. Get recipients
    let recipients = [];

    if (studentIds.length > 0 || coachIds.length > 0) {
      if (studentIds.length > 0) {
        const { data: students, error: studentError } = await supabase
          .from("student_invitations")
          .select("id, student_name, accepted_at, email")
          .in("id", studentIds)
          .eq("institute_id", instituteId)
          .eq("status", "accepted");

        if (studentError) {
          console.error("❌ Error fetching students:", studentError);
        } else {
          recipients = (students || []).map(student => ({
            student_id: student.id,
            email: student.email,
            name: student.student_name || "Student",
            accepted_at: student.accepted_at,
          }));
        }
      }
    } else {
      const { data: studentInvitations, error: studentError } = await supabase
        .from("student_invitations")
        .select("id, student_name, accepted_at, email")
        .eq("institute_id", instituteId)
        .eq("status", "accepted");

      if (studentError) {
        console.error("❌ Error fetching student invitations:", studentError);
        throw studentError;
      }

      recipients = (studentInvitations || []).map(inv => ({
        student_id: inv.id,
        email: inv.email,
        name: inv.student_name || "Student",
        accepted_at: inv.accepted_at,
      }));
    }

    console.log("📋 Recipients:", JSON.stringify(recipients, null, 2));
    
    if (recipients.length === 0) {
      return {
        success: true,
        message: "No eligible recipients found for this survey.",
        data: {
          surveyId,
          sentCount: 0,
          skippedCount: 0,
          totalEligible: 0,
        },
      };
    }

    // 3. Get UUIDs for all recipients first
    const recipientEmails = recipients.map(r => r.email);
    
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email")
      .in("email", recipientEmails);

    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      throw usersError;
    }

    // Create a map of email -> user UUID
    const userUuidMap = {};
    users.forEach(user => {
      userUuidMap[user.email] = user.id;
    });

    // Add UUID to each recipient
    recipients = recipients.map(recipient => ({
      ...recipient,
      user_uuid: userUuidMap[recipient.email] || null,
    }));

    // Filter out recipients without a user account
    const validRecipients = recipients.filter(r => r.user_uuid !== null);
    console.log("📋 Valid recipients with UUIDs:", validRecipients.length);

    if (validRecipients.length === 0) {
      return {
        success: true,
        message: "No valid recipients found (users without accounts).",
        data: {
          surveyId,
          sentCount: 0,
          skippedCount: 0,
          totalEligible: recipients.length,
        },
      };
    }

    // 4. Get UUIDs of students who have already submitted
    const userUuids = validRecipients.map(r => r.user_uuid);
    
    const { data: existingResponses, error: responseError } = await supabase
      .from("survey_responses")
      .select("student_id")
      .eq("survey_id", surveyId)
      .eq("institute_id", instituteId)
      .in("student_id", userUuids);

    if (responseError) {
      console.error("❌ Error checking existing responses:", responseError);
      throw responseError;
    }

    const submittedStudentIds = new Set(existingResponses?.map(r => r.student_id) || []);

    // 5. Filter recipients based on resend flag
    let studentsToSend = [];
    let skippedCount = 0;

    validRecipients.forEach(recipient => {
      const hasSubmitted = submittedStudentIds.has(recipient.user_uuid);
      
      // ✅ FIX 8: Simplified resend logic - only send to those who haven't submitted
      if (!hasSubmitted) {
        studentsToSend.push(recipient);
      } else {
        skippedCount++;
      }
    });

    if (studentsToSend.length === 0) {
      return {
        success: true,
        message: resend ? "No pending recipients to resend." : "All eligible recipients have already submitted.",
        data: {
          surveyId,
          sentCount: 0,
          skippedCount,
          totalEligible: validRecipients.length,
        },
      };
    }

    // 6. Generate tokens and send emails
    const emailResults = [];
    let successfulEmails = 0;
    let failedEmails = 0;

    for (const student of studentsToSend) {
      const token = generateSurveyToken();
      
      const surveyLink = generateSurveyLink(surveyId, token, student.student_id);

      console.log(`📋 Sending to: ${student.email}, Link: ${surveyLink}`);

      try {
        await sendNpsSurveyEmail({
          studentName: student.name,
          email: student.email,
          surveyLink: surveyLink,
          surveyTitle: survey.title,
          instituteId: instituteId,
          isResend: resend
        });
        
        console.log(`✅ NPS survey email sent to ${student.email}`);

        // Save recipient with error handling and token
        const { error: recipientInsertError } = await supabase
          .from("nps_survey_recipients")
          .upsert(
            {
              survey_id: surveyId,
              student_id: student.user_uuid,
              status: "pending",
              sent_at: new Date().toISOString(),
              token: token, // Save token for security
            },
            {
              onConflict: "survey_id,student_id",
            }
          );

        if (recipientInsertError) {
          console.error(
            "❌ Error saving survey recipient:",
            recipientInsertError
          );
          
          // We need to throw here because the recipient wasn't saved
          throw new Error(`Failed to save recipient record: ${recipientInsertError.message}`);
        }

        // Only increment successfulEmails after both email AND recipient save succeed
        successfulEmails++;
        
        emailResults.push({
          studentId: student.student_id,
          email: student.email,
          surveyLink: surveyLink,
          status: 'sent',
          success: true,
        });
      } catch (emailError) {
        console.error(`❌ Email sending failed for ${student.email}:`, emailError);
        failedEmails++;
        
        emailResults.push({
          studentId: student.student_id,
          email: student.email,
          surveyLink: surveyLink,
          status: 'failed',
          success: false,
          error: emailError.message,
        });
      }
    }

    // 7. Update survey status - ALWAYS set to 'sent' and is_active: true
    try {
      const updateData = {
        status: 'sent',
        is_active: true,
      };
      
      console.log(`📋 Updating survey ${surveyId} status to 'sent' and is_active to true`);
      
      const { error: updateError } = await supabase
        .from("nps_surveys")
        .update(updateData)
        .eq("id", surveyId)
        .eq("institute_id", instituteId);
      
      if (updateError) {
        console.error("❌ Error updating survey status:", updateError);
      } else {
        console.log(`✅ Survey ${surveyId} status updated to 'sent' and is_active set to true`);
      }
    } catch (updateErr) {
      console.error("❌ Failed to update survey status:", updateErr);
    }

    return {
      success: true,
      message: `Survey sent to ${successfulEmails} recipients. ${failedEmails > 0 ? `Failed to send to ${failedEmails} recipients.` : ''}`,
      data: {
        surveyId,
        sentCount: successfulEmails,
        failedCount: failedEmails,
        skippedCount,
        totalEligible: validRecipients.length,
        emails: emailResults,
        isResend: resend,
        status: 'sent',
        isActive: true,
      },
    };
  } catch (error) {
    console.error("❌ Error in sendSurveyService:", error);
    throw error;
  }
};

// ─── SECTION 4: Survey Responses ─────────────────────────────────────────

/**
 * Submit survey response
 * @param {Object} data - Response data
 * @param {string} data.surveyId - Survey ID
 * @param {string} data.studentId - Student ID
 * @param {string} data.institute_id - Institute ID
 * @param {Object} data.answers - Survey answers (key-value pairs)
 * @param {string} data.token - Survey token for validation
 * @returns {Promise<Object>} Created survey response
 */
export const submitSurveyResponseService = async (data) => {
  try {
    const {
      surveyId,
      studentId,
      institute_id,
      answers,
      token,
    } = data;

    if (!surveyId) {
      throw new Error("Survey ID is required");
    }
    if (!studentId) {
      throw new Error("Student ID is required");
    }
    if (!institute_id) {
      throw new Error("Institution ID is required");
    }
    if (!answers || Object.keys(answers).length === 0) {
      throw new Error("Answers are required");
    }

    // Validate token using nps_survey_recipients
    // First, get the user UUID from the student_invitations table
    const { data: studentInvitation, error: invitationError } = await supabase
      .from("student_invitations")
      .select("email, student_name")
      .eq("id", studentId)
      .eq("institute_id", institute_id)
      .single();

    if (invitationError) {
      console.error("❌ Error fetching student invitation:", invitationError);
      throw new Error("Student invitation not found");
    }

    // Get the user UUID from the users table using the email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", studentInvitation.email)
      .single();

    if (userError) {
      console.error("❌ Error fetching user:", userError);
      throw new Error("User not found for this student");
    }

    const userUuid = userData.id;
    console.log("📋 Found user UUID for submission:", userUuid);

    // Validate token before allowing submission
    const { data: recipient, error: recipientError } = await supabase
      .from("nps_survey_recipients")
      .select("id, status, token")
      .eq("survey_id", surveyId)
      .eq("student_id", userUuid)
      .eq("token", token)
      .maybeSingle();

    if (recipientError) {
      console.error("❌ Error validating survey token:", recipientError);
      throw new Error("Error validating survey access");
    }

    if (!recipient) {
      throw new Error("Invalid or expired survey link");
    }

    if (recipient.status === "completed") {
      throw new Error("You have already submitted this survey");
    }

    // 2. Check survey exists
    const { data: survey, error: surveyError } = await supabase
      .from("nps_surveys")
      .select("id, title, question_ids, institute_id")
      .eq("id", surveyId)
      .eq("institute_id", institute_id)
      .single();

    if (surveyError) {
      if (surveyError.code === "PGRST116") {
        throw new Error("Survey not found");
      }
      console.error("❌ Error fetching survey:", surveyError);
      throw surveyError;
    }

    // 3. Check if student already submitted this survey using the user UUID
    const { data: existingResponse, error: checkError } = await supabase
      .from("survey_responses")
      .select("id")
      .eq("survey_id", surveyId)
      .eq("student_id", userUuid)
      .eq("institute_id", institute_id)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Error checking existing response:", checkError);
      throw checkError;
    }

    if (existingResponse) {
      return {
        success: false,
        message: "You have already submitted this survey.",
        data: null,
      };
    }

    // 4. Validate required questions
    if (survey.question_ids && survey.question_ids.length > 0) {
      // ✅ FIX 1: Fetch is_required field
      const { data: questions, error: questionError } = await supabase
        .from("survey_questions")
        .select("id, question, question_type, is_required")
        .in("id", survey.question_ids);

      if (questionError) {
        console.error("❌ Error fetching questions for validation:", questionError);
        throw questionError;
      }

      const missingRequired = [];

      questions.forEach((question) => {
        const answer = answers[question.id];

        const isMissing =
          answer === undefined ||
          answer === null ||
          answer === "";

        // ✅ FIX 1: Only check required questions
        if (question.is_required && isMissing) {
          missingRequired.push(question.question);
        }
      });

      if (missingRequired.length > 0) {
        throw new Error(`Required questions missing: ${missingRequired.join(', ')}`);
      }
    }

    // 5. Save answers using the user UUID
    const insertData = {
      survey_id: surveyId,
      student_id: userUuid,
      institute_id: institute_id,
      answers: answers,
      submitted_at: new Date().toISOString(),
    };

    const { data: insertedData, error: insertError } = await supabase
      .from("survey_responses")
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error saving survey response:", insertError);
      throw insertError;
    }

    /*
    * ---------------------------------------------------------
    * 6. MARK RECIPIENT AS COMPLETED
    * ---------------------------------------------------------
    */
    const {
      error: recipientUpdateError,
    } = await supabase
      .from("nps_survey_recipients")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("survey_id", surveyId)
      .eq("student_id", userUuid);

    if (recipientUpdateError) {
      console.error(
        "❌ Error updating survey recipient:",
        recipientUpdateError
      );
    }


    /*
    * ---------------------------------------------------------
    * 7. CHECK WHETHER ALL RECIPIENTS COMPLETED
    * ---------------------------------------------------------
    */
    const {
      data: recipientRecords,
      error: recipientCheckError,
    } = await supabase
      .from("nps_survey_recipients")
      .select("id, status")
      .eq("survey_id", surveyId);

    if (recipientCheckError) {
      console.error(
        "❌ Error checking survey recipients:",
        recipientCheckError
      );
    } else if (recipientRecords && recipientRecords.length > 0) {

      const pendingRecipients = recipientRecords.filter(
        (recipient) => recipient.status === "pending"
      );

      if (pendingRecipients.length === 0) {
        const { error: surveyStatusError } = await supabase
          .from("nps_surveys")
          .update({
            status: "completed",
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", surveyId)
          .eq("institute_id", institute_id);

        if (surveyStatusError) {
          console.error(
            "❌ Error marking survey as completed:",
            surveyStatusError
          );
        }
      }
    }

    return {
      success: true,
      message: "Survey response submitted successfully.",
      data: insertedData,
      referral: null,
    };
  } catch (error) {
    console.error("❌ Error in submitSurveyResponseService:", error);
    throw error;
  }
};

/**
 * Get survey responses with pagination and analytics
 * @param {Object} params - Query parameters
 * @param {string} params.surveyId - Survey ID
 * @param {string} params.instituteId - Institute ID
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search term
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort order
 * @returns {Promise<Object>} Survey responses with analytics
 */
/**
 * Get survey responses with pagination, student details and analytics.
 *
 * Analytics are calculated from ALL responses.
 * Pagination is applied only to the response list.
 */
export const getSurveyResponsesService = async (params) => {
  try {
    const {
      surveyId,
      instituteId,
      search = "",
      sortBy = "submitted_at",
      sortOrder = "desc",
    } = params;

    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.max(Number(params.limit) || 10, 1);

    if (!surveyId) {
      throw new Error("Survey ID is required");
    }

    if (!instituteId) {
      throw new Error("Institute ID is required");
    }

    /*
     * ---------------------------------------------------------
     * 1. GET SURVEY
     * ---------------------------------------------------------
     */
    const {
      data: survey,
      error: surveyError,
    } = await supabase
      .from("nps_surveys")
      .select(`
        id,
        title,
        description,
        question_ids,
        institute_id
      `)
      .eq("id", surveyId)
      .eq("institute_id", instituteId)
      .single();

    if (surveyError) {
      if (surveyError.code === "PGRST116") {
        throw new Error("Survey not found");
      }

      console.error(
        "❌ Error fetching survey:",
        surveyError
      );

      throw surveyError;
    }

    /*
     * ---------------------------------------------------------
     * 2. GET QUESTIONS
     * ---------------------------------------------------------
     */
    let questions = [];

    if (
      survey.question_ids &&
      survey.question_ids.length > 0
    ) {
      const {
        data: questionData,
        error: questionError,
      } = await supabase
        .from("survey_questions")
        .select(`
          id,
          question,
          question_type,
          display_order
        `)
        .in("id", survey.question_ids);

      if (questionError) {
        console.error(
          "❌ Error fetching survey questions:",
          questionError
        );

        throw questionError;
      }

      /*
       * Preserve question_ids order from the survey.
       */
      questions = survey.question_ids
        .map((id) =>
          questionData.find((question) => question.id === id)
        )
        .filter(Boolean);
    }

    /*
     * ---------------------------------------------------------
     * 3. GET ALL RESPONSES
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     * No .range() here.
     *
     * These responses are only used for analytics.
     */
    const {
      data: allResponses,
      error: allResponsesError,
    } = await supabase
      .from("survey_responses")
      .select("*")
      .eq("survey_id", surveyId)
      .eq("institute_id", instituteId);

    if (allResponsesError) {
      console.error(
        "❌ Error fetching all survey responses:",
        allResponsesError
      );

      throw allResponsesError;
    }

    /*
     * ---------------------------------------------------------
     * 4. CALCULATE ANALYTICS FROM ALL RESPONSES
     * ---------------------------------------------------------
     */
    const analytics = calculateSurveyAnalytics(
      allResponses || [],
      questions
    );

    /*
     * ---------------------------------------------------------
     * 5. GET PAGINATED RESPONSES
     * ---------------------------------------------------------
     */

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let responseQuery = supabase
      .from("survey_responses")
      .select("*", { count: "exact" })
      .eq("survey_id", surveyId)
      .eq("institute_id", instituteId);

    /*
     * Search:
     *
     * We will handle student-name/email search after
     * getting users because student_id is a UUID and
     * ilike on UUID is not what we want.
     */
    const validSortColumns = [
      "submitted_at",
      "student_id",
    ];

    const safeSortBy = validSortColumns.includes(sortBy)
      ? sortBy
      : "submitted_at";

    const ascending =
      String(sortOrder).toLowerCase() === "asc";

    responseQuery = responseQuery.order(
      safeSortBy,
      {
        ascending,
      }
    );

    responseQuery = responseQuery.range(from, to);

    const {
      data: paginatedResponses,
      count,
      error: responseError,
    } = await responseQuery;

    if (responseError) {
      console.error(
        "❌ Error fetching paginated responses:",
        responseError
      );

      throw responseError;
    }

    /*
     * ---------------------------------------------------------
     * 6. GET USER DETAILS
     * ---------------------------------------------------------
     */
    const studentIds = [
      ...new Set(
        (paginatedResponses || [])
          .map((response) => response.student_id)
          .filter(Boolean)
      ),
    ];

    let users = [];

    if (studentIds.length > 0) {
      const {
        data: userData,
        error: userError,
      } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", studentIds);

      if (userError) {
        console.error(
          "❌ Error fetching student users:",
          userError
        );

        throw userError;
      }

      users = userData || [];
    }

    const userMap = {};

    users.forEach((user) => {
      userMap[user.id] = user;
    });

    /*
     * ---------------------------------------------------------
     * 7. BUILD RESPONSE DATA
     * ---------------------------------------------------------
     */
    let responseData = (paginatedResponses || []).map(
      (response) => {
        const student = userMap[response.student_id] || null;

        const responseNps = calculateResponseNps(
          response,
          questions
        );

        const answerDetails = buildAnswerDetails(
          response,
          questions
        );

        return {
          ...response,

          student: student
            ? {
                id: student.id,
                name: student.name,
                email: student.email,
              }
            : null,

          score: responseNps.score,
          category: responseNps.category,

          answerDetails,
        };
      }
    );

    /*
     * ---------------------------------------------------------
     * 8. SEARCH BY STUDENT NAME / EMAIL
     * ---------------------------------------------------------
     *
     * Since the original query cannot reliably search
     * users.name/users.email through this query, filter the
     * enriched current page here.
     *
     * NOTE:
     * If you need search across ALL pages, we should later
     * move this to a database-side query/view.
     */
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();

      responseData = responseData.filter((response) => {
        const studentName =
          response.student?.name?.toLowerCase() || "";

        const studentEmail =
          response.student?.email?.toLowerCase() || "";

        return (
          studentName.includes(searchTerm) ||
          studentEmail.includes(searchTerm)
        );
      });
    }

    /*
     * ---------------------------------------------------------
     * 9. PAGINATION
     * ---------------------------------------------------------
     */
    const total = count || 0;

    const totalPages =
      total > 0
        ? Math.ceil(total / limit)
        : 1;

    return {
      success: true,

      analytics,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },

      data: responseData,
    };
  } catch (error) {
    console.error(
      "❌ Error in getSurveyResponsesService:",
      error
    );

    throw error;
  }
};

/**
 * Get a single survey response by ID
 * @param {string} id - Survey response ID
 * @param {string} instituteId - Institute ID
 * @returns {Promise<Object>} Survey response data
 */
/**
 * Get a single survey response by ID.
 *
 * Returns:
 * - survey information
 * - student information
 * - raw response
 * - calculated NPS score/category
 * - detailed answers
 */
export const getSurveyResponseByIdService = async (
  id,
  instituteId
) => {
  try {
    if (!id) {
      throw new Error("Survey response ID is required");
    }

    if (!instituteId) {
      throw new Error("Institute ID is required");
    }

    /*
     * ---------------------------------------------------------
     * 1. GET RESPONSE
     * ---------------------------------------------------------
     */
    const {
      data: response,
      error: responseError,
    } = await supabase
      .from("survey_responses")
      .select("*")
      .eq("id", id)
      .eq("institute_id", instituteId)
      .single();

    if (responseError) {
      if (responseError.code === "PGRST116") {
        throw new Error("Survey response not found");
      }

      console.error(
        "❌ Error fetching survey response:",
        responseError
      );

      throw responseError;
    }

    /*
     * ---------------------------------------------------------
     * 2. GET SURVEY
     * ---------------------------------------------------------
     */
    const {
      data: survey,
      error: surveyError,
    } = await supabase
      .from("nps_surveys")
      .select(`
        id,
        title,
        description,
        question_ids
      `)
      .eq("id", response.survey_id)
      .eq("institute_id", instituteId)
      .single();

    if (surveyError) {
      console.error(
        "❌ Error fetching survey:",
        surveyError
      );

      throw surveyError;
    }

    /*
     * ---------------------------------------------------------
     * 3. GET QUESTIONS
     * ---------------------------------------------------------
     */
    let questions = [];

    if (
      survey.question_ids &&
      survey.question_ids.length > 0
    ) {
      const {
        data: questionData,
        error: questionError,
      } = await supabase
        .from("survey_questions")
        .select(`
          id,
          question,
          question_type,
          display_order
        `)
        .in("id", survey.question_ids);

      if (questionError) {
        console.error(
          "❌ Error fetching questions:",
          questionError
        );

        throw questionError;
      }

      questions = survey.question_ids
        .map((questionId) =>
          questionData.find(
            (question) => question.id === questionId
          )
        )
        .filter(Boolean);
    }

    /*
     * ---------------------------------------------------------
     * 4. GET STUDENT
     * ---------------------------------------------------------
     */
    let student = null;

    if (response.student_id) {
      const {
        data: user,
        error: userError,
      } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("id", response.student_id)
        .single();

      if (userError) {
        console.error(
          "❌ Error fetching student:",
          userError
        );

        throw userError;
      }

      student = {
        id: user.id,
        name: user.name,
        email: user.email,
      };
    }

    /*
     * ---------------------------------------------------------
     * 5. CALCULATE NPS
     * ---------------------------------------------------------
     */
    const responseNps = calculateResponseNps(
      response,
      questions
    );

    /*
     * ---------------------------------------------------------
     * 6. BUILD ANSWER DETAILS
     * ---------------------------------------------------------
     */
    const answerDetails = buildAnswerDetails(
      response,
      questions
    );

    /*
     * ---------------------------------------------------------
     * 7. RETURN
     * ---------------------------------------------------------
     */
    return {
      success: true,

      data: {
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
        },

        student,

        response: {
          id: response.id,
          surveyId: response.survey_id,
          studentId: response.student_id,
          instituteId: response.institute_id,
          submittedAt: response.submitted_at,

          score: responseNps.score,
          category: responseNps.category,

          answers: answerDetails,

          // Keep original answers as well
          rawAnswers: response.answers,
        },
      },
    };
  } catch (error) {
    console.error(
      "❌ Error in getSurveyResponseByIdService:",
      error
    );

    throw error;
  }
};

/**
 * Get student survey submission status for a specific survey
 * @param {Object} params - Query parameters
 * @param {string} params.studentId - Student ID
 * @param {string} params.surveyId - Survey ID
 * @param {string} params.institute_id - Institute ID
 * @returns {Promise<Object>} Submission status
 */
export const getStudentSurveyStatusService = async (params) => {
  try {
    const { studentId, surveyId, institute_id } = params;

    if (!studentId) {
      throw new Error("Student ID is required");
    }
    if (!surveyId) {
      throw new Error("Survey ID is required");
    }
    if (!institute_id) {
      throw new Error("Institution ID is required");
    }

    const { data: existingResponse, error } = await supabase
      .from("survey_responses")
      .select("id, submitted_at, answers")
      .eq("student_id", studentId)
      .eq("survey_id", surveyId)
      .eq("institute_id", institute_id)
      .maybeSingle();

    if (error) {
      console.error("❌ Error checking survey status:", error);
      throw error;
    }

    return {
      success: true,
      submitted: !!existingResponse,
      data: existingResponse || null,
    };
  } catch (error) {
    console.error("❌ Error in getStudentSurveyStatusService:", error);
    throw error;
  }
};

// ─── SECTION 5: Dashboard ─────────────────────────────────────────────────

/**
 * Get survey dashboard data with analytics and referrals
 * @param {Object} params - Query parameters
 * @param {string} params.instituteId - Institute ID
 * @param {string} params.surveyId - Optional survey ID to filter
 * @returns {Promise<Object>} Dashboard data with analytics and referrals
 */
export const getSurveyDashboardService = async (params) => {
  try {
    const { instituteId, surveyId } = params;

    if (!instituteId) {
      throw new Error("Institute ID is required");
    }

    // ─── Query 1: Get survey count and details ─────────────────────────────
    let surveyQuery = supabase
      .from("nps_surveys")
      .select("id, title, send_after_days, is_active, status, created_at, sent_at, question_ids")
      .eq("institute_id", instituteId);

    if (surveyId) {
      surveyQuery = surveyQuery.eq("id", surveyId);
    }

    const { data: surveys, error: surveyError } = await surveyQuery;

    if (surveyError) {
      console.error("❌ Error fetching surveys:", surveyError);
      throw surveyError;
    }

    const surveyCount = surveys?.length || 0;

    // ─── Query 2: Get all survey responses ──────────────────────────────────
    let responseQuery = supabase
      .from("survey_responses")
      .select("*")
      .eq("institute_id", instituteId);

    if (surveyId) {
      responseQuery = responseQuery.eq("survey_id", surveyId);
    }

    const { data: allResponses, error: responseError } = await responseQuery;

    if (responseError) {
      console.error("❌ Error fetching responses:", responseError);
      throw responseError;
    }

    const totalResponses = allResponses?.length || 0;

    // ─── Query 3: Get completed responses count per survey ──────────────────
    let completedQuery = supabase
      .from("survey_responses")
      .select("id, survey_id", { count: "exact" })
      .eq("institute_id", instituteId);

    if (surveyId) {
      completedQuery = completedQuery.eq("survey_id", surveyId);
    }

    const { data: completedData, error: completedError } = await completedQuery;

    if (completedError) {
      console.error("❌ Error fetching completed responses:", completedError);
      throw completedError;
    }

    const completedCount = completedData?.length || 0;

    // ─── Calculate pending responses per survey ────────────────────────────
    // Build a map of survey_id -> completed count
    const completedMap = {};
    if (completedData) {
      completedData.forEach(response => {
        completedMap[response.survey_id] = (completedMap[response.survey_id] || 0) + 1;
      });
    }

    // Calculate pending for each survey
    const surveyStats = await Promise.all((surveys || []).map(async (survey) => {
      // Get eligible students for this specific survey
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (survey.send_after_days || 15));
      const cutoffDateStr = cutoffDate.toISOString();

      const { data: eligibleStudents, error: eligibleError } = await supabase
        .from("student_invitations")
        .select("student_id")
        .eq("institute_id", instituteId)
        .eq("status", "accepted")

      if (eligibleError) {
        console.error(`❌ Error fetching eligible students for survey ${survey.id}:`, eligibleError);
        return {
          ...survey,
          eligibleCount: 0,
          completedCount: 0,
          pendingCount: 0,
        };
      }

      const eligibleCount = eligibleStudents?.length || 0;
      const completedForSurvey = completedMap[survey.id] || 0;
      const pendingCount = Math.max(0, eligibleCount - completedForSurvey);

      return {
        ...survey,
        eligibleCount,
        completedCount: completedForSurvey,
        pendingCount,
        responseRate: eligibleCount > 0 ? Math.round((completedForSurvey / eligibleCount) * 100) : 0,
      };
    }));

    // ─── Calculate Survey Analytics ──────────────────────────────────────────
    // Get survey questions for analytics
    let questions = [];
    if (surveys && surveys.length > 0) {
      const allQuestionIds = [];
      surveys.forEach(survey => {
        if (survey.question_ids && survey.question_ids.length > 0) {
          allQuestionIds.push(...survey.question_ids);
        }
      });
      
      if (allQuestionIds.length > 0) {
        const { data: questionData, error: questionError } = await supabase
          .from("survey_questions")
          .select("*")
          .in("id", allQuestionIds);

        if (!questionError) {
          questions = questionData || [];
        }
      }
    }

    const analytics = calculateSurveyAnalytics(allResponses, questions);

    // ─── Query 4: Get referral statistics ──────────────────────────────────
    const { data: referralData, error: referralError } = await supabase
      .from("nps_student_referrals")
      .select(`
        total_clicks,
        total_signups,
        total_enrollments,
        reward_points
      `)
      .eq("institute_id", instituteId);

    if (referralError) {
      console.error("❌ Error fetching referral data:", referralError);
      throw referralError;
    }

    const referralSummary = calculateReferralSummary(referralData);

    // ─── Get survey status breakdown ──────────────────────────────────────
    const statusBreakdown = {};
    if (surveys) {
      surveys.forEach(survey => {
        statusBreakdown[survey.status] = (statusBreakdown[survey.status] || 0) + 1;
      });
    }

    // ─── Build dashboard response ──────────────────────────────────────────
    return {
      success: true,
      data: {
        surveyCount,
        totalResponses,
        averageRating: analytics.averageRating,
        completedResponses: completedCount,
        pendingResponses: surveyStats.reduce((sum, s) => sum + s.pendingCount, 0),
        referralSummary,
        surveys: surveyStats,
        analytics,
        statusBreakdown,
      },
    };
  } catch (error) {
    console.error("❌ Error in getSurveyDashboardService:", error);
    throw error;
  }
};

// ─── SECTION 6: Student Survey Access ─────────────────────────────────────

/**
 * Get survey for student with token validation
 * @param {Object} params - Query parameters
 * @param {string} params.surveyId - Survey ID
 * @param {string} params.token - Survey token
 * @param {string} params.studentId - Student ID
 * @param {string} params.instituteId - Institute ID
 * @returns {Promise<Object>} Survey data with questions
 */
export const getSurveyForStudentService = async (params) => {
  try {
    const { surveyId, token, studentId, instituteId } = params;

    console.log("🔍 [getSurveyForStudentService] Received params:", {
      surveyId,
      token: token ? "present" : "missing",
      studentId,
      instituteId,
    });

    // 1. Input validation
    if (!surveyId) {
      throw new Error("Survey ID is required");
    }
    if (!token) {
      throw new Error("Survey token is required");
    }
    if (!studentId) {
      throw new Error("Student ID is required");
    }
    if (!instituteId) {
      throw new Error("Institute ID is required");
    }

    // 2. Get the user UUID from the student_invitations table
    const { data: studentInvitation, error: invitationError } = await supabase
      .from("student_invitations")
      .select("id, email, student_name")
      .eq("id", studentId)
      .eq("institute_id", instituteId) // ✅ FIX 5: Added institute filter
      .single();

    if (invitationError) {
      console.error("❌ Error fetching student invitation:", invitationError);
      throw new Error("Student invitation not found");
    }

    console.log("📋 Found student invitation:", studentInvitation);

    // 3. Get the user UUID from the users table using the email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", studentInvitation.email)
      .single();

    if (userError) {
      console.error("❌ Error fetching user:", userError);
      throw new Error("User not found for this student");
    }

    const userUuid = userData.id;
    console.log("📋 Found user UUID:", userUuid);

    // Validate token using nps_survey_recipients
    const { data: recipient, error: recipientError } = await supabase
      .from("nps_survey_recipients")
      .select("survey_id, student_id, status, token")
      .eq("survey_id", surveyId)
      .eq("student_id", userUuid)
      .eq("token", token)
      .maybeSingle();

    if (recipientError) {
      console.error("❌ Error validating token:", recipientError);
      throw new Error("Error validating survey access");
    }

    if (!recipient) {
      console.error("❌ Invalid token or unauthorized access");
      throw new Error("Invalid or expired survey link");
    }

    // 4. Get survey details
    const { data: survey, error: surveyError } = await supabase
      .from("nps_surveys")
      .select(`
        id,
        title,
        description,
        question_ids,
        is_active,
        status,
        send_after_days,
        created_at,
        institute_id
      `)
      .eq("id", surveyId)
      .eq("institute_id", instituteId) // ✅ FIX 5: Added institute filter
      .single();

    if (surveyError) {
      if (surveyError.code === "PGRST116") {
        throw new Error("Survey not found");
      }
      console.error("❌ Error fetching survey:", surveyError);
      throw surveyError;
    }

    // 5. Check if survey is available
    // ✅ FIX 6: Improved availability check
    if (!survey.is_active || survey.status !== "sent") {
      throw new Error("This survey is no longer available");
    }

    // 6. Check if survey has questions
    if (!survey.question_ids || survey.question_ids.length === 0) {
      throw new Error("Survey has no questions");
    }

    // 7. Check if student already submitted
    const { data: existingResponse, error: responseError } = await supabase
      .from("survey_responses")
      .select("id")
      .eq("survey_id", surveyId)
      .eq("student_id", userUuid)
      .eq("institute_id", survey.institute_id)
      .maybeSingle();

    if (responseError) {
      console.error("❌ Error checking existing response:", responseError);
      throw responseError;
    }

    if (existingResponse) {
      throw new Error("You have already submitted this survey");
    }

    // 8. Get survey questions
    let questions = [];
    if (survey.question_ids && survey.question_ids.length > 0) {
      const { data: questionData, error: questionError } = await supabase
        .from("survey_questions")
        .select(`
          id,
          question,
          question_type
        `)
        .in("id", survey.question_ids);

      if (questionError) {
        console.error("❌ Error fetching survey questions:", questionError);
        throw questionError;
      }

      questions = survey.question_ids
        .map(id => questionData.find(q => q.id === id))
        .filter(Boolean);
    }

    // 9. Return survey data
    return {
      success: true,
      data: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: questions.map(q => ({
          id: q.id,
          question: q.question,
          question_type: q.question_type,
        })),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        submitted: false,
        total_questions: questions.length,
        student_name: studentInvitation.student_name,
        institute_id: survey.institute_id,
        token: token,
      },
    };
  } catch (error) {
    console.error("❌ Error in getSurveyForStudentService:", error);
    throw error;
  }
};
// ─── Referral Methods ─────────────────────────────────────────────────────

/**
 * Create a referral for a student
 * @param {Object} data - Referral data
 * @param {string} data.institute_id - Institute ID
 * @param {string} data.studentId - Student ID
 * @param {string} data.referralName - Referred person's name
 * @param {string} data.referralEmail - Referred person's email
 * @param {string} data.referralPhone - Referred person's phone
 * @param {string} data.referralCode - Optional referral code (generated if not provided)
 * @returns {Promise<Object>} Created or existing referral
 */
export const createReferralService = async (data) => {
  try {
    const { 
      institute_id, 
      studentId, 
      referralName,
      referralEmail,
      referralPhone,
      referralCode 
    } = data;

    if (!institute_id) {
      throw new Error("Institution ID is required");
    }
    if (!studentId) {
      throw new Error("Student ID is required");
    }

    const { data: existingReferral, error: findError } = await supabase
      .from("nps_student_referrals")
      .select("*")
      .eq("student_id", studentId)
      .eq("institute_id", institute_id)
      .maybeSingle();

    if (findError) {
      console.error("❌ Error checking existing referral:", findError);
      throw findError;
    }

    if (existingReferral) {
      // Update with referral details if not already set
      const updateData = {};
      if (referralName) updateData.referral_name = referralName;
      if (referralEmail) updateData.referral_email = referralEmail;
      if (referralPhone) updateData.referral_phone = referralPhone;
      
      if (Object.keys(updateData).length > 0) {
        const { data: updatedData, error: updateError } = await supabase
          .from("nps_student_referrals")
          .update(updateData)
          .eq("id", existingReferral.id)
          .select()
          .single();

        if (updateError) {
          console.error("❌ Error updating referral:", updateError);
          throw updateError;
        }

        return {
          success: true,
          message: "Referral updated successfully.",
          data: updatedData,
        };
      }

      return {
        success: true,
        message: "Referral already exists.",
        data: existingReferral,
      };
    }

    const code = referralCode || `REF-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const referralLink = `${process.env.FRONTEND_URL}/signup?ref=${code}`;

    const insertData = {
      institute_id: institute_id,
      student_id: studentId,
      referral_code: code,
      referral_link: referralLink,
      referral_name: referralName || null,
      referral_email: referralEmail || null,
      referral_phone: referralPhone || null,
      total_clicks: 0,
      total_signups: 0,
      total_enrollments: 0,
      reward_points: 0,
    };

    const { data: insertedData, error: insertError } = await supabase
      .from("nps_student_referrals")
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error creating referral:", insertError);
      throw insertError;
    }

    return {
      success: true,
      message: "Referral created successfully.",
      data: insertedData,
    };
  } catch (error) {
    console.error("❌ Error in createReferralService:", error);
    throw error;
  }
};

/**
 * Increment referral clicks
 * @param {string} referralCode - Referral code
 * @returns {Promise<Object>} Updated referral
 */
export const incrementReferralClickService = async (referralCode) => {
  try {
    if (!referralCode) {
      throw new Error("Referral code is required");
    }

    const { data: referral, error: findError } = await supabase
      .from("nps_student_referrals")
      .select("*")
      .eq("referral_code", referralCode)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Referral not found");
      }
      console.error("❌ Error finding referral:", findError);
      throw findError;
    }

    const { data: updatedReferral, error: updateError } = await supabase
      .from("nps_student_referrals")
      .update({
        total_clicks: (referral.total_clicks || 0) + 1,
      })
      .eq("id", referral.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating referral clicks:", updateError);
      throw updateError;
    }

    return {
      success: true,
      message: "Referral click incremented successfully.",
      data: updatedReferral,
    };
  } catch (error) {
    console.error("❌ Error in incrementReferralClickService:", error);
    throw error;
  }
};

/**
 * Increment referral signups
 * @param {string} referralCode - Referral code
 * @param {number} rewardPointsToAdd - Reward points to add (default: 10)
 * @returns {Promise<Object>} Updated referral
 */
export const incrementReferralSignupService = async (referralCode, rewardPointsToAdd = 10) => {
  try {
    if (!referralCode) {
      throw new Error("Referral code is required");
    }

    const { data: referral, error: findError } = await supabase
      .from("nps_student_referrals")
      .select("*")
      .eq("referral_code", referralCode)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Referral not found");
      }
      console.error("❌ Error finding referral:", findError);
      throw findError;
    }

    const { data: updatedReferral, error: updateError } = await supabase
      .from("nps_student_referrals")
      .update({
        total_signups: (referral.total_signups || 0) + 1,
        reward_points: (referral.reward_points || 0) + rewardPointsToAdd,
      })
      .eq("id", referral.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating referral signups:", updateError);
      throw updateError;
    }

    return {
      success: true,
      message: "Referral signup incremented successfully.",
      data: updatedReferral,
    };
  } catch (error) {
    console.error("❌ Error in incrementReferralSignupService:", error);
    throw error;
  }
};

/**
 * Increment referral enrollments
 * @param {string} referralCode - Referral code
 * @param {number} rewardPointsToAdd - Reward points to add (default: 50)
 * @returns {Promise<Object>} Updated referral
 */
export const incrementReferralEnrollmentService = async (referralCode, rewardPointsToAdd = 50) => {
  try {
    if (!referralCode) {
      throw new Error("Referral code is required");
    }

    const { data: referral, error: findError } = await supabase
      .from("nps_student_referrals")
      .select("*")
      .eq("referral_code", referralCode)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") {
        throw new Error("Referral not found");
      }
      console.error("❌ Error finding referral:", findError);
      throw findError;
    }

    const { data: updatedReferral, error: updateError } = await supabase
      .from("nps_student_referrals")
      .update({
        total_enrollments: (referral.total_enrollments || 0) + 1,
        reward_points: (referral.reward_points || 0) + rewardPointsToAdd,
      })
      .eq("id", referral.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating referral enrollments:", updateError);
      throw updateError;
    }

    return {
      success: true,
      message: "Referral enrollment incremented successfully.",
      data: updatedReferral,
    };
  } catch (error) {
    console.error("❌ Error in incrementReferralEnrollmentService:", error);
    throw error;
  }
};

/**
 * Get referral by code (for signup flow)
 * @param {string} referralCode - Referral code
 * @returns {Promise<Object>} Referral data
 */
export const getReferralByCodeService = async (referralCode) => {
  try {
    if (!referralCode) {
      throw new Error("Referral code is required");
    }

    const { data: referral, error } = await supabase
      .from("nps_student_referrals")
      .select(`
        id,
        referral_code,
        referral_link,
        student_id,
        institute_id,
        total_clicks,
        total_signups,
        total_enrollments,
        reward_points,
        created_at
      `)
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (error) {
      console.error("❌ Error fetching referral by code:", error);
      throw error;
    }

    if (!referral) {
      return {
        success: false,
        message: "Invalid referral code",
        data: null,
      };
    }

    return {
      success: true,
      message: "Referral found",
      data: referral,
    };
  } catch (error) {
    console.error("❌ Error in getReferralByCodeService:", error);
    throw error;
  }
};

/**
 * Get student referral details
 * @param {Object} params - Query parameters
 * @param {string} params.studentId - Student ID
 * @param {string} params.institute_id - Institute ID
 * @returns {Promise<Object>} Referral details with code, link, and statistics
 */
export const getStudentReferralService = async (params) => {
  try {
    const { studentId, institute_id } = params;

    if (!studentId) {
      throw new Error("Student ID is required");
    }
    if (!institute_id) {
      throw new Error("Institution ID is required");
    }

    const { data: referral, error } = await supabase
      .from("nps_student_referrals")
      .select("*")
      .eq("student_id", studentId)
      .eq("institute_id", institute_id)
      .maybeSingle();

    if (error) {
      console.error("❌ Error fetching referral:", error);
      throw error;
    }

    if (!referral) {
      return {
        success: true,
        exists: false,
        message: "No referral found for this student.",
        data: null,
      };
    }

    const referralLink = referral.referral_link || 
      `${process.env.FRONTEND_URL}/signup?ref=${referral.referral_code}`;

    return {
      success: true,
      exists: true,
      data: {
        referralCode: referral.referral_code,
        referralLink,
        clicks: referral.total_clicks || 0,
        signups: referral.total_signups || 0,
        enrollments: referral.total_enrollments || 0,
        rewardPoints: referral.reward_points || 0,
        referralName: referral.referral_name || null,
        referralEmail: referral.referral_email || null,
        referralPhone: referral.referral_phone || null,
        createdAt: referral.created_at,
      },
    };
  } catch (error) {
    console.error("❌ Error in getStudentReferralService:", error);
    throw error;
  }
};