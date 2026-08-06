import { body, validationResult } from "express-validator";

/**
 * Common Validation Handler
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation Failed",
      errors: errors.array(),
    });
  }

  next();
};

/* -------------------------------------------------------------------------- */
/*                          Survey Question Validation                         */
/* -------------------------------------------------------------------------- */

export const createSurveyQuestionValidation = [
  body("questionText")
    .notEmpty()
    .withMessage("Question text is required"),

  body("questionType")
    .notEmpty()
    .withMessage("Question type is required")
    .isIn([
      "rating",
      "text",
      "multiple_choice",
      "recommendation",
      "satisfaction",
      "email",
      "phone",
      "name",
    ])
    .withMessage("Invalid question type"),

  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),

  body("options")
    .optional()
    .isArray()
    .withMessage("Options must be an array"),

  body("isRequired")
    .optional()
    .isBoolean()
    .withMessage("isRequired must be boolean"),

  handleValidation,
];

export const updateSurveyQuestionValidation = [
  body("questionText")
    .optional()
    .notEmpty()
    .withMessage("Question text cannot be empty"),

  body("questionType")
    .optional()
    .isIn([
      "rating",
      "text",
      "multiple_choice",
      "recommendation",
      "satisfaction",
      "email",
      "phone",
      "name",
    ])
    .withMessage("Invalid question type"),

  body("category")
    .optional()
    .isString(),

  body("options")
    .optional()
    .isArray(),

  body("isRequired")
    .optional()
    .isBoolean(),

  handleValidation,
];

/* -------------------------------------------------------------------------- */
/*                              Survey Validation                             */
/* -------------------------------------------------------------------------- */

export const createSurveyValidation = [
  body("title")
    .notEmpty()
    .withMessage("Survey title is required"),

  body("description")
    .optional()
    .isString(),

  body("selectedQuestions")
    .isArray({ min: 6, max: 10 })
    .withMessage("Survey must contain between 6 and 10 questions"),

  body("sendAfterDays")
    .isInt({ min: 1 })
    .withMessage("sendAfterDays must be greater than 0"),

  body("status")
    .optional()
    .isIn(["draft", "scheduled", "sent", "completed"])
    .withMessage("Invalid survey status"),

  handleValidation,
];

export const updateSurveyValidation = [
  body("title")
    .optional()
    .notEmpty(),

  body("description")
    .optional()
    .isString(),

  body("selectedQuestions")
    .optional()
    .isArray({ min: 6, max: 10 })
    .withMessage("Survey must contain between 6 and 10 questions"),

  body("sendAfterDays")
    .optional()
    .isInt({ min: 1 }),

  body("status")
    .optional()
    .isIn(["draft", "scheduled", "sent", "completed"]),

  handleValidation,
];

/* -------------------------------------------------------------------------- */
/*                           Send Survey Validation                           */
/* -------------------------------------------------------------------------- */

export const sendSurveyValidation = [
  body("resend")
    .optional()
    .isBoolean()
    .withMessage("resend must be true or false"),

  handleValidation,
];

/* -------------------------------------------------------------------------- */
/*                       Submit Survey Response Validation                    */
/* -------------------------------------------------------------------------- */

export const submitSurveyResponseValidation = [
  body("institutionId")
    .notEmpty()
    .isUUID()
    .withMessage("Valid institutionId is required"),

  body("answers")
    .notEmpty()
    .isObject()
    .withMessage("Answers object is required"),

  body("token")
    .notEmpty()
    .withMessage("Survey token is required"),

  handleValidation,
];