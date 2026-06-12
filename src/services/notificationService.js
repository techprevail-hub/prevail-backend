import supabase from "../services/supabaseClient.js";
import { getSettingsService } from "./settingsService.js";

// GET USER NOTIFICATIONS
export const getNotificationsService = async (userId) => {

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data;
};

// CREATE NOTIFICATION
export const createNotificationService = async (
  userId,
  title,
  message,
  type
) => {

  const settings = await getSettingsService(userId);

  // Notification preference check

  if (
    type === "job" &&
    !settings.notifications?.jobAlerts
  ) {
    return null;
  }

  if (
    type === "system" &&
    !settings.notifications?.push
  ) {
    return null;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert([
      {
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
      },
    ])
    .select();

  if (error) throw error;

  return data;
};

// MARK SINGLE NOTIFICATION READ
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

  if (error) throw error;

  return data;
};

// MARK ALL NOTIFICATIONS READ
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

  if (error) throw error;

  return data;
};