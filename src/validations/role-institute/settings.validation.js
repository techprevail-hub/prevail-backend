// validations/role-institute/settings.validation.js

/**
 * Allowed notification settings
 */
const NOTIFICATION_KEYS = [
  "student",
  "coach",
  "placement",
  "careerProgress",
  "nps",
  "system",
];

/**
 * Allowed feature settings
 */
const FEATURE_KEYS = [
  "students",
  "coaches",
  "careerProgress",
  "placement",
  "nps",
  "reporting",
];

/**
 * Validate Notification Settings
 */
export const updateInstituteNotificationSettingsValidation = (
  req,
  res,
  next
) => {
  try {
    const { notificationSettings } = req.body;

    // Check whether notificationSettings exists
    if (
      !notificationSettings ||
      typeof notificationSettings !== "object" ||
      Array.isArray(notificationSettings)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Notification settings must be a valid object.",
      });
    }

    const keys = Object.keys(notificationSettings);

    // Make sure at least one setting is provided
    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide at least one notification setting.",
      });
    }

    // Check for unsupported settings
    const invalidKeys = keys.filter(
      (key) => !NOTIFICATION_KEYS.includes(key)
    );

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid notification setting(s): ${invalidKeys.join(
          ", "
        )}.`,
      });
    }

    // Make sure every value is boolean
    for (const key of keys) {
      if (typeof notificationSettings[key] !== "boolean") {
        return res.status(400).json({
          success: false,
          message: `Notification setting "${key}" must be true or false.`,
        });
      }
    }

    next();
  } catch (error) {
    console.error(
      "❌ Notification settings validation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};

/**
 * Validate Feature Settings
 */
export const updateInstituteFeatureSettingsValidation = (
  req,
  res,
  next
) => {
  try {
    const { featureSettings } = req.body;

    // Check whether featureSettings exists
    if (
      !featureSettings ||
      typeof featureSettings !== "object" ||
      Array.isArray(featureSettings)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Feature settings must be a valid object.",
      });
    }

    const keys = Object.keys(featureSettings);

    // Make sure at least one setting is provided
    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide at least one feature setting.",
      });
    }

    // Check for unsupported settings
    const invalidKeys = keys.filter(
      (key) => !FEATURE_KEYS.includes(key)
    );

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid feature setting(s): ${invalidKeys.join(
          ", "
        )}.`,
      });
    }

    // Make sure every value is boolean
    for (const key of keys) {
      if (typeof featureSettings[key] !== "boolean") {
        return res.status(400).json({
          success: false,
          message: `Feature setting "${key}" must be true or false.`,
        });
      }
    }

    next();
  } catch (error) {
    console.error(
      "❌ Feature settings validation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};