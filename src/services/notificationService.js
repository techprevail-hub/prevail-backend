import supabase from "../services/supabaseClient.js";

/**
 * Get institute ID for a user
 *
 * IMPORTANT:
 * This assumes users.institute_id contains
 * the institute that the user belongs to.
 *
 * If your project stores this relationship
 * somewhere else, only this function needs
 * to be changed.
 */
const getInstituteIdForUser = async (userId) => {
  try {
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase
      .from("users")
      .select("institute_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "⚠️ Could not get institute ID for user:",
        error.message
      );

      // Important:
      // Do not break the existing notification system
      // if institute settings cannot be found.
      return null;
    }

    return data?.institute_id || null;
  } catch (error) {
    console.error(
      "⚠️ getInstituteIdForUser error:",
      error.message
    );

    // Existing notification behavior should continue.
    return null;
  }
};

/**
 * Map existing notification categories
 * to Institute Settings notification keys.
 *
 * Unknown categories are allowed by default
 * so existing notifications are not accidentally blocked.
 */
const getInstituteNotificationKey = (category) => {
  if (!category) {
    return null;
  }

  const categoryMap = {
    student: "student",
    students: "student",

    coach: "coach",
    coaches: "coach",

    placement: "placement",
    placements: "placement",

    career: "careerProgress",
    career_progress: "careerProgress",
    careerProgress: "careerProgress",

    nps: "nps",

    system: "system",
  };

  return categoryMap[category] || null;
};

/**
 * Check whether a notification is enabled
 * for the user's institute.
 *
 * IMPORTANT:
 * If the setting is missing, the function returns TRUE.
 * This protects your existing notification functionality.
 */
const isInstituteNotificationEnabled = async (
  userId,
  category
) => {
  try {
    const instituteId =
      await getInstituteIdForUser(userId);

    /**
     * If we cannot determine the institute,
     * allow the notification.
     *
     * This prevents the new Settings feature
     * from breaking existing notifications.
     */
    if (!instituteId) {
      console.log(
        "⚠️ Institute ID not found. Notification allowed by default."
      );

      return true;
    }

    const notificationKey =
      getInstituteNotificationKey(category);

    /**
     * If this category is not currently managed
     * by Institute Settings, allow it.
     *
     * This is important for your existing categories
     * such as job, resume, linkedin, interview, etc.
     */
    if (!notificationKey) {
      console.log(
        `ℹ️ Category "${category}" is not managed by Institute Settings. Notification allowed.`
      );

      return true;
    }

    const { data, error } = await supabase
      .from("institute_settings")
      .select("notification_settings")
      .eq("institute_id", instituteId)
      .maybeSingle();

    /**
     * If there is a database error,
     * do not break the existing notification system.
     */
    if (error) {
      console.error(
        "⚠️ Error reading institute notification settings:",
        error.message
      );

      return true;
    }

    /**
     * No settings record means:
     * notification is enabled by default.
     */
    if (!data) {
      console.log(
        "ℹ️ Institute settings not found. Notification allowed by default."
      );

      return true;
    }

    const notificationSettings =
      data.notification_settings || {};

    /**
     * Only explicitly FALSE blocks a notification.
     *
     * true       → allow
     * false      → block
     * undefined  → allow
     */
    if (
      notificationSettings[notificationKey] === false
    ) {
      console.log(
        `⛔ Institute notification disabled: ${notificationKey}`
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "⚠️ isInstituteNotificationEnabled error:",
      error.message
    );

    /**
     * Safety fallback:
     * Never break the existing notification system
     * because of the new Settings functionality.
     */
    return true;
  }
};

// ======================================================
// GET USER NOTIFICATIONS
// ======================================================

export const getNotificationsService = async (
  userId,
  page = 1,
  limit = 10,
  category = null
) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
};

// ======================================================
// CREATE NOTIFICATION
// ======================================================

export const createNotificationService = async (
  userId,
  title,
  message,
  type,
  category,
  actionUrl
) => {
  // Existing debug logs
  console.log(
    "📢 Notification Service Called:"
  );

  console.log(
    "   - User ID:",
    userId
  );

  console.log(
    "   - Title:",
    title
  );

  console.log(
    "   - Category:",
    category
  );

  console.log(
    "   - Type:",
    type
  );

  console.log(
    "   - Action URL:",
    actionUrl
  );

  // ==================================================
  // NEW: INSTITUTE NOTIFICATION SETTING CHECK
  // ==================================================

  const notificationEnabled =
    await isInstituteNotificationEnabled(
      userId,
      category
    );

  console.log(
    "   - Institute Notification Enabled:",
    notificationEnabled
  );

  /**
   * If the institute has disabled this
   * notification category, stop here.
   *
   * Existing notification database data
   * and all other notification functionality
   * remain untouched.
   */
  if (!notificationEnabled) {
    console.log(
      "   ⛔ Notification skipped because it is disabled by Institute Settings."
    );

    return null;
  }

  // ==================================================
  // EXISTING NOTIFICATION CREATION
  // ==================================================

  console.log(
    "   ✅ Creating notification in database..."
  );

  const { data, error } = await supabase
    .from("notifications")
    .insert([
      {
        user_id: userId,
        title,
        message,
        type,
        category,
        action_url: actionUrl,
        is_read: false,
      },
    ])
    .select();

  if (error) {
    console.error(
      "   ❌ Database error:",
      error
    );

    throw error;
  }

  console.log(
    "   ✅ Notification created successfully:",
    data
  );

  return data;
};

// ======================================================
// MARK SINGLE NOTIFICATION READ
// ======================================================

export const markAsReadService = async (
  notificationId
) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .select();

  if (error) {
    throw error;
  }

  return data;
};

// ======================================================
// MARK ALL NOTIFICATIONS READ
// ======================================================

export const markAllAsReadService = async (
  userId
) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", userId)
    .select();

  if (error) {
    throw error;
  }

  return data;
};