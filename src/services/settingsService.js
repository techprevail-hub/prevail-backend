import supabase from "../services/supabaseClient.js";

export const getSettingsService = async (userId) => {

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  // First time user - no settings record yet
  if (!data) {

    return {
      account: {},
      notifications: {
        email: true,
        push: true,
        jobAlerts: true,
        marketingEmails: false,
      },
      preferences: {
        careerStage: "",
        careerGoal: "",
        targetIndustry: "",
        interestedInCoaching: false,
      },
    };

  }

  return {
    account: {},
    notifications: data.notifications || {
      email: true,
      push: true,
      jobAlerts: true,
      marketingEmails: false,
    },
    preferences: data.preferences || {
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

  if (error) throw error;

  return data;
};


export const updatePreferencesService = async (
  userId,
  preferences
) => {

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

  if (error) throw error;

  return data;
};