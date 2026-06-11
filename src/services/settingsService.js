import supabase from "../services/supabaseClient.js";

export const getSettingsService = async (userId) => {

  // Fetch user information from users table
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("name, email, role, created_at")
    .eq("id", userId)
    .single();

  if (userError) throw userError;

  // Fetch settings data
  const { data: settingsData, error: settingsError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (settingsError) throw settingsError;

  return {
    account: {
      name: userData?.name || "",
      email: userData?.email || "",
      role: userData?.role || "",
      created_at: userData?.created_at || "",
    },

    notifications: settingsData?.notifications || {
      email: true,
      push: true,
      jobAlerts: true,
      marketingEmails: false,
    },

    preferences: settingsData?.preferences || {
      careerStage: "",
      careerGoal: "",
      targetIndustry: "",
      interestedInCoaching: false,
    },
  };
};

export const updateNotificationsService = async (
  userId,
  notifications
) => {

  console.log("USER ID:", userId);

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        notifications,
      },
      {
        onConflict: "user_id",
      }
    )
    .select();

  if (error) {
    console.error("Notification Update Error:", error);
    throw error;
  }

  return data;
};

export const updatePreferencesService = async (
  userId,
  preferences
) => {

  console.log("USER ID:", userId);

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        preferences,
      },
      {
        onConflict: "user_id",
      }
    )
    .select();

  if (error) {
    console.error("Preferences Update Error:", error);
    throw error;
  }

  return data;
};