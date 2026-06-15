import supabase from "../services/supabaseClient.js";
import { getSettingsService } from "./settingsService.js";

// GET USER NOTIFICATIONS
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

  if (error) throw error;

  return data;
};

// CREATE NOTIFICATION
export const createNotificationService = async (
  userId,
  title,
  message,
  type,
  category,
  actionUrl
) => {
  // Add debug logs
  console.log("📢 Notification Service Called:");
  console.log("   - User ID:", userId);
  console.log("   - Title:", title);
  console.log("   - Category:", category);
  console.log("   - Type:", type);
  console.log("   - Action URL:", actionUrl);

  const settings = await getSettingsService(userId);
  
  console.log("   - User Settings:", JSON.stringify(settings, null, 2));

  // TEMPORARILY DISABLED FOR DEBUGGING - All preference checks commented out
  // Settings Preference Checks - Disabled to allow notifications to be created
  
  // if (
  //   category === "job" &&
  //   !settings.notifications?.jobAlerts
  // ) {
  //   console.log("   ⛔ Notification blocked: Job alerts disabled");
  //   return null;
  // }
  //
  // if (
  //   category === "resume" &&
  //   !settings.notifications?.push
  // ) {
  //   console.log("   ⛔ Notification blocked: Push notifications disabled");
  //   return null;
  // }
  //
  // if (
  //   category === "linkedin" &&
  //   !settings.notifications?.push
  // ) {
  //   console.log("   ⛔ Notification blocked: Push notifications disabled");
  //   return null;
  // }
  //
  // if (
  //   category === "interview" &&
  //   !settings.notifications?.push
  // ) {
  //   console.log("   ⛔ Notification blocked: Push notifications disabled");
  //   return null;
  // }
  //
  // if (
  //   category === "coach" &&
  //   !settings.notifications?.push
  // ) {
  //   console.log("   ⛔ Notification blocked: Push notifications disabled");
  //   return null;
  // }

  console.log("   ✅ Creating notification in database...");

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
    console.error("   ❌ Database error:", error);
    throw error;
  }

  console.log("   ✅ Notification created successfully:", data);
  return data;
};

// MARK SINGLE NOTIFICATION READ
export const markAsReadService = async (notificationId) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .select();

  if (error) throw error;

  return data;
};

// MARK ALL NOTIFICATIONS READ
export const markAllAsReadService = async (userId) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", userId)
    .select();

  if (error) throw error;

  return data;
};